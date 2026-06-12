import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useContexts } from '../../api/queries.js';
import { useClustersStore } from '../../state/clusters.js';
import { useLogPrefsStore, type TsMode } from '../../state/log-prefs.js';
import { TAIL_LINE_OPTIONS, useUiPrefsStore, type RefreshRate, type TableDensity } from '../../state/prefs.js';
import { KubeconfigSection } from './KubeconfigSection.js';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function ClustersSection() {
  const { data: contexts } = useContexts();
  const contextSettings = useClustersStore((s) => s.contextSettings);
  const setContextSetting = useClustersStore((s) => s.setContextSetting);
  const protectByDefault = useUiPrefsStore((s) => s.protectByDefault);
  const setPrefs = useUiPrefsStore((s) => s.set);

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={protectByDefault} onChange={(e) => setPrefs({ protectByDefault: e.target.checked })} />}
        label={
          <Box>
            <Typography variant="body2">Protect clusters by default</Typography>
            <Typography variant="caption" color="text.secondary">
              Destructive actions require typing the resource name unless a cluster is explicitly unprotected
            </Typography>
          </Box>
        }
      />
      <Section title="Clusters">
        <List dense disablePadding>
          {(contexts ?? []).map((c) => {
            const isProtected = contextSettings[c.name]?.protected ?? protectByDefault;
            return (
              <ListItem
                key={c.name}
                disableGutters
                secondaryAction={
                  <Tooltip title={isProtected ? 'Protected: destructive actions require typed confirmation' : 'Mark as protected (e.g. production)'}>
                    <IconButton size="small" onClick={() => setContextSetting(c.name, { protected: !isProtected })}>
                      {isProtected ? <ShieldIcon color="warning" sx={{ fontSize: 18 }} /> : <ShieldOutlinedIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={c.name}
                  secondary={`${c.server ?? c.cluster}${c.kubernetesVersion ? ` · ${c.kubernetesVersion}` : ''}`}
                  slotProps={{ secondary: { sx: { fontSize: 12 } } }}
                />
              </ListItem>
            );
          })}
          {(contexts ?? []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No contexts found in kubeconfig.
            </Typography>
          )}
        </List>
      </Section>
    </Stack>
  );
}

