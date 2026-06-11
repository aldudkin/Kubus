import { Box, Stack, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts';
import { useMetricsHistory } from '../api/queries.js';
import { formatBytes, formatCpu } from './Sparkline.js';

interface Props {
  ctx: string;
  kind: 'pod' | 'node';
  name: string;
  namespace?: string;
}

export function MetricsChart({ ctx, kind, name, namespace }: Props) {
  const { data } = useMetricsHistory({ ctx, kind, name, namespace });

  if (!data?.available) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        Metrics unavailable — is metrics-server installed in this cluster?
      </Typography>
    );
  }
  if (!data.series.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        Collecting samples… check back in ~20 seconds.
      </Typography>
    );
  }

  const times = data.series.map((s) => new Date(s.t));
  const latest = data.series[data.series.length - 1]!;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Box>
        <Typography variant="subtitle2">CPU — {formatCpu(latest.cpuMilli)}</Typography>
        <LineChart
          height={180}
          series={[{ data: data.series.map((s) => s.cpuMilli), label: 'mCPU', area: true, showMark: false, color: '#7aa2f7' }]}
          xAxis={[{ data: times, scaleType: 'time' }]}
          hideLegend
        />
      </Box>
      <Box>
        <Typography variant="subtitle2">Memory — {formatBytes(latest.memBytes)}</Typography>
        <LineChart
          height={180}
          series={[{ data: data.series.map((s) => s.memBytes / 2 ** 20), label: 'MiB', area: true, showMark: false, color: '#9ece6a' }]}
          xAxis={[{ data: times, scaleType: 'time' }]}
          hideLegend
        />
      </Box>
    </Stack>
  );
}
