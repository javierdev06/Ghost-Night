const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 1280;
const H = 720;
canvas.width  = W;
canvas.height = H;

const TILE = 48;
const COLS = 60;
const ROWS = 40;

// ================================
//  Cargar Sprites
// ================================
const sprites = {};

function loadSprites() {
  return new Promise(resolve => {
    const files = [
      'grey_dirt0','grey_dirt1','grey_dirt2',
      'brick_dark0','brick_dark1','brick_dark2',
      'torch0','torch1','torch2','torch3','torch4',
      'enemy_slime','enemy_bat','enemy_gremlin','enemy_ogre','enemy_manticore',
      'atlas_floor',
      'player_f0','player_f1','player_f2','player_f3',
      'player_run_f0','player_run_f1','player_run_f2','player_run_f3',
      'chest_closed','chest_open',
      'heart_full','heart_empty',
      'player_wizzard_f0','player_wizzard_f1','player_wizzard_f2','player_wizzard_f3',
      'player_wizzard_run_f0','player_wizzard_run_f1','player_wizzard_run_f2','player_wizzard_run_f3',
      'player_lizard_f0','player_lizard_f1','player_lizard_f2','player_lizard_f3',
      'player_lizard_run_f0','player_lizard_run_f1','player_lizard_run_f2','player_lizard_run_f3',
    ];
    let loaded = 0;
    for (const name of files) {
      const img = new Image();
      img.src = `assets/${name}.png`;
      img.onload = () => { sprites[name]=img; loaded++; if (loaded===files.length) resolve(); };
      img.onerror = () => { loaded++; if (loaded===files.length) resolve(); };
    }
  });
}

// ================================
// VARIABLES GLOBALES
// ================================
let level = 1;
let maxLevelReached = 1;
const TOTAL_LEVELS = 15;

const WEAPONS = [
  { name: 'Pistola',  color: '#fac775', dmg: 20, speed: 7,  rate: 300,  ammo: Infinity },
  { name: 'Escopeta', color: '#F0997B', dmg: 12, speed: 6,  rate: 700,  ammo: 16, pellets: 5, spread: 0.3 },
  { name: 'AK-47',    color: '#9FE1CB', dmg: 15, speed: 9,  rate: 110,  ammo: 30 },
  { name: 'Laser',    color: '#B5D4F4', dmg: 8,  speed: 13, rate: 80,   ammo: 50 },
  { name: 'Cohete',   color: '#E24B4A', dmg: 90, speed: 5,  rate: 1100, ammo: 4  },
  { name: 'Espada',   color: '#C0C0C0', dmg: 55, speed: 0,  rate: 600,  ammo: Infinity, melee: true, range: 40 },
  { name: 'Mazo',     color: '#8D6E63', dmg: 40, speed: 0,  rate: 800,  ammo: Infinity, melee: true, range: 35 },
  { name: 'Cuchillo', color: '#B0BEC5', dmg: 30, speed: 0,  rate: 350,  ammo: Infinity, melee: true, range: 28 },
  { name: 'Sarten',   color: '#78909C', dmg: 18, speed: 0,  rate: 400,  ammo: Infinity, melee: true, range: 26 },
];
let currentWeapon = WEAPONS[0];

const SKINS = [
  { id: 'knight',  name: 'Guerrero', prefix: 'player'         },
  { id: 'wizzard', name: 'Mago',     prefix: 'player_wizzard' },
  { id: 'lizard',  name: 'Lagarto',  prefix: 'player_lizard'  },
];
let selectedSkin = 0;

const HEROES = [
  { name: 'Guerrero',  color: '#AFA9EC', desc: 'Equilibrado. Resistente en combate.', hp: 120, speed: 3,   weapon: 'Pistola',  stats: { HP: '120', Velocidad: 'Media',      Arma: 'Pistola'  } },
  { name: 'Mago',      color: '#7F77DD', desc: 'Fragil pero dispara mas rapido.',     hp: 80,  speed: 3.2, weapon: 'Laser',    stats: { HP: '80',  Velocidad: 'Media',      Arma: 'Laser'    } },
  { name: 'Picaro',    color: '#5DCAA5', desc: 'Muy rapido. Ideal para esquivar.',    hp: 90,  speed: 4.5, weapon: 'Cuchillo', stats: { HP: '90',  Velocidad: 'Alta',       Arma: 'Cuchillo' } },
  { name: 'Ingeniero', color: '#EF9F27', desc: 'Especialista en armas pesadas.',      hp: 100, speed: 2.5, weapon: 'Cohete',   stats: { HP: '100', Velocidad: 'Baja',       Arma: 'Cohete'   } },
  { name: 'Caballero', color: '#B5D4F4', desc: 'Maximo HP. Empieza con espada.',      hp: 150, speed: 2.2, weapon: 'Espada',   stats: { HP: '150', Velocidad: 'Baja',       Arma: 'Espada'   } },
  { name: 'Cazador',   color: '#9FE1CB', desc: 'Experto en largo alcance.',           hp: 85,  speed: 3.5, weapon: 'AK-47',   stats: { HP: '85',  Velocidad: 'Media-Alta', Arma: 'AK-47'    } },
];
let selectedHero = 0;

// Animacion del jugador
let playerAnimFrame = 0;
let playerAnimTimer = 0;
let playerMoving    = false;

