# Formula Brasil 1

Jogo de corrida 3D para navegador. Frontend Three.js/Vite no Netlify, servidor Node.js/Socket.IO no Render e PostgreSQL no Neon.

## Netlify
Build: `npm install && npm run build`; publish: `dist`. Defina `VITE_SERVER_URL` com a URL HTTPS do Render.

## Render
Use o Blueprint `render.yaml`. Build: `npm install`; Start: `npm run server`; Health check: `/api/health`.
Configure `DATABASE_URL` com a connection string Neon (pooler) e `JWT_SECRET` (gerado pelo Blueprint). `CLIENT_ORIGIN` deve conter `https://formula-brasil1.netlify.app`.

## Neon
Projeto `formula-brasil1`, banco `formula_br1`. Tabelas criadas: players, races, race_entries, player_stats e race_events.

## API
- POST `/api/auth/register` — {username,email,password}
- POST `/api/auth/login` — {login,password}
- GET `/api/me` — Bearer token
- GET `/api/leaderboard`
- GET `/api/races/recent`
- GET `/api/health`

## Multiplayer
Socket.IO com autenticação JWT, salas com até 20 pilotos, largada após 30 segundos ou ao preencher o grid, corridas de 10 minutos e transmissão de estado entre participantes.

## Controles
W/↑ acelera; S/↓ freia; A/D ou setas direcionam; C alterna cockpit/externa; Esc pausa.

## Pendências para ativação e conclusão
Configurar variáveis do Render e Netlify, testar conexão real, conectar interface de cadastro/login, renderizar carros remotos no cliente, classificação e encerramento de resultados, física autoritativa, reconexão e testes de carga. Até esses testes, não considerar o multiplayer pronto.
