import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { io } from 'socket.io-client';
import './style.css';

const bugEvents=[];
function recordBug(type,message,source=''){
 const entry={time:new Date().toISOString(),type:String(type),message:String(message||'').slice(0,500),source:String(source||'').slice(0,240)};
 bugEvents.push(entry);if(bugEvents.length>60)bugEvents.shift();
 const list=document.querySelector('#bugList');if(list){const row=document.createElement('div');row.className='bugEntry';row.textContent=entry.time.slice(11,19)+' · '+entry.type+' · '+entry.message;list.prepend(row);}
 const count=document.querySelector('#bugCount');if(count)count.textContent=String(bugEvents.length);
}
window.addEventListener('error',e=>recordBug('JS ERROR',e.message,e.filename+':'+e.lineno));
window.addEventListener('unhandledrejection',e=>recordBug('PROMISE',e.reason?.message||e.reason));
const nativeConsoleError=console.error.bind(console);console.error=(...args)=>{nativeConsoleError(...args);recordBug('CONSOLE ERROR',args.map(v=>v?.message||String(v)).join(' '));};
const nativeConsoleWarn=console.warn.bind(console);console.warn=(...args)=>{nativeConsoleWarn(...args);recordBug('CONSOLE WARN',args.map(v=>v?.message||String(v)).join(' '));};
const nativeFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const url=(()=>{try{return new URL(typeof args[0]==='string'?args[0]:args[0].url,location.href).pathname;}catch{return 'request';}})();try{const response=await nativeFetch(...args);if(!response.ok)recordBug('HTTP '+response.status,url);return response;}catch(error){recordBug('NETWORK',error?.message||error,url);throw error;}};
const app=document.querySelector('#app');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080d18);scene.fog=new THREE.Fog(0x080d18,90,420);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.domElement.id='scene';app.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8d6ff,0x20202a,2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-40,80,20);sun.castShadow=true;scene.add(sun);
const grassCanvas=document.createElement('canvas');grassCanvas.width=grassCanvas.height=512;const grassCtx=grassCanvas.getContext('2d');grassCtx.fillStyle='#263d2a';grassCtx.fillRect(0,0,512,512);for(let i=0;i<18000;i++){const v=28+Math.random()*45;grassCtx.fillStyle=`rgba(${25+Math.random()*18},${v+35},${20+Math.random()*18},${.12+Math.random()*.25})`;grassCtx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*3,1+Math.random()*3);}const grassTexture=new THREE.CanvasTexture(grassCanvas);grassTexture.wrapS=grassTexture.wrapT=THREE.RepeatWrapping;grassTexture.repeat.set(70,70);grassTexture.colorSpace=THREE.SRGBColorSpace;const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({map:grassTexture,color:0xffffff,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);

const track=new THREE.Group();scene.add(track);
const asphaltCanvas=document.createElement('canvas');asphaltCanvas.width=asphaltCanvas.height=512;const asphaltCtx=asphaltCanvas.getContext('2d');asphaltCtx.fillStyle='#292d31';asphaltCtx.fillRect(0,0,512,512);for(let i=0;i<26000;i++){const g=65+Math.random()*55;asphaltCtx.fillStyle=`rgba(${g},${g+2},${g+4},${.08+Math.random()*.22})`;asphaltCtx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*2,1+Math.random()*2);}const asphaltTexture=new THREE.CanvasTexture(asphaltCanvas);asphaltTexture.wrapS=asphaltTexture.wrapT=THREE.RepeatWrapping;asphaltTexture.repeat.set(36,2);asphaltTexture.colorSpace=THREE.SRGBColorSpace;const roadMat=new THREE.MeshStandardMaterial({map:asphaltTexture,color:0xffffff,roughness:.94}),lineMat=new THREE.MeshStandardMaterial({color:0xf4f1e9});
const kerbCanvas=document.createElement('canvas');kerbCanvas.width=512;kerbCanvas.height=64;const kerbCtx=kerbCanvas.getContext('2d');for(let i=0;i<16;i++){kerbCtx.fillStyle=i%2?'#f7f5ef':'#d92732';kerbCtx.fillRect(i*32,0,32,64);}const kerbTexture=new THREE.CanvasTexture(kerbCanvas);kerbTexture.wrapS=kerbTexture.wrapT=THREE.RepeatWrapping;kerbTexture.colorSpace=THREE.SRGBColorSpace;const redMat=new THREE.MeshStandardMaterial({map:kerbTexture,color:0xffffff,roughness:.72});
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
ribbon(19,.015,roadMat);
function ribbonOffset(width,y,material,offset){let verts=[],uvs=[],idx=[];const n=600;for(let i=0;i<=n;i++){const t=i/n,p=sampleTrackPoint(t),tan=sampleTrackTangent(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();for(let j=0;j<2;j++){const sign=j===0?-1:1,q=p.clone().addScaledVector(side,offset+sign*width/2);verts.push(q.x,y,q.z);uvs.push(t*36,j);}if(i<n){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.receiveShadow=true;track.add(m);}
ribbonOffset(1.15,.04,redMat,8.85);ribbonOffset(1.15,.04,redMat,-8.85); 
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
// Halo de proteção, braços e luvas visíveis na câmera do piloto.
function cockpitBar(a,b,r,mat){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),mat);mesh.position.copy(va).add(vb).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());mesh.castShadow=true;cockpit.add(mesh);return mesh;}
const haloMat=new THREE.MeshStandardMaterial({color:0xffc928,metalness:.65,roughness:.28});
cockpitBar([0,1.05,-.95],[0,1.58,-1.22],.045,haloMat);cockpitBar([-.68,1.42,-1.12],[.68,1.42,-1.12],.045,haloMat);cockpitBar([-.68,1.42,-1.12],[-.38,1.08,-.78],.04,haloMat);cockpitBar([.68,1.42,-1.12],[.38,1.08,-.78],.04,haloMat);
const steering=new THREE.Group();cockpit.add(steering);steering.position.set(0,1.08,-.92);steering.rotation.x=.22;
const wheelRim=new THREE.MeshStandardMaterial({color:0x111820,metalness:.65,roughness:.28}),wheelFace=new THREE.MeshStandardMaterial({color:0x202a35,metalness:.55,roughness:.3});
function wheelPart(w,hh,d,x,y,z,mat=wheelRim){const m=new THREE.Mesh(new THREE.BoxGeometry(w,hh,d),mat);m.position.set(x,y,z);m.castShadow=true;steering.add(m);return m;}
// Volante retangular estilo F1: topo e base planos, laterais com empunhaduras.
wheelPart(.62,.09,.09,0,.23,0);wheelPart(.62,.09,.09,0,-.23,0);wheelPart(.09,.46,.10,-.265,0,0);wheelPart(.09,.46,.10,.265,0,0);
wheelPart(.18,.25,.12,0,0,-.035,wheelFace);wheelPart(.22,.08,.13,-.18,-.02,-.01,wheelFace);wheelPart(.22,.08,.13,.18,-.02,-.01,wheelFace);
wheelPart(.12,.07,.025,-.18,.12,-.07,new THREE.MeshStandardMaterial({color:0xe43b45}));wheelPart(.12,.07,.025,.18,.12,-.07,new THREE.MeshStandardMaterial({color:0x25a9df}));
for(let i=0;i<3;i++){const knob=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.025,16),new THREE.MeshStandardMaterial({color:[0xffc928,0x36c77a,0xe84b55][i],metalness:.3}));knob.rotation.x=Math.PI/2;knob.position.set(-.13+i*.13,.22,-.065);steering.add(knob);}
const dash=cockpitBox(cockpit,new THREE.MeshStandardMaterial({color:0x05090f,emissive:0x07305b,emissiveIntensity:1.1,metalness:.3}),0,1.03,-.62,.68,.23,.12);
dash.rotation.x=-.18;
const displayCanvas=document.createElement('canvas');displayCanvas.width=512;displayCanvas.height=256;
const displayCtx=displayCanvas.getContext('2d');displayCtx.fillStyle='#06101c';displayCtx.fillRect(0,0,512,256);
displayCtx.fillStyle='#42e6ff';displayCtx.font='bold 76px Arial';displayCtx.fillText('320',28,112);
displayCtx.fillStyle='#f4f7ff';displayCtx.font='bold 28px Arial';displayCtx.fillText('KM/H   GEAR 8',28,170);
const displayTexture=new THREE.CanvasTexture(displayCanvas);
const screen=new THREE.Mesh(new THREE.PlaneGeometry(.58,.26),new THREE.MeshBasicMaterial({map:displayTexture}));
screen.position.set(0,1.16,-.69);cockpit.add(screen);
for(const x of [-.31,.31]){cockpitBar([x*1.95,.72,-.24],[x,1.03,-.83],.075,new THREE.MeshStandardMaterial({color:0x202632,roughness:.9}));const glove=new THREE.Mesh(new THREE.SphereGeometry(.105,18,14),new THREE.MeshStandardMaterial({color:0x171c25,roughness:.9}));glove.position.set(x,1.08,-.91);cockpit.add(glove);}
const cockpitCam=new THREE.Object3D();cockpitCam.position.set(0,1.32,.42);car.add(cockpitCam);
const externalCam=new THREE.Object3D();externalCam.position.set(4,3.1,7);car.add(externalCam);
let carAssetLoaded=false;
const formulaWheelMeshes=[],formulaSteeringMeshes=[];
let audioContext=null,engineOsc=null,engineGain=null,engineFilter=null,brakeNoise=null,brakeGain=null,wheelSpin=0;
const carAssetUrls=[
 'https://models.vinish.dev/racing/formula-racer.glb',
 'https://tevy.dev/models/formula-car/v1/lod0.glb'
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
 const visual=template.clone(true);
 visual.traverse(o=>{
  if(!o.isMesh)return;
  if(o.material)o.material=o.material.clone();
  const nm=(o.name||'').toLowerCase();
  if(/wheel|tyre|tire|rim/.test(nm))formulaWheelMeshes.push({mesh:o,owner:target,front:/front|fl|fr/.test(nm),baseX:o.rotation.x,baseY:o.rotation.y});
  if(/steering[_ -]?wheel/.test(nm))formulaSteeringMeshes.push({mesh:o,owner:target,baseZ:o.rotation.z});
 });
 target.add(visual);return visual;
}
function initRaceAudio(){
 if(audioContext)return;
 const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
 audioContext=new AudioCtx();
 engineOsc=audioContext.createOscillator();engineOsc.type='sawtooth';
 engineFilter=audioContext.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=520;
 engineGain=audioContext.createGain();engineGain.gain.value=.0001;
 engineOsc.connect(engineFilter).connect(engineGain).connect(audioContext.destination);engineOsc.start();
 const buffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.32;
 brakeNoise=audioContext.createBufferSource();brakeNoise.buffer=buffer;brakeNoise.loop=true;
 const brakeFilter=audioContext.createBiquadFilter();brakeFilter.type='bandpass';brakeFilter.frequency.value=1450;
 brakeGain=audioContext.createGain();brakeGain.gain.value=.0001;
 brakeNoise.connect(brakeFilter).connect(brakeGain).connect(audioContext.destination);brakeNoise.start();
}
function updateRaceAudio(accelerating,braking){
 if(!audioContext||!engineOsc)return;
 const now=audioContext.currentTime,rpm=950+speed*37+(accelerating?800:0);
 engineOsc.frequency.setTargetAtTime(Math.max(18,rpm/60),now,.06);
 engineFilter.frequency.setTargetAtTime(700+rpm*.25,now,.08);
 engineGain.gain.setTargetAtTime(started&&!paused ? .075 : .0001,now,.08);
 brakeGain.gain.setTargetAtTime(braking&&speed>15 ? .055 : .0001,now,.05);
 if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
}

