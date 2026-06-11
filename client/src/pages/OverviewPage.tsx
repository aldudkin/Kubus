import { Alert, Box, Card, CardContent, Chip, Grid, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useNodeMetrics, useOverview } from '../api/queries.js';
import { useClustersStore } from '../state/clusters.js';
import { AgeCell } from '../components/AgeCell.js';
import { StatusChip } from '../components/StatusChip.js';
import { formatBytes, formatCpu } from '../components/Sparkline.js';

export function OverviewPage() {
  const selected = useClustersStore((s) => s.selected);

  if (selected.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          ⎈ Kubedeck
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select one or more clusters in the top bar to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      {selected.map((ctx) => (
        <ClusterOverviewSection key={ctx} ctx={ctx} />
      ))}
    </Stack>
  );
}

function ClusterOverviewSection({ ctx }: { ctx: string }) {
  const { data, isLoading, error } = useOverview(ctx);
  const { data: nodeMetrics } = useNodeMetrics(ctx);
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {ctx}
      </Typography>
      {isLoading && <LinearProgress />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {data && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <StatCard label="Nodes" value={data.counts.nodes} />
            <StatCard label="Namespaces" value={data.counts.namespaces} />
            <StatCard label="Pods" value={`${data.counts.podsRunning}/${data.counts.pods}`} sub="running" warn={data.counts.podsRunning < data.counts.pods} />
            <StatCard label="Deployments" value={data.counts.deployments} />
            <StatCard label="Failing pods" value={data.failingPods.length} warn={data.failingPods.length > 0} onClick={() => navigate('/r/core/v1/pods')} />
            <StatCard label="Warnings (1h)" value={data.warningEvents.length} warn={data.warningEvents.length > 0} onClick={() => navigate('/r/core/v1/events')} />
          </Grid>

          {nodeMetrics?.available && nodeMetrics.items.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Node usage
                </Typography>
                <Stack spacing={1}>
                  {nodeMetrics.items.map((n) => (
                    <Box key={n.name} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ width: 220 }} noWrap>
                        {n.name}
                      </Typography>
                      <UsageBar label={`CPU ${formatCpu(n.cpuMilli)}`} pct={n.cpuCapacityMilli ? (n.cpuMilli / n.cpuCapacityMilli) * 100 : undefined} />
                      <UsageBar label={`Mem ${formatBytes(n.memBytes)}`} pct={n.memCapacityBytes ? (n.memBytes / n.memCapacityBytes) * 100 : undefined} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {data.failingPods.length > 0 && (
            <ProblemCard title="Failing pods">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Pod</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Restarts</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.failingPods.map((p) => (
                    <TableRow key={`${p.namespace}/${p.name}`} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/r/core/v1/pods?sel=${ctx}|${p.namespace}|${p.name}`)}>
                      <TableCell>
                        {p.namespace}/{p.name}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={p.reason} />
                      </TableCell>
                      <TableCell>{p.restarts}</TableCell>
                      <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.message}>
                        {p.message ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ProblemCard>
          )}

          {data.unavailableWorkloads.length > 0 && (
            <ProblemCard title="Unavailable workloads">
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {data.unavailableWorkloads.map((w) => (
                  <Chip
                    key={`${w.namespace}/${w.name}`}
                    label={`${w.namespace}/${w.name} ${w.ready}/${w.desired}`}
                    color="warning"
                    variant="outlined"
                    onClick={() => navigate(`/r/apps/v1/deployments?sel=${ctx}|${w.namespace}|${w.name}`)}
                  />
                ))}
              </Stack>
            </ProblemCard>
          )}

          {data.recentRestarts.length > 0 && (
            <ProblemCard title="Recent restarts (1h)">
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {data.recentRestarts.slice(0, 20).map((r) => (
                  <Chip key={`${r.namespace}/${r.pod}/${r.container}`} label={`${r.namespace}/${r.pod} ×${r.restarts}${r.reason ? ` (${r.reason})` : ''}`} variant="outlined" color="warning" />
                ))}
              </Stack>
            </ProblemCard>
          )}

          {data.warningEvents.length > 0 && (
            <ProblemCard title="Warning events (1h)">
              <Stack spacing={0.5}>
                {data.warningEvents.slice(0, 15).map((e, i) => (
                  <Typography key={i} variant="body2">
                    <Typography component="span" variant="caption" color="text.secondary">
                      <AgeCell timestamp={e.lastTimestamp} />
                    </Typography>{' '}
                    <b>{e.reason}</b> {e.involvedKind}/{e.namespace ? `${e.namespace}/` : ''}{e.involvedName} — {e.message}
                    {e.count > 1 ? ` (×${e.count})` : ''}
                  </Typography>
                ))}
              </Stack>
            </ProblemCard>
          )}

          {data.failingPods.length === 0 && data.unavailableWorkloads.length === 0 && data.warningEvents.length === 0 && (
            <Alert severity="success" variant="outlined">
              No problems detected — all workloads healthy.
            </Alert>
          )}
        </>
      )}
    </Box>
  );
}

function StatCard({ label, value, sub, warn, onClick }: { label: string; value: number | string; sub?: string; warn?: boolean; onClick?: () => void }) {
  return (
    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
      <Card variant="outlined" sx={{ cursor: onClick ? 'pointer' : 'default', borderColor: warn ? 'warning.main' : undefined }} onClick={onClick}>
        <CardContent sx={{ py: '12px !important' }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" color={warn ? 'warning.main' : undefined}>
            {value}
            {sub && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {sub}
              </Typography>
            )}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function ProblemCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, pct }: { label: string; pct?: number }) {
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, pct ?? 0)}
        color={(pct ?? 0) > 90 ? 'error' : (pct ?? 0) > 75 ? 'warning' : 'primary'}
        sx={{ flex: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ width: 130 }} color="text.secondary">
        {label}
        {pct !== undefined ? ` (${pct.toFixed(0)}%)` : ''}
      </Typography>
    </Box>
  );
}
