import fs from 'node:fs';

const file = new URL('./public/resources/game.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`v2008 patch point not found: ${label}`);
  source = source.replace(from, to);
}

replaceOnce(`    } else {\n      const airTarget = move * (keys.run ? 510 : 440);\n      const airControl = 1100 * dt;\n      if (move) player.vx += clamp(airTarget - player.vx, -airControl, airControl);\n      else player.vx *= Math.max(0, 1 - dt * 0.18);\n    }\n`, `    } else {\n      if (archAssist) {\n        // Keep an arch jump on a believable arc toward the snow cap instead of\n        // accelerating past it while the run key is still held. This is a light\n        // air-control correction, not a teleport: horizontal velocity changes gradually.\n        const dxToArch = archAssist.x - player.x;\n        const airTarget = clamp(dxToArch * 2.15, -285, 285);\n        const airControl = 820 * dt;\n        player.vx += clamp(airTarget - player.vx, -airControl, airControl);\n      } else {\n        const airTarget = move * (keys.run ? 510 : 440);\n        const airControl = 1100 * dt;\n        if (move) player.vx += clamp(airTarget - player.vx, -airControl, airControl);\n        else player.vx *= Math.max(0, 1 - dt * 0.18);\n      }\n    }\n`, 'arch air control');

replaceOnce(`        archAssist = { x: archTarget.x, top: targetSurface ? targetSurface.top : GROUND - 196, t: 1.2 };\n        player.vy = -790;\n        player.vx = jumpDir ? jumpDir * 430 : (archTarget.x > player.x ? 330 : -330);\n`, `        archAssist = { x: archTarget.x, top: targetSurface ? targetSurface.top : GROUND - 196, t: 1.2 };\n        player.vy = -760;\n        player.vx = clamp((archTarget.x - player.x) * 1.8, -285, 285);\n`, 'arch launch velocity');

replaceOnce(`      // Ground-level traversal is behind the masonry, while the snow cap remains solid.\n      if (phase === 'street' && player.y > GROUND - 95) for (const h of hideSpots) if (Math.abs(player.x - h.x) < 158 && !player.hidden) drawArchForeground(h.x);\n`, `      // Ground-level traversal is behind the masonry, while the snow cap remains solid.\n      // Repaint the arch foreground whenever either Brodsky or an NPC is crossing it;\n      // tying this only to the player caused NPCs to pop in front of the masonry.\n      if (phase === 'street') for (const h of hideSpots) {\n        const playerNearArch = player.y > GROUND - 95 && Math.abs(player.x - h.x) < 158;\n        const npcNearArch = talkers.some(t => Math.abs(t.x - h.x) < 170 && t.y > GROUND - 115);\n        if (playerNearArch || npcNearArch) drawArchForeground(h.x);\n      }\n`, 'arch foreground occlusion');

fs.writeFileSync(file, source);
console.log('Applied v2008 physics patch.');
