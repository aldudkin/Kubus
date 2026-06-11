import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const { app } = await buildApp(config);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

const url = `http://${config.host}:${config.port}/?token=${config.token}`;
app.log.info(`Kubedeck ready at ${url}`);

if (config.openBrowser) {
  const { default: open } = await import('open');
  await open(url).catch(() => {
    /* headless environments: URL is already logged */
  });
}
