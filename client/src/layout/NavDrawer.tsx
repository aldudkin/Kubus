import { useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  TextField,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NavLink, useLocation } from 'react-router';
import { BUILTIN_NAV_GROUPS, groupToPath, type ResourceKindInfo } from '@kubedeck/shared';
import { useApiResources } from '../api/queries.js';
import { useClustersStore } from '../state/clusters.js';

const WIDTH = 220;

function kindPath(group: string, version: string, plural: string): string {
  return `/r/${groupToPath(group)}/${version}/${plural}`;
}

function NavEntry({ to, label }: { to: string; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <ListItemButton component={NavLink} to={to} dense selected={active} sx={{ pl: 3, py: 0.25 }}>
      <ListItemText primary={label} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />
    </ListItemButton>
  );
}

export function NavDrawer() {
  const selected = useClustersStore((s) => s.selected);
  const { data: apiResources } = useApiResources(selected[0]);
  const [crdsOpen, setCrdsOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const customKinds = useMemo(() => {
    const custom = (apiResources ?? []).filter((r) => r.custom && r.verbs.includes('list'));
    const byGroup = new Map<string, ResourceKindInfo[]>();
    for (const kind of custom) {
      const list = byGroup.get(kind.group) ?? [];
      list.push(kind);
      byGroup.set(kind.group, list);
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [apiResources]);

  const f = filter.toLowerCase();
  const matches = (label: string) => !f || label.toLowerCase().includes(f);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: WIDTH, position: 'relative', borderRight: 1, borderColor: 'divider', overflowY: 'auto' },
      }}
    >
      <Box sx={{ p: 1 }}>
        <TextField fullWidth placeholder="Filter resources…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </Box>
      <List dense disablePadding sx={{ pb: 4 }}>
        <NavEntry to="/" label="Overview" />
        <NavEntry to="/helm" label="Helm Releases" />
        <NavEntry to="/forwards" label="Port Forwards" />
        <NavEntry to="/diff" label="Diff" />
        {BUILTIN_NAV_GROUPS.map((group) => {
          const visible = group.kinds.filter((k) => matches(k.kind));
          if (!visible.length) return null;
          return (
            <Box key={group.title}>
              <ListSubheader disableSticky sx={{ lineHeight: '28px', bgcolor: 'transparent' }}>
                {group.title}
              </ListSubheader>
              {visible.map((k) => (
                <NavEntry key={k.plural} to={kindPath(k.group, k.version, k.plural)} label={pluralLabel(k.kind)} />
              ))}
            </Box>
          );
        })}
        {customKinds.length > 0 && (
          <>
            <ListItemButton dense onClick={() => setCrdsOpen(!crdsOpen)}>
              <ListItemText primary="Custom Resources" slotProps={{ primary: { variant: 'subtitle2' } }} />
              {crdsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </ListItemButton>
            <Collapse in={crdsOpen || !!f}>
              {customKinds.map(([groupName, kinds]) => {
                const visible = kinds.filter((k) => matches(k.kind));
                if (!visible.length) return null;
                return (
                  <Box key={groupName}>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 3, display: 'block', mt: 0.5 }} noWrap>
                      {groupName}
                    </Typography>
                    {visible.map((k) => (
                      <NavEntry key={`${k.group}/${k.plural}`} to={kindPath(k.group, k.version, k.plural)} label={k.kind} />
                    ))}
                  </Box>
                );
              })}
            </Collapse>
          </>
        )}
      </List>
    </Drawer>
  );
}

function pluralLabel(kind: string): string {
  if (kind === 'Endpoints') return 'Endpoints';
  if (kind.endsWith('Policy')) return `${kind.slice(0, -6)}Policies`;
  if (kind.endsWith('s')) return kind;
  return `${kind}s`;
}