function buildProceduralFormulaCar(target,paint=red){
 const group=new THREE.Group();target.add(group);
 const carbonFiber=new THREE.MeshStandardMaterial({color:0x10151d,metalness:.72,roughness:.25});
 const bodyPaint=paint.clone();
 const body=(geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 body(new THREE.BoxGeometry(1.45,.38,2.65),bodyPaint,0,.55,.05);
 body(new THREE.BoxGeometry(.72,.22,2.25),carbonFiber,0,.72,-.02);
 const nose=body(new THREE.CylinderGeometry(.08,.46,2.05,8),bodyPaint,0,.58,-1.82);nose.rotation.x=-Math.PI/2;
 body(new THREE.BoxGeometry(2.15,.12,.42),carbonFiber,0,.42,-2.75);
 body(new THREE.BoxGeometry(2.2,.16,.35),bodyPaint,0,.42,1.42);
 body(new THREE.BoxGeometry(2.7,.13,.48),carbonFiber,0,.95,1.78);
 for(const x of [-.92,.92]){
  body(new THREE.BoxGeometry(.16,.48,1.35),carbonFiber,x,.56,-.05);
  for(const z of [-1.35,1.25]){
   const tire=body(new THREE.CylinderGeometry(.43,.43,.28,24),new THREE.MeshStandardMaterial({color:0x08090b,roughness:.94}),x,.42,z);
   tire.rotation.z=Math.PI/2;
   const rim=body(new THREE.CylinderGeometry(.22,.22,.3,20),new THREE.MeshStandardMaterial({color:0x929aa4,metalness:.8,roughness:.25}),x,.42,z);rim.rotation.z=Math.PI/2;
   formulaWheelMeshes.push({mesh:tire,owner:target,front:z<0,baseX:tire.rotation.x,baseY:tire.rotation.y,procedural:true});
   formulaWheelMeshes.push({mesh:rim,owner:target,front:z<0,baseX:rim.rotation.x,baseY:rim.rotation.y,procedural:true});
  }
 }
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.55,.055,10,28,Math.PI*1.55),new THREE.MeshStandardMaterial({color:0xffc928,metalness:.5,roughness:.3}));
 halo.position.set(0,1.22,.12);halo.rotation.z=Math.PI;group.add(halo);
 body(new THREE.BoxGeometry(.42,.28,.55),carbonFiber,0,.96,.12);
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.24,.035,10,28),carbonFiber);wheel.position.set(0,1.05,-.52);wheel.rotation.x=.25;group.add(wheel);
 formulaSteeringMeshes.push({mesh:wheel,owner:target,baseZ:wheel.rotation.z});
 return group;
}
function loadFormulaModel(){
 // Mantém o cockpit 3D existente e remove apenas a carroceria procedural do jogador.
 for(const ai of aiDrivers)buildProceduralFormulaCar(ai.model,red);
 carAssetLoaded=true;
 const status=document.querySelector('#loading');if(status)status.style.display='none';
 console.info('Modelo de Fórmula 3D procedural carregado localmente; sem dependência de CORS ou KTX2.');
}
let speed=0,steer=0,heading=0,progress=.02,started=false,paused=false,external=false,elapsed=0,gear=1,laps=0,lapElapsed=0,bestLap=Infinity,lateral=0,finished=false,gameMode='practice';
let mouseSteer=0,throttleTouch=false,brakeTouch=false,mouseSteerActive=false;
let lightsPhase='off',lightsTimer=0,lightsCount=0,lightsGo=false;
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
function connectSocket(){if(!serverUrl||!authToken)return;socket?.disconnect();socket=io(serverUrl,{auth:{token:authToken},transports:['polling','websocket'],timeout:8000,reconnection:true});
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
for(let i=0;i<5;i++){const model=car.clone(true);model.traverse(o=>{if(o.isMesh&&o.material){o.material=Array.isArray(o.material)?o.material.map(m=>{const cloned=m.clone();if(cloned.color)cloned.color.setHex(aiColors[i]);return cloned;}):o.material.clone();if(!Array.isArray(o.material)&&o.material.color)o.material.color.setHex(aiColors[i]);}});scene.add(model);const slot=gridSlot(i+1);aiDrivers.push({model,gridIndex:i+1,progress:slot.u,gridOffset:slot.offset,speed:0,targetSpeed:220+i*7,laps:0,finished:false});}
function trackPoint(t,offset=0){const u=safeTrackU(t),p=sampleTrackPoint(u),tan=sampleTrackTangent(u),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();return p.addScaledVector(side,offset);}
function gridSlot(index){const row=Math.floor(index/2),side=index%2===0?-1:1;return {u:safeTrackU(.02-row*.016),offset:side*2.35};}
function placeOnGrid(obj,index){const slot=gridSlot(index),p=trackPoint(slot.u,slot.offset),t=sampleTrackTangent(slot.u);obj.position.set(p.x,.09,p.z);obj.rotation.y=Math.atan2(-t.x,-t.z);}
aiDrivers.forEach((a,i)=>placeOnGrid(a.model,i+1));
// Marcações permanentes do grid: seis vagas em duas colunas, com número e contorno.
const gridMat=new THREE.MeshBasicMaterial({color:0xf3f3ed,side:THREE.DoubleSide});
for(let i=0;i<6;i++){const slot=gridSlot(i),p=trackPoint(slot.u,slot.offset),t=sampleTrackTangent(slot.u),angle=Math.atan2(-t.x,-t.z);const mark=new THREE.Mesh(new THREE.PlaneGeometry(2.15,4.2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12,side:THREE.DoubleSide}));mark.rotation.x=-Math.PI/2;mark.rotation.z=-angle;mark.position.set(p.x,.055,p.z);track.add(mark);const number=document.createElement('canvas');number.width=128;number.height=128;const ctx=number.getContext('2d');ctx.fillStyle='#ffffff';ctx.font='bold 82px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),64,64);const tex=new THREE.CanvasTexture(number);const label=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(p.x,.065,p.z);track.add(label);}
// Pórtico e cinco luzes de largada no início da reta.
const startPoint=sampleTrackPoint(.02),startTan=sampleTrackTangent(.02),startSide=new THREE.Vector3(-startTan.z,0,startTan.x).normalize();const gantry=new THREE.Group();gantry.position.set(startPoint.x,0,startPoint.z);gantry.rotation.y=Math.atan2(-startTan.x,-startTan.z);scene.add(gantry);const gantryMat=new THREE.MeshStandardMaterial({color:0x171c25,metalness:.7,roughness:.3});const postGeo=new THREE.BoxGeometry(.35,7,.35);for(const x of [-10,10]){const post=new THREE.Mesh(postGeo,gantryMat);post.position.set(x,3.5,0);gantry.add(post);}const beam=new THREE.Mesh(new THREE.BoxGeometry(20,.55,.6),gantryMat);beam.position.set(0,7,0);gantry.add(beam);const startLights=[];for(let i=0;i<5;i++){const housing=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.35,.65),new THREE.MeshStandardMaterial({color:0x080a0e,metalness:.4,roughness:.5}));housing.position.set((i-2)*2.65,6.05,-.45);gantry.add(housing);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.43,20,16),new THREE.MeshBasicMaterial({color:0x260609}));lamp.position.set((i-2)*2.65,6.05,-.84);gantry.add(lamp);startLights.push(lamp);}
const greenHousing=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.05,.7),gantryMat);greenHousing.position.set(0,4.85,-.45);gantry.add(greenHousing);const greenSignal=new THREE.Mesh(new THREE.SphereGeometry(.39,24,18),new THREE.MeshBasicMaterial({color:0x06230e}));greenSignal.position.set(0,4.85,-.88);gantry.add(greenSignal);const greenGlow=new THREE.PointLight(0x22ff66,0,18);greenGlow.position.set(0,4.85,-1.15);gantry.add(greenGlow);
loadFormulaModel();
const trackSelect=document.querySelector('#trackSelect');if(trackSelect){trackSelect.value=selectedTrack;trackSelect.onchange=()=>{location.search='?track='+encodeURIComponent(trackSelect.value);};}
function startRace(){initRaceAudio();gameMode='race';started=false;finished=false;paused=false;elapsed=0;lapElapsed=0;bestLap=Infinity;laps=0;progress=.02;lateral=0;speed=0;gear=1;placeOnGrid(car,0);aiDrivers.forEach((a,i)=>{const slot=gridSlot(i+1);a.progress=slot.u;a.gridOffset=slot.offset;a.speed=0;a.laps=0;a.finished=false;placeOnGrid(a.model,i+1);});lightsPhase='red';lightsTimer=0;lightsCount=0;lightsGo=false;startLights.forEach(l=>l.material.color.setHex(0x260609));greenSignal.material.color.setHex(0x06230e);greenGlow.intensity=0;document.querySelector('#startPanel').style.display='none';document.querySelector('#loading').style.display='none';document.querySelector('#session').textContent='PREPARADOS · AGUARDE A LARGADA';document.querySelector('#lap').textContent='0/3';}
document.querySelector('#start').onclick=()=>{initRaceAudio();gameMode='practice';started=true;finished=false;paused=false;elapsed=0;lapElapsed=0;bestLap=Infinity;laps=0;progress=.02;lateral=0;speed=0;placeOnGrid(car,0);document.querySelector('#startPanel').style.display='none';document.querySelector('#session').textContent='TREINO LIVRE · '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#lap').textContent='0/∞';};
document.querySelector('#raceStart').onclick=startRace;
const keys={};
const steerPad=document.querySelector('#steerPad'),steerWheel=document.querySelector('#steerWheel');
function updateTouchWheel(){steerWheel.style.transform='rotate('+(-mouseSteer*210)+'deg)';}
addEventListener('pointermove',e=>{if(!started||paused||external||e.pointerType==='touch')return;const dy=Number(e.movementY)||0;mouseSteer=THREE.MathUtils.clamp(mouseSteer+dy*.012,-1,1);mouseSteerActive=true;updateTouchWheel();},{passive:true});
addEventListener('blur',()=>{mouseSteer=0;mouseSteerActive=false;updateTouchWheel();});
steerPad.addEventListener('pointerdown',e=>{e.preventDefault();steerPad.setPointerCapture(e.pointerId);const r=steerPad.getBoundingClientRect();mouseSteer=THREE.MathUtils.clamp((e.clientX-(r.left+r.width/2))/(r.width*.42),-1,1);updateTouchWheel();});
steerPad.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&e.buttons){const r=steerPad.getBoundingClientRect();mouseSteer=THREE.MathUtils.clamp((e.clientX-(r.left+r.width/2))/(r.width*.42),-1,1);updateTouchWheel();}});
steerPad.addEventListener('pointerup',()=>{mouseSteer=0;updateTouchWheel();});

