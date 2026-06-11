import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useClustersStore } from '../state/clusters.js';
import { useDockStore } from '../state/dock.js';
import { ClusterSwitcher } from './ClusterSwitcher.js';
import { NamespaceFilter } from './NamespaceFilter.js';

export function TopBar() {
  const mode = useClustersStore((s) => s.themeMode);
  const toggleTheme = useClustersStore((s) => s.toggleTheme);
  const dock = useDockStore();

  return (
    <AppBar position="static" color="default" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense" sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
          ⎈ Kubedeck
        </Typography>
        <ClusterSwitcher />
        <NamespaceFilter />
        <Box sx={{ flex: 1 }} />
        {dock.tabs.length > 0 && (
          <Tooltip title={dock.open ? 'Hide dock' : `Show dock (${dock.tabs.length} tabs)`}>
            <IconButton onClick={() => dock.setOpen(!dock.open)} color={dock.open ? 'primary' : 'default'}>
              <TerminalIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Toggle theme">
          <IconButton onClick={toggleTheme}>{mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}</IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
