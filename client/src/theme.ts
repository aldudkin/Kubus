import { createTheme, type Theme } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#7aa2f7' : '#2962ff' },
      secondary: { main: '#26a69a' },
      background:
        mode === 'dark'
          ? { default: '#16161e', paper: '#1a1b26' }
          : { default: '#f5f6fa', paper: '#ffffff' },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 13,
    },
    components: {
      MuiAppBar: { defaultProps: { elevation: 0 } },
      MuiPaper: { defaultProps: { elevation: 0 } },
      MuiButton: { defaultProps: { size: 'small' }, styleOverrides: { root: { textTransform: 'none' } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiChip: { defaultProps: { size: 'small' } },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  });
}
