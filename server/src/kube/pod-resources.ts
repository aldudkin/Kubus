import type { KubeObject, PodResourceUsage, PodResourcesResponse } from '@kubus/shared';
import type { ClusterHandle } from './cluster-manager.js';
import { cpuToMilli, memToBytes } from './quantity.js';

interface ContainerSpec {
  restartPolicy?: string;
  resources?: { requests?: { cpu?: string; memory?: string }; limits?: { cpu?: string; memory?: string } };
}

interface PodSpecResources {
  cpuRequestMilli: number;
  memRequestBytes: number;
  cpuLimitMilli: number;
  memLimitBytes: number;
}

function podSpecResources(pod: KubeObject): PodSpecResources {
  const spec = pod.spec as { containers?: ContainerSpec[]; initContainers?: ContainerSpec[] } | undefined;
  // Regular containers plus restartable init containers (sidecars) — those
  // run for the pod's whole life and count toward scheduling.
  const containers = [
    ...(spec?.containers ?? []),
    ...(spec?.initContainers ?? []).filter((c) => c.restartPolicy === 'Always'),
  ];
  const acc: PodSpecResources = { cpuRequestMilli: 0, memRequestBytes: 0, cpuLimitMilli: 0, memLimitBytes: 0 };
  for (const c of containers) {
    acc.cpuRequestMilli += cpuToMilli(c.resources?.requests?.cpu);
    acc.memRequestBytes += memToBytes(c.resources?.requests?.memory);
    acc.cpuLimitMilli += cpuToMilli(c.resources?.limits?.cpu);
    acc.memLimitBytes += memToBytes(c.resources?.limits?.memory);
  }
  return acc;
}

/**
 * Join live pod usage (metrics poller) with spec requests/limits (pods
 * watcher) so the client can apply threshold filters without refetching.
 */
export async function computePodResources(handle: ClusterHandle, namespace?: string): Promise<PodResourcesResponse> {
  const podsWatcher = handle.watchers.acquire('', 'v1', 'pods');
  try {
    await podsWatcher.watcher.ready();
    const specs = new Map<string, PodSpecResources>();
    for (const pod of podsWatcher.watcher.items()) {
      if (namespace && pod.metadata.namespace !== namespace) continue;
      specs.set(`${pod.metadata.namespace ?? ''}/${pod.metadata.name}`, podSpecResources(pod));
    }
    const pods: PodResourceUsage[] = [];
    for (const usage of handle.metricsPoller.podSnapshot(namespace)) {
      const spec = specs.get(`${usage.namespace ?? ''}/${usage.name}`);
      if (!spec) continue; // metrics for a pod the watcher no longer has
      pods.push({
        namespace: usage.namespace ?? '',
        name: usage.name,
        cpuUsageMilli: usage.cpuMilli,
        memUsageBytes: usage.memBytes,
        ...spec,
      });
    }
    pods.sort((a, b) => b.cpuUsageMilli - a.cpuUsageMilli);
    return { available: handle.metricsPoller.available, pods };
  } finally {
    podsWatcher.release();
  }
}
