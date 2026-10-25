'use strict';
const $=id=>document.getElementById(id);
const keys=new Set();const pointers=new Map();
const state={camera:0,x:.5,velocity:0,bank:0,capture:null,pois:[],delay:2.5,lastDangerAt:0,lastSide:0,burst:0,avoided:0,playing:true,paused:false,time:0,day:1,dayTime:0,fed:false,food:null,transition:null,labelTime:0};
const openingDialogue=document.querySelector('#opening-speech p').innerHTML;
let opening=null;
let ending=null;
let hungerFade=null;
let last=0;const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function clearInput(){keys.clear();pointers.clear();$('left').classList.remove('held');$('right').classList.remove('held');}
function direction(){return (keys.has('ArrowRight')||[...pointers.values()].includes(1)?1:0)-(keys.has('ArrowLeft')||[...pointers.values()].includes(-1)?1:0);}
const random=(min,max)=>min+Math.random()*(max-min);
function spawn(side){
 if(state.transition||!$('result').hidden)return;
 if(!state.playing)reset();if(state.paused)setPaused(false);
 const upper=Math.random()<.30;
 const broad=!upper&&Math.random()>.30;
 const reach=broad?random(.48,.68):random(.20,.34);
 const finalSize=.96; // Same physical scoop size at the closest depth for every trajectory.
 let duration=random(3.3,4.9);
 // Closely spaced entrances can overlap; full-width evasions still have time to reverse.
 if(broad){duration=Math.max(duration,state.lastDangerAt+2.8-state.time);state.lastDangerAt=state.time+duration;}
 const el=document.createElement('img');el.className='poi';el.src=side<0?'assets/poi-left.png':'assets/poi-right.png';el.alt=side<0?'左から迫るポイ':'右から迫るポイ';$('nets').append(el);
 state.pois.push({side,upper,age:0,duration,reach,finalSize,ratio:side<0?828/741:1585/1500,el});state.lastSide=side;
}
function scheduleNext(){state.burst++;if(state.burst>=3){state.burst=0;state.delay=random(2.1,3.1);}else state.delay=Math.random()<.65?random(.65,1.15):random(1.5,2.1);}
function reset(){resetDays();Object.assign(state,{camera:0,x:.5,velocity:0,bank:0,capture:null,pois:[],delay:2.5,lastDangerAt:0,lastSide:0,burst:0,avoided:0,playing:true,paused:false,time:0});clearInput();$('nets').replaceChildren();$('result').hidden=$('resume').hidden=$('capture').hidden=true;$('fish').hidden=false;$('capture-white').style.opacity='0';render();}
function setPaused(value){if(!state.playing)return;state.paused=value;clearInput();$('resume').hidden=!value;}
function poiGeometry(poi){
 if(poi.retreat){
  const t=Math.min(1,poi.exitAge/.48),ease=t*t;
  const size=poi.exitStart.size;
  const x=poi.exitStart.x+poi.side*(poi.exitStart.size+.65)*ease;
  return {x,y:poi.exitStart.y,size,t,exiting:true};
 }
 const t=Math.min(1,poi.age/poi.duration),eased=t*t*(3-2*t),size=.24+(poi.finalSize-.24)*eased;
 const edge=-.20+(poi.reach+.20)*eased;
 const x=poi.side<0?Math.min(edge-size/2,size/2-.035):Math.max(1-edge+size/2,1-size/2+.035);
 // Approach the fish's actual depth. Capture is determined only by visible pixel overlap.
 const y=poi.upper?Math.min(.24,.66-size*poi.ratio/2):Math.min(.44+.12*eased,(.68+.39*eased)-size*poi.ratio/2);
 return {x,y,size,t,edge};
}
// Binary masks contain only painted pixels from each supplied PNG. No network or canvas reads.
const collisionMasks=Object.fromEntries(Object.entries(window.COLLISION_MASKS).map(([key,value])=>[key,{...value,bits:Uint8Array.from(atob(value.bits),c=>c.charCodeAt(0))}]));
function maskContains(mask,x,y){
 const px=Math.floor(x),py=Math.floor(y);
 if(px<0||py<0||px>=mask.width||py>=mask.height)return false;
 const index=py*mask.width+px;return (mask.bits[index>>3]&(1<<(index&7)))!==0;
}
function imageShape(img,key){
 if(!img.complete||!img.naturalWidth||!img.offsetWidth||!img.offsetHeight)return null;
 const style=getComputedStyle(img),origin=style.transformOrigin.split(' ').map(parseFloat);
 const matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform).inverse();
 const stage=$('stage').getBoundingClientRect();
 return {mask:collisionMasks[key],rect:img.getBoundingClientRect(),matrix,
  baseX:stage.left+img.offsetLeft+origin[0],baseY:stage.top+img.offsetTop+origin[1],
  ox:origin[0],oy:origin[1],sx:collisionMasks[key].width/img.offsetWidth,sy:collisionMasks[key].height/img.offsetHeight};
}
function paintedAt(shape,x,y){
 const dx=x-shape.baseX,dy=y-shape.baseY,m=shape.matrix;
 return maskContains(shape.mask,(m.a*dx+m.c*dy+m.e+shape.ox)*shape.sx,(m.b*dx+m.d*dy+m.f+shape.oy)*shape.sy);
}
function shapesOverlap(a,b,clip){
 const left=Math.max(a.rect.left,b.rect.left,clip.left),right=Math.min(a.rect.right,b.rect.right,clip.right);
 const top=Math.max(a.rect.top,b.rect.top,clip.top),bottom=Math.min(a.rect.bottom,b.rect.bottom,clip.bottom);
 if(right<=left||bottom<=top)return false;
 for(let y=top+.5;y<bottom;y+=1)for(let x=left+.5;x<right;x+=1){if(paintedAt(a,x,y)&&paintedAt(b,x,y))return true;}
 return false;
}
function hitsFish(poi){
 const fish=imageShape($('fish'),'fish'),net=imageShape(poi.el,poi.side<0?'left':'right');
 return !!(fish&&net&&shapesOverlap(fish,net,$('stage').getBoundingClientRect()));
}
function update(dt){if(!state.playing||state.paused)return;state.time+=dt;
state.dayTime+=dt;
if(state.labelTime>0){state.labelTime-=dt;if(state.labelTime<=0)$('day-label').hidden=true;}
if((state.day===2&&!state.fed)||state.day===3){
 // Dialogue finishes before the vignette begins (all times are active day seconds).
 if(state.dayTime>=10&&state.dayTime<13){
  $('day-label').textContent='お腹が空いた';$('day-label').hidden=false;
  $('hunger').hidden=true;$('hunger').style.opacity=0;
 }else if(state.dayTime>=13&&state.dayTime<16){
  $('day-label').textContent='餌を探さないと';$('day-label').hidden=false;
  $('hunger').hidden=true;$('hunger').style.opacity=0;
 }else if(state.day===3&&state.dayTime>=16&&state.dayTime<19){
  $('day-label').textContent='空腹で目が霞む';$('day-label').hidden=false;
  $('hunger').hidden=true;$('hunger').style.opacity=0;
 }else if(state.dayTime>=16){
  $('day-label').hidden=true;
  $('hunger').hidden=state.day!==3;
  $('hunger').style.opacity=state.day===3?Math.max(0,Math.min(1,(state.dayTime-19)/4)):0;
 }
}
if(state.day===2&&!state.fed){
 if(state.dayTime>=25&&!state.food){state.food={x:random(.22,.78),y:-.06};$('food').hidden=false;}
 if(state.food){state.food.y+=dt*.032;renderFood();if(foodHitsFish()){state.fed=true;fadeOutHunger();$('food').hidden=$('day-label').hidden=true;}}
}
if(state.dayTime>=60){endDay();return;}

const input=direction();
// Strokes build speed smoothly, with a gentle pulse instead of constant translation.
const stroke=.86+.14*Math.sin(state.time*5.5);
const target=input*.43*stroke;
const resistance=input===0?2.4:(input*state.velocity<0?1.9:2.7);
state.velocity+=(target-state.velocity)*(1-Math.exp(-dt*resistance));
state.x=Math.max(.14,Math.min(.86,state.x+state.velocity*dt));
if((state.x===.14&&state.velocity<0)||(state.x===.86&&state.velocity>0))state.velocity*=Math.exp(-dt*12);
state.camera=state.x-.5;
state.bank+=((state.velocity/.43)*-9-state.bank)*(1-Math.exp(-dt*4));

state.delay-=dt;
if(state.delay<=0&&state.pois.length<4){spawn(state.lastSide&&Math.random()<.72?-state.lastSide:(Math.random()<.5?-1:1));scheduleNext();}
for(const poi of [...state.pois]){
 if(poi.retreat)poi.exitAge+=dt;else poi.age+=dt;const g=poiGeometry(poi);render();
 if(hitsFish(poi)){beginCapture(poi);break;}
 if(g.t>=1&&poi.el.complete&&poi.el.naturalWidth){
  if(!poi.retreat){poi.retreat=true;poi.exitAge=0;poi.exitStart={x:g.x,y:g.y,size:g.size};continue;}
  // Removal happens only after the complete image has passed outside the viewport.
  if(poi.side<0?g.x+g.size/2>=0:g.x-g.size/2<=1)continue;
  state.avoided++;poi.el.remove();state.pois=state.pois.filter(p=>p!==poi);
 }
}
}


