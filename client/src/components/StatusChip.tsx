import { Chip } from '@mui/material';

const GOOD = new Set(['Running', 'Succeeded', 'Active', 'Bound', 'Ready', 'Available', 'Completed', 'deployed', 'True']);
const BAD = new Set(['Failed', 'CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'Error', 'Evicted', 'Lost', 'NotReady', 'failed', 'OOMKilled']);
const WARN = new Set(['Pending', 'Terminating', 'ContainerCreating', 'PodInitializing', 'Released', 'Unknown', 'SchedulingDisabled', 'pending-install', 'pending-upgrade', 'superseded', 'uninstalling']);

export function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (GOOD.has(status)) return 'success';
  if (BAD.has(status)) return 'error';
  if (WARN.has(status)) return 'warning';
  return 'default';
}

export function StatusChip({ status }: { status: string }) {
  if (!status) return null;
  return <Chip label={status} color={statusColor(status)} variant="outlined" sx={{ height: 20, fontSize: 11 }} />;
}
