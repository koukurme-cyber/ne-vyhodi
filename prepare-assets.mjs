const ASSET_ZIP_URL = 'https://ne-vyhodi-v40-jtlf89.v2.appdeploy.ai/resources/ne-vyhodi-v40-assets.zip';

function listZipEntries(buffer) {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const min = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP EOCD not found');

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(offset) !== centralSignature) throw new Error(`Bad central directory entry at ${offset}`);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    entries.push({ name, method, compressedSize, uncompressedSize });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const response = await fetch(ASSET_ZIP_URL, { redirect: 'follow' });
console.log(`Asset bridge: HTTP ${response.status} ${response.url}`);
if (!response.ok) throw new Error(`Asset bridge failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
console.log(`Asset bridge downloaded: ${bytes.length} bytes`);
const entries = listZipEntries(bytes);
console.log(`ZIP entries: ${entries.length}`);
for (const entry of entries) console.log(`ZIP ${entry.uncompressedSize}\t${entry.name}`);
console.log('Diagnostic only: existing public files left unchanged.');
