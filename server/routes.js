import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { issueToken, authMiddleware } from './auth.js';

export const api = Router();
api.post('/auth/register', async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!/^[\p{L}\p{N}_ -]{3,24}$/u.test(username)) return res.status(400).json({error:'Nome deve ter de 3 a 24 caracteres.'});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({error:'E-mail inválido.'});
    if (password.length < 8 || password.length > 72) return res.status(400).json({error:'A senha deve ter de 8 a 72 caracteres.'});
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query('INSERT INTO players(username,username_normalized,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,username,email,created_at',[username,username.toLowerCase(),email,hash]);
    const player = result.rows[0];
    await pool.query('INSERT INTO player_stats(player_id) VALUES($1) ON CONFLICT DO NOTHING',[player.id]);
    res.status(201).json({token:issueToken(player),player});
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({error:'Nome ou e-mail já cadastrado.'});
    console.error('Register error:',e.message); res.status(500).json({error:'Não foi possível criar a conta.'});
  }
});
api.post('/auth/login', async (req,res) => {
  try {
    const login = String(req.body?.login || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const q = await pool.query('SELECT id,username,email,password_hash FROM players WHERE email=$1 OR username_normalized=$1 LIMIT 1',[login]);
    if (!q.rowCount || !(await bcrypt.compare(password,q.rows[0].password_hash))) return res.status(401).json({error:'Login ou senha incorretos.'});
    const p=q.rows[0]; await pool.query('UPDATE players SET last_seen_at=now() WHERE id=$1',[p.id]);
    res.json({token:issueToken(p),player:{id:p.id,username:p.username,email:p.email}});
  } catch(e){console.error('Login error:',e.message);res.status(500).json({error:'Falha ao entrar.'});}
});
api.get('/me',authMiddleware,async(req,res)=>{
  const q=await pool.query('SELECT p.id,p.username,p.email,p.created_at,s.races_started,s.races_finished,s.wins,s.podiums,s.points FROM players p LEFT JOIN player_stats s ON s.player_id=p.id WHERE p.id=$1',[req.player.sub]);
  if(!q.rowCount)return res.status(404).json({error:'Piloto não encontrado.'});res.json({player:q.rows[0]});
});
api.get('/leaderboard',async(_req,res)=>{
  const q=await pool.query('SELECT p.username,s.points,s.wins,s.podiums,s.races_finished FROM player_stats s JOIN players p ON p.id=s.player_id ORDER BY s.points DESC,s.wins DESC,s.podiums DESC LIMIT 100');
  res.json({ranking:q.rows});
});
api.get('/races/recent',async(_req,res)=>{
  const q=await pool.query('SELECT r.room_code,r.track_slug,r.status,r.started_at,r.finished_at,count(e.player_id)::int AS participants FROM races r LEFT JOIN race_entries e ON e.race_id=r.id GROUP BY r.id ORDER BY r.created_at DESC LIMIT 30');
  res.json({races:q.rows});
});
