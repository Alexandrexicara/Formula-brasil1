# Formula Brasil 1

Jogo de corrida 3D para navegador, com Three.js e Vite. O frontend é publicado no Netlify; o serviço multiplayer fica preparado para hospedagem no Render.

## Rodar o jogo localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

O Netlify usa `netlify.toml` para executar `npm run build` e publicar a pasta `dist`.

## Controles

- W / seta para cima: acelerar
- S / seta para baixo: frear
- A/D ou setas esquerda/direita: direcionar
- C: alternar cockpit e câmera externa
- Esc: pausar

## Multiplayer — preparação

O diretório `server/` contém o servidor Node.js + Express + Socket.IO com fila de entrada, grids de até 20 vagas, evento de largada e corridas de 10 minutos.

Para iniciar o servidor:

```bash
npm run server
```

No Render, configure:
- Build command: `npm install`
- Start command: `npm run server`
- `CLIENT_ORIGIN=https://formula-brasil1.netlify.app`

No Netlify, configure a variável `VITE_SERVER_URL` com a URL pública do serviço Render e faça um novo deploy.

## O que ainda depende da configuração dos serviços

- Publicar o servidor Socket.IO no Render e configurar a URL no Netlify.
- Conectar Neon/PostgreSQL para contas, resultados e ranking persistentes.
- Implementar autenticação, sincronização/interpolação visual completa dos adversários e validação de corrida no servidor.
- Evoluir modelo 3D, física, áudio, danos e conteúdo das pistas.

O modo de treino local não depende do Render. A interface do grid online já está preparada, mas o multiplayer real só ficará disponível depois que o servidor for publicado e conectado.
