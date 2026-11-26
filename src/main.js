import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { io } from 'socket.io-client';
import './style.css';

const app=document.querySelector('#app');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080d18);scene.fog=new THREE.Fog(0x080d18,90,420);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.domElement.id='scene';app.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8d6ff,0x20202a,2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-40,80,20);sun.castShadow=true;scene.add(sun);
const grassCanvas=document.createElement('canvas');grassCanvas.width=grassCanvas.height=512;const grassCtx=grassCanvas.getContext('2d');grassCtx.fillStyle='#263d2a';grassCtx.fillRect(0,0,512,512);for(let i=0;i<18000;i++){const v=28+Math.random()*45;grassCtx.fillStyle=`rgba(${25+Math.random()*18},${v+35},${20+Math.random()*18},${.12+Math.random()*.25})`;grassCtx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*3,1+Math.random()*3);}const grassTexture=new THREE.CanvasTexture(grassCanvas);grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(70,70);grassTexture.colorSpace=THREE.SRGBColorSpace;const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({map:grassTexture,color:0xffffff,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);

const track=new THREE.Group();scene.add(track);
const asphaltCanvas=document.createElement('canvas');asphaltCanvas.width=asphaltCanvas.height=512;const asphaltCtx=asphaltCanvas.getContext('2d');asphaltCtx.fillStyle='#292d31';asphaltCtx.fillRect(0,0,512,512);for(let i=0;i<26000;i++){const g=65+Math.random()*55;asphaltCtx.fillStyle=`rgba(${g},${g+2},${g+4},${.08+Math.random()*.22})`;asphaltCtx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*2,1+Math.random()*2);}const asphaltTexture=new THREE.CanvasTexture(asphaltCanvas);asphaltTexture.wrapS=asphaltTexture.wrapT=THREE.RepeatWrapping;asphaltTexture.repeat.set(36,2);asphaltTexture.colorSpace=THREE.SRGBColorSpace;const roadMat=new THREE.MeshStandardMaterial({map:asphaltTexture,color:0xffffff,roughness:.94}),lineMat=new THREE.MeshStandardMaterial({color:0xf4f1e9}),redMat=new THREE.MeshStandardMaterial({color:0xd92834});
const selectedTrack=new URLSearchParams(location.search).get('track')||'las-vegas';
const trackNames={'las-vegas':'LAS VEGAS','interlagos':'INTERLAGOS','silverstone':'SILVERSTONE'};
const points=[];for(let i=0;i<180;i++){let a=i/180*Math.PI*2,rx,rz;if(selectedTrack==='interlagos'){rx=78+22*Math.sin(2*a)+9*Math.sin(5*a);rz=55+13*Math.cos(3*a);}else if(selectedTrack==='silverstone'){rx=94+11*Math.sin(4*a)+6*Math.sin(7*a);rz=54+12*Math.sin(6*a);}else{rx=88+12*Math.sin(3*a)+7*Math.sin(5*a);rz=48+8*Math.sin(2*a);}points.push(new THREE.Vector3(Math.cos(a)*rx,0,Math.sin(a)*rz));}
const curve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.12);
const trackLength=curve.getLength();
const validVector=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
function safeTrackU(value){return Number.isFinite(value)?((value%1)+1)%1:0;}
function sampleTrackPoint(value){const u=safeTrackU(value);try{const p=curve.getPointAt(u);if(validVector(p))return p;}catch(error){}return curve.getPoint(u);}
function sampleTrackTangent(value){const u=safeTrackU(value);try{const t=curve.getTangentAt(u);if(validVector(t))return t;}catch(error){}return curve.getTangent(u);}

