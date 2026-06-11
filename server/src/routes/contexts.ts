import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';
import { sendError } from '../util/errors.js';

export function registerContextRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/contexts', async () => ctx.clusters.listContexts());

  app.post<{ Params: { ctx: string } }>('/api/contexts/:ctx/connect', async (req, reply) => {
    try {
      await ctx.clusters.connect(req.params.ctx);
      return ctx.clusters.listContexts();
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });

  app.delete<{ Params: { ctx: string } }>('/api/contexts/:ctx/connect', async (req) => {
    ctx.clusters.disconnect(req.params.ctx);
    return ctx.clusters.listContexts();
  });

  app.get<{ Params: { ctx: string } }>('/api/contexts/:ctx/api-resources', async (req, reply) => {
    try {
      return await ctx.clusters.get(req.params.ctx).discovery.getResources();
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });

  app.get<{ Params: { ctx: string } }>('/api/contexts/:ctx/namespaces', async (req, reply) => {
    try {
      const handle = ctx.clusters.get(req.params.ctx);
      const { watcher, release } = handle.watchers.acquire('', 'v1', 'namespaces');
      try {
        await watcher.ready();
        return watcher
          .items()
          .map((ns) => ns.metadata.name)
          .sort();
      } finally {
        release();
      }
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });

  app.get<{ Params: { ctx: string }; Querystring: { involvedName?: string; involvedKind?: string; namespace?: string } }>('/api/contexts/:ctx/events', async (req, reply) => {
    try {
      const handle = ctx.clusters.get(req.params.ctx);
      const { involvedName, involvedKind, namespace } = req.query;
      const selectors: string[] = [];
      if (involvedName) selectors.push(`involvedObject.name=${involvedName}`);
      if (involvedKind) selectors.push(`involvedObject.kind=${involvedKind}`);
      const query = new URLSearchParams();
      if (selectors.length) query.set('fieldSelector', selectors.join(','));
      const path = namespace ? `/api/v1/namespaces/${encodeURIComponent(namespace)}/events` : '/api/v1/events';
      const result = await handle.raw.json<{ items?: unknown[] }>(`${path}?${query.toString()}`);
      return { items: result.items ?? [] };
    } catch (err) {
      sendError(reply, err);
      return reply;
    }
  });
}
