import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*' }));
app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'formula-brasil1',
  multiplayer: 'matchmaking-preview',
  maxPlayersPerRace: 20,
  timestamp: new Date().toISOString()
}));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

const MAX_PLAYERS = 20;
const RACE_DURATION_MS = 10 * 60 * 1000;
const START_WAIT_MS = 30 * 1000;
const queues = new Map();
const rooms = new Map();
let roomSequence = 1;

function createRoom() {
  const id = `grid-${String(roomSequence++).padStart(4, '0')}`;
  const room = { id, players: new Map(), status: 'forming', createdAt: Date.now(), startedAt: null, endsAt: null, startTimer: null, finishTimer: null };
  rooms.set(id, room);
  return room;
}

function publicRoom(room) {
  return { id: room.id, status: room.status, players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready })), capacity: MAX_PLAYERS, startsAt: room.startedAt, endsAt: room.endsAt };
}

function removeFromRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (room) {
    room.players.delete(socket.id);
    io.to(roomId).emit('grid:update', publicRoom(room));
    if (room.players.size === 0) {
      clearTimeout(room.startTimer);
      clearTimeout(room.finishTimer);
      rooms.delete(roomId);
    }
  }
  socket.leave(roomId);
  socket.data.roomId = null;
}

function assignPlayer(socket, name) {
  let room = [...rooms.values()].find(r => r.status === 'forming' && r.players.size < MAX_PLAYERS);
  if (!room) room = createRoom();
  const player = { id: socket.id, name: String(name || 'Piloto').trim().slice(0, 24) || 'Piloto', ready: true, x: 0, y: 0, z: 0, rotation: 0, speed: 0 };
  room.players.set(socket.id, player);
  socket.join(room.id);
  socket.data.roomId = room.id;
  socket.emit('grid:joined', { room: publicRoom(room), playerId: socket.id });
  io.to(room.id).emit('grid:update', publicRoom(room));

  if (room.players.size === 1) {
    room.startTimer = setTimeout(() => startRace(room), START_WAIT_MS);
  }
  if (room.players.size >= MAX_PLAYERS) startRace(room);
}

function startRace(room) {
  if (!room || room.status !== 'forming' || room.players.size === 0) return;
  room.status = 'racing';
  room.startedAt = Date.now();
  room.endsAt = room.startedAt + RACE_DURATION_MS;
  clearTimeout(room.startTimer);
  io.to(room.id).emit('race:start', { room: publicRoom(room), durationMs: RACE_DURATION_MS, serverTime: room.startedAt });
  room.finishTimer = setTimeout(() => {
    room.status = 'finished';
    io.to(room.id).emit('race:finish', { room: publicRoom(room), finishedAt: Date.now() });
  }, RACE_DURATION_MS);
}

io.on('connection', socket => {
  socket.emit('server:ready', { maxPlayersPerRace: MAX_PLAYERS, raceDurationMs: RACE_DURATION_MS });

  socket.on('queue:join', (payload = {}) => {
    removeFromRoom(socket);
    assignPlayer(socket, payload.name);
  });

  socket.on('player:state', state => {
    const room = rooms.get(socket.data.roomId);
    if (!room || room.status !== 'racing' || !state || typeof state !== 'object') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.x = Number.isFinite(state.x) ? state.x : player.x;
    player.y = Number.isFinite(state.y) ? state.y : player.y;
    player.z = Number.isFinite(state.z) ? state.z : player.z;
    player.rotation = Number.isFinite(state.rotation) ? state.rotation : player.rotation;
    player.speed = Number.isFinite(state.speed) ? Math.max(0, Math.min(400, state.speed)) : player.speed;
    socket.to(room.id).volatile.emit('player:update', { id: socket.id, ...player });
  });

  socket.on('queue:leave', () => removeFromRoom(socket));
  socket.on('disconnect', () => removeFromRoom(socket));
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, '0.0.0.0', () => console.log(`Formula Brasil 1 server listening on ${port}`));
