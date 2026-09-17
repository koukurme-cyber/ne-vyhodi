import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function readParts(dir, prefix) {
  const parts = fs.readdirSync(dir).filter(name => name.startsWith(prefix)).sort();
  if (!parts.length) throw new Error(`Missing payload: ${dir}/${prefix}`);
  return parts.map(name => fs.readFileSync(path.join(dir, name), 'ascii')).join('');
}

function extractTar(buffer, root = 'public') {
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const str = (a, b) => header.subarray(a, b).toString('utf8').replace(/\0.*$/, '');
    const name = str(0, 100);
    const prefix = str(345, 500);
    const rel = prefix ? `${prefix}/${name}` : name;
    const sizeText = str(124, 136).trim();
    const size = sizeText ? parseInt(sizeText, 8) : 0;
    const type = String.fromCharCode(header[156] || 48);
    const safe = path.normalize(rel).replace(/^([/\\])+/, '');
    const target = path.join(root, safe);
    if (!path.resolve(target).startsWith(path.resolve(root))) throw new Error(`Unsafe tar path: ${rel}`);
    offset += 512;
    if (type === '5') fs.mkdirSync(target, { recursive: true });
    else if (type === '0' || type === '\0') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buffer.subarray(offset, offset + size));
    }
    offset += Math.ceil(size / 512) * 512;
  }
}

const runtimeEncoded = readParts('runtime-payloads-v2006', 'runtime-assets.tgz.b64.');
const runtimeTar = zlib.gunzipSync(Buffer.from(runtimeEncoded, 'base64'));
extractTar(runtimeTar, 'public');
console.log(`Prepared self-contained V20.1 runtime (${runtimeTar.length} tar bytes).`);

const gameEncoded = readParts('code-payloads-v2006', 'game.js.gz.b64.');
const gameBytes = zlib.gunzipSync(Buffer.from(gameEncoded, 'base64'));
fs.mkdirSync('public/resources', { recursive: true });
fs.writeFileSync('public/resources/game.js', gameBytes);
console.log(`Prepared V20.1 game.js (${gameBytes.length} bytes).`);