// Menu animado
let menuLoopRunning = false;
const menuParticles = Array.from({length:60}, ()=>({
  x: Math.random()*1280,
  y: Math.random()*720,
  size: Math.random()*2+0.5,
  speed: Math.random()*0.5+0.2,
  opacity: Math.random()*Math.PI,
  color: Math.random()<0.5 ? '#AFA9EC' : '#fac775',
}));

// ================================
// GUARDAR Y CARGAR PROGRESO
// ================================
function saveProgress() {
  localStorage.setItem('ghostNightSave', JSON.stringify({ maxLevelReached, kills, selectedSkin, selectedHero }));
}

function loadProgress() {
  const raw = localStorage.getItem('ghostNightSave');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.maxLevelReached) maxLevelReached = d.maxLevelReached;
    if (d.kills)           kills           = d.kills;
    if (typeof d.selectedSkin==='number') selectedSkin = d.selectedSkin;
    if (typeof d.selectedHero==='number') selectedHero = d.selectedHero;
  } catch(e) {}
}

function resetProgress() {
  localStorage.removeItem('ghostNightSave');
  maxLevelReached=1; kills=0; selectedSkin=0; selectedHero=0;
  location.reload();
}

loadProgress();

// ================================
// GENERACION DEL MAPA - CELLULAR AUTOMATA
// ================================
function generateMap() {
  let map = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.random() < 0.45 ? 1 : 0)
  );
  for (let y=0; y<ROWS; y++) { map[y][0]=1; map[y][COLS-1]=1; }
  for (let x=0; x<COLS; x++) { map[0][x]=1; map[ROWS-1][x]=1; }

  for (let pass=0; pass<5; pass++) {
    const next = map.map(r=>[...r]);
    for (let y=1; y<ROWS-1; y++) {
      for (let x=1; x<COLS-1; x++) {
        let walls=0;
        for (let dy=-1;dy<=1;dy++)
          for (let dx=-1;dx<=1;dx++)
            walls+=map[y+dy][x+dx];
        next[y][x] = walls>=5 ? 1 : 0;
      }
    }
    map=next;
  }

  const visited = Array.from({length:ROWS},()=>Array(COLS).fill(false));
  function floodFill(sy, sx) {
    const cells = [];
    const queue = [[sy,sx]];
    visited[sy][sx]=true;
    while (queue.length) {
      const [cy,cx]=queue.shift();
      cells.push({y:cy,x:cx});
      for (const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny=cy+dy, nx=cx+dx;
        if (ny>=0&&ny<ROWS&&nx>=0&&nx<COLS&&!visited[ny][nx]&&map[ny][nx]===0) {
          visited[ny][nx]=true; queue.push([ny,nx]);
        }
      }
    }
    return cells;
  }

  let largestRegion = [];
  for (let y=1;y<ROWS-1;y++)
    for (let x=1;x<COLS-1;x++)
      if (!visited[y][x]&&map[y][x]===0) {
        const region=floodFill(y,x);
        if (region.length>largestRegion.length) largestRegion=region;
      }

  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) map[y][x]=1;
  for (const {y,x} of largestRegion) map[y][x]=0;

  const rooms = [];
  const regionSize=largestRegion.length;
  const zoneCount=Math.min(10, Math.floor(regionSize/20));
  const step=Math.floor(regionSize/Math.max(zoneCount,1));
  for (let i=0;i<zoneCount;i++) {
    const cell=largestRegion[i*step];
    rooms.push({x:cell.x,y:cell.y,w:3,h:3});
  }
  if (rooms.length<2) {
    rooms.push({x:Math.floor(COLS/2),y:Math.floor(ROWS/2),w:3,h:3});
    rooms.push({x:Math.floor(COLS/3),y:Math.floor(ROWS/3),w:3,h:3});
  }

  return { map, rooms };
}

let { map, rooms } = generateMap();

// ================================
// JUGADOR
// ================================
const startRoom = rooms[0];
const playerStartX = startRoom.x*TILE;
const playerStartY = startRoom.y*TILE;
const player = {
  x:playerStartX, y:playerStartY,
  size:10, speed:3, angle:0, hp:120, maxHp:120, iframes:0, meleeSwing:0,
};
let camX = Math.max(0,Math.min(playerStartX-W/2,COLS*TILE-W));
let camY = Math.max(0,Math.min(playerStartY-H*0.7,ROWS*TILE-H));

const enemies=[], drops=[], hpDrops=[], bullets=[], particles=[], chests=[];
const revealedTiles = new Set();
const fireflies = Array.from({length:30},()=>({
  x:Math.random()*COLS*TILE, y:Math.random()*ROWS*TILE,
  vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5,
  life:Math.random()*100, maxLife:100, bright:Math.random()
}));

// ================================
// ENEMIGOS
// ================================
function getEnemyStats(type) {
  return {
    slime:    { size:18, speed:0.8+level*0.04, hp:20+level*5,   dmg:6  },
    bat:      { size:15, speed:2.0+level*0.06, hp:15+level*4,   dmg:5  },
    gremlin:  { size:18, speed:1.4+level*0.07, hp:35+level*8,   dmg:10 },
    ogre:     { size:28, speed:0.9+level*0.05, hp:80+level*15,  dmg:18 },
    manticore:{ size:42, speed:1.0+level*0.04, hp:600+level*80, dmg:30 },
  }[type] || { size:18, speed:1.2, hp:30, dmg:8 };
}

