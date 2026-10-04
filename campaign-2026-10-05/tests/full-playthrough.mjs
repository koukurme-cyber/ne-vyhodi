import {Engine} from '../engine.js';
import {chapters} from '../chapters.js';
import fs from 'node:fs';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
const reports=[],events=[];const engine=new Engine((message)=>events.push({chapter:engine.chapter.id,time:engine.total,message}));
const dt=1/60;
for(let index=0;index<chapters.length;index++){
 engine.enter(index);engine.paused=false;const c=engine.chapter;let frames=0,deaths=0,start=engine.total,lastProgress=engine.total,signature='',lastJump=-10;
 while(!engine.state.done&&frames<60*1200){
  const s=engine.state,k={};frames++;
  if(s.dead){deaths++;events.push({chapter:c.id,time:engine.total,message:`Death ${deaths} at ${Math.round(s.x)} arena ${s.arena}`});if(deaths>=4)break;engine.retry();continue;}
  let target=c.steps[s.step]?.[1]??c.width-90;
  if(c.type==='shooter'&&s.step>0&&s.arena<c.arenas){
   if(!s.enemies.length)target=1200+s.arena*(c.width-2300)/(c.arenas-1)-450;
   else {
    const ground=s.enemies.filter(e=>e.ground).sort((a,b)=>Math.abs(s.x-a.x)-Math.abs(s.x-b.x))[0];
    const e=ground||s.enemies[0];const side=s.x<e.x?-1:1;
    let desiredY=e.ground?500:e.y-e.h/2;
    const aimUp=!e.ground;k.up=aimUp;
    const distance=aimUp?Math.max(180,Math.min(380,(474-desiredY)/.6+64)):300;
    target=e.x+side*distance;
    if(Math.abs(target-s.x)>15){k.right=target>s.x;k.left=target<s.x;}
    // Face the target without altering position or combat state.
    if(s.face!==Math.sign(e.x-s.x)){k.right=e.x>s.x;k.left=e.x<s.x;}
    k.action=true;
    const danger=s.enemyShots.some(b=>Math.abs(b.x-s.x)<120&&Math.abs(b.y-(s.y-80))<100&&b.vx*(s.x-b.x)>0);
    if(danger&&s.y>=600&&s.time-lastJump>.95){k.jump=true;lastJump=s.time;}
   }
  }
  if(c.type==='fight'&&s.step===0){target=2200;k.block=s.time%3.2<1.3;k.attack=s.time%3.2>1.35&&s.time%3.2<2.7;}
  if(!s.enemies.length){if(Math.abs(target-s.x)>(s.step>=c.steps.length?5:65)&&!s.aboard){k.right=target>s.x;k.left=target<s.x;}}
  if(['stealth','chase','light'].includes(c.type))k.down=true;
  k.run=!k.down&&engine.stamina>1.2;
  if(c.type==='platform'){
   const ahead=engine.puddles.find(p=>p.x>s.x-5&&p.x-s.x<70);
   if(ahead&&s.y>=600){if(engine.stamina<1.5){k.right=false;k.run=false;}else {k.run=true;k.jump=true;lastJump=s.time;}}
  }
  if(c.type!=='shooter'&&c.type!=='fight'&&Math.abs(target-s.x)<80){
   if(c.type==='post'&&s.step===2){const p=(s.time%2.4)/2.4;k.action=p>.4&&p<.6&&s.cooldown<=0&&!engine.actionLatch;}else k.action=!engine.actionLatch;
  }
  if(c.type==='shooter'&&Math.abs(target-s.x)<80&&(s.step===0||s.arena===c.arenas))k.action=true;
  if(c.type==='fight'&&s.step>0&&Math.abs(target-s.x)<80)k.action=!engine.actionLatch;
  engine.input=k;engine.update(dt);
  const newSignature=`${s.step}:${s.arena}:${s.kills}:${Math.floor(s.x/150)}`;
  if(newSignature!==signature){signature=newSignature;lastProgress=engine.total;}
  if(engine.total-lastProgress>50){events.push({chapter:c.id,time:engine.total,message:`STUCK x=${Math.round(s.x)} step=${s.step} arena=${s.arena} enemies=${s.enemies.map(e=>`${e.kind}:${e.hp}`).join(',')}`});break;}
 }
 const s=engine.state;const report={chapter:index+1,id:c.id,done:s.done,seconds:+(engine.total-start).toFixed(1),deaths,x:Math.round(s.x),step:s.step,arena:s.arena,kills:s.kills,hp:s.hp};reports.push(report);console.log(JSON.stringify(report));if(!s.done)break;
}
fs.writeFileSync(new URL('playthrough-result.json', import.meta.url),JSON.stringify({reports,events,totalSeconds:engine.total},null,2));
console.log('TOTAL',engine.total/60,'minutes');
