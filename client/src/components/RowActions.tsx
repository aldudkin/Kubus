import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import SubjectIcon from '@mui/icons-material/Subject';
import TerminalIcon from '@mui/icons-material/Terminal';
import CableIcon from '@mui/icons-material/Cable';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BlockIcon from '@mui/icons-material/Block';
import DownhillSkiingIcon from '@mui/icons-material/DownhillSkiing';
import type { KubeObject } from '@kubedeck/shared';
import { useCordon, useDeleteResource, useDrain, useRolloutRestart, useScale, useStartPortForward, useTriggerCronJob } from '../api/queries.js';
import { watchClient } from '../api/ws/watch-client.js';
import { useDockStore, dockTabId } from '../state/dock.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { podContainerNames } from '../kube-display.js';

export interface RowActionTarget {
  ctx: string;
  group: string;
  version: string;
  plural: string;
  kind: string;
  obj: KubeObject;
}

export function RowActions({ target }: { target: RowActionTarget }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'delete' | 'scale' | 'forward' | 'drain' | null>(null);
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);

  const del = useDeleteResource();
  const restart = useRolloutRestart();
  const cordon = useCordon();
  const trigger = useTriggerCronJob();
  const addTab = useDockStore((s) => s.addTab);

  const { kind, obj, ctx } = target;
  const name = obj.metadata.name;
  const namespace = obj.metadata.namespace;
  const close = () => setAnchor(null);

  const ok = (text: string) => setToast({ severity: 'success', text });
  const fail = (err: unknown) => setToast({ severity: 'error', text: err instanceof Error ? err.message : String(err) });

  const scalable = kind === 'Deployment' || kind === 'StatefulSet' || kind === 'ReplicaSet';
  const restartable = kind === 'Deployment' || kind === 'StatefulSet' || kind === 'DaemonSet';
  const isPod = kind === 'Pod';
  const isNode = kind === 'Node';
  const isCronJob = kind === 'CronJob';
  const canForward = isPod || kind === 'Service';
  const unschedulable = isNode && !!(obj.spec as { unschedulable?: boolean })?.unschedulable;

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close} onClick={(e) => e.stopPropagation()}>
        {isPod && (
          <MenuItem
            onClick={() => {
              addTab({ kind: 'logs', id: dockTabId(), title: `logs: ${name}`, ctx, namespace: namespace ?? '', pods: [name] });
              close();
            }}
          >
            <ListItemIcon>
              <SubjectIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logs</ListItemText>
          </MenuItem>
        )}
        {isPod && (
          <MenuItem
            onClick={() => {
              const container = podContainerNames(obj)[0] ?? '';
              addTab({ kind: 'terminal', id: dockTabId(), title: `sh: ${name}`, ctx, namespace: namespace ?? '', pod: name, container });
              close();
            }}
          >
            <ListItemIcon>
              <TerminalIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Shell</ListItemText>
          </MenuItem>
        )}
        {canForward && (
          <MenuItem
            onClick={() => {
              setDialog('forward');
              close();
            }}
          >
            <ListItemIcon>
              <CableIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Port forward…</ListItemText>
          </MenuItem>
        )}
        {scalable && (
          <MenuItem
            onClick={() => {
              setDialog('scale');
              close();
            }}
          >
            <ListItemIcon>
              <OpenInFullIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Scale…</ListItemText>
          </MenuItem>
        )}
        {restartable && (
          <MenuItem
            onClick={() => {
              restart.mutate(
                { ctx, body: { kind: kind as 'Deployment', namespace: namespace ?? '', name } },
                { onSuccess: () => ok(`Rollout restart triggered for ${name}`), onError: fail },
              );
              close();
            }}
          >
            <ListItemIcon>
              <RestartAltIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Rollout restart</ListItemText>
          </MenuItem>
        )}
        {isCronJob && (
          <MenuItem
            onClick={() => {
              trigger.mutate({ ctx, body: { namespace: namespace ?? '', name } }, { onSuccess: (r) => ok(`Created job ${r.jobName}`), onError: fail });
              close();
            }}
          >
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Trigger now</ListItemText>
          </MenuItem>
        )}
        {isNode && (
          <MenuItem
            onClick={() => {
              cordon.mutate(
                { ctx, body: { node: name, unschedulable: !unschedulable } },
                { onSuccess: () => ok(`${unschedulable ? 'Uncordoned' : 'Cordoned'} ${name}`), onError: fail },
              );
              close();
            }}
          >
            <ListItemIcon>
              <BlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{unschedulable ? 'Uncordon' : 'Cordon'}</ListItemText>
          </MenuItem>
        )}
        {isNode && (
          <MenuItem
            onClick={() => {
              setDialog('drain');
              close();
            }}
          >
            <ListItemIcon>
              <DownhillSkiingIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Drain…</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            setDialog('delete');
            close();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete…</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={dialog === 'delete'}
        title={`Delete ${kind}`}
        message={
          <>
            Delete <b>{namespace ? `${namespace}/` : ''}{name}</b> from cluster <b>{ctx}</b>? This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={del.isPending}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          del.mutate(
            { ctx, group: target.group, version: target.version, plural: target.plural, name, namespace },
            {
              onSuccess: () => {
                setDialog(null);
                ok(`Deleted ${name}`);
              },
              onError: (e) => {
                setDialog(null);
                fail(e);
              },
            },
          )
        }
      />
      {dialog === 'scale' && <ScaleDialog target={target} onClose={() => setDialog(null)} onDone={ok} onError={fail} />}
      {dialog === 'forward' && <PortForwardDialog target={target} onClose={() => setDialog(null)} onDone={ok} onError={fail} />}
      {dialog === 'drain' && <DrainDialog target={target} onClose={() => setDialog(null)} />}

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.severity} variant="filled" onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </>
  );
}

