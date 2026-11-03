const W=48,H=32,D=48;
const COL={1:[.36,.68,.27],2:[.5,.35,.2],3:[.5,.5,.52],4:[.42,.3,.16],5:[.2,.5,.2],6:[.9,.84,.6],7:[.7,.3,.25]};
let seed=1,blocks=new Uint8Array(W*H*D),edits=new Map(),room=null,code='',dirty=true,sel=1,started=false;
const idx=(x,y,z)=>x+W*(z+D*y);
function get(x,y,z){if(x<0||z<0||x>=W||z>=D||y>=H)return 0;if(y<0)return 3;return blocks[idx(x,y,z)]}
function rnd(n){const s=Math.sin(n*127.1+seed*311.7)*43758.5453;return s-Math.floor(s)}
function hgt(x,z){return Math.floor(10+4*Math.sin(x*.18+seed)+3*Math.cos(z*.14+seed*2)+2*Math.sin((x+z)*.31))}
function gen(){
  blocks.fill(0);
  for(let x=0;x<W;x++)for(let z=0;z<D;z++){const h=hgt(x,z);
    for(let y=0;y<=h;y++)blocks[idx(x,y,z)]=y===h?(h<=9?6:1):(y>h-3?2:3);}
  for(let x=3;x<W-3;x++)for(let z=3;z<D-3;z++){const h=hgt(x,z);
    if(h>9&&rnd(x*97+z*13)>.985){
      for(let y=h+1;y<=h+4;y++)blocks[idx(x,y,z)]=4;
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=5;dy++){
        if(Math.abs(dx)+Math.abs(dz)+(dy-3)<4&&!blocks[idx(x+dx,h+dy,z+dz)])blocks[idx(x+dx,h+dy,z+dz)]=5;}
    }}
}
function setBlock(x,y,z,t,remote){
  if(x<0||y<0||z<0||x>=W||y>=H||z>=D)return;
  blocks[idx(x,y,z)]=t;edits.set(x+","+y+","+z,[x,y,z,t]);dirty=true;
  if(!remote&&room)room.emit("block",{x,y,z,t});
}
// three
const renderer=new THREE.WebGLRenderer({antialias:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x8fc4e8);scene.fog=new THREE.Fog(0x8fc4e8,25,70);
const cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,200);cam.rotation.order="YXZ";
addEventListener("resize",()=>{renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
let mesh=null;
const FACES=[[1,0,0,[1,0,0,1,1,0,1,1,1,1,0,1],.8],[-1,0,0,[0,0,0,0,0,1,0,1,1,0,1,0],.8],[0,1,0,[0,1,0,0,1,1,1,1,1,1,1,0],1],[0,-1,0,[0,0,0,1,0,0,1,0,1,0,0,1],.55],[0,0,1,[0,0,1,1,0,1,1,1,1,0,1,1],.9],[0,0,-1,[0,0,0,0,1,0,1,1,0,1,0,0],.7]];
function rebuild(){
  const pos=[],col=[],ind=[];let n=0;
  for(let y=0;y<H;y++)for(let z=0;z<D;z++)for(let x=0;x<W;x++){
    const t=blocks[idx(x,y,z)];if(!t)continue;const c=COL[t];
    for(const f of FACES){if(get(x+f[0],y+f[1],z+f[2]))continue;
      for(let i=0;i<4;i++){pos.push(x+f[3][i*3],y+f[3][i*3+1],z+f[3][i*3+2]);col.push(c[0]*f[4],c[1]*f[4],c[2]*f[4]);}
      ind.push(n,n+1,n+2,n,n+2,n+3);n+=4;}}
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute("color",new THREE.Float32BufferAttribute(col,3));g.setIndex(ind);
  if(mesh){scene.remove(mesh);mesh.geometry.dispose()}
  mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));scene.add(mesh);dirty=false;
}
const hl=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),new THREE.LineBasicMaterial({color:0x000000}));hl.visible=false;scene.add(hl);
// player
const P={x:W/2,y:30,z:D/2,vx:0,vy:0,vz:0,yaw:0,pitch:0,ground:false};
function hit(x,y,z){
  for(let a=Math.floor(x-.3);a<=Math.floor(x+.3);a++)for(let b=Math.floor(y);b<=Math.floor(y+1.79);b++)for(let c=Math.floor(z-.3);c<=Math.floor(z+.3);c++)if(get(a,b,c))return true;
  return false;
}
const keys={};
addEventListener("keydown",e=>{keys[e.code]=true;const n=+e.key;if(n>=1&&n<=7){sel=n;drawHud()}});
addEventListener("keyup",e=>keys[e.code]=false);
function step(dt){
  const sp=5,f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0);
  if(keys.ArrowLeft)P.yaw+=1.8*dt;if(keys.ArrowRight)P.yaw-=1.8*dt;
  if(keys.ArrowUp)P.pitch=Math.min(1.5,P.pitch+1.5*dt);if(keys.ArrowDown)P.pitch=Math.max(-1.5,P.pitch-1.5*dt);
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);
  let mx=(-sy*f+cy*r),mz=(-cy*f-sy*r);const l=Math.hypot(mx,mz)||1;
  P.vx=mx/l*sp*(f||r?1:0);P.vz=mz/l*sp*(f||r?1:0);
  P.vy-=25*dt;if(keys.Space&&P.ground){P.vy=8;P.ground=false}
  let nx=P.x+P.vx*dt;if(!hit(nx,P.y,P.z))P.x=nx;
  let nz=P.z+P.vz*dt;if(!hit(P.x,P.y,nz))P.z=nz;
  let ny=P.y+P.vy*dt;
  if(!hit(P.x,ny,P.z)){P.y=ny;P.ground=false}else{if(P.vy<0)P.ground=true;P.vy=0}
  if(P.y<-20){P.x=W/2;P.y=30;P.z=D/2}
}
function ray(){
  const d=new THREE.Vector3(0,0,-1).applyEuler(cam.rotation),e=cam.position;let pv=null;
  for(let t=0;t<6;t+=.04){const x=Math.floor(e.x+d.x*t),y=Math.floor(e.y+d.y*t),z=Math.floor(e.z+d.z*t);
    if(get(x,y,z))return{h:[x,y,z],p:pv};pv=[x,y,z];}
  return null;
}
renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
renderer.domElement.addEventListener("mousedown",e=>{
  if(document.pointerLockElement!==renderer.domElement){renderer.domElement.requestPointerLock&&renderer.domElement.requestPointerLock();return}
  const r=ray();if(!r)return;
  if(e.button===0){if(r.h[1]>=0)setBlock(r.h[0],r.h[1],r.h[2],0)}
  else if(e.button===2&&r.p){const[x,y,z]=r.p;
    if(!(Math.abs(x+.5-P.x)<.9&&Math.abs(z+.5-P.z)<.9&&y+1>P.y&&y<P.y+1.8))setBlock(x,y,z,sel)}
});
addEventListener("mousemove",e=>{
  if(document.pointerLockElement!==renderer.domElement)return;
  P.yaw-=e.movementX*.0025;P.pitch=Math.max(-1.5,Math.min(1.5,P.pitch-e.movementY*.0025));
});
// peers
const others=new Map();
function syncPeers(list){
  const seen=new Set();
  for(const p of list){if(p.isMe||p.presence.x==null)continue;seen.add(p.peer);
    let m=others.get(p.peer);
    if(!m){m=new THREE.Mesh(new THREE.BoxGeometry(.6,1.8,.6),new THREE.MeshBasicMaterial({color:+p.presence.c||0xff8800}));scene.add(m);others.set(p.peer,m)}
    m.position.set(+p.presence.x,+p.presence.y+.9,+p.presence.z);m.rotation.y=+p.presence.r||0;}
  for(const[k,m]of others)if(!seen.has(k)){scene.remove(m);others.delete(k)}
  document.getElementById("info").textContent=(room?"Sala "+code.toUpperCase()+" · ":"Solo · ")+(seen.size+1)+" jogador(es)";
}
function sendSync(){const a=[...edits.values()];for(let i=0;i<a.length;i+=120)setTimeout(()=>room&&room.emit("sync",a.slice(i,i+120)),i/120*150)}
const myColor=Math.floor(Math.random()*0xffffff);
async function start(c){
  const st=document.getElementById("st");
  code=c.toLowerCase().replace(/[^a-z0-9]/g,"");
  seed=1;if(code){seed=0;for(const ch of code)seed=(seed*31+ch.charCodeAt(0))%997;seed+=1}
  gen();
  if(code){
    st.textContent="Conectando…";
    let r=null;try{r=window.claude&&await window.claude.use("room")}catch(e){}
    if(r){try{room=await r.join("mc-"+code)}catch(e){room=null}}
    if(!room){st.textContent="Multiplayer indisponível aqui. Entrando em modo solo.";code=""}
  }
  if(room){
    room.on("block",m=>{if(!m.isMe&&m.data)setBlock(m.data.x,m.data.y,m.data.z,m.data.t,true)});
    room.on("sync",m=>{if(!m.isMe&&Array.isArray(m.data))m.data.forEach(a=>setBlock(a[0],a[1],a[2],a[3],true))});
    room.onPeers(ch=>{
      syncPeers(ch.peers);
      const newcomers=ch.joined.filter(p=>!p.isMe);
      if(newcomers.length&&!ch.joined.some(p=>p.isMe)){
        const old=ch.peers.filter(p=>!ch.joined.some(j=>j.peer===p.peer)).map(p=>p.peer).sort();
        const mine=ch.peers.find(p=>p.isMe&&p.sameTab);
        if(mine&&old[0]===mine.peer)sendSync();}
    });
    setInterval(()=>room.presence({x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+P.yaw.toFixed(2),c:myColor}),100);
  }
  document.getElementById("menu").style.display="none";
  ["hud","info","cross"].forEach(i=>document.getElementById(i).style.display=i==="hud"?"flex":"block");
  document.getElementById("info").textContent=room?"Sala "+code.toUpperCase():"Solo";
  drawHud();started=true;
  renderer.domElement.requestPointerLock&&renderer.domElement.requestPointerLock();
}
function drawHud(){
  const h=document.getElementById("hud");h.innerHTML="";
  for(let i=1;i<=7;i++){const d=document.createElement("div");d.className="slot"+(i===sel?" on":"");
    const c=COL[i];d.style.background="rgb("+c.map(v=>Math.round(v*255)).join(",")+")";d.textContent=i;
    d.onclick=()=>{sel=i;drawHud()};h.appendChild(d)}
}
const $=id=>document.getElementById(id);
$("join").onclick=()=>{const c=$("code").value.trim();if(!c){$("st").textContent="Digite um código de sala.";return}start(c)};
$("make").onclick=()=>{const c=Math.random().toString(36).slice(2,7);$("code").value=c;$("st").textContent="Código "+c+" criado. Passe para os amigos e clique em Entrar.";};
$("solo").onclick=()=>start("");
let last=performance.now();
(function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(t-last)/1000);last=t;
  if(started){
    step(dt);
    if(dirty)rebuild();
    cam.position.set(P.x,P.y+1.6,P.z);cam.rotation.set(P.pitch,P.yaw,0);
    const r=ray();if(r){hl.visible=true;hl.position.set(r.h[0]+.5,r.h[1]+.5,r.h[2]+.5)}else hl.visible=false;
  }
  renderer.render(scene,cam);
})(performance.now());