function ribbon(width,y,material){let verts=[],uvs=[],idx=[];const n=600;for(let i=0;i<=n;i++){let t=i/n,p=sampleTrackPoint(t),tan=sampleTrackTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();for(let j=0;j<2;j++){const sign=j===0?-1:1;verts.push(p.x+side.x*width/2*sign,y,p.z+side.z*width/2*sign);uvs.push(t*36,j);}if(i<n){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();let m=new THREE.Mesh(g,material);m.receiveShadow=true;track.add(m);}
ribbon(19,.015,roadMat);ribbon(1.4,.025,redMat); 
for(let side of [-1,1]){let verts=[],idx=[];for(let i=0;i<=600;i++){let p=sampleTrackPoint(i/600),t=sampleTrackTangent(i/600),s=new THREE.Vector3(-t.z,0,t.x).normalize();let q=p.clone().addScaledVector(s,side*9.4);verts.push(q.x,.04,q.z);q=p.clone().addScaledVector(s,side*8.9);verts.push(q.x,.04,q.z);if(i<600){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();track.add(new THREE.Mesh(g,lineMat));}
for(let i=0;i<80;i++){let p=sampleTrackPoint(i/80),t=sampleTrackTangent(i/80),s=new THREE.Vector3(-t.z,0,t.x).normalize();for(let side of [-1,1]){let b=new THREE.Mesh(new THREE.BoxGeometry(.35,1.1,.35),new THREE.MeshStandardMaterial({color:0x20242b}));b.position.copy(p).addScaledVector(s,side*12);b.position.y=.55;track.add(b);}}
function building(x,z,w,h,d,color){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.1}));m.position.set(x,h/2-.05,z);m.castShadow=true;scene.add(m);for(let y=2;y<h-1;y+=3)for(let xx=-w/2+1;xx<w/2-1;xx+=2){let win=new THREE.Mesh(new THREE.BoxGeometry(.65,.9,.05),new THREE.MeshBasicMaterial({color:Math.random()>.25?0x8ab8e8:0x202c43}));win.position.set(x+xx,y,z+d/2+.03);scene.add(win);}}
for(let i=0;i<28;i++){let a=i/28*Math.PI*2,p=sampleTrackPoint(a),s=new THREE.Vector3(-sampleTrackTangent(a).z,0,sampleTrackTangent(a).x).normalize();let q=p.clone().addScaledVector(s,(i%2?1:-1)*(28+Math.random()*25));building(q.x,q.z,8+Math.random()*9,12+Math.random()*45,8, i%3?0x171e2a:0x25202c);}
for(let i=0;i<16;i++){let light=new THREE.PointLight(i%2?0x297dff:0xff253f,38,28,2);let p=sampleTrackPoint(i/16);light.position.set(p.x,7,p.z);scene.add(light);}

const car=new THREE.Group();scene.add(car);
const carbon=new THREE.MeshStandardMaterial({color:0x10151d,metalness:.72,roughness:.24});
const red=new THREE.MeshStandardMaterial({color:0xc91929,metalness:.58,roughness:.28});
const cockpit=new THREE.Group();car.add(cockpit);
function cockpitBox(parent,mat,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
/* Cockpit independente do modelo externo: câmera de pilotagem, painel e volante. */
const cockpitFloor=cockpitBox(cockpit,carbon,0,.72,-.1,.86,.12,1.05);
const steering=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,10,32),carbon);
steering.position.set(0,1.08,-.48);steering.rotation.x=.22;cockpit.add(steering);
cockpitBox(cockpit,red,0,1.08,-.48,.2,.13,.1);
const dash=cockpitBox(cockpit,new THREE.MeshStandardMaterial({color:0x05090f,emissive:0x07305b,emissiveIntensity:1.1,metalness:.3}),0,1.03,-.04,.68,.23,.12);
dash.rotation.x=-.18;
const displayCanvas=document.createElement('canvas');displayCanvas.width=512;displayCanvas.height=256;
const displayCtx=displayCanvas.getContext('2d');displayCtx.fillStyle='#06101c';displayCtx.fillRect(0,0,512,256);
displayCtx.fillStyle='#42e6ff';displayCtx.font='bold 76px Arial';displayCtx.fillText('320',28,112);
displayCtx.fillStyle='#f4f7ff';displayCtx.font='bold 28px Arial';displayCtx.fillText('KM/H   GEAR 8',28,170);
const displayTexture=new THREE.CanvasTexture(displayCanvas);
const screen=new THREE.Mesh(new THREE.PlaneGeometry(.58,.26),new THREE.MeshBasicMaterial({map:displayTexture}));
screen.position.set(0,1.16,-.108);cockpit.add(screen);
for(const x of [-.34,.34]){const glove=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),new THREE.MeshStandardMaterial({color:0x171c25,roughness:.9}));glove.position.set(x,1.04,-.42);cockpit.add(glove);}
const cockpitCam=new THREE.Object3D();cockpitCam.position.set(0,1.32,-.62);car.add(cockpitCam);
const externalCam=new THREE.Object3D();externalCam.position.set(4,3.1,7);car.add(externalCam);
let carAssetLoaded=false;
const carAssetUrls=[
 'https://tevy.dev/models/formula-car/v1/lod0.glb',
 'https://cdn.3dassets.dev/assets/15179/v1/model.glb'
];
function fitFormulaModel(root){
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const scale=5.25/Math.max(size.z,size.x);
 root.scale.setScalar(scale);
 root.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 root.rotation.y=Math.PI; // os modelos do pacote têm o bico no +Z; o carro do jogo aponta para -Z.
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();o.material.roughness=Math.min(.82,Math.max(.2,o.material.roughness??.45));}}});
}
function attachFormulaModel(target,template){
 const visual=template.clone(true);visual.traverse(o=>{if(o.isMesh&&o.material)o.material=o.material.clone();});
 target.add(visual);return visual;
}
function loadFormulaModel(index=0){
 if(index>=carAssetUrls.length){console.error('Nenhum modelo 3D de Fórmula foi carregado.');const status=document.querySelector('#loading');if(status){status.style.display='grid';status.textContent='ERRO AO CARREGAR O MODELO 3D DO CARRO';}return;}
 const loader=new GLTFLoader();
 loader.load(carAssetUrls[index],gltf=>{
   const template=gltf.scene;fitFormulaModel(template);
   attachFormulaModel(car,template);
   for(const ai of aiDrivers){attachFormulaModel(ai.model,template);}
   carAssetLoaded=true;
   console.info('Modelo 3D de Fórmula carregado:',carAssetUrls[index]);
 },undefined,error=>{console.warn('Falha ao carregar modelo 3D:',carAssetUrls[index],error);loadFormulaModel(index+1);});
}
let speed=0,steer=0,heading=0,progress=.02,started=false,paused=false,external=false,elapsed=0,gear=1,laps=0,lapElapsed=0,bestLap=Infinity,lateral=0,finished=false,gameMode='practice';
const TOTAL_LAPS=3,aiDrivers=[];
// Posiciona o carro na linha de largada antes de abrir o treino.
const initialPoint=sampleTrackPoint(progress);const initialTangent=sampleTrackTangent(progress);car.position.set(initialPoint.x,.08,initialPoint.z);car.rotation.y=Math.atan2(-initialTangent.x,-initialTangent.z);
const onlineStatus=document.querySelector('#onlineStatus');
const serverUrl=import.meta.env.VITE_SERVER_URL;
let socket=null,onlineRoom=null,authToken=localStorage.getItem('formulaBr1Token')||'',authMode='login';
const remoteCars=new Map();
function addRemote(id,name){if(remoteCars.has(id))return;const model=car.clone(true);model.scale.setScalar(.98);model.traverse(o=>{if(o.isLight)o.visible=false;});scene.add(model);remoteCars.set(id,{model,name});}
function updateRemote(data){addRemote(data.id,data.name);const r=remoteCars.get(data.id);r.model.position.set(data.x,.08,data.z);r.model.rotation.y=data.rotation;}
function syncRemotePlayers(room){const ids=new Set(room.players.map(p=>p.id));for(const [id,r] of remoteCars){if(!ids.has(id)){scene.remove(r.model);remoteCars.delete(id);}}for(const p of room.players)if(p.id!==socket?.id)addRemote(p.id,p.name);}
function connectSocket(){if(!serverUrl||!authToken)return;socket?.disconnect();socket=io(serverUrl,{auth:{token:authToken},transports:['websocket','polling'],timeout:8000,reconnection:true});
  socket.on('connect',()=>{onlineStatus.textContent='SERVIDOR CONECTADO · PRONTO PARA ENTRAR NA FILA';onlineStatus.className='connected';});
  socket.on('connect_error',()=>{onlineStatus.textContent='NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR. O TREINO LIVRE CONTINUA DISPONÍVEL.';onlineStatus.className='error';});
  socket.on('grid:joined',data=>{onlineRoom=data.room;syncRemotePlayers(data.room);onlineStatus.textContent='GRID '+data.room.id+' · '+data.room.players.length+'/20 PILOTOS';});
  socket.on('grid:update',room=>{onlineRoom=room;syncRemotePlayers(room);onlineStatus.textContent='GRID '+room.id+' · '+room.players.length+'/20 PILOTOS · '+(room.status==='racing'?'CORRIDA EM ANDAMENTO':'AGUARDANDO LARGADA');});
  socket.on('player:update',updateRemote);
  socket.on('race:position',d=>{onlineStatus.textContent=d.username+' terminou em '+d.position+'º · '+d.points+' pontos';});
  socket.on('race:start',()=>{onlineStatus.textContent='LARGADA! BOA CORRIDA.';onlineStatus.className='connected';startRace();});
  socket.on('race:finish',()=>{onlineStatus.textContent='CORRIDA ENCERRADA';});
}
if(serverUrl&&authToken)connectSocket();
if(!serverUrl){
  onlineStatus.textContent='SERVIDOR MULTIPLAYER SERÁ CONECTADO QUANDO O RENDER FOR CONFIGURADO.';
}
const aiColors=[0x174d9b,0xffc928,0xeeeeee,0x16a06b,0x8a42bd];
for(let i=0;i<5;i++){const model=car.clone(true);model.traverse(o=>{if(o.isMesh&&o.material){o.material=Array.isArray(o.material)?o.material.map(m=>{const cloned=m.clone();if(cloned.color)cloned.color.setHex(aiColors[i]);return cloned;}):o.material.clone();if(!Array.isArray(o.material)&&o.material.color)o.material.color.setHex(aiColors[i]);}});scene.add(model);aiDrivers.push({model,progress:(.02+(i+1)*.105)%1,speed:220+i*7,laps:0,finished:false});}
function trackPoint(t,offset=0){const u=safeTrackU(t),p=sampleTrackPoint(u),tan=sampleTrackTangent(u),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();return p.addScaledVector(side,offset);}
aiDrivers.forEach(a=>{const p=trackPoint(a.progress);a.model.position.set(p.x,.08,p.z);const t=sampleTrackTangent(a.progress);a.model.rotation.y=Math.atan2(-t.x,-t.z);});
loadFormulaModel();
const trackSelect=document.querySelector('#trackSelect');if(trackSelect){trackSelect.value=selectedTrack;trackSelect.onchange=()=>{location.search='?track='+encodeURIComponent(trackSelect.value);};}
function startRace(){gameMode='race';started=true;finished=false;paused=false;elapsed=0;lapElapsed=0;bestLap=Infinity;laps=0;progress=.02;lateral=0;speed=0;const gridPoint=sampleTrackPoint(progress),gridTangent=sampleTrackTangent(progress);car.position.set(gridPoint.x,.08,gridPoint.z);car.rotation.y=Math.atan2(-gridTangent.x,-gridTangent.z);aiDrivers.forEach((a,i)=>{a.progress=(.02+(i+1)*.105)%1;a.laps=0;a.finished=false;});document.querySelector('#startPanel').style.display='none';document.querySelector('#loading').style.display='none';document.querySelector('#session').textContent='CORRIDA · 3 VOLTAS · '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#lap').textContent='0/3';}
document.querySelector('#start').onclick=()=>{startRace();gameMode='practice';document.querySelector('#session').textContent='TREINO LIVRE · '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#lap').textContent='0/∞';};
document.querySelector('#raceStart').onclick=startRace;
const keys={};addEventListener('keydown',e=>{const key=String(e.key||'').toLowerCase();if(!key)return;keys[key]=true;if(key==='c')external=!external;if(key==='escape'&&started){paused=!paused;document.querySelector('#pause').hidden=!paused;}});addEventListener('keyup',e=>{const key=String(e.key||'').toLowerCase();if(key)keys[key]=false;});

function setAuthMode(mode){
 authMode=mode;
 const register=mode==='register';
 const email=document.querySelector('#authEmail');
 email.hidden=!register;
 email.required=register;
 document.querySelector('#authLogin').placeholder=register?'Nome de piloto':'E-mail ou nome de piloto';
 document.querySelector('#authLogin').maxLength=register?24:254;
 document.querySelector('#authPassword').maxLength=72;
 document.querySelector('#authPassword').placeholder=register?'Crie uma senha (mínimo 8 caracteres)':'Sua senha';
 document.querySelector('#authSubmit').textContent=register?'CRIAR MINHA CONTA':'ENTRAR NA CONTA';
 document.querySelector('#loginTab').classList.toggle('active',!register);
 document.querySelector('#registerTab').classList.toggle('active',register);
 document.querySelector('#authStatus').textContent=register?'Informe nome de piloto, e-mail e senha para criar sua conta.':'Informe seu e-mail ou nome de piloto e sua senha.';
 document.querySelector('#authStatus').className='';
}
document.querySelector('#loginTab').addEventListener('click',()=>setAuthMode('login'));
document.querySelector('#registerTab').addEventListener('click',()=>setAuthMode('register'));
document.querySelector('#authForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const status=document.querySelector('#authStatus');
 const button=document.querySelector('#authSubmit');
 const login=document.querySelector('#authLogin').value.trim();
 const email=document.querySelector('#authEmail').value.trim();
 const password=document.querySelector('#authPassword').value;
 const register=authMode==='register';
 if(!serverUrl){status.textContent='Servidor não configurado. Tente novamente em instantes.';status.className='error';return;}
 if(login.length<3){status.textContent='Digite um nome de piloto com pelo menos 3 caracteres.';status.className='error';return;}
 if(register&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent='Digite um endereço de e-mail válido.';status.className='error';return;}
 if(password.length<8||password.length>72){status.textContent='A senha precisa ter entre 8 e 72 caracteres.';status.className='error';return;}
 button.disabled=true;button.textContent=register?'CRIANDO CONTA…':'ENTRANDO…';
 status.textContent='Conectando ao servidor…';status.className='';
 try{
  const response=await fetch((serverUrl.endsWith('/')?serverUrl.slice(0,-1):serverUrl)+'/api/auth/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(register?{username:login,email,password}:{login,password})});
  const data=await response.json().catch(()=>({error:'O servidor retornou uma resposta inválida.'}));
  if(!response.ok)throw new Error(data.error||('Falha na autenticação (HTTP '+response.status+').'));
  if(!data.token||!data.player)throw new Error('O servidor não confirmou a sessão. Tente novamente.');
  authToken=data.token;localStorage.setItem('formulaBr1Token',authToken);
  document.querySelector('#pilotName').value=data.player.username;
  status.textContent=(register?'Conta criada e conectada: ':'Login realizado: ')+data.player.username;
  status.className='connected';connectSocket();
 }catch(error){status.textContent=error.message||'Não foi possível conectar. Verifique sua internet e tente novamente.';status.className='error';}
 finally{button.disabled=false;button.textContent=register?'CRIAR MINHA CONTA':'ENTRAR NA CONTA';}
});
document.querySelector('#rankingButton').onclick=async()=>{const panel=document.querySelector('#leaderboardPanel');panel.hidden=false;panel.textContent='Carregando classificação…';try{const r=await fetch(serverUrl+'/api/leaderboard');const d=await r.json();if(!r.ok)throw new Error('Não foi possível carregar o ranking.');panel.innerHTML='<strong>TOP 100 PILOTOS</strong>'+d.ranking.slice(0,10).map((p,i)=>'<div class=\"rankRow\"><span>'+String(i+1).padStart(2,'0')+' · '+p.username+'</span><b>'+p.points+' PTS</b></div>').join('');}catch(e){panel.textContent=e.message;}};
document.querySelector('#engineer').onclick=async()=>{const box=document.querySelector('#engineerAdvice');box.textContent='Consultando engenheiro de corrida…';try{const r=await fetch(serverUrl+'/api/engineer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({speed:Math.round(speed),lap:document.querySelector('#lap').textContent,elapsed:Number(elapsed.toFixed(1)),position:Number(document.querySelector('#position').textContent)})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Engenheiro indisponível');box.textContent=d.advice;}catch(e){box.textContent=e.message;}};
document.querySelector('#onlineStart').onclick=()=>{
 if(!serverUrl){onlineStatus.textContent='O GRID ONLINE ESTÁ PREPARADO. FALTA PUBLICAR O SERVIDOR NO RENDER.';onlineStatus.className='error';return;}
 if(!authToken){document.querySelector('#authStatus').textContent='Entre ou crie uma conta antes de entrar no grid.';return;}
 if(!socket?.connected){onlineStatus.textContent='CONECTANDO AO SERVIDOR…';if(!socket)connectSocket();else socket.connect();return;}
 socket.emit('queue:join');onlineStatus.textContent='PROCURANDO VAGA NO GRID…';
};
function drawMap(){let c=document.querySelector('#minimap').getContext('2d');c.clearRect(0,0,150,100);c.strokeStyle='#5c6572';c.lineWidth=5;c.beginPath();curve.getPoints(220).forEach((p,i)=>{let x=75+p.x*.48,y=50+p.z*.48;i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath();c.stroke();let p=sampleTrackPoint(progress);c.fillStyle='#ff3b45';c.beginPath();c.arc(75+p.x*.48,50+p.z*.48,4,0,7);c.fill();}
let last=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;
if(started&&!paused&&!finished){elapsed+=dt;lapElapsed+=dt;const accel=keys.w||keys.arrowup,brake=keys.s||keys.arrowdown,left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;speed=THREE.MathUtils.clamp(speed+(accel?78:0)*dt-(brake?145:0)*dt-(accel?0:12)*dt,0,350);const target=(left?-1:0)+(right?1:0);steer=THREE.MathUtils.damp(steer,target,4.2,dt);lateral=THREE.MathUtils.clamp(lateral+steer*(speed/3.6)*dt*.72,-13,13);const previous=progress;progress=safeTrackU(progress+(speed/3.6)*dt/(Math.max(1,Number.isFinite(trackLength)?trackLength:1)*10));const p=trackPoint(progress,lateral),t=sampleTrackTangent(progress);heading=Math.atan2(-t.x,-t.z)+steer*.22;car.position.set(p.x,.08,p.z);car.rotation.y=heading;if(Math.abs(lateral)>8.3){speed=Math.max(45,speed-55*dt);document.querySelector('#session').textContent='FORA DA PISTA · PERDA DE ADERÊNCIA';}if(progress<previous){laps++;bestLap=Math.min(bestLap,lapElapsed);lapElapsed=0;document.querySelector('#lap').textContent=gameMode==='race'?Math.min(laps,TOTAL_LAPS)+'/3':laps+'/∞';if(gameMode==='race'&&laps>=TOTAL_LAPS){finished=true;speed=0;document.querySelector('#session').textContent='BANDEIRADA · '+elapsed.toFixed(2)+'s';if(socket?.connected&&onlineRoom?.status==='racing')socket.emit('race:finish-player',{totalTimeMs:Math.round(elapsed*1000),bestLapMs:Math.round(bestLap*1000)});}}if(socket?.connected&&onlineRoom?.status==='racing')socket.volatile.emit('player:state',{x:p.x,y:.08,z:p.z,rotation:heading,speed});
for(const ai of aiDrivers){if(ai.finished)continue;const old=ai.progress;ai.progress=safeTrackU(ai.progress+(ai.speed/3.6)*dt/(Math.max(1,Number.isFinite(trackLength)?trackLength:1)*10));const ap=trackPoint(ai.progress,Math.sin(ai.progress*18)*1.2);ai.model.position.set(ap.x,.08,ap.z);const at=sampleTrackTangent(ai.progress);ai.model.rotation.y=Math.atan2(-at.x,-at.z);if(ai.progress<old)ai.laps++;if(gameMode==='race'&&ai.laps>=TOTAL_LAPS)ai.finished=true;}
gear=speed<5?1:Math.min(8,Math.max(1,Math.floor(speed/43)+1));}
const activeCam=external?externalCam:cockpitCam,wp=activeCam.getWorldPosition(new THREE.Vector3()),look=external?car.position.clone().add(new THREE.Vector3(0,.8,0)):wp.clone().add(new THREE.Vector3(0,-.05,-25).applyQuaternion(car.quaternion));camera.position.lerp(wp,.18);camera.lookAt(look);document.querySelector('#speed').textContent=Math.round(speed);document.querySelector('#gear').textContent=started?gear:'N';document.querySelector('#clock').textContent=new Date(elapsed*1000).toISOString().slice(14,23);document.querySelector('#cameraLabel').textContent=external?'CÂMERA EXTERNA':'CÂMERA COCKPIT';document.querySelector('.mapLabel').textContent='CIRCUITO '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#position').textContent=1+aiDrivers.filter(a=>(a.laps+a.progress)>(laps+progress)).length;drawMap();renderer.render(scene,camera);}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.querySelector('#loading').style.display='none';