function ScaleDialog({ target, onClose, onDone, onError }: { target: RowActionTarget; onClose: () => void; onDone: (t: string) => void; onError: (e: unknown) => void }) {
  const scale = useScale();
  const current = (target.obj.spec as { replicas?: number })?.replicas ?? 0;
  const [replicas, setReplicas] = useState(current);
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Scale {target.obj.metadata.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current replicas: {current}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          type="number"
          label="Replicas"
          value={replicas}
          onChange={(e) => setReplicas(Math.max(0, Number(e.target.value)))}
          slotProps={{ htmlInput: { min: 0 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={scale.isPending}
          onClick={() =>
            scale.mutate(
              {
                ctx: target.ctx,
                body: { group: target.group, version: target.version, plural: target.plural, namespace: target.obj.metadata.namespace ?? '', name: target.obj.metadata.name, replicas },
              },
              {
                onSuccess: () => {
                  onClose();
                  onDone(`Scaled ${target.obj.metadata.name} to ${replicas}`);
                },
                onError: (e) => {
                  onClose();
                  onError(e);
                },
              },
            )
          }
        >
          Scale
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PortForwardDialog({ target, onClose, onDone, onError }: { target: RowActionTarget; onClose: () => void; onDone: (t: string) => void; onError: (e: unknown) => void }) {
  const start = useStartPortForward();
  const isPod = target.kind === 'Pod';
  const defaultPort = isPod
    ? ((target.obj.spec as { containers?: Array<{ ports?: Array<{ containerPort: number }> }> })?.containers?.[0]?.ports?.[0]?.containerPort ?? 80)
    : ((target.obj.spec as { ports?: Array<{ port: number }> })?.ports?.[0]?.port ?? 80);
  const [remotePort, setRemotePort] = useState(defaultPort);
  const [localPort, setLocalPort] = useState<number | ''>('');
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Port forward {target.obj.metadata.name}</DialogTitle>
      <DialogContent sx={{ display: 'flex', gap: 2, pt: '12px !important' }}>
        <TextField label={`${target.kind} port`} type="number" value={remotePort} onChange={(e) => setRemotePort(Number(e.target.value))} />
        <TextField label="Local port (auto)" type="number" value={localPort} onChange={(e) => setLocalPort(e.target.value === '' ? '' : Number(e.target.value))} placeholder="auto" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={start.isPending}
          onClick={() =>
            start.mutate(
              {
                ctx: target.ctx,
                body: {
                  namespace: target.obj.metadata.namespace ?? '',
                  kind: isPod ? 'pod' : 'service',
                  name: target.obj.metadata.name,
                  remotePort,
                  localPort: localPort === '' ? undefined : localPort,
                },
              },
              {
                onSuccess: (info) => {
                  onClose();
                  onDone(`Forwarding localhost:${info.localPort} → ${info.name}:${info.remotePort}`);
                },
                onError: (e) => {
                  onClose();
                  onError(e);
                },
              },
            )
          }
        >
          Start
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DrainDialog({ target, onClose }: { target: RowActionTarget; onClose: () => void }) {
  const drain = useDrain();
  const [drainId, setDrainId] = useState<string>();
  const [progress, setProgress] = useState<{ evicted: number; total: number; current?: string; done?: boolean; error?: string }>();

  useEffect(() => {
    if (!drainId) return;
    return watchClient.onBroadcast((msg) => {
      if (msg.op === 'drain-progress' && msg.drainId === drainId) {
        setProgress(msg);
      }
    });
  }, [drainId]);

  const name = target.obj.metadata.name;
  const running = !!drainId && !progress?.done;

  return (
    <Dialog open onClose={running ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Drain node {name}</DialogTitle>
      <DialogContent>
        {!drainId && (
          <Typography variant="body2">
            This cordons <b>{name}</b> and evicts all non-DaemonSet pods. Pods managed by controllers will be rescheduled elsewhere.
          </Typography>
        )}
        {drainId && (
          <>
            <LinearProgress
              variant={progress?.total ? 'determinate' : 'indeterminate'}
              value={progress?.total ? (progress.evicted / progress.total) * 100 : undefined}
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {progress?.error
                ? `Failed: ${progress.error}`
                : progress?.done
                  ? `Done — evicted ${progress.evicted}/${progress.total} pods.`
                  : `Evicting ${progress?.current ?? '…'} (${progress?.evicted ?? 0}/${progress?.total ?? '?'})`}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={running}>
          {progress?.done ? 'Close' : 'Cancel'}
        </Button>
        {!drainId && (
          <Button
            variant="contained"
            color="error"
            disabled={drain.isPending}
            onClick={() =>
              drain.mutate(
                { ctx: target.ctx, body: { node: name } },
                { onSuccess: (r) => setDrainId(r.drainId), onError: (e) => setProgress({ evicted: 0, total: 0, done: true, error: e instanceof Error ? e.message : String(e) }) },
              )
            }
          >
            Drain
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
