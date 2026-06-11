import { Box, IconButton, Tab, Tabs, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TerminalIcon from '@mui/icons-material/Terminal';
import SubjectIcon from '@mui/icons-material/Subject';
import { useDockStore } from '../state/dock.js';
import { TerminalPane } from '../components/TerminalPane.js';
import { LogViewer } from '../components/LogViewer.js';

export function BottomDock() {
  const { tabs, activeId, open, setActive, closeTab, setOpen, height, setHeight } = useDockStore();
  if (!open || tabs.length === 0) return null;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;
    const onMove = (ev: MouseEvent) => setHeight(startHeight + (startY - ev.clientY));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box onMouseDown={startResize} sx={{ height: 4, cursor: 'row-resize', flexShrink: 0, '&:hover': { bgcolor: 'primary.main' } }} />
      <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={activeId ?? false} onChange={(_e, v) => setActive(v as string)} variant="scrollable" sx={{ minHeight: 32, flex: 1 }}>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              sx={{ minHeight: 32, py: 0, textTransform: 'none' }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {tab.kind === 'terminal' ? <TerminalIcon sx={{ fontSize: 14 }} /> : <SubjectIcon sx={{ fontSize: 14 }} />}
                  {tab.title}
                  <IconButton
                    component="span"
                    size="small"
                    sx={{ p: 0.25, ml: 0.5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
        <Tooltip title="Minimize">
          <IconButton size="small" onClick={() => setOpen(false)}>
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {tabs.map((tab) => (
          <Box key={tab.id} sx={{ position: 'absolute', inset: 0, display: tab.id === activeId ? 'block' : 'none' }}>
            {tab.kind === 'terminal' ? <TerminalPane tab={tab} active={tab.id === activeId} /> : <LogViewer tab={tab} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
