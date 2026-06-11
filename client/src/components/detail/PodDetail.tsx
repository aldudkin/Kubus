import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { KubeObject } from '@kubedeck/shared';
import { GenericDetail } from './GenericDetail.js';
import { StatusChip } from '../StatusChip.js';
import { podSummary } from '../../kube-display.js';

interface ContainerSpec {
  name: string;
  image?: string;
  ports?: Array<{ containerPort: number; protocol?: string }>;
}

interface ContainerStatus {
  name: string;
  ready?: boolean;
  restartCount?: number;
  state?: Record<string, { reason?: string }>;
}

export function PodDetail({ obj, ctx }: { obj: KubeObject; ctx: string }) {
  const spec = obj.spec as { containers?: ContainerSpec[]; initContainers?: ContainerSpec[]; nodeName?: string } | undefined;
  const status = obj.status as { podIP?: string; containerStatuses?: ContainerStatus[]; qosClass?: string } | undefined;
  const summary = podSummary(obj);
  const statusByName = new Map((status?.containerStatuses ?? []).map((c) => [c.name, c]));

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ px: 2, pt: 2, flexWrap: 'wrap' }}>
        <StatusChip status={summary.status} />
        <Chip label={`Ready ${summary.ready}`} variant="outlined" />
        <Chip label={`Restarts ${summary.restarts}`} variant="outlined" />
        {status?.podIP && <Chip label={`IP ${status.podIP}`} variant="outlined" />}
        {spec?.nodeName && <Chip label={`Node ${spec.nodeName}`} variant="outlined" />}
        {status?.qosClass && <Chip label={`QoS ${status.qosClass}`} variant="outlined" />}
      </Stack>
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Containers
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Restarts</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...(spec?.initContainers ?? []).map((c) => ({ ...c, init: true })), ...(spec?.containers ?? []).map((c) => ({ ...c, init: false }))].map((c) => {
              const st = statusByName.get(c.name);
              const stateKey = st?.state ? Object.keys(st.state)[0] : undefined;
              const reason = stateKey ? (st!.state![stateKey]?.reason ?? stateKey) : '';
              return (
                <TableRow key={c.name}>
                  <TableCell>
                    {c.name}
                    {c.init && <Chip label="init" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.image}>
                    {c.image}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={reason === 'running' ? 'Running' : reason} />
                  </TableCell>
                  <TableCell>{st?.restartCount ?? 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <GenericDetail obj={obj} ctx={ctx} />
    </Box>
  );
}
