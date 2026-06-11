import { useMemo, useState } from 'react';
import { Box, Drawer, FormControlLabel, IconButton, Stack, Switch, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import yaml from 'js-yaml';
import type { KubeObject } from '@kubedeck/shared';
import { useApplyResource, useResource, useResourceEvents } from '../api/queries.js';
import { YamlEditor } from './YamlEditor.js';
import { GenericDetail } from './detail/GenericDetail.js';
import { PodDetail } from './detail/PodDetail.js';
import { AgeCell } from './AgeCell.js';
import { MetricsChart } from './MetricsChart.js';

export interface ResourceSelection {
  ctx: string;
  group: string;
  version: string;
  plural: string;
  kind: string;
  name: string;
  namespace?: string;
}

interface Props {
  sel: ResourceSelection | undefined;
  onClose: () => void;
}

export function ResourceDetailDrawer({ sel, onClose }: Props) {
  const [tab, setTab] = useState('overview');
  const [reveal, setReveal] = useState(false);
  const isSecret = sel?.kind === 'Secret';
  const { data: obj, refetch } = useResource(sel ? { ...sel, reveal: isSecret && reveal } : undefined);
  const { data: events } = useResourceEvents(tab === 'events' && sel ? { ctx: sel.ctx, name: sel.name, kind: sel.kind, namespace: sel.namespace } : undefined);
  const apply = useApplyResource();

  const yamlText = useMemo(() => (obj ? yaml.dump(obj, { noRefs: true, lineWidth: 140 }) : ''), [obj]);
  const hasMetrics = sel?.kind === 'Pod' || sel?.kind === 'Node';

  const handleApply = async (text: string) => {
    if (!sel) return;
    try {
      await apply.mutateAsync({ ...sel, yamlBody: text });
    } catch (err) {
      // 409 → refresh so the editor shows the server's current state on Reset.
      if ((err as { status?: number }).status === 409) {
        void refetch();
        throw new Error(`${(err as Error).message} — the resource changed on the server; the view has been refreshed, re-apply your edits.`);
      }
      throw err;
    }
  };

  return (
    <Drawer anchor="right" open={!!sel} onClose={onClose} slotProps={{ paper: { sx: { width: 'min(720px, 80vw)' } } }}>
      {sel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                {sel.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {sel.kind}
                {sel.namespace ? ` · ${sel.namespace}` : ''} · {sel.ctx}
                {obj && (
                  <>
                    {' · '}
                    <AgeCell timestamp={obj.metadata.creationTimestamp} /> old
                  </>
                )}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Tabs value={tab} onChange={(_e, v) => setTab(v as string)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}>
            <Tab value="overview" label="Overview" sx={{ minHeight: 36 }} />
            <Tab value="yaml" label="YAML" sx={{ minHeight: 36 }} />
            <Tab value="events" label="Events" sx={{ minHeight: 36 }} />
            {hasMetrics && <Tab value="metrics" label="Metrics" sx={{ minHeight: 36 }} />}
          </Tabs>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {tab === 'overview' && obj && (sel.kind === 'Pod' ? <PodDetail obj={obj} ctx={sel.ctx} /> : <GenericDetail obj={obj} ctx={sel.ctx} />)}
            {tab === 'yaml' && (
              <YamlEditor
                value={yamlText}
                onApply={handleApply}
                toolbar={
                  isSecret ? (
                    <FormControlLabel
                      control={<Switch size="small" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />}
                      label={<Typography variant="caption">Reveal secret data</Typography>}
                    />
                  ) : undefined
                }
              />
            )}
            {tab === 'events' && <EventsList events={events?.items ?? []} />}
            {tab === 'metrics' && hasMetrics && (
              <MetricsChart ctx={sel.ctx} kind={sel.kind === 'Pod' ? 'pod' : 'node'} name={sel.name} namespace={sel.namespace} />
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

function EventsList({ events }: { events: KubeObject[] }) {
  if (!events.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No events.
      </Typography>
    );
  }
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {events.map((e) => {
        const ev = e as KubeObject & { type?: string; reason?: string; message?: string; count?: number; lastTimestamp?: string };
        return (
          <Box key={e.metadata.uid} sx={{ borderLeft: 3, borderColor: ev.type === 'Warning' ? 'error.main' : 'success.main', pl: 1.5, py: 0.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {ev.reason} {ev.count && ev.count > 1 ? `×${ev.count}` : ''}{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                <AgeCell timestamp={ev.lastTimestamp ?? e.metadata.creationTimestamp} /> ago
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {ev.message}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
