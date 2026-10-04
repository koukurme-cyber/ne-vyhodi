const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const elements = new Map();
const ctx = new Proxy({ getImageData: () => ({ data: new Uint8Array(512 * 512 * 4).fill(255) }), createLinearGradient: () => ({addColorStop(){}}) }, {get:(o,k)=>o[k] || (()=>{})});
function el(id) { if (!elements.has(id)) elements.set(id, {width:960,height:540,hidden:true,textContent:'',disabled:false, addEventListener(){}, getContext:()=>ctx,classList:{remove(){},add(){},toggle(){}}});return elements.get(id); }
class MockImage {set src(v){this.width=1536;this.height=1024;queueMicrotask(()=>this.onload());}}
const context={document:{getElementById:el,createElement:()=>el('scratch'),querySelectorAll:()=>[],addEventListener(){},hidden:false},Image:MockImage,performance:{now:()=>0},matchMedia:()=>({matches:false}),window:{addEventListener(){}},requestAnimationFrame(){},console,setTimeout,clearTimeout,queueMicrotask};
vm.createContext(context);
let source=fs.readFileSync(path.join(__dirname, '..', 'game.js'),'utf8');
source=source.replace('  loadAssets();\n  requestAnimationFrame(frame);','  globalThis.test = {world, keys, touch, reset, action, update, clearInput, selectLevel, continueRun, levels, draw};\n  loadAssets();\n  requestAnimationFrame(frame);');
vm.runInContext(source,context);
setImmediate(()=>{
 const t=context.test;
 const step=(seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)t.update(1/120)};
 t.reset();t.keys.add('KeyD');step(3.9);t.keys.clear();t.action();assert(t.world.player.hidden,'second hide is reachable');step(4.5);t.action();assert(!t.world.player.hidden);t.keys.add('KeyD');step(2.2);assert.equal(t.world.state,'won');
 t.reset();t.keys.add('KeyD');step(6);assert.equal(t.world.state,'lost');
 t.reset();t.world.player.x=313;t.action();assert(t.world.player.hidden);t.action();assert(!t.world.player.hidden);assert.equal(t.world.player.x,313);
 t.reset();t.world.npc.state='chase';t.world.npc.x=700;t.world.npc.dir=-1;t.world.npc.lastSeenX=78;t.world.player.x=78;step(.8);assert.equal(t.world.npc.state,'search');t.world.player.x=313;t.action();step(11);assert.equal(t.world.npc.state,'patrol');
 t.reset();t.world.player.x=632;t.world.npc.x=710;t.world.npc.dir=-1;t.world.npc.state='chase';t.world.npc.lastSeenX=632;t.action();step(.1);assert.equal(t.world.npc.state,'search');step(4);assert.equal(t.world.npc.state,'patrol');assert(t.world.player.hidden);
 t.reset();t.touch.right=true;t.touch.run=true;step(.2);const x=t.world.player.x;t.clearInput();step(.5);assert.equal(t.world.player.x,x);
 t.reset();t.world.player.x=280;t.action();t.update(.01);assert.equal(el('prompt').hidden,false);t.reset();t.world.player.x=280;t.update(.01);assert.equal(el('prompt').hidden,false);
 t.selectLevel(1);t.keys.add('KeyD');step(1.55);t.keys.clear();t.action();assert(t.world.player.hidden);step(6.55);t.action();t.keys.add('KeyD');step(6.7);assert.equal(t.world.state,'won');t.continueRun();assert.equal(t.world.npcs.length,2);assert.equal(t.world.state,'play');
 t.selectLevel(2);t.keys.add('KeyD');step(1.5);t.keys.clear();t.action();assert(t.world.player.hidden);step(3.4);t.action();t.keys.add('KeyD');step(3.1);t.keys.clear();t.action();assert(t.world.player.hidden);step(7.6);t.action();t.keys.add('KeyD');t.touch.run=true;step(4.1);assert.equal(t.world.state,'won');t.continueRun();assert.equal(t.world.npcs.length,1);assert.equal(el('level-title').textContent,'1 / 3 · Двор');
 t.reset();t.world.player.x=650;t.world.npc.x=760;t.world.npc.dir=-1;step(.2);assert(t.world.npc.speechTimer>0);assert.equal(el('speech').textContent,'Иосиф Александрович, я тут стих написала');assert.equal(t.world.state,'play');t.keys.add('KeyD');step(2);assert.equal(t.world.state,'lost');assert.equal(el('screen-text').textContent,'«Иосиф Александрович, я тут стих написала»');
 console.log('PASS: all three levels and transitions; speech before capture; hide/exit/win; conversation loss; both hide actions; lose distant target/search/patrol; hiding during chase; input reset; repeated prompts');
 clearTimeout(0);process.exit(0);
});