function bindPedal(id,which){const el=document.querySelector(id),down=e=>{e.preventDefault();if(which==='throttle')throttleTouch=true;else brakeTouch=true;el.classList.add('active');},up=()=>{if(which==='throttle')throttleTouch=false;else brakeTouch=false;el.classList.remove('active');};el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',e=>{if(e.buttons===0)up();});}
bindPedal('#throttleBtn','throttle');bindPedal('#brakeBtn','brake');
addEventListener('keydown',e=>{const key=String(e.key||'').toLowerCase();if(!key)return;keys[key]=true;if(['w','s','arrowup','arrowdown','arrowleft','arrowright','a','d'].includes(key))e.preventDefault();if(key==='c')external=!external;if(key==='escape'&&started){paused=!paused;document.querySelector('#pause').hidden=!paused;}});
addEventListener('keyup',e=>{const key=String(e.key||'').toLowerCase();if(key)keys[key]=false;});

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
setAuthMode('login');
document.querySelector('#authForm').addEventListener('submit',async event=>{
 recordBug('AUTH','Tentativa de '+(authMode==='register'?'cadastro':'login'));
 event.preventDefault();
 const status=document.querySelector('#authStatus');
 const button=document.querySelector('#authSubmit');
 const login=document.querySelector('#authLogin').value.trim();
 const email=document.querySelector('#authEmail').value.trim();
 const password=document.querySelector('#authPassword').value;
 const register=authMode==='register';
 if(!serverUrl){recordBug('AUTH CONFIG','VITE_SERVER_URL não configurada');status.textContent='Servidor não configurado. Tente novamente em instantes.';status.className='error';return;}
 if(login.length<3){status.textContent='Digite um nome de piloto com pelo menos 3 caracteres.';status.className='error';return;}
 if(register&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent='Digite um endereço de e-mail válido.';status.className='error';return;}
 if(password.length<8||password.length>72){status.textContent='A senha precisa ter entre 8 e 72 caracteres.';status.className='error';return;}
 button.disabled=true;button.textContent=register?'CRIANDO CONTA…':'ENTRANDO…';
 status.textContent='Conectando ao servidor…';status.className='';
 try{
  const response=await fetch((serverUrl.endsWith('/')?serverUrl.slice(0,-1):serverUrl)+'/api/auth/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(register?{username:login,email,password}:{login,username:login,password})});
  const data=await response.json().catch(()=>({error:'O servidor retornou uma resposta inválida.'}));
  if(!response.ok)throw new Error(data.error||('Falha na autenticação (HTTP '+response.status+').'));
  if(!data.token||!data.player)throw new Error('O servidor não confirmou a sessão. Tente novamente.');
  authToken=data.token;localStorage.setItem('formulaBr1Token',authToken);
  document.querySelector('#pilotName').value=data.player.username;
  status.textContent=(register?'Conta criada e conectada: ':'Login realizado: ')+data.player.username;
  status.className='connected';connectSocket();
 }catch(error){recordBug('AUTH ERROR',error.message);if(register&&/já cadastrado/i.test(error.message)){setAuthMode('login');status.textContent='Esse nome ou e-mail já tem uma conta. Abra ENTRAR e use sua senha.';status.className='error';}else{status.textContent=error.message||'Não foi possível conectar. Verifique sua internet e tente novamente.';status.className='error';}}
 finally{button.disabled=false;button.textContent=register?'CRIAR MINHA CONTA':'ENTRAR NA CONTA';}
});
document.querySelector('#bugTag').onclick=()=>{const p=document.querySelector('#bugPanel');p.hidden=!p.hidden;};
document.querySelector('#copyBugReport').onclick=async()=>{const report=JSON.stringify({app:'Formula Brasil 1',url:location.href,ua:navigator.userAgent,events:bugEvents},null,2);try{await navigator.clipboard.writeText(report);document.querySelector('#bugCopyStatus').textContent='Relatório copiado.';}catch(e){document.querySelector('#bugCopyStatus').textContent=report.slice(0,3000);}};
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
if(lightsPhase==='red'&&!paused){lightsTimer+=dt;if(lightsTimer>=.82){lightsTimer=0;if(lightsCount<5){startLights[lightsCount].material.color.setHex(0xff1724);lightsCount++;}else{startLights.forEach(l=>l.material.color.setHex(0x260609));lightsPhase='go';lightsTimer=0;greenSignal.material.color.setHex(0x20ff62);greenGlow.intensity=35;}}}else if(lightsPhase==='go'&&!paused){lightsTimer+=dt;if(lightsTimer>=.9){lightsPhase='off';greenSignal.material.color.setHex(0x06230e);greenGlow.intensity=0;started=true;document.querySelector('#session').textContent='CORRIDA · 3 VOLTAS · '+(trackNames[selectedTrack]||'LAS VEGAS');}}if(started&&!paused&&!finished){elapsed+=dt;lapElapsed+=dt;const accel=keys.w||keys.arrowup||throttleTouch,brake=keys.s||keys.arrowdown||brakeTouch,left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;updateRaceAudio(accel,brake);speed=THREE.MathUtils.clamp(speed+(accel?38:0)*dt-(brake?105:0)*dt-(accel?0:5.5)*dt,0,350);const target=THREE.MathUtils.clamp((left?-1:0)+(right?1:0)+mouseSteer,-1,1);steer=THREE.MathUtils.damp(steer,target,5.2,dt);lateral=THREE.MathUtils.clamp(lateral+steer*(speed/3.6)*dt*.72,-13,13);const previous=progress;progress=safeTrackU(progress+(speed/3.6)*dt/(Math.max(1,Number.isFinite(trackLength)?trackLength:1)*10));const p=trackPoint(progress,lateral),t=sampleTrackTangent(progress);heading=Math.atan2(-t.x,-t.z)+steer*.22;car.position.set(p.x,.08,p.z);car.rotation.y=heading;if(Math.abs(lateral)>8.3){speed=Math.max(45,speed-55*dt);document.querySelector('#session').textContent='FORA DA PISTA · PERDA DE ADERÊNCIA';}if(progress<previous){laps++;bestLap=Math.min(bestLap,lapElapsed);lapElapsed=0;document.querySelector('#lap').textContent=gameMode==='race'?Math.min(laps,TOTAL_LAPS)+'/3':laps+'/∞';if(gameMode==='race'&&laps>=TOTAL_LAPS){finished=true;speed=0;document.querySelector('#session').textContent='BANDEIRADA · '+elapsed.toFixed(2)+'s';if(socket?.connected&&onlineRoom?.status==='racing')socket.emit('race:finish-player',{totalTimeMs:Math.round(elapsed*1000),bestLapMs:Math.round(bestLap*1000)});}}if(socket?.connected&&onlineRoom?.status==='racing')socket.volatile.emit('player:state',{x:p.x,y:.08,z:p.z,rotation:heading,speed});
for(const ai of aiDrivers){if(ai.finished)continue;ai.speed=THREE.MathUtils.damp(ai.speed,ai.targetSpeed,1.25,dt);const old=ai.progress;ai.progress=safeTrackU(ai.progress+(ai.speed/3.6)*dt/(Math.max(1,Number.isFinite(trackLength)?trackLength:1)*10));const ap=trackPoint(ai.progress,ai.gridOffset);ai.model.position.set(ap.x,.08,ap.z);const at=sampleTrackTangent(ai.progress);ai.model.rotation.y=Math.atan2(-at.x,-at.z);if(ai.progress<old)ai.laps++;if(gameMode==='race'&&ai.laps>=TOTAL_LAPS)ai.finished=true;}
const shiftUp=[0,58,102,148,194,240,282,320],shiftDown=[0,0,48,88,132,178,222,264];if(speed>shiftUp[gear]&&gear<8)gear++;else if(gear>1&&speed<shiftDown[gear])gear--;}
const activeCam=external?externalCam:cockpitCam,wp=activeCam.getWorldPosition(new THREE.Vector3()),forward=new THREE.Vector3(0,0,-1).applyQuaternion(car.quaternion),look=external?car.position.clone().add(new THREE.Vector3(0,.8,0)):wp.clone().addScaledVector(forward,25).add(new THREE.Vector3(0,-.05,0));camera.position.copy(wp);camera.lookAt(look);wheelSpin+=speed*dt*.075;for(const w of formulaWheelMeshes){w.mesh.rotation.x=w.baseX+wheelSpin;if(w.front){let wheelSteer=0;if(w.owner===car)wheelSteer=steer;else{const ai=aiDrivers.find(a=>a.model===w.owner);if(ai){const t0=sampleTrackTangent(ai.progress),t1=sampleTrackTangent(ai.progress+.003),h0=Math.atan2(-t0.x,-t0.z),h1=Math.atan2(-t1.x,-t1.z);wheelSteer=THREE.MathUtils.clamp(Math.atan2(Math.sin(h1-h0),Math.cos(h1-h0))*6,-.38,.38);}}w.mesh.rotation.y=w.baseY-wheelSteer*.35;}}for(const w of formulaSteeringMeshes)if(w.owner===car)w.mesh.rotation.z=w.baseZ-steer*.65;steering.rotation.z=-steer*.72;updateTouchWheel();document.querySelector('#speed').textContent=Math.round(speed);document.querySelector('#gear').textContent=started?gear+'ª':'N';document.querySelector('#clock').textContent=new Date(elapsed*1000).toISOString().slice(14,23);document.querySelector('#cameraLabel').textContent=external?'CÂMERA EXTERNA':'COCKPIT · HALO · VOLANTE';
displayCtx.fillStyle='#06101c';displayCtx.fillRect(0,0,512,256);displayCtx.fillStyle='#42e6ff';displayCtx.font='bold 86px Arial';displayCtx.fillText(String(Math.round(speed)),24,112);displayCtx.fillStyle='#f4f7ff';displayCtx.font='bold 32px Arial';displayCtx.fillText('KM/H',28,158);displayCtx.fillStyle='#ffcf39';displayCtx.font='bold 58px Arial';displayCtx.fillText((started?gear:'N')+'ª',340,150);displayCtx.fillStyle='#d8e3f0';displayCtx.font='bold 22px Arial';displayCtx.fillText('RPM '+Math.round(950+speed*37+(keys.w||throttleTouch?800:0)),28,215);displayTexture.needsUpdate=true;document.querySelector('.mapLabel').textContent='CIRCUITO '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#position').textContent=1+aiDrivers.filter(a=>(a.laps+a.progress)>(laps+progress)).length;drawMap();renderer.render(scene,camera);}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.querySelector('#loading').style.display='none';