function fadeOutHunger(){
 const el=$('hunger');
 if(el.hidden)return;
 hungerFade={age:0,opacity:Number(el.style.opacity)||0};
}
function updateHungerFade(dt){
 if(!hungerFade)return;
 hungerFade.age+=dt;
 $('hunger').style.opacity=hungerFade.opacity*Math.max(0,1-hungerFade.age);
 if(hungerFade.age>=1){$('hunger').hidden=true;hungerFade=null;}
}
function resetDays(){
 ending=null;$('scene-fade').hidden=true;$('scene-fade').style.opacity=0;$('ending').hidden=true;$('ending-retry').hidden=true;$('retry').hidden=false;
 for(const id of ['left','right'])$(id).disabled=false;
 hungerFade=null;
 Object.assign(state,{day:1,dayTime:0,fed:false,food:null,transition:null,labelTime:0});
 for(const id of ['food','hunger','day-label','day-transition'])$(id).hidden=true;
 $('hunger').style.opacity=0;
 $('result').classList.remove('starved');$('caught-image').src='assets/caught.png';$('caught-image').alt='袋に入った金魚';
}
function renderFood(){if(!state.food)return;$('food').style.left=state.food.x*100+'%';$('food').style.top=state.food.y*100+'%';}
function foodHitsFish(){
 const fish=imageShape($('fish'),'fish');if(!fish)return false;
 const r=$('food').getBoundingClientRect(),clip=$('stage').getBoundingClientRect();
 // The tightly cropped food is round; test its visible disk against painted fish pixels.
 for(let y=Math.max(r.top,clip.top)+.5;y<Math.min(r.bottom,clip.bottom);y++)for(let x=Math.max(r.left,clip.left)+.5;x<Math.min(r.right,clip.right);x++){
  if(((x-r.left)/r.width-.5)**2+((y-r.top)/r.height-.5)**2<=.24&&paintedAt(fish,x,y))return true;
 }
 return false;
}
function endDay(){
 state.playing=false;state.paused=false;clearInput();$('resume').hidden=true;
 fadeOutHunger();$('food').hidden=$('day-label').hidden=true;
 state.transition={age:0,death:state.day===3||(state.day===2&&!state.fed),switched:false};
 $('day-message').textContent='';$('day-transition').style.opacity=0;$('day-transition').hidden=false;
}
function updateDayTransition(dt){
 const t=state.transition;t.age+=dt;const overlay=$('day-transition');
 if(t.age<1){overlay.style.opacity=t.age;return;}
 overlay.style.opacity=1;
 if(!t.switched){
  t.switched=true;state.pois=[];$('nets').replaceChildren();
  if(t.death){
   $('result').classList.add('starved');$('caught-image').src='assets/starved.png';$('caught-image').alt='餓死した金魚';
   $('resultText').textContent='あなたは餓死した';$('result').hidden=false;
  }else $('day-message').textContent=(state.day===1?'１日が終わった\n今日はなんとか生き延びた…':'2日目が終わった\n今日もなんとか生き延びた…');
 }
 if(t.death){overlay.style.opacity=Math.max(0,1-(t.age-1));if(t.age>=2){overlay.hidden=true;state.transition=null;}return;}
 if(t.age<4)return;
 if(!t.next){
  t.next=true;state.day++;state.dayTime=0;state.food=null;state.fed=false;state.delay=2.5;state.lastDangerAt=state.time;state.velocity=0;state.bank=0;
  $('day-message').textContent='';$('day-label').textContent=state.day===2?'２日目':'3日目';$('day-label').hidden=false;
 }
 overlay.style.opacity=Math.max(0,1-(t.age-4));
 if(t.age>=6.5){overlay.hidden=true;$('day-label').hidden=true;state.transition=null;state.playing=true;}
}