function AppearanceSection() {
  const themeMode = useClustersStore((s) => s.themeMode);
  const toggleTheme = useClustersStore((s) => s.toggleTheme);
  const { tableDensity, monoFontSize } = useUiPrefsStore();
  const setPrefs = useUiPrefsStore((s) => s.set);

  return (
    <Stack spacing={3}>
      <Section title="Theme">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={themeMode}
          onChange={(_, v: 'light' | 'dark' | null) => {
            if (v && v !== themeMode) toggleTheme();
          }}
        >
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
      </Section>
      <Section title="Table density">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={tableDensity}
          onChange={(_, v: TableDensity | null) => {
            if (v) setPrefs({ tableDensity: v });
          }}
        >
          <ToggleButton value="compact">Compact</ToggleButton>
          <ToggleButton value="comfortable">Comfortable</ToggleButton>
        </ToggleButtonGroup>
      </Section>
      <Section title={`Code font size — ${monoFontSize}px`}>
        <Slider
          size="small"
          min={10}
          max={18}
          step={1}
          marks
          value={monoFontSize}
          onChange={(_, v) => setPrefs({ monoFontSize: v as number })}
          sx={{ maxWidth: 320, display: 'block' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Applies to logs, YAML editors, diffs and terminals (new terminal sessions)
        </Typography>
      </Section>
    </Stack>
  );
}

const REFRESH_OPTIONS: Array<{ value: RefreshRate; label: string; hint: string }> = [
  { value: 'fast', label: 'Fast', hint: '½× intervals' },
  { value: 'normal', label: 'Normal', hint: 'default intervals' },
  { value: 'slow', label: 'Slow', hint: '2× intervals' },
  { value: 'off', label: 'Paused', hint: 'no background polling' },
];

function RefreshSection() {
  const refreshRate = useUiPrefsStore((s) => s.refreshRate);
  const setPrefs = useUiPrefsStore((s) => s.set);
  return (
    <Stack spacing={2}>
      <Section title="Background refresh">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={refreshRate}
          onChange={(_, v: RefreshRate | null) => {
            if (v) setPrefs({ refreshRate: v });
          }}
        >
          {REFRESH_OPTIONS.map((o) => (
            <ToggleButton key={o.value} value={o.value}>
              {o.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {REFRESH_OPTIONS.find((o) => o.value === refreshRate)?.hint}. Governs polled data (metrics, events, helm releases, overview) — watched
          resource lists stay live over WebSocket regardless.
        </Typography>
      </Section>
    </Stack>
  );
}

const SHELL_PRESETS = ['auto', 'sh', 'bash'] as const;

function LogsTerminalSection() {
  const { defaultTailLines, defaultShell } = useUiPrefsStore();
  const setPrefs = useUiPrefsStore((s) => s.set);
  const { wrap, tsMode, highlight, setWrap, setTsMode, setHighlight } = useLogPrefsStore();
  const shellPreset = (SHELL_PRESETS as readonly string[]).includes(defaultShell) ? defaultShell : 'custom';

  return (
    <Stack spacing={3}>
      <Section title="Log viewer">
        <Stack spacing={1.5}>
          <FormControl size="small" sx={{ maxWidth: 240 }}>
            <InputLabel id="settings-tail">Tail lines (live view)</InputLabel>
            <Select
              labelId="settings-tail"
              label="Tail lines (live view)"
              value={defaultTailLines}
              onChange={(e) => setPrefs({ defaultTailLines: Number(e.target.value) })}
            >
              {TAIL_LINE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n.toLocaleString()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel control={<Switch checked={wrap} onChange={(e) => setWrap(e.target.checked)} />} label="Wrap long lines" />
          <FormControlLabel
            control={<Switch checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />}
            label="Syntax highlighting (JSON / logfmt / levels)"
          />
          <FormControl size="small" sx={{ maxWidth: 240 }}>
            <InputLabel id="settings-ts">Timestamps</InputLabel>
            <Select labelId="settings-ts" label="Timestamps" value={tsMode} onChange={(e) => setTsMode(e.target.value as TsMode)}>
              <MenuItem value="off">Hidden</MenuItem>
              <MenuItem value="local">Local time</MenuItem>
              <MenuItem value="utc">UTC</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Section>
      <Section title="Terminal">
        <Stack spacing={1.5}>
          <FormControl size="small" sx={{ maxWidth: 240 }}>
            <InputLabel id="settings-shell">Default shell</InputLabel>
            <Select
              labelId="settings-shell"
              label="Default shell"
              value={shellPreset}
              onChange={(e) => {
                const v = e.target.value;
                setPrefs({ defaultShell: v === 'custom' ? '/bin/zsh' : v });
              }}
            >
              <MenuItem value="auto">Auto (bash, falls back to sh)</MenuItem>
              <MenuItem value="sh">sh</MenuItem>
              <MenuItem value="bash">bash</MenuItem>
              <MenuItem value="custom">Custom…</MenuItem>
            </Select>
          </FormControl>
          {shellPreset === 'custom' && (
            <TextField
              size="small"
              label="Shell path"
              value={defaultShell}
              onChange={(e) => setPrefs({ defaultShell: e.target.value })}
              sx={{ maxWidth: 240 }}
            />
          )}
          <Typography variant="caption" color="text.secondary">
            Applies to newly opened exec terminals
          </Typography>
        </Stack>
      </Section>
    </Stack>
  );
}

const TABS = ['Kubeconfig', 'Clusters', 'Appearance', 'Data & refresh', 'Logs & terminal'];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent sx={{ display: 'flex', p: 0, minHeight: 440 }}>
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 180, flexShrink: 0, pt: 1 }}
        >
          {TABS.map((t) => (
            <Tab key={t} label={t} sx={{ alignItems: 'flex-start', textAlign: 'left', minHeight: 40 }} />
          ))}
        </Tabs>
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          {tab === 0 && <KubeconfigSection />}
          {tab === 1 && <ClustersSection />}
          {tab === 2 && <AppearanceSection />}
          {tab === 3 && <RefreshSection />}
          {tab === 4 && <LogsTerminalSection />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
