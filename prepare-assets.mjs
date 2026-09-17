import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ORIGIN = 'https://ne-vyhodi-brodsky.koukurme.chatgpt.site/';
const downloadPaths = [
  "assets/npc/clerk/idle.png",
  "assets/npc/clerk/talk.png",
  "assets/npc/drunk/drunk1.png",
  "assets/npc/drunk/drunk2.png",
  "assets/npc/drunk/drunk3.png",
  "assets/npc/fish_stall.png",
  "assets/npc/rurik/idle.png",
  "assets/npc/rurik/point.png",
  "assets/npc/rurik/talk.png",
  "assets/npc/somna/somna1.png",
  "assets/npc/somna/somna2.png",
  "assets/npc/somna/somna3.png",
  "assets/npc/somna/somna4.png",
  "assets/npc/vendor.png",
  "assets/player/crouch/crouch_01.png",
  "assets/player/crouch/crouch_walk_01.png",
  "assets/player/hide/hide_01.png",
  "assets/player/idle/idle_01.png",
  "assets/player/idle/idle_02.png",
  "assets/player/interact/books_01.png",
  "assets/player/interact/gramophone_01.png",
  "assets/player/interact/newspaper_01.png",
  "assets/player/interact/pickup_01.png",
  "assets/player/interact/suitcase_01.png",
  "assets/player/jump/jump_01.png",
  "assets/player/jump/landing_01.png",
  "assets/player/run/run_01.png",
  "assets/player/run/run_02.png",
  "assets/player/run/run_03.png",
  "assets/player/walk/walk_01.png",
  "assets/player/walk/walk_02.png",
  "assets/player/walk/walk_03.png",
  "assets/room/book.png",
  "assets/room/chair.png",
  "assets/room/cigarette.png",
  "assets/room/door_closed.png",
  "assets/room/interior-v17.png",
  "assets/talker/talk/talk_taunt_01.png",
  "assets/talker/talk/talk_taunt_02.png",
  "assets/talker/walk/walk_01.png",
  "assets/talker/walk/walk_02.png",
  "assets/talker/walk/walk_03.png",
  "assets/talker/walk/walk_04.png",
  "assets/world/arch.png",
  "assets/world/bench.png",
  "assets/world/city.jpg",
  "assets/world/crate.png",
  "assets/world/electric_bus.png",
  "assets/world/ground_1.png",
  "assets/world/ground_2.png",
  "assets/world/newspaper.png",
  "assets/world/pilgrims.png",
  "assets/world/pyaterochka_sign.png",
  "assets/world/storefront-v17.png",
  "assets/world/tram.png",
  "resources/art-v1720/brodsky-caviar.png",
  "resources/art-v1720/brodsky-caviar.webp",
  "resources/art-v1720/brodsky-phone.png",
  "resources/art-v1720/brodsky-phone.webp",
  "resources/art-v1720/clerk-handoff.png",
  "resources/art-v1720/clerk-handoff.webp",
  "resources/art-v1720/climbable-arch.png",
  "resources/art-v1720/climbable-arch.webp",
  "resources/art-v1720/courtyard.png",
  "resources/art-v1720/courtyard.webp",
  "resources/art-v1720/fish-seller-idle.png",
  "resources/art-v1720/fish-seller-idle.webp",
  "resources/art-v1720/fish-seller-talk.png",
  "resources/art-v1720/fish-seller-talk.webp",
  "resources/art-v1720/fish-stall.png",
  "resources/art-v1720/fish-stall.webp",
  "resources/art-v1720/news-counter.png",
  "resources/art-v1720/news-counter.webp",
  "resources/art-v1720/passage-courtyard.png",
  "resources/art-v1720/passage-courtyard.webp",
  "resources/art-v1720/tram-street.png",
  "resources/art-v1720/tram-street.webp",
  "resources/art-v1721/player/crouch/crouch_01.webp",
  "resources/art-v1721/player/crouch/crouch_walk_01.webp",
  "resources/art-v1721/player/hide/hide_01.webp",
  "resources/art-v1721/player/idle/idle_01.webp",
  "resources/art-v1721/player/idle/idle_02.webp",
  "resources/art-v1721/player/interact/books_01.webp",
  "resources/art-v1721/player/interact/gramophone_01.webp",
  "resources/art-v1721/player/interact/newspaper_01.webp",
  "resources/art-v1721/player/interact/pickup_01.webp",
  "resources/art-v1721/player/interact/suitcase_01.webp",
  "resources/art-v1721/player/jump/jump_01.webp",
  "resources/art-v1721/player/jump/landing_01.webp",
  "resources/art-v1721/player/run/run_01.webp",
  "resources/art-v1721/player/run/run_02.webp",
  "resources/art-v1721/player/run/run_03.webp",
  "resources/art-v1721/player/walk/walk_01.webp",
  "resources/art-v1721/player/walk/walk_02.webp",
  "resources/art-v1721/player/walk/walk_03.webp",
  "resources/art-v1721/rooftop-route.webp",
  "resources/art-v1800/advert-star.webp",
  "resources/art-v1800/boiler-fight.webp",
  "resources/art-v1800/cage-hall.webp",
  "resources/art-v1800/christmas-tram.webp",
  "resources/art-v1800/embankment-vo.webp",
  "resources/art-v1800/final-chase.webp",
  "resources/art-v1800/luggage-hall.webp",
  "resources/art-v1800/pawnshop.webp",
  "resources/art-v1800/player/shoot-straight.webp",
  "resources/art-v1800/player/shoot-up.webp",
  "resources/art-v1800/post-office.webp",
  "resources/art-v1800/vertical-courtyards.webp"
];

async function ensureDownload(rel) {
  const target = path.join('public', rel);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const response = await fetch(new URL(rel, ORIGIN));
  if (!response.ok) throw new Error(`Asset ${rel}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Asset ${rel}: empty response`);
  fs.writeFileSync(target, bytes);
  console.log(`Fetched ${rel} (${bytes.length} bytes)`);
}

async function rebuildPayload(prefix, target) {
  const dir = 'asset-payloads';
  const parts = fs.readdirSync(dir).filter(name => name.startsWith(prefix + '.')).sort();
  if (!parts.length) throw new Error(`Missing payload: ${prefix}`);
  const encoded = parts.map(name => fs.readFileSync(path.join(dir, name), 'ascii')).join('');
  const bytes = Buffer.from(encoded, 'base64');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  console.log(`Prepared ${target} (${bytes.length} bytes)`);
}

function rebuildGzipPayload(prefix, target) {
  const dir = 'code-payloads';
  const parts = fs.readdirSync(dir).filter(name => name.startsWith(prefix + '.')).sort();
  if (!parts.length) throw new Error(`Missing code payload: ${prefix}`);
  const encoded = parts.map(name => fs.readFileSync(path.join(dir, name), 'ascii')).join('');
  const compressed = Buffer.from(encoded, 'base64');
  const bytes = zlib.gunzipSync(compressed);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  console.log(`Prepared ${target} (${bytes.length} bytes)`);
}

await Promise.all(downloadPaths.map(ensureDownload));
rebuildGzipPayload('game.js.gz.b64', 'public/resources/game.js');
console.log('All runtime assets prepared.');
