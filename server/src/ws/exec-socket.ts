import { PassThrough } from 'node:stream';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { execClientControlSchema, type ExecServerControl } from '@kubedeck/shared';
import type { AppContext } from '../app.js';

/**
 * Interactive shell into a container. One browser socket per terminal.
 * Browser -> server: binary frames = stdin bytes; text frames = JSON control
 * ({op:'resize',cols,rows}). Server -> browser: binary frames = output bytes;
 * text frames = JSON control ({op:'exit'}).
 *
 * Resize plumbing: client-node's Exec checks stdin for `columns`/`rows` and a
 * 'resize' event (terminal-size-queue) and forwards sizes on channel 4.
 */
export function registerExecSocket(app: FastifyInstance, ctx: AppContext): void {
  app.get('/ws/exec', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const q = req.query as Record<string, string | undefined>;
    const ctxName = q.ctx ?? '';
    const namespace = q.namespace ?? '';
    const pod = q.pod ?? '';
    const container = q.container ?? '';
    const shell = q.shell;

    const sendControl = (msg: ExecServerControl) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
    };

    // stdin decorated as a resizable stream for client-node's size queue.
    const stdin = new PassThrough() as PassThrough & { columns: number; rows: number };
    stdin.columns = Number(q.cols ?? 80) || 80;
    stdin.rows = Number(q.rows ?? 24) || 24;

    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const forward = (chunk: Buffer) => {
      if (socket.readyState === socket.OPEN) socket.send(chunk, { binary: true });
    };
    stdout.on('data', forward);
    stderr.on('data', forward);

    socket.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        stdin.write(data);
        return;
      }
      try {
        const parsed = execClientControlSchema.safeParse(JSON.parse(data.toString('utf8')));
        if (parsed.success && parsed.data.op === 'resize') {
          stdin.columns = parsed.data.cols;
          stdin.rows = parsed.data.rows;
          stdin.emit('resize');
        }
      } catch {
        // not JSON: treat text frames as input too (some clients send text)
        stdin.write(data.toString('utf8'));
      }
    });

    void (async () => {
      try {
        const handle = ctx.clusters.get(ctxName);
        const command = shell ? [shell] : ['/bin/sh', '-c', 'command -v bash >/dev/null 2>&1 && exec bash || exec sh'];
        const upstream = await handle.makeExec().exec(namespace, pod, container, command, stdout, stderr, stdin, true, (status) => {
          const code = status.status === 'Success' ? 0 : (status.details?.causes?.find((c) => c.reason === 'ExitCode')?.message ? Number(status.details.causes.find((c) => c.reason === 'ExitCode')!.message) : 1);
          sendControl({ op: 'exit', code, message: status.message });
        });
        upstream.on('close', () => {
          sendControl({ op: 'exit' });
          socket.close();
        });
        socket.on('close', () => {
          try {
            upstream.close();
          } catch {
            /* already closed */
          }
        });
      } catch (err) {
        sendControl({ op: 'exit', code: 1, message: err instanceof Error ? err.message : String(err) });
        socket.close();
      }
    })();
  });
}
