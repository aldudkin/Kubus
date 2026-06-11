import { DiffEditor } from '@monaco-editor/react';
import { useTheme } from '@mui/material/styles';

export function DiffViewer({ left, right }: { left: string; right: string }) {
  const theme = useTheme();
  return (
    <DiffEditor
      language="yaml"
      original={left}
      modified={right}
      theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
      options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12 }}
    />
  );
}
