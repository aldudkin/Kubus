import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, IconButton, TextField, ToggleButton, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { LogServerMessage } from '@kubedeck/shared';
import { wsUrl } from '../api/http.js';
import type { LogsTab } from '../state/dock.js';

interface LogLine {
  pod: string;
  container: string;
  ts?: string;
  line: string;
}

const POD_COLORS = ['#7aa2f7', '#9ece6a', '#e0af68', '#f7768e', '#bb9af7', '#7dcfff', '#ff9e64', '#73daca'];
const MAX_LINES = 20_000;
const ROW_HEIGHT = 20;

export function LogViewer({ tab }: { tab: LogsTab }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState('');
  const [follow, setFollow] = useState(true);
  const [statusText, setStatusText] = useState('connecting…');
  const bufferRef = useRef<LogLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(400);

  const podColor = useMemo(() => {
    const map = new Map<string, string>();
    tab.pods.forEach((pod, i) => map.set(pod, POD_COLORS[i % POD_COLORS.length]!));
    return map;
  }, [tab.pods]);

  useEffect(() => {
    const ws = new WebSocket(
      wsUrl('/ws/logs', {
        ctx: tab.ctx,
        namespace: tab.namespace,
        pods: tab.pods.join(','),
        container: tab.container ?? '',
        previous: tab.previous ?? false,
        follow: true,
        tailLines: 500,
      }),
    );
    // Batch incoming lines into 120ms renders.
    const flush = window.setInterval(() => {
      if (!bufferRef.current.length) return;
      const fresh = bufferRef.current;
      bufferRef.current = [];
      setLines((prev) => {
        const next = [...prev, ...fresh];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    }, 120);

    ws.onopen = () => setStatusText('streaming');
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as LogServerMessage;
        if (msg.op === 'line') {
          bufferRef.current.push({ pod: msg.pod, container: msg.container, ts: msg.ts, line: msg.line });
        } else if (msg.op === 'pod-status' && msg.state === 'error') {
          bufferRef.current.push({ pod: msg.pod, container: msg.container, line: `⚠ ${msg.message ?? 'stream error'}` });
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => setStatusText('disconnected');
    return () => {
      window.clearInterval(flush);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  const visible = useMemo(() => {
    if (!filter) return lines;
    try {
      const re = new RegExp(filter, 'i');
      return lines.filter((l) => re.test(l.line) || re.test(l.pod));
    } catch {
      const f = filter.toLowerCase();
      return lines.filter((l) => l.line.toLowerCase().includes(f) || l.pod.toLowerCase().includes(f));
    }
  }, [lines, filter]);

  // Auto-scroll on new lines while following.
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, follow]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setViewHeight(el.clientHeight);
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (!atBottom && follow) setFollow(false);
  }, [follow]);

  const download = () => {
    const text = visible.map((l) => `${l.ts ?? ''} [${l.pod}/${l.container}] ${l.line}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tab.title.replace(/\s+/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Simple windowed rendering — only rows near the viewport mount.
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 20);
  const end = Math.min(visible.length, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + 20);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <TextField placeholder="Filter (regex)…" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ width: 240 }} />
        <Chip label={`${visible.length} lines`} variant="outlined" />
        <Typography variant="caption" color="text.secondary">
          {statusText}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={follow ? 'Pause auto-scroll' : 'Resume auto-scroll'}>
          <ToggleButton value="follow" selected={follow} size="small" onChange={() => setFollow(!follow)} sx={{ p: 0.5 }}>
            {follow ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </ToggleButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton size="small" onClick={() => setLines([])}>
            <DeleteSweepIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton size="small" onClick={download}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        ref={scrollRef}
        onScroll={onScroll}
        sx={{ flex: 1, overflow: 'auto', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, bgcolor: '#16161e', color: '#c0caf5' }}
      >
        <Box sx={{ height: visible.length * ROW_HEIGHT, position: 'relative' }}>
          {visible.slice(start, end).map((l, i) => {
            const idx = start + i;
            return (
              <Box
                key={idx}
                sx={{ position: 'absolute', top: idx * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT, px: 1, whiteSpace: 'pre', display: 'flex', gap: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
              >
                {tab.pods.length > 1 && (
                  <Box component="span" sx={{ color: podColor.get(l.pod) ?? '#888', flexShrink: 0 }}>
                    {l.pod}
                  </Box>
                )}
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.line}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
