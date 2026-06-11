import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import Editor from '@monaco-editor/react';
import { useTheme } from '@mui/material/styles';

interface Props {
  value: string;
  readOnly?: boolean;
  onApply?: (yamlText: string) => Promise<void>;
  applyLabel?: string;
  /** Extra toolbar content (e.g. reveal-secrets toggle). */
  toolbar?: React.ReactNode;
}

export function YamlEditor({ value, readOnly, onApply, applyLabel = 'Apply', toolbar }: Props) {
  const theme = useTheme();
  const [text, setText] = useState(value);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(value);
    setError(undefined);
  }, [value]);

  const dirty = text !== value;

  const apply = async () => {
    if (!onApply) return;
    setBusy(true);
    setError(undefined);
    try {
      await onApply(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {(onApply || toolbar) && (
        <Stack direction="row" spacing={1} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', alignItems: 'center', flexShrink: 0 }}>
          {toolbar}
          <Box sx={{ flex: 1 }} />
          {onApply && (
            <>
              <Button disabled={!dirty || busy} onClick={() => setText(value)}>
                Reset
              </Button>
              <Button variant="contained" disabled={!dirty || busy} onClick={() => void apply()}>
                {busy ? 'Applying…' : applyLabel}
              </Button>
            </>
          )}
        </Stack>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(undefined)} sx={{ borderRadius: 0, flexShrink: 0 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          language="yaml"
          value={text}
          onChange={(v) => setText(v ?? '')}
          theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly: readOnly ?? !onApply,
            minimap: { enabled: false },
            fontSize: 12,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
          }}
        />
      </Box>
    </Box>
  );
}
