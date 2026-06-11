import type { FastifyInstance } from 'fastify';
import yaml from 'js-yaml';
import { ApiException, type KubernetesObject } from '@kubernetes/client-node';
import { groupFromPath, type KubeObject, type ListResponse } from '@kubedeck/shared';
import type { AppContext } from '../app.js';
import { resourcePath } from '../kube/raw-client.js';
import { maybeRedact } from '../kube/redact.js';
import { HttpProblem, sendError } from '../util/errors.js';

interface GvrParams {
  ctx: string;
  group: string;
  version: string;
  plural: string;
}

interface ListQuery {
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: string;
  continue?: string;
}

/** Parse a request body that may be YAML or JSON into an object. */
function parseManifest(body: unknown): KubernetesObject {
  let obj: unknown = body;
  if (typeof body === 'string') {
    obj = yaml.load(body);
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new HttpProblem(422, 'body must be a single YAML/JSON object');
  }
  const k = obj as KubernetesObject;
  if (!k.apiVersion || !k.kind || !k.metadata?.name) {
    throw new HttpProblem(422, 'manifest must have apiVersion, kind and metadata.name');
  }
  return k;
}

export function registerResourceRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Accept YAML bodies for create/replace.
  app.addContentTypeParser(['application/yaml', 'text/yaml'], { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  app.get<{ Params: GvrParams; Querystring: ListQuery }>('/api/contexts/:ctx/resources/:group/:version/:plural', async (req, reply) => {
    try {
      const handle = ctx.clusters.get(req.params.ctx);
      const group = groupFromPath(req.params.group);
      const { version, plural } = req.params;
      const query = new URLSearchParams();
      if (req.query.labelSelector) query.set('labelSelector', req.query.labelSelector);
      if (req.query.fieldSelector) query.set('fieldSelector', req.query.fieldSelector);
      query.set('limit', req.query.limit ?? '2000');
      if (req.query.continue) query.set('continue', req.query.continue);
      const path = resourcePath(group, version, plural, { namespace: req.query.namespace || undefined, query });
      const list = await handle.raw.json<{ metadata?: { resourceVersion?: string; continue?: string }; items?: KubeObject[] }>(path);
      const items = (list.items ?? []).map((item) => {
        if (item.metadata && 'managedFields' in item.metadata) {
          delete (item.metadata as Record<string, unknown>).managedFields;
        }
        return maybeRedact(item, group, plural);
      });
      const response: ListResponse = {
        items,
        resourceVersion: list.metadata?.resourceVersion,
        continue: list.metadata?.continue,
      };
      return response;
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });

  app.get<{ Params: GvrParams & { name: string }; Querystring: { namespace?: string; reveal?: string } }>(
    '/api/contexts/:ctx/resources/:group/:version/:plural/:name',
    async (req, reply) => {
      try {
        const handle = ctx.clusters.get(req.params.ctx);
        const group = groupFromPath(req.params.group);
        const path = resourcePath(group, req.params.version, req.params.plural, {
          namespace: req.query.namespace || undefined,
          name: req.params.name,
        });
        const obj = await handle.raw.json<KubeObject>(path);
        return req.query.reveal === 'true' ? obj : maybeRedact(obj, group, req.params.plural);
      } catch (err) {
        sendError(reply, err);
        return reply;
      }
    },
  );

  app.put<{ Params: GvrParams & { name: string }; Querystring: { namespace?: string }; Body: unknown }>(
    '/api/contexts/:ctx/resources/:group/:version/:plural/:name',
    async (req, reply) => {
      try {
        const handle = ctx.clusters.get(req.params.ctx);
        const manifest = parseManifest(req.body);
        try {
          return await handle.objects.replace(manifest);
        } catch (err) {
          // On conflict, hand back the server's current object so the
          // client can offer a re-read/merge flow.
          if (err instanceof ApiException && err.code === 409) {
            const group = groupFromPath(req.params.group);
            const path = resourcePath(group, req.params.version, req.params.plural, {
              namespace: req.query.namespace || undefined,
              name: req.params.name,
            });
            const current = await handle.raw.json<KubeObject>(path).catch(() => undefined);
            void reply.code(409).send({ message: 'conflict: resource was modified', reason: 'Conflict', code: 409, current });
            return reply;
          }
          throw err;
        }
      } catch (err) {
        sendError(reply, err);
        return reply;
      }
    },
  );

  app.post<{ Body: unknown }>('/api/contexts/:ctx/resources', async (req, reply) => {
    try {
      const handle = ctx.clusters.get((req.params as { ctx: string }).ctx);
      const manifest = parseManifest(req.body);
      return await handle.objects.create(manifest);
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });

  app.delete<{ Params: GvrParams & { name: string }; Querystring: { namespace?: string; gracePeriodSeconds?: string; propagationPolicy?: string } }>(
    '/api/contexts/:ctx/resources/:group/:version/:plural/:name',
    async (req, reply) => {
      try {
        const handle = ctx.clusters.get(req.params.ctx);
        const group = groupFromPath(req.params.group);
        const query = new URLSearchParams();
        if (req.query.gracePeriodSeconds !== undefined) query.set('gracePeriodSeconds', req.query.gracePeriodSeconds);
        if (req.query.propagationPolicy) query.set('propagationPolicy', req.query.propagationPolicy);
        const path = resourcePath(group, req.params.version, req.params.plural, {
          namespace: req.query.namespace || undefined,
          name: req.params.name,
          query,
        });
        return await handle.raw.json(path, { method: 'DELETE' });
      } catch (err) {
        sendError(reply, err);
        return reply;
      }
    },
  );
}