const clamp01=value=>Math.max(0,Math.min(1,value));
const easeCapture=value=>{const t=clamp01(value);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function beginCapture(poi){
 const stage=$('stage').getBoundingClientRect(),fish=$('fish').getBoundingClientRect();
 state.playing=false;clearInput();
 state.capture={age:0,net:poiGeometry(poi),fishX:(fish.left+fish.width/2-stage.left)/stage.width,fishY:(fish.top+fish.height/2-stage.top)/stage.height,bank:state.bank};
 $('capture-net').src=poi.el.src;poi.el.hidden=true;$('fish').hidden=true;
 $('capture').hidden=false;$('resume').hidden=true;
 renderCapture();
}
function capturePose(c){
 const lift=easeCapture(c.age/.25),center=easeCapture((c.age-.25)/.85),zoom=easeCapture((c.age-1.05)/.9);
 const size=mix(c.net.size,1.18,center)*(1+zoom*.65);
 const netX=mix(c.net.x,.5,center),netY=mix(c.net.y,.46,center);
 const landingX=c.net.x,landingY=c.net.y+.035;
 const fishX=mix(mix(c.fishX,landingX,lift),.5,center);
 const fishY=mix(mix(c.fishY,landingY,lift),.48,center);
 const shake=reduceMotion?0:Math.sin(c.age*83)*.003*lift;
 return {netX,netY,size,fishX:fishX+shake,fishY:fishY+(reduceMotion?0:Math.sin(c.age*101)*.002*lift),fishSize:.25*(1+center*.12)*(1+zoom*.65),angle:mix(c.bank,0,lift)+(reduceMotion?0:Math.sin(c.age*90)*2.2*lift),white:easeCapture((c.age-1.25)/.7)};
}
function renderCapture(){
 const c=state.capture,g=capturePose(c);
 for(const [id,x,y,width] of [['capture-net',g.netX,g.netY,g.size],['capture-fish',g.fishX,g.fishY,g.fishSize]]){const el=$(id);el.style.left=x*100+'%';el.style.top=y*100+'%';el.style.width=width*100+'%';}
 $('capture-fish').style.transform=`translate(-50%,-50%) rotate(${g.angle}deg)`;
 $('capture-white').style.opacity=g.white;
 if(c.age>=2.05){
  $('capture').hidden=true;$('resultText').textContent='あなたは捕まりました';$('result').hidden=false;$('retry').hidden=true;
  if(c.age<2.85){$('scene-fade').hidden=false;$('scene-fade').style.opacity=Math.max(0,1-(c.age-2.05)/.8);}
  else if(c.age<4.05){$('scene-fade').hidden=true;$('scene-fade').style.opacity=0;}
 }
 if(c.age>=4.05){$('scene-fade').hidden=false;$('scene-fade').style.opacity=Math.min(1,(c.age-4.05)/.8);}
 if(c.age>=4.85)startEnding();
}

function render(){if(state.capture){renderCapture();return;} // Fish swims across the screen; a subtle layer shift preserves depth.
const turn=state.camera/.36,farShift=turn*2,nearShift=-turn*5;const speed=Math.min(1,Math.abs(state.velocity)/.43);const bob=reduceMotion?0:Math.sin(state.time*2.3)*(3+speed*7)-speed*4;
$('water').style.transform=`translateX(${farShift}%)`;$('foreground').style.transform=`translateX(${nearShift}%)`;
const middleShift=-turn*1.5;const middleFloat=reduceMotion?0:Math.sin(state.time*.8)*1.1+Math.sin(state.time*.37)*.35;
$('middle-fish').style.transform=`translateX(${middleShift}%)`;$('drifting-fish').style.transform=`translateY(${middleFloat}%)`;
$('fish').style.left=state.x*100+'%';$('fish').style.transform=`translate(-50%,${bob*0.291407470703125}%) rotate(${reduceMotion?0:state.bank+Math.sin(state.time*4.5)*Math.min(2,speed*2)}deg)`;
for(const poi of state.pois){const g=poiGeometry(poi);poi.el.style.left=g.x*100+'%';poi.el.style.top=g.y*100+'%';poi.el.style.width=g.size*100+'%';poi.el.style.zIndex=String(Math.round(g.size*1000));}}

function startOpening(){
 reset();state.playing=false;clearInput();opening={age:0};
 $('fish').hidden=true;$('opening').style.background='#fff';
 $('opening-net').hidden=true;$('opening-net').style.left='110%';$('opening-net').style.top='60%';
 $('senior-fish').style.top='68%';$('senior-fish').style.transform='translate(-50%,-50%)';
 $('opening-speech').classList.remove('exclamation');document.querySelector('#opening-speech p').innerHTML=openingDialogue;
 $('opening').hidden=false;$('opening').style.opacity=1;
 $('opening-title').hidden=false;$('opening-tank').hidden=true;
 $('opening-characters').hidden=true;$('opening-characters').style.opacity=0;
 $('opening-speech').hidden=true;$('opening-white').style.opacity=0;
 for(const id of ['left','right'])$(id).disabled=true;
}
function updateOpening(dt){
 opening.age+=dt;const t=opening.age;
 if(t<1)return;
 if(t<1.8){$('opening-white').style.opacity=(t-1)/.8;return;}
 $('opening-title').hidden=true;$('opening-tank').hidden=true;
 $('opening').style.background='transparent';
 $('opening-white').style.opacity=Math.max(0,1-(t-1.8)/.6);
 if(t<2.4)return;
 $('opening-characters').hidden=false;
 $('opening-characters').style.opacity=Math.min(1,(t-2.4)/.8);
 if(t>=3.2)$('opening-speech').hidden=false;
 if(t>=8.2){
  const enter=clamp01((t-8.2)/.9),ease=enter*enter*(3-2*enter);
  $('opening-net').hidden=false;$('opening-net').style.left=(110-85*ease)+'%';
 }
 if(t>=9.1){
  document.querySelector('#opening-speech p').textContent='あっ！';$('opening-speech').classList.add('exclamation');
 }
 if(t>=9.4){
  $('opening-speech').hidden=true;
  const lift=clamp01((t-9.4)/1.6),shift=140*lift*lift;
  $('opening-net').style.top=(60-shift)+'%';$('senior-fish').style.top=(68-shift)+'%';
  const shake=reduceMotion?0:Math.sin((t-9.4)*85)*1.5;
  $('senior-fish').style.transform=`translate(calc(-50% + ${shake}px),-50%) rotate(${shake}deg)`;
 }
 if(t>=11.0){
  $('opening').hidden=true;$('fish').hidden=false;opening=null;clearInput();state.playing=true;
  for(const id of ['left','right'])$(id).disabled=false;
 }
}
function startEnding(){
 state.capture=null;state.playing=false;state.paused=false;clearInput();
 ending={age:0,done:false};$('scene-fade').hidden=false;$('scene-fade').style.opacity=1;$('ending').hidden=false;$('ending-retry').hidden=true;
 $('ending-characters').style.opacity=1;$('ending-message').hidden=true;$('ending-white').style.opacity=0;
 for(const id of ['left','right'])$(id).disabled=true;
}
function updateEnding(dt){
 if(ending.done)return;
 ending.age+=dt;
 $('scene-fade').style.opacity=Math.max(0,1-ending.age/.8);
 if(ending.age<.8)return;
 $('scene-fade').hidden=true;
 const t=ending.age-.8;
 $('ending-characters').style.opacity=Math.max(0,1-Math.max(0,t-4));
 if(t>=5)$('ending-message').hidden=false;
 if(t>=8)$('ending-white').style.opacity=Math.min(1,(t-8)/1.5);
 if(t>=9.5){ending.done=true;$('ending-white').style.opacity=1;$('ending-retry').hidden=false;}
}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!document.hidden){if(opening){updateOpening(dt);}else if(ending){updateEnding(dt);}else if(state.transition){updateDayTransition(dt);}else if(state.capture){state.capture.age+=dt;}else update(dt);if(!state.paused)updateHungerFade(dt);}render();requestAnimationFrame(frame);}
for(const [id,dir] of [['left',-1],['right',1]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();if(!state.playing||state.paused)return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,dir);b.classList.add('held');});const release=e=>{pointers.delete(e.pointerId);b.classList.remove('held');};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,release);}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(state.playing&&!state.paused)keys.add(e.key);}if(e.code==='Space'&&!e.repeat){e.preventDefault();setPaused(!state.paused);}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>setPaused(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
$('ending-retry').onclick=startOpening;
$('retry').onclick=reset;$('resume').onclick=()=>setPaused(false);
Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))).then(()=>{startOpening();requestAnimationFrame(frame);});