function spawnEnemies() {
  enemies.length=0;
  const isBossFloor=level===TOTAL_LEVELS;
  const typePool=level<=3?['slime','bat']:level<=7?['slime','bat','gremlin']:level<=12?['slime','bat','gremlin','ogre']:['gremlin','ogre','bat'];
  for (let i=1;i<rooms.length;i++) {
    const r=rooms[i];
    if (isBossFloor&&i===rooms.length-1) {
      const s=getEnemyStats('manticore');
      enemies.push({x:r.x*TILE,y:r.y*TILE,size:s.size,speed:s.speed,hp:s.hp,maxHp:s.hp,angle:0,type:'manticore',lastShot:0,dead:false});
    } else {
      const count=1+Math.floor(Math.random()*(1+Math.floor(level/3)));
      for (let j=0;j<count;j++) {
        const type=typePool[Math.floor(Math.random()*typePool.length)];
        const s=getEnemyStats(type);
        enemies.push({x:r.x*TILE,y:r.y*TILE,size:s.size,speed:s.speed,hp:s.hp,maxHp:s.hp,angle:0,type,lastShot:0,dead:false});
      }
    }
  }
}

function spawnChests() {
  chests.length=0;
  for (let i=2;i<rooms.length-1;i++) {
    if (Math.random()<0.6) {
      const r=rooms[i];
      const goldChance=Math.min(0.1+level*0.04,0.6);
      chests.push({x:r.x*TILE,y:r.y*TILE,gold:Math.random()<goldChance,opened:false});
    }
  }
}

spawnEnemies();
spawnChests();

const keys={}, mouse={x:W/2,y:H/2,down:false};
let lastShot=0, kills=0;
let gameRunning=false, levelComplete=false, paused=false, loopRunning=false;

function collidesWithWall(x,y,size) {
  const corners=[[x-size,y-size],[x+size,y-size],[x-size,y+size],[x+size,y+size]];
  for (const [cx,cy] of corners) {
    const tx=Math.floor(cx/TILE),ty=Math.floor(cy/TILE);
    if (ty<0||ty>=ROWS||tx<0||tx>=COLS) return true;
    if (map[ty][tx]===1) return true;
  }
  return false;
}

function spawnParticles(x,y,color,count) {
  for (let i=0;i<count;i++) {
    const angle=Math.random()*Math.PI*2, speed=1+Math.random()*3;
    particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:20+Math.floor(Math.random()*20),maxLife:40,color});
  }
}

function updateRevealedTiles() {
  const px=Math.floor(player.x/TILE),py=Math.floor(player.y/TILE),radius=6;
  for (let dy=-radius;dy<=radius;dy++)
    for (let dx=-radius;dx<=radius;dx++)
      if (dx*dx+dy*dy<=radius*radius)
        revealedTiles.add(`${px+dx},${py+dy}`);
}

function openChest(chest) {
  chest.opened=true;
  const roll=Math.random();
  if (chest.gold) {
    hpDrops.push({x:chest.x,y:chest.y-20,amount:40});
    drops.push({x:chest.x+20,y:chest.y,weapon:WEAPONS[1+Math.floor(Math.random()*(WEAPONS.length-1))]});
  } else {
    if (roll<0.5) hpDrops.push({x:chest.x,y:chest.y,amount:20});
    else drops.push({x:chest.x,y:chest.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]});
  }
  spawnParticles(chest.x,chest.y,chest.gold?'#fac775':'#aaa',10);
}

function nextLevel() {
  level++;
  const data=generateMap(); map=data.map; rooms=data.rooms;
  const r=rooms[0];
  player.x=r.x*TILE; player.y=r.y*TILE;
  camX=Math.max(0,Math.min(player.x-W/2,COLS*TILE-W));
  camY=Math.max(0,Math.min(player.y-H*0.7,ROWS*TILE-H));
  player.hp=Math.min(player.maxHp,player.hp+40);
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear(); spawnEnemies(); spawnChests();
}

function showLevelComplete() {
  levelComplete=true;
  if (level>=maxLevelReached) maxLevelReached=level+1;
  saveProgress();
  document.getElementById('levelComplete').style.display='flex';
  document.getElementById('levelCompleteMsg').textContent=`Piso ${level} completado - Kills: ${kills}`;
}

function continueGame() {
  document.getElementById('levelComplete').style.display='none';
  levelComplete=false; nextLevel();
}

function gameOver() { saveProgress(); gameRunning=false; }

