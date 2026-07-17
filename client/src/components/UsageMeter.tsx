import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

export function usageColor(pct: number): 'success' | 'warning' | 'error' {
  return pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success';
}

/**
 * Compact usage readout: absolute value in a fixed-width slot plus a
 * utilization bar when a reference total (requests or limits) is known.
 * Shared by the list CPU/Memory cells, PodMiniList and the detail
 * container cards.
 */
export function UsageMeter({
  value,
  max,
  format,
  maxHint = 'requested',
  emptyHint,
  placeholder = false,
}: {
  value: number;
  /** Reference total the bar fills against; omitted → no fill. */
  max?: number;
  format: (v: number) => string;
  /** What `max` represents, for the tooltip (e.g. "requested", "limit"). */
  maxHint?: string;
  /** Tooltip when there is no `max`, e.g. "no CPU requests set". */
  emptyHint?: string;
  /**
   * Without `max`: render an empty bar track so columns keep a uniform
   * layout (list cells); off for container cards, whose req/lim caption
   * already explains the missing bar.
   */
  placeholder?: boolean;
}) {
  const text = format(value);
  if (!max && !placeholder) {
    return (
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {text}
      </Typography>
    );
  }
  const pct = max ? (value / max) * 100 : undefined;
  const tip = pct !== undefined ? `${text} of ${format(max!)} ${maxHint} (${pct.toFixed(0)}%)` : `${text} · ${emptyHint ?? 'no requests set'}`;
  return (
    <Tooltip title={tip}>
      <Box sx={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, flexShrink: 0, minWidth: 44 }}>
          {text}
        </Typography>
        {pct !== undefined ? (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, pct))}
            color={usageColor(pct)}
            sx={{ flex: 1, minWidth: 36, height: 5, borderRadius: 999, bgcolor: 'action.hover' }}
          />
        ) : (
          <Box sx={{ flex: 1, minWidth: 36, height: 5, borderRadius: 999, bgcolor: 'action.hover', opacity: 0.5 }} />
        )}
      </Box>
    </Tooltip>
  );
}
