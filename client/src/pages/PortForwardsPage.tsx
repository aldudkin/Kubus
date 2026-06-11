import { Box, Chip, IconButton, Link, Tooltip, Typography } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import type { GridColDef } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import type { PortForwardInfo } from '@kubedeck/shared';
import { usePortForwards, useStopPortForward } from '../api/queries.js';
import { StatusChip } from '../components/StatusChip.js';

export function PortForwardsPage() {
  const { data, isLoading } = usePortForwards();
  const stop = useStopPortForward();

  const columns: GridColDef<PortForwardInfo>[] = [
    {
      field: 'local',
      headerName: 'Local',
      width: 160,
      valueGetter: (_v, row) => row.localPort,
      renderCell: (p) => (
        <Link href={`http://localhost:${p.row.localPort}`} target="_blank" rel="noreferrer">
          localhost:{p.row.localPort}
        </Link>
      ),
    },
    { field: 'target', headerName: 'Target', flex: 1, minWidth: 220, valueGetter: (_v, row) => `${row.kind}/${row.namespace}/${row.name}:${row.remotePort}` },
    { field: 'pod', headerName: 'Pod', flex: 1, minWidth: 180, valueGetter: (_v, row) => row.targetPod ?? '' },
    { field: 'ctx', headerName: 'Cluster', width: 150, valueGetter: (_v, row) => row.ctx },
    {
      field: 'state',
      headerName: 'State',
      width: 110,
      renderCell: (p) => (
        <Tooltip title={p.row.error ?? ''}>
          <span>
            <StatusChip status={p.row.state === 'active' ? 'Ready' : 'Error'} />
          </span>
        </Tooltip>
      ),
    },
    { field: 'connections', headerName: 'Conns', width: 70, type: 'number', valueGetter: (_v, row) => row.connections },
    {
      field: '_stop',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (p) => (
        <Tooltip title="Stop forward">
          <IconButton size="small" color="error" onClick={() => stop.mutate(p.row.id)}>
            <StopIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6">Port Forwards</Typography>
        <Chip label={`${data?.length ?? 0} active`} variant="outlined" />
      </Box>
      {(data?.length ?? 0) === 0 && !isLoading ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No active forwards. Start one from a Pod or Service row menu (⋮ → Port forward).
        </Typography>
      ) : (
        <DataGrid rows={data ?? []} columns={columns} loading={isLoading} getRowId={(r) => r.id} density="compact" sx={{ border: 0 }} />
      )}
    </Box>
  );
}