// ================================
// MENU ANIMADO
// ================================
function menuLoop() {
  if (!menuLoopRunning) return;

  const grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#050510');
  grad.addColorStop(1,'#0d0d1c');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  for (const p of menuParticles) {
    p.y-=p.speed;
    p.opacity+=0.02;
    if (p.y<0) { p.y=H; p.x=Math.random()*W; p.opacity=0; }
    ctx.globalAlpha=Math.abs(Math.sin(p.opacity))*0.7;
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;



  requestAnimationFrame(menuLoop);
}

// ================================
// DIBUJAR JUGADOR
// ================================
function drawPlayer(c) {
  const prefix=SKINS[selectedSkin]?.prefix||'player';
  const frameKey=playerMoving?`${prefix}_run_f${playerAnimFrame}`:`${prefix}_f${playerAnimFrame}`;
  const sprite=sprites[frameKey];
  if (sprite) {
    c.drawImage(sprite,-20,-36,40,44);
  } else {
    c.fillStyle='#AFA9EC'; c.fillRect(-8,-20,16,24);
    c.fillStyle='#f0c090'; c.beginPath(); c.arc(0,-24,7,0,Math.PI*2); c.fill();
  }
}

// ================================
// DIBUJAR ENEMIGOS
// ================================
function drawEnemy(ctx, e) {
  const sprite=sprites[`enemy_${e.type}`];
  if (sprite) {
    ctx.save(); ctx.translate(e.x,e.y);
    const flip=Math.cos(e.angle)<0?-1:1;
    ctx.scale(flip,1);
    const s=e.size*2.2;
    ctx.drawImage(sprite,-s/2,-s/2,s,s);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(e.x,e.y);
    ctx.fillStyle='#e24b4a'; ctx.beginPath(); ctx.arc(0,0,e.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  const barW=e.type==='manticore'?90:e.type==='ogre'?50:30;
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(e.x-barW/2,e.y-e.size-14,barW,5);
  const hpColor=e.type==='manticore'?'#FF6600':e.type==='ogre'?'#795548':e.type==='gremlin'?'#8BC34A':e.type==='bat'?'#6D4C41':'#4CAF50';
  ctx.fillStyle=hpColor; ctx.fillRect(e.x-barW/2,e.y-e.size-14,barW*(e.hp/e.maxHp),5);
  if (e.type==='manticore') { ctx.fillStyle='#FF6600'; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.fillText('MANTICORA',e.x,e.y-e.size-18); ctx.textAlign='left'; }
}

// ================================
// MENU
// ================================
function showMenu() {
  loopRunning=false; gameRunning=false;
  ['levelMap','charSelect','skinSelect','pauseMenu','levelComplete'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('menu').style.display='flex';
  ctx.clearRect(0,0,W,H);
  if (!menuLoopRunning) {
    menuLoopRunning=true;
    menuLoop();
  }
}

loadSprites().then(() => {
  menuLoopRunning=true;
  menuLoop();
});

function showLevelMap() {
  document.getElementById('menu').style.display='none';
  document.getElementById('levelMap').style.display='flex';
  buildLevelGrid();
}

function buildLevelGrid() {
  const grid=document.getElementById('levelGrid');
  grid.innerHTML='';
  for (let i=1;i<=TOTAL_LEVELS;i++) {
    const btn=document.createElement('div');
    const completed=i<maxLevelReached, unlocked=i<=maxLevelReached;
    btn.className='level-btn'+(completed?' completed':unlocked?' unlocked':'');
    btn.innerHTML=`<span>${i}</span><span class="level-stars">${completed?'***':unlocked?'---':'X'}</span>`;
    if (unlocked) btn.onclick=()=>startLevel(i);
    grid.appendChild(btn);
  }
}

function startLevel(n) {
  menuLoopRunning=false;
  document.getElementById('levelMap').style.display='none';
  level=n;
  const data=generateMap(); map=data.map; rooms=data.rooms;
  const r=rooms[0];
  player.x=r.x*TILE; player.y=r.y*TILE;
  camX=Math.max(0,Math.min(player.x-W/2,COLS*TILE-W));
  camY=Math.max(0,Math.min(player.y-H*0.7,ROWS*TILE-H));
  player.hp=120;
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear(); spawnEnemies(); spawnChests();
  gameRunning=true; levelComplete=false; paused=false;
  if (!loopRunning) { loopRunning=true; loop(); }
}

function buildCharGrid() {
  const grid=document.getElementById('charGrid');
  grid.innerHTML='';
  HEROES.forEach((h,i)=>{
    const card=document.createElement('div');
    card.className='char-card'+(i===selectedHero?' selected':'');
    card.innerHTML=`<div class="char-name" style="color:${h.color}">${h.name}</div><div class="char-desc">${h.desc}</div><div class="char-stats">HP: <span>${h.stats.HP}</span><br>Vel: <span>${h.stats.Velocidad}</span><br>Arma: <span>${h.stats.Arma}</span></div>`;
    card.onclick=()=>{ document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); selectedHero=i; };
    grid.appendChild(card);
  });
}

function startGame() {
  menuLoopRunning=false;
  document.getElementById('menu').style.display='none';
  document.getElementById('charSelect').style.display='flex';
  buildCharGrid();
}

function confirmChar() {
  document.getElementById('charSelect').style.display='none';
  showSkinSelect();
}

function showSkinSelect() {
  document.getElementById('skinSelect').style.display='flex';
  buildSkinGrid();
}

function buildSkinGrid() {
  const grid=document.getElementById('skinGrid');
  grid.innerHTML='';
  SKINS.forEach((s,i)=>{
    const card=document.createElement('div');
    card.className='skin-card'+(i===selectedSkin?' selected':'');
    const pc=document.createElement('canvas'); pc.width=60; pc.height=70; pc.className='skin-preview';
    card.appendChild(pc);
    const nameEl=document.createElement('div'); nameEl.className='skin-name'; nameEl.textContent=s.name;
    card.appendChild(nameEl);
    card.onclick=()=>{ document.querySelectorAll('.skin-card').forEach(c=>c.classList.remove('selected')); card.classList.add('selected'); selectedSkin=i; };
    grid.appendChild(card);
    const pctx=pc.getContext('2d');
    const prefix=s.prefix||'player';
    const sprite=sprites[`${prefix}_f0`];
    if (sprite) { pctx.drawImage(sprite,2,4,56,62); }
    else {
      pctx.save(); pctx.translate(30,45);
      pctx.fillStyle='#AFA9EC'; pctx.fillRect(-10,-20,20,24);
      pctx.fillStyle='#f0c090'; pctx.beginPath(); pctx.arc(0,-24,7,0,Math.PI*2); pctx.fill();
      pctx.restore();
    }
  });
}

function confirmSkin() {
  menuLoopRunning=false;
  document.getElementById('skinSelect').style.display='none';
  const hero=HEROES[selectedHero];
  player.hp=120; player.maxHp=120; player.speed=hero.speed;
  currentWeapon=WEAPONS.find(w=>w.name===hero.weapon)||WEAPONS[0];
  gameRunning=true; levelComplete=false; paused=false; kills=0; level=1;
  const data=generateMap(); map=data.map; rooms=data.rooms;
  const r=rooms[0];
  player.x=r.x*TILE; player.y=r.y*TILE;
  camX=Math.max(0,Math.min(player.x-W/2,COLS*TILE-W));
  camY=Math.max(0,Math.min(player.y-H*0.7,ROWS*TILE-H));
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=0;
  revealedTiles.clear(); spawnEnemies(); spawnChests();
  loadSprites().then(()=>{
    if (!loopRunning) { loopRunning=true; loop(); }
  });
}

window.addEventListener('keydown', e=>{
  keys[e.key]=true;
  if ((e.key==='r'||e.key==='R')&&!gameRunning&&loopRunning) location.reload();
  if (e.key==='Escape'&&gameRunning) paused?resumeGame():pauseGame();
});
window.addEventListener('keyup', e=>keys[e.key]=false);
canvas.addEventListener('mousemove', e=>{
  const rect=canvas.getBoundingClientRect();
  const scaleX=W/rect.width, scaleY=H/rect.height;
  mouse.x=(e.clientX-rect.left)*scaleX; mouse.y=(e.clientY-rect.top)*scaleY;
});
canvas.addEventListener('mousedown', ()=>mouse.down=true);
canvas.addEventListener('mouseup',   ()=>mouse.down=false);

function pauseGame()  { paused=true;  document.getElementById('pauseMenu').style.display='flex'; }
function resumeGame() { paused=false; document.getElementById('pauseMenu').style.display='none'; }
function quitToMenu() {
  menuLoopRunning=false;
  paused=false; loopRunning=false; gameRunning=false; levelComplete=false;
  document.getElementById('pauseMenu').style.display='none';
  document.getElementById('levelComplete').style.display='none';
  bullets.length=drops.length=hpDrops.length=particles.length=chests.length=enemies.length=0;
  revealedTiles.clear();
  ctx.clearRect(0,0,W,H);
  document.getElementById('menu').style.display='flex';
  setTimeout(()=>{
    menuLoopRunning=true;
    menuLoop();
  }, 50);
}

// ================================
// UPDATE
// ================================
function update() {
  camX=Math.max(0,Math.min(player.x-W/2,COLS*TILE-W));
  camY=Math.max(0,Math.min(player.y-H*0.7,ROWS*TILE-H));
  updateRevealedTiles();
  player.angle=Math.atan2(mouse.y+camY-player.y, mouse.x+camX-player.x);

  let dx=0,dy=0;
  if (keys['a']||keys['ArrowLeft'])  dx-=1;
  if (keys['d']||keys['ArrowRight']) dx+=1;
  if (keys['w']||keys['ArrowUp'])    dy-=1;
  if (keys['s']||keys['ArrowDown'])  dy+=1;
  const len=Math.sqrt(dx*dx+dy*dy);
  if (len>0) { dx/=len; dy/=len; }
  const nx=player.x+dx*player.speed, ny=player.y+dy*player.speed;
  if (!collidesWithWall(nx,player.y,player.size)) player.x=nx;
  if (!collidesWithWall(player.x,ny,player.size)) player.y=ny;
  if (player.iframes>0) player.iframes--;
  if (player.meleeSwing>0) player.meleeSwing--;

  playerMoving=(dx!==0||dy!==0);
  playerAnimTimer++;
  if (playerAnimTimer>8) { playerAnimTimer=0; playerAnimFrame=(playerAnimFrame+1)%4; }

  const now=Date.now();
  if (mouse.down&&now-lastShot>currentWeapon.rate) {
    lastShot=now;
    if (currentWeapon.melee) {
      player.meleeSwing=12;
      for (const e of enemies) {
        if (e.dead) continue;
        const ex=e.x-player.x, ey=e.y-player.y;
        const dist=Math.sqrt(ex*ex+ey*ey);
        const angleDiff=Math.abs(Math.atan2(ey,ex)-player.angle);
        if (dist<currentWeapon.range+e.size&&angleDiff<Math.PI*0.6) {
          e.hp-=currentWeapon.dmg; spawnParticles(e.x,e.y,'#fff',6);
          if (e.hp<=0) { e.dead=true; kills++; spawnParticles(e.x,e.y,'#ff6600',14); if (Math.random()<0.3) drops.push({x:e.x,y:e.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]}); if (Math.random()<0.4) hpDrops.push({x:e.x,y:e.y,amount:20}); }
        }
      }
    } else {
      const pellets=currentWeapon.pellets||1;
      for (let p=0;p<pellets;p++) {
        const spread=currentWeapon.spread||0;
        const angle=player.angle+(Math.random()-0.5)*spread;
        bullets.push({x:player.x,y:player.y,vx:Math.cos(angle)*currentWeapon.speed,vy:Math.sin(angle)*currentWeapon.speed,dmg:currentWeapon.dmg,life:90,owner:'player'});
      }
    }
  }

  for (let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; b.life--;
    const tx=Math.floor(b.x/TILE),ty=Math.floor(b.y/TILE);
    if (b.life<=0||ty<0||ty>=ROWS||tx<0||tx>=COLS||map[ty][tx]===1) { bullets.splice(i,1); continue; }
    if (b.owner==='enemy') {
      const dx=b.x-player.x,dy=b.y-player.y;
      if (Math.sqrt(dx*dx+dy*dy)<player.size+4&&player.iframes===0) {
        player.hp-=15; player.iframes=30; spawnParticles(player.x,player.y,'#e24b4a',6); bullets.splice(i,1);
      }
      continue;
    }
    let hit=false;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex=b.x-e.x,ey=b.y-e.y;
      if (Math.sqrt(ex*ex+ey*ey)<e.size+4) {
        e.hp-=b.dmg||20;
        if (e.hp<=0) { e.dead=true; kills++; spawnParticles(e.x,e.y,'#ff6600',14); if (Math.random()<0.3) drops.push({x:e.x,y:e.y,weapon:WEAPONS[Math.floor(Math.random()*WEAPONS.length)]}); if (Math.random()<0.4) hpDrops.push({x:e.x,y:e.y,amount:20}); }
        bullets.splice(i,1); hit=true; break;
      }
    }
    if (hit) continue;
  }

  const now2=Date.now();
  for (const e of enemies) {
    if (e.dead) continue;
    const edx=player.x-e.x, edy=player.y-e.y;
    const elen=Math.sqrt(edx*edx+edy*edy);
    e.angle=Math.atan2(edy,edx);
    const stats=getEnemyStats(e.type);
    if (e.type==='bat') {
      if (elen>0) { e.x+=(edx/elen)*e.speed; e.y+=(edy/elen)*e.speed; }
    } else if (e.type==='slime') {
      if (elen>0&&now2%60<3) {
        const sx=e.x+(edx/elen)*e.speed*3, sy=e.y+(edy/elen)*e.speed*3;
        if (!collidesWithWall(sx,e.y,e.size)) e.x=sx;
        if (!collidesWithWall(e.x,sy,e.size)) e.y=sy;
      }
    } else if (e.type==='gremlin') {
      if (elen>80) { const enx=e.x+(edx/elen)*e.speed,eny=e.y+(edy/elen)*e.speed; if (!collidesWithWall(enx,e.y,e.size)) e.x=enx; if (!collidesWithWall(e.x,eny,e.size)) e.y=eny; }
      if (elen<180&&now2-e.lastShot>1200) { e.lastShot=now2; bullets.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*5,vy:Math.sin(e.angle)*5,dmg:stats.dmg,life:100,owner:'enemy'}); }
    } else if (e.type==='ogre') {
      if (elen>0) { const enx=e.x+(edx/elen)*e.speed,eny=e.y+(edy/elen)*e.speed; if (!collidesWithWall(enx,e.y,e.size)) e.x=enx; if (!collidesWithWall(e.x,eny,e.size)) e.y=eny; }
    } else if (e.type==='manticore') {
      if (elen>0) { const enx=e.x+(edx/elen)*e.speed,eny=e.y+(edy/elen)*e.speed; if (!collidesWithWall(enx,e.y,e.size)) e.x=enx; if (!collidesWithWall(e.x,eny,e.size)) e.y=eny; }
      if (elen<350&&now2-e.lastShot>700) { e.lastShot=now2; for (let s=-2;s<=2;s++) { const a=e.angle+s*0.25; bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*6,vy:Math.sin(a)*6,dmg:stats.dmg,life:130,owner:'enemy'}); } }
    }
    if (player.iframes===0&&elen<e.size+player.size) { player.hp-=stats.dmg; player.iframes=40; spawnParticles(player.x,player.y,'#e24b4a',6); }
  }

  let nearbyDrop=null;
  for (const d of drops) {
    const dx=player.x-d.x, dy=player.y-d.y;
    if (Math.sqrt(dx*dx+dy*dy)<40) { nearbyDrop=d; break; }
  }
  if (keys['e']||keys['E']) {
    if (nearbyDrop) {
      if (currentWeapon.name!=='Pistola') drops.push({x:player.x+10,y:player.y,weapon:currentWeapon});
      currentWeapon=nearbyDrop.weapon;
      drops.splice(drops.indexOf(nearbyDrop),1);
      keys['e']=false; keys['E']=false;
    }
  }

  for (let i=hpDrops.length-1;i>=0;i--) { const h=hpDrops[i],dx=player.x-h.x,dy=player.y-h.y; if (Math.sqrt(dx*dx+dy*dy)<20&&player.hp<120) { player.hp=Math.min(120,player.hp+h.amount); spawnParticles(player.x,player.y,'#9FE1CB',6); hpDrops.splice(i,1); } }
  for (let i=chests.length-1;i>=0;i--) { const c=chests[i]; if (c.opened) continue; const dx=player.x-c.x,dy=player.y-c.y; if (Math.sqrt(dx*dx+dy*dy)<30) openChest(c); }
  for (let i=particles.length-1;i>=0;i--) { const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life--; if (p.life<=0) particles.splice(i,1); }

  for (const f of fireflies) {
    f.x+=f.vx; f.y+=f.vy;
    f.vx+=(Math.random()-0.5)*0.1; f.vy+=(Math.random()-0.5)*0.1;
    f.vx=Math.max(-0.8,Math.min(0.8,f.vx)); f.vy=Math.max(-0.8,Math.min(0.8,f.vy));
    f.life=(f.life+1)%f.maxLife; f.bright=Math.sin(f.life/f.maxLife*Math.PI);
    if (f.x<0||f.x>COLS*TILE) f.vx*=-1;
    if (f.y<0||f.y>ROWS*TILE) f.vy*=-1;
  }

  if (enemies.length>0&&enemies.every(e=>e.dead)&&!levelComplete) showLevelComplete();
  if (player.hp<=0) { player.hp=0; gameOver(); }
}

