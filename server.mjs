import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
const mime = new Map([
  ['.html','text/html; charset=utf-8'], ['.js','text/javascript; charset=utf-8'], ['.css','text/css; charset=utf-8'],
  ['.txt','text/plain; charset=utf-8'], ['.json','application/json; charset=utf-8'], ['.png','image/png'],
  ['.jpg','image/jpeg'], ['.jpeg','image/jpeg'], ['.webp','image/webp'], ['.avif','image/avif']
]);

http.createServer((req,res)=>{
  const u = new URL(req.url || '/', 'http://localhost');
  if (u.pathname === '/health') { res.writeHead(200, {'content-type':'text/plain'}); res.end('ok'); return; }
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')) { res.writeHead(403); res.end('forbidden'); return; }
  fs.stat(file,(err,stat)=>{
    if (err || !stat.isFile()) { res.writeHead(404, {'content-type':'text/plain'}); res.end('not found'); return; }
    const ext=path.extname(file).toLowerCase();
    const headers={'content-type': mime.get(ext)||'application/octet-stream'};
    if (!['.html','.js','.txt'].includes(ext)) headers['cache-control']='public, max-age=31536000, immutable';
    res.writeHead(200,headers); fs.createReadStream(file).pipe(res);
  });
}).listen(port,'0.0.0.0',()=>console.log(`NE VYHODI listening on ${port}`));
