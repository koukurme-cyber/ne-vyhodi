import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
const types = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.webp':'image/webp', '.avif':'image/avif', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml'
};
http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'text/plain; charset=utf-8'}); res.end('ok'); return; }
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const requested = pathname === '/' ? '/index.html' : pathname;
  const file = path.normalize(path.join(root, requested));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); res.end('Not found'); return;
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {'content-type': types[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'});
  fs.createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`NE VYHODI V20.3 listening on ${port}`));