// ================================
// DRAW
// ================================
function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.translate(-camX,-camY);

  const torchFrame=Math.floor(Date.now()/150)%5;
  const floorAtlas=sprites['atlas_floor'];
  const floorTiles=[[0,0],[16,0],[32,0],[48,0],[64,0],[0,16],[16,16],[32,16]];

  for (let y=0;y<ROWS;y++) {
    for (let x=0;x<COLS;x++) {
      const px=x*TILE, py=y*TILE;
      if (!revealedTiles.has(`${x},${y}`)) { ctx.fillStyle='#000'; ctx.fillRect(px,py,TILE,TILE); continue; }
      if (map[y][x]===1) {
        const wallIdx=(x*3+y*7)%3;
        const wallSprite=sprites[`brick_dark${wallIdx}`];
        if (wallSprite) ctx.drawImage(wallSprite,px,py,TILE,TILE);
        else { ctx.fillStyle='#2a1f3d'; ctx.fillRect(px,py,TILE,TILE); }
        if ((x*5+y*3)%18===0) {
          const torchSprite=sprites[`torch${torchFrame}`];
          if (torchSprite) {
            ctx.drawImage(torchSprite,px+8,py+2,16,28);
            const grd=ctx.createRadialGradient(px+TILE/2,py+TILE/2,2,px+TILE/2,py+TILE/2,70);
            grd.addColorStop(0,'rgba(255,140,0,0.18)'); grd.addColorStop(1,'rgba(255,140,0,0)');
            ctx.fillStyle=grd; ctx.fillRect(px-24,py-24,TILE+48,TILE+48);
          }
        }
      } else {
        if (floorAtlas) {
          const idx=(x*7+y*11)%floorTiles.length;
          const [sx,sy]=floorTiles[idx];
          ctx.drawImage(floorAtlas,sx,sy,16,16,px,py,TILE,TILE);
        } else { ctx.fillStyle='#0e0b14'; ctx.fillRect(px,py,TILE,TILE); }
        if (map[y-1]&&map[y-1][x]===1) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(px,py,TILE,10); }
        if (map[y+1]&&map[y+1][x]===1) { ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(px,py+TILE-6,TILE,6); }
        if (map[y][x-1]===1)            { ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(px,py,8,TILE); }
        if (map[y][x+1]===1)            { ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(px+TILE-8,py,8,TILE); }
      }
    }
  }

  for (const f of fireflies) {
    const tx=Math.floor(f.x/TILE),ty=Math.floor(f.y/TILE);
    if (!revealedTiles.has(`${tx},${ty}`)) continue;
    ctx.globalAlpha=f.bright*0.8; ctx.fillStyle='#aaff44'; ctx.beginPath(); ctx.arc(f.x,f.y,2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=f.bright*0.15; ctx.fillStyle='#ccff66'; ctx.beginPath(); ctx.arc(f.x,f.y,8,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  for (const c of chests) {
    if (!revealedTiles.has(`${Math.floor(c.x/TILE)},${Math.floor(c.y/TILE)}`)) continue;
    const chestSprite=sprites[c.opened?'chest_open':'chest_closed'];
    if (chestSprite) {
      ctx.drawImage(chestSprite,c.x-20,c.y-20,40,40);
      if (!c.opened&&c.gold) { ctx.globalAlpha=0.3+Math.sin(Date.now()/300)*0.2; ctx.fillStyle='#FFD600'; ctx.beginPath(); ctx.arc(c.x,c.y,20,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    } else {
      ctx.save(); ctx.translate(c.x,c.y);
      ctx.fillStyle=c.gold?'#F9A825':'#9E9E9E'; ctx.fillRect(-14,-10,28,20);
      ctx.restore();
    }
  }

  for (const h of hpDrops) {
    const heartSprite=sprites['heart_full'];
    if (heartSprite) { ctx.drawImage(heartSprite,h.x-14,h.y-14,28,28); }
    else { ctx.fillStyle='#e24b4a'; ctx.beginPath(); ctx.arc(h.x,h.y,12,0,Math.PI*2); ctx.fill(); }
  }

  for (const d of drops) {
    ctx.fillStyle=d.weapon.color+'33'; ctx.beginPath(); ctx.arc(d.x,d.y,18,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=d.weapon.color; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(d.x,d.y,16,0,Math.PI*2); ctx.stroke();
    ctx.save(); ctx.translate(d.x,d.y); ctx.fillStyle=d.weapon.color; ctx.fillRect(-12,-3,24,6); ctx.fillStyle='#aaa'; ctx.fillRect(6,-2,12,4); ctx.restore();
    ctx.fillStyle=d.weapon.color; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText(d.weapon.name,d.x,d.y-20);
    const ddx=player.x-d.x, ddy=player.y-d.y;
    if (Math.sqrt(ddx*ddx+ddy*ddy)<40) { ctx.fillStyle='#fff'; ctx.font='bold 13px monospace'; ctx.fillText('[E]',d.x,d.y-34); }
    ctx.textAlign='left';
  }

  for (const p of particles) { ctx.globalAlpha=p.life/p.maxLife; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;

  for (const b of bullets) { ctx.fillStyle=b.owner==='enemy'?'#ff6600':currentWeapon.color; ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill(); }

  for (const e of enemies) {
    if (e.dead) continue;
    if (!revealedTiles.has(`${Math.floor(e.x/TILE)},${Math.floor(e.y/TILE)}`)) continue;
    drawEnemy(ctx,e);
  }

  if (player.iframes===0||Math.floor(player.iframes/4)%2===0) {
    ctx.save(); ctx.translate(player.x,player.y);
    const flip=Math.abs(player.angle)>Math.PI/2?-1:1;
    ctx.scale(flip,1); drawPlayer(ctx); ctx.restore();
    ctx.save(); ctx.translate(player.x,player.y); ctx.rotate(player.angle);
    if (currentWeapon.melee) {
      const swing=player.meleeSwing>0?(1-player.meleeSwing/12)*Math.PI*0.8:0;
      ctx.rotate(swing);
      if (currentWeapon.name==='Espada') { ctx.fillStyle='#C0C0C0'; ctx.fillRect(8,-2,28,4); ctx.fillStyle='#8D6E63'; ctx.fillRect(6,-4,4,8); }
      else if (currentWeapon.name==='Mazo') { ctx.fillStyle='#8D6E63'; ctx.fillRect(6,-2,18,4); ctx.fillStyle='#757575'; ctx.fillRect(20,-7,10,14); }
      else if (currentWeapon.name==='Cuchillo') { ctx.fillStyle='#B0BEC5'; ctx.fillRect(6,-1.5,16,3); }
      else if (currentWeapon.name==='Sarten') { ctx.fillStyle='#78909C'; ctx.fillRect(6,-2,12,4); ctx.fillStyle='#546E7A'; ctx.beginPath(); ctx.ellipse(22,0,8,7,0,0,Math.PI*2); ctx.fill(); }
    } else {
      ctx.fillStyle='#555'; ctx.fillRect(4,-2,16,4);
      ctx.fillStyle='#333'; ctx.fillRect(16,-3,4,6);
    }
    ctx.restore();
  }

  ctx.restore();

  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,48);
  const heartFull=sprites['heart_full'], heartEmpty=sprites['heart_empty'];
  const maxHearts=6;
  const fullHearts=Math.min(6,Math.round(player.hp/20));
  for (let i=0;i<maxHearts;i++) {
    const hSprite=i<fullHearts?heartFull:heartEmpty;
    if (hSprite) ctx.drawImage(hSprite,10+i*22,8,20,20);
    else { ctx.fillStyle=i<fullHearts?'#e24b4a':'#555'; ctx.fillRect(10+i*22,8,18,18); }
  }
  ctx.fillStyle=currentWeapon.color; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.fillText(currentWeapon.name,W/2,28); ctx.textAlign='left';
  if (level===TOTAL_LEVELS) { ctx.fillStyle='#FF6600'; ctx.font='bold 12px monospace'; ctx.textAlign='center'; ctx.fillText('NIVEL FINAL - LA MANTICORA TE ESPERA',W/2,44); ctx.textAlign='left'; }
  const enemiesLeft=enemies.filter(e=>!e.dead).length;
  ctx.fillStyle='#aaa'; ctx.font='13px monospace'; ctx.fillText(`Piso: ${level}  Enemigos: ${enemiesLeft}`,W-200,28);
}

// ================================
// LOOP
// ================================
function loop() {
  if (!loopRunning) return;
  if (!gameRunning) {
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#e24b4a'; ctx.font='bold 56px monospace'; ctx.textAlign='center'; ctx.fillText('GAME OVER',W/2,H/2-24);
    ctx.fillStyle='#aaa'; ctx.font='20px monospace';
    ctx.fillText(`Piso: ${level}  Kills: ${kills}`,W/2,H/2+24);
    ctx.fillText('Presiona R para reiniciar',W/2,H/2+60); ctx.textAlign='left';
    requestAnimationFrame(loop); return;
  }
  if (paused) { requestAnimationFrame(loop); return; }
  if (levelComplete) { draw(); requestAnimationFrame(loop); return; }
  update(); draw(); requestAnimationFrame(loop);
}