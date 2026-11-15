import http from 'node:http';

export function createServer({ config, state }) {
  return http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/' || url === '/health') {
      const body = {
        status: state.connected ? 'ok' : 'starting',
        connected: Boolean(state.connected),
        bot: state.bot ? `@${state.bot.username}` : null,
        uptimeSeconds: Math.round((Date.now() - state.startedAt) / 1000),
        model: config.groqModel
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

export function listen(server, port, log) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      log?.info(`Health server listening on port ${port}`);
      resolve();
    });
  });
}
