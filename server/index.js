import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { pool } from './db.js';
import { authenticateToken } from './auth.js';
import { api } from './routes.js';

const app=express();app.set('trust proxy',1);
app.use(helmet({crossOriginEmbedderPolicy:false}));
const origins=(process.env.CLIENT_ORIGIN||'https://formula-brasil1.netlify.app').split(',').map(x=>x.trim());
app.use(cors({origin:origins,credentials:true}));app.use(express.json({limit:'32kb'}));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',async(_req,res)=>{let database='unavailable';try{await pool.query('SELECT 1');database='connected';}catch{}res.json({ok:true,service:'formula-brasil1',database,maxPlayersPerRace:20,raceDurationMs:600000});});
app.use('/api',api);
const httpServer=createServer(app);
const io=new Server(httpServer,{cors:{origin:origins,methods:['GET','POST']},transports:['websocket','polling']});
const MAX_PLAYERS=20,RACE_DURATION_MS=600000,START_WAIT_MS=30000,rooms=new Map();let sequence=1;
function publicRoom(r){return{id:r.code,status:r.status,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:true})),capacity:MAX_PLAYERS,startedAt:r.startedAt,endsAt:r.endsAt};}
async function persistRoom(r){try{const q=await pool.query('INSERT INTO races(room_code,track_slug,status,max_players,started_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(room_code) DO UPDATE SET status=EXCLUDED.status,started_at=COALESCE(races.started_at,EXCLUDED.started_at) RETURNING id',[r.code,'las-vegas',r.status,MAX_PLAYERS,r.startedAt?new Date(r.startedAt):null]);r.dbId=q.rows[0].id;for(const p of r.players.values())if(p.playerId)await pool.query('INSERT INTO race_entries(race_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[r.dbId,p.playerId]);}catch(e){console.error('Race persistence:',e.message);}}
async function finishRoom(r){if(!r||r.status!=='racing')return;r.status='finished';clearTimeout(r.finishTimer);try{if(r.dbId)await pool.query("UPDATE races SET status='finished',finished_at=now() WHERE id=$1",[r.dbId]);}catch(e){console.error(e.message);}io.to(r.code).emit('race:finish',{room:publicRoom(r),finishedAt:Date.now()});}
async function startRoom(r){if(!r||r.status!=='forming'||!r.players.size)return;r.status='racing';r.startedAt=Date.now();r.endsAt=r.startedAt+RACE_DURATION_MS;clearTimeout(r.startTimer);await persistRoom(r);io.to(r.code).emit('race:start',{room:publicRoom(r),durationMs:RACE_DURATION_MS,serverTime:r.startedAt});r.finishTimer=setTimeout(()=>finishRoom(r),RACE_DURATION_MS);}
async function removePlayer(s){const code=s.data.roomCode;if(!code)return;const r=rooms.get(code);if(r){r.players.delete(s.id);io.to(code).emit('grid:update',publicRoom(r));if(!r.players.size){clearTimeout(r.startTimer);clearTimeout(r.finishTimer);rooms.delete(code);}}s.leave(code);s.data.roomCode=null;}
io.use((s,next)=>{try{s.player=s.handshake.auth?.token?authenticateToken(s.handshake.auth.token):null;next();}catch{next(new Error('Sessão inválida. Entre novamente.'));}});
io.on('connection',s=>{
 s.emit('server:ready',{maxPlayersPerRace:MAX_PLAYERS,raceDurationMs:RACE_DURATION_MS,authenticated:Boolean(s.player)});
 s.on('queue:join',async()=>{if(!s.player)return s.emit('server:error',{message:'Entre na sua conta para participar do grid online.'});await removePlayer(s);let r=[...rooms.values()].find(x=>x.status==='forming'&&x.players.size<MAX_PLAYERS);if(!r){const code='GRID-'+String(sequence++).padStart(5,'0');r={code,players:new Map(),status:'forming',startedAt:null,endsAt:null};rooms.set(code,r);}const p={id:s.id,playerId:s.player.sub,name:s.player.username,x:0,y:0,z:0,rotation:0,speed:0};r.players.set(s.id,p);s.join(r.code);s.data.roomCode=r.code;s.emit('grid:joined',{room:publicRoom(r),playerId:s.id});io.to(r.code).emit('grid:update',publicRoom(r));if(r.players.size===1)r.startTimer=setTimeout(()=>startRoom(r),START_WAIT_MS);if(r.players.size>=MAX_PLAYERS)startRoom(r);await persistRoom(r);});
 s.on('player:state',state=>{const r=rooms.get(s.data.roomCode);if(!r||r.status!=='racing'||!state||typeof state!=='object')return;const p=r.players.get(s.id);if(!p)return;for(const k of ['x','y','z','rotation','speed'])if(Number.isFinite(state[k]))p[k]=k==='speed'?Math.max(0,Math.min(400,state[k])):state[k];s.to(r.code).volatile.emit('player:update',{id:s.id,name:p.name,x:p.x,y:p.y,z:p.z,rotation:p.rotation,speed:p.speed});});
 s.on('queue:leave',()=>removePlayer(s));s.on('disconnect',()=>removePlayer(s));
});
const port=Number(process.env.PORT||10000);httpServer.listen(port,'0.0.0.0',()=>console.log('Formula Brasil 1 server listening on '+port));
