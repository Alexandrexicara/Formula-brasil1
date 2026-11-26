import * as THREE from 'three';
import { io } from 'socket.io-client';
import './style.css';

const app=document.querySelector('#app');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080d18);scene.fog=new THREE.Fog(0x080d18,90,420);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.domElement.id='scene';app.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8d6ff,0x20202a,2));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-40,80,20);sun.castShadow=true;scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:0x11151b,roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;scene.add(ground);

const track=new THREE.Group();scene.add(track);
const roadMat=new THREE.MeshStandardMaterial({color:0x25282d,roughness:.9}),lineMat=new THREE.MeshStandardMaterial({color:0xf4f1e9}),redMat=new THREE.MeshStandardMaterial({color:0xd92834});
const selectedTrack=new URLSearchParams(location.search).get('track')||'las-vegas';
const trackNames={'las-vegas':'LAS VEGAS','interlagos':'INTERLAGOS','silverstone':'SILVERSTONE'};
const points=[];for(let i=0;i<180;i++){let a=i/180*Math.PI*2,rx,rz;if(selectedTrack==='interlagos'){rx=78+22*Math.sin(2*a)+9*Math.sin(5*a);rz=55+13*Math.cos(3*a);}else if(selectedTrack==='silverstone'){rx=94+11*Math.sin(4*a)+6*Math.sin(7*a);rz=54+12*Math.sin(6*a);}else{rx=88+12*Math.sin(3*a)+7*Math.sin(5*a);rz=48+8*Math.sin(2*a);}points.push(new THREE.Vector3(Math.cos(a)*rx,0,Math.sin(a)*rz));}
const curve=new THREE.CatmullRomCurve3(points,true,'catmullrom',.12);
function ribbon(width,y,material){let verts=[],idx=[];const n=600;for(let i=0;i<=n;i++){let t=i/n,p=curve.getPointAt(t),tan=curve.getTangentAt(t),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();for(let s of [-1,1])verts.push(p.x+side.x*width/2,y,p.z+side.z*width/2);if(i<n){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();let m=new THREE.Mesh(g,material);m.receiveShadow=true;track.add(m);}
ribbon(19,.015,roadMat);ribbon(1.4,.025,redMat); 
for(let side of [-1,1]){let verts=[],idx=[];for(let i=0;i<=600;i++){let p=curve.getPointAt(i/600),t=curve.getTangentAt(i/600),s=new THREE.Vector3(-t.z,0,t.x).normalize();let q=p.clone().addScaledVector(s,side*9.4);verts.push(q.x,.04,q.z);q=p.clone().addScaledVector(s,side*8.9);verts.push(q.x,.04,q.z);if(i<600){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();track.add(new THREE.Mesh(g,lineMat));}
for(let i=0;i<80;i++){let p=curve.getPointAt(i/80),t=curve.getTangentAt(i/80),s=new THREE.Vector3(-t.z,0,t.x).normalize();for(let side of [-1,1]){let b=new THREE.Mesh(new THREE.BoxGeometry(.35,1.1,.35),new THREE.MeshStandardMaterial({color:0x20242b}));b.position.copy(p).addScaledVector(s,side*12);b.position.y=.55;track.add(b);}}
function building(x,z,w,h,d,color){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.1}));m.position.set(x,h/2-.05,z);m.castShadow=true;scene.add(m);for(let y=2;y<h-1;y+=3)for(let xx=-w/2+1;xx<w/2-1;xx+=2){let win=new THREE.Mesh(new THREE.BoxGeometry(.65,.9,.05),new THREE.MeshBasicMaterial({color:Math.random()>.25?0x8ab8e8:0x202c43}));win.position.set(x+xx,y,z+d/2+.03);scene.add(win);}}
for(let i=0;i<28;i++){let a=i/28*Math.PI*2,p=curve.getPointAt(a),s=new THREE.Vector3(-curve.getTangentAt(a).z,0,curve.getTangentAt(a).x).normalize();let q=p.clone().addScaledVector(s,(i%2?1:-1)*(28+Math.random()*25));building(q.x,q.z,8+Math.random()*9,12+Math.random()*45,8, i%3?0x171e2a:0x25202c);}
for(let i=0;i<16;i++){let light=new THREE.PointLight(i%2?0x297dff:0xff253f,38,28,2);let p=curve.getPointAt(i/16);light.position.set(p.x,7,p.z);scene.add(light);}

const car=new THREE.Group();scene.add(car);
const carbon=new THREE.MeshStandardMaterial({color:0x11151b,metalness:.7,roughness:.28}),red=new THREE.MeshStandardMaterial({color:0xc91929,metalness:.55,roughness:.3}),rubber=new THREE.MeshStandardMaterial({color:0x08090b,roughness:.9}),glass=new THREE.MeshStandardMaterial({color:0x101d2a,metalness:.7,roughness:.12});
function box(parent,mat,x,y,z,w,h,d){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
box(car,carbon,0,.45,0,1.35,.32,3.1);box(car,red,0,.56,-.55,1.5,.18,1.45);box(car,red,0,.52,1.1,1.8,.12,.5);box(car,carbon,0,.72,-1.12,.65,.24,.8);
const nose=new THREE.Mesh(new THREE.ConeGeometry(.42,2.1,4),red);nose.rotation.x=-Math.PI/2;nose.position.set(0,.48,-2.15);car.add(nose);
box(car,carbon,0,.28,-3.1,2.5,.12,.28);box(car,red,0,1.05,1.25,1.5,.65,.12);
for(let x of [-.88,.88])for(let z of [-1.05,1.1]){let wheel=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.28,24),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.43,z);car.add(wheel);let hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.29,20),new THREE.MeshStandardMaterial({color:0x9da4ae,metalness:.9}));hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);car.add(hub);}
const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.055,10,36,Math.PI),carbon);halo.rotation.z=Math.PI;halo.position.set(0,1.15,-.15);car.add(halo);
const cockpit= new THREE.Group();car.add(cockpit);box(cockpit,carbon,0,.88,-.15,.92,.16,.8);
const steering=new THREE.Mesh(new THREE.TorusGeometry(.29,.045,10,32),carbon);steering.position.set(0,1.12,-.62);steering.rotation.x=.25;cockpit.add(steering);box(cockpit,red,0,1.12,-.62,.25,.18,.12);
for(let x of [-.37,.37]){let glove=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),new THREE.MeshStandardMaterial({color:0x151a22}));glove.position.set(x,1.08,-.56);cockpit.add(glove);}
const dash=box(cockpit,new THREE.MeshStandardMaterial({color:0x06090e,emissive:0x09213b,emissiveIntensity:.8}),0,1.05,-.05,.68,.25,.12);dash.rotation.x=-.25;
const cockpitCam=new THREE.Object3D();cockpitCam.position.set(0,1.48,-.25);car.add(cockpitCam);
const externalCam=new THREE.Object3D();externalCam.position.set(4,3.1,7);car.add(externalCam);
let speed=0,steer=0,heading=0,progress=.02,started=false,paused=false,external=false,elapsed=0,gear=1,laps=0,lapElapsed=0,bestLap=Infinity,lateral=0,finished=false;\nconst TOTAL_LAPS=3,aiDrivers=[];
// Posiciona o carro na linha de largada antes de abrir o treino.
const initialPoint=curve.getPointAt(progress);const initialTangent=curve.getTangentAt(progress);car.position.set(initialPoint.x,.08,initialPoint.z);car.rotation.y=Math.atan2(-initialTangent.x,-initialTangent.z);
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
  socket.on('race:start',()=>{onlineStatus.textContent='LARGADA! BOA CORRIDA.';onlineStatus.className='connected';});
  socket.on('race:finish',()=>{onlineStatus.textContent='CORRIDA ENCERRADA';});
}
if(serverUrl&&authToken)connectSocket();
if(!serverUrl){
  onlineStatus.textContent='SERVIDOR MULTIPLAYER SERÁ CONECTADO QUANDO O RENDER FOR CONFIGURADO.';
}
const aiColors=[0x174d9b,0xffc928,0xeeeeee,0x16a06b,0x8a42bd];
for(let i=0;i<5;i++){const model=car.clone(true);model.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&o.material!==rubber){o.material=o.material.clone();o.material.color.setHex(aiColors[i]);}});scene.add(model);aiDrivers.push({model,progress:(.02+(i+1)*.105)%1,speed:220+i*7,laps:0,finished:false});}
function trackPoint(t,offset=0){const p=curve.getPointAt((t+1)%1),tan=curve.getTangentAt((t+1)%1),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();return p.addScaledVector(side,offset);}
function startRace(){started=true;finished=false;paused=false;elapsed=0;lapElapsed=0;bestLap=Infinity;laps=0;progress=.02;lateral=0;speed=0;aiDrivers.forEach((a,i)=>{a.progress=(.02+(i+1)*.105)%1;a.laps=0;a.finished=false;});document.querySelector('#startPanel').style.display='none';document.querySelector('#loading').style.display='none';document.querySelector('#session').textContent='CORRIDA · 3 VOLTAS · '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#lap').textContent='0/3';}
document.querySelector('#start').onclick=startRace;
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='c')external=!external;if(e.key==='Escape'&&started){paused=!paused;document.querySelector('#pause').hidden=!paused;}});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelector('#start').onclick=()=>{started=true;document.querySelector('#startPanel').style.display='none';document.querySelector('#loading').style.display='none';};
function setAuthMode(mode){authMode=mode;document.querySelector('#authEmail').hidden=mode!=='register';document.querySelector('#authLogin').placeholder=mode==='register'?'Nome de piloto':'E-mail ou nome de piloto';document.querySelector('#authSubmit').textContent=mode==='register'?'CRIAR CONTA':'ENTRAR NA CONTA';document.querySelector('#loginTab').classList.toggle('active',mode==='login');document.querySelector('#registerTab').classList.toggle('active',mode==='register');}
document.querySelector('#loginTab').onclick=()=>setAuthMode('login');
document.querySelector('#registerTab').onclick=()=>setAuthMode('register');
document.querySelector('#authSubmit').onclick=async()=>{
 const status=document.querySelector('#authStatus');if(!serverUrl){status.textContent='O servidor será ativado após a configuração do Render.';return;}
 const login=document.querySelector('#authLogin').value.trim(),password=document.querySelector('#authPassword').value;
 const body=authMode==='register'?{username:login,email:document.querySelector('#authEmail').value.trim(),password}:{login,password};
 status.textContent='Conectando…';
 try{const response=await fetch(serverUrl+'/api/auth/'+(authMode==='register'?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Falha na autenticação.');authToken=data.token;localStorage.setItem('formulaBr1Token',authToken);document.querySelector('#pilotName').value=data.player.username;status.textContent='Conta conectada: '+data.player.username;status.className='connected';connectSocket();}catch(e){status.textContent=e.message;status.className='error';}
};
document.querySelector('#engineer').onclick=async()=>{const box=document.querySelector('#engineerAdvice');box.textContent='Consultando engenheiro de corrida…';try{const r=await fetch(serverUrl+'/api/engineer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({speed:Math.round(speed),lap:document.querySelector('#lap').textContent,elapsed:Number(elapsed.toFixed(1)),position:Number(document.querySelector('#position').textContent)})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Engenheiro indisponível');box.textContent=d.advice;}catch(e){box.textContent=e.message;}};\ndocument.querySelector('#onlineStart').onclick=()=>{
 if(!serverUrl){onlineStatus.textContent='O GRID ONLINE ESTÁ PREPARADO. FALTA PUBLICAR O SERVIDOR NO RENDER.';onlineStatus.className='error';return;}
 if(!authToken){document.querySelector('#authStatus').textContent='Entre ou crie uma conta antes de entrar no grid.';return;}
 if(!socket?.connected){onlineStatus.textContent='CONECTANDO AO SERVIDOR…';if(!socket)connectSocket();else socket.connect();return;}
 socket.emit('queue:join');onlineStatus.textContent='PROCURANDO VAGA NO GRID…';
};
function drawMap(){let c=document.querySelector('#minimap').getContext('2d');c.clearRect(0,0,150,100);c.strokeStyle='#5c6572';c.lineWidth=5;c.beginPath();curve.getPoints(220).forEach((p,i)=>{let x=75+p.x*.48,y=50+p.z*.48;i?c.lineTo(x,y):c.moveTo(x,y)});c.closePath();c.stroke();let p=curve.getPointAt(progress);c.fillStyle='#ff3b45';c.beginPath();c.arc(75+p.x*.48,50+p.z*.48,4,0,7);c.fill();}
let last=performance.now();function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;
if(started&&!paused&&!finished){elapsed+=dt;lapElapsed+=dt;const accel=keys.w||keys.arrowup,brake=keys.s||keys.arrowdown,left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;speed=THREE.MathUtils.clamp(speed+(accel?78:0)*dt-(brake?145:0)*dt-(accel?0:12)*dt,0,350);const target=(left?-1:0)+(right?1:0);steer=THREE.MathUtils.damp(steer,target,4.2,dt);lateral=THREE.MathUtils.clamp(lateral+steer*(speed/3.6)*dt*.72,-13,13);const previous=progress;progress=(progress+(speed/3.6)*dt/(curve.getLength()*10)+1)%1;const p=trackPoint(progress,lateral),t=curve.getTangentAt(progress);heading=Math.atan2(-t.x,-t.z)+steer*.22;car.position.set(p.x,.08,p.z);car.rotation.y=heading;if(Math.abs(lateral)>8.3){speed=Math.max(45,speed-55*dt);document.querySelector('#session').textContent='FORA DA PISTA · PERDA DE ADERÊNCIA';}if(progress<previous){laps++;bestLap=Math.min(bestLap,lapElapsed);lapElapsed=0;document.querySelector('#lap').textContent=Math.min(laps,TOTAL_LAPS)+'/3';if(laps>=TOTAL_LAPS){finished=true;speed=0;document.querySelector('#session').textContent='BANDEIRADA · '+elapsed.toFixed(2)+'s';if(socket?.connected&&onlineRoom?.status==='racing')socket.emit('race:finish-player',{totalTimeMs:Math.round(elapsed*1000),bestLapMs:Math.round(bestLap*1000)});}}if(socket?.connected&&onlineRoom?.status==='racing')socket.volatile.emit('player:state',{x:p.x,y:.08,z:p.z,rotation:heading,speed});
for(const ai of aiDrivers){if(ai.finished)continue;const old=ai.progress;ai.progress=(ai.progress+(ai.speed/3.6)*dt/(curve.getLength()*10)+1)%1;const ap=trackPoint(ai.progress,Math.sin(ai.progress*18)*1.2);ai.model.position.set(ap.x,.08,ap.z);const at=curve.getTangentAt(ai.progress);ai.model.rotation.y=Math.atan2(-at.x,-at.z);if(ai.progress<old)ai.laps++;if(ai.laps>=TOTAL_LAPS)ai.finished=true;}
gear=speed<5?1:Math.min(8,Math.max(1,Math.floor(speed/43)+1));}
const activeCam=external?externalCam:cockpitCam,wp=activeCam.getWorldPosition(new THREE.Vector3()),look=external?car.position.clone().add(new THREE.Vector3(0,.8,0)):wp.clone().add(new THREE.Vector3(0,-.05,-25).applyQuaternion(car.quaternion));camera.position.lerp(wp,.18);camera.lookAt(look);document.querySelector('#speed').textContent=Math.round(speed);document.querySelector('#gear').textContent=started?gear:'N';document.querySelector('#clock').textContent=new Date(elapsed*1000).toISOString().slice(14,23);document.querySelector('#cameraLabel').textContent=external?'CÂMERA EXTERNA':'CÂMERA COCKPIT';document.querySelector('.mapLabel').textContent='CIRCUITO '+(trackNames[selectedTrack]||'LAS VEGAS');document.querySelector('#position').textContent=1+aiDrivers.filter(a=>a.progress>progress&&!a.finished).length;drawMap();renderer.render(scene,camera);}
requestAnimationFrame(animate);let dt=Math.min((now-last)/1000,.04);last=now;if(started&&!paused){elapsed+=dt;let accel=keys.w||keys.arrowup,brake=keys.s||keys.arrowdown,left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;speed=THREE.MathUtils.clamp(speed+(accel?52:0)*dt-(brake?105:0)*dt-(accel?0:7)*dt,0,330);speed=Math.max(0,speed);let target=(left?-1:0)+(right?1:0);steer=THREE.MathUtils.damp(steer,target,5,dt);let turn=steer*(.00013+speed*.0000018);progress=(progress+speed*dt/curve.getLength()*.28+1)%1;let p=curve.getPointAt(progress),t=curve.getTangentAt(progress);heading=Math.atan2(-t.x,-t.z)+steer*.18;car.position.set(p.x,.08,p.z);car.rotation.y=heading;if(socket?.connected&&onlineRoom?.status==='racing')socket.volatile.emit('player:state',{x:p.x,y:.08,z:p.z,rotation:heading,speed});gear=speed<5?1:Math.min(8,Math.max(1,Math.floor(speed/42)+1));}
let activeCam=external?externalCam:cockpitCam;let wp=activeCam.getWorldPosition(new THREE.Vector3()),look=external?car.position.clone().add(new THREE.Vector3(0,.8,0)):wp.clone().add(new THREE.Vector3(0,-.05,-25).applyQuaternion(car.quaternion));camera.position.lerp(wp,.18);camera.lookAt(look);
document.querySelector('#speed').textContent=Math.round(speed);document.querySelector('#gear').textContent=started?gear:'N';document.querySelector('#clock').textContent=new Date(elapsed*1000).toISOString().slice(14,23);document.querySelector('#cameraLabel').textContent=external?'CÂMERA EXTERNA':'CÂMERA COCKPIT';drawMap();renderer.render(scene,camera);}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.querySelector('#loading').style.display='none';