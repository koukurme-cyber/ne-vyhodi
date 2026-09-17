import fs from 'node:fs';
import zlib from 'node:zlib';

const COMPACT_URL = 'https://ne-vyhodi-v20-1-compact-koukurme-6594.vercel.app/';

function decodeGzipBase64(encoded) {
  const normalized = encoded
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return zlib.gunzipSync(Buffer.from(padded, 'base64')).toString('utf8');
}

function extractCompressedHtml(wrapper) {
  // The failed compact Vercel build wrapped the original autonomous HTML in
  // a gzip+base64 loader. Browsers failed on atob(); Node's Buffer decoder is
  // deliberately more tolerant, so recover the original document server-side.
  const candidates = [
    /(['"])(H4sI[A-Za-z0-9+/_=\-\s]+)\1/s,
    /(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(['"])([A-Za-z0-9+/_=\-\s]+)\1\s*;[\s\S]{0,800}?atob\(/s
  ];

  for (const rx of candidates) {
    const match = wrapper.match(rx);
    if (!match) continue;
    const encoded = match[2];
    try {
      const html = decodeGzipBase64(encoded);
      if (/<!doctype html/i.test(html) && /<canvas\b/i.test(html)) return html;
    } catch (error) {
      console.log(`Payload candidate rejected: ${error.message}`);
    }
  }
  return null;
}

async function recoverAutonomousBuild() {
  const response = await fetch(COMPACT_URL, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 NE-VYHODI-Railway-Recovery/20.1' }
  });
  console.log(`Compact source: HTTP ${response.status} ${response.url}`);
  if (!response.ok) throw new Error(`Compact V20.1 source: HTTP ${response.status}`);

  const wrapper = await response.text();
  console.log(`Compact source received: ${wrapper.length} chars`);

  let html = extractCompressedHtml(wrapper);

  // If the source is already the autonomous game rather than its loader,
  // keep it directly. Do not accept the known broken atob wrapper here.
  if (!html && /<!doctype html/i.test(wrapper) && /<canvas\b/i.test(wrapper) && !/\batob\s*\(/.test(wrapper)) {
    html = wrapper;
  }

  if (!html) {
    const hasAtob = /\batob\s*\(/.test(wrapper);
    const hasGzip = wrapper.includes('H4sI');
    throw new Error(`Could not recover autonomous V20.1 HTML (atob=${hasAtob}, gzip=${hasGzip})`);
  }

  if (/\batob\s*\(/.test(html)) {
    console.log('Recovered game contains an atob() occurrence; continuing only because it is inside the original game document, not the hosting wrapper.');
  }

  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/index.html', html, 'utf8');
  console.log(`Recovered autonomous V20.1: ${Buffer.byteLength(html)} bytes`);
}

await recoverAutonomousBuild();
console.log('Railway runtime package prepared.');
