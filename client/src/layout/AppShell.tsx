import { Box } from '@mui/material';
import { Outlet } from 'react-router';
import { TopBar } from './TopBar.js';
import { NavDrawer } from './NavDrawer.js';
import { BottomDock } from './BottomDock.js';
import { useDockStore } from '../state/dock.js';

export function AppShell() {
  const dockOpen = useDockStore((s) => s.open);
  const dockHeight = useDockStore((s) => s.height);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TopBar />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <NavDrawer />
        <Box component="main" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </Box>
          <Box sx={{ height: dockOpen ? dockHeight : 0, flexShrink: 0, transition: 'height 120ms ease' }}>
            <BottomDock />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
