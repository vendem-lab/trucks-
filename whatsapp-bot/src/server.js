import http from 'node:http';

export function createServer({ config, state, log }) {
  return http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/' || url === '/health') {
      const body = {
        status: state.connected ? 'ok' : 'starting',
        connected: Boolean(state.connected),
        uptimeSeconds: Math.round(process.uptime()),
        model: config.groqModel,
        session: config.sessionId
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
      log?.info({ port }, 'Health server listening');
      resolve();
    });
  });
}
