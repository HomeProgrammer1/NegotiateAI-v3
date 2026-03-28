/**
 * server.js
 * NegotiateAI v3 — Call Center Demo Backend
 *
 * Architecture:
 *   Mic (agent) ──► WebSocket (PCM audio) ──► Gemini Live API
 *                                                  │ suggest_directive
 *   Camera (agent)                       ┌─────────┴──────────┐
 *     └──► WHIP ──► Smelter        NegotiateAI UI       POST /api/overlay
 *                      │           (agent sees hint)          │
 *                      ▼                              smelter.updateSuggestion()
 *                 WHEP output
 *                      │
 *                      ▼
 *               TV / projector
 *           (trainees see: camera + hint)
 *
 * HTTP API (port 3000):
 *   GET  /api/smelter-config  → WHIP/WHEP endpoints + bearer token
 *   GET  /api/room-config     → Fishjam roomId + agentToken
 *   POST /api/overlay         → { text } → push hint to Smelter overlay
 *   GET  /*                   → static files from ./ui/
 *
 * WebSocket (port 8765):
 *   Binary frames → PCM Float32 audio at 44.1kHz → resampled → Gemini
 *   JSON { type: "start" } → begin Gemini session
 *   JSON { type: "stop"  } → end session
 */

require('dotenv').config();

const http   = require('http');
const WebSocket = require('ws');
const fs     = require('fs');
const path   = require('path');
const net    = require('net');

const smelter = require('./smelterOverlay');
const GeminiClient = require('./geminiClient');
const { resampleFloat32To16kHz } = require('./audioResample');

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3000', 10);
const WS_PORT   = parseInt(process.env.WS_PORT   || '8765', 10);

const GEMINI_API_KEY           = process.env.GEMINI_API_KEY;
const FISHJAM_ID               = process.env.FISHJAM_ID;
const FISHJAM_MANAGEMENT_TOKEN = process.env.FISHJAM_MANAGEMENT_TOKEN;

if (!GEMINI_API_KEY) {
  console.error('[Config] ERROR: GEMINI_API_KEY is required in .env');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fishjam room (created once at startup)
// ─────────────────────────────────────────────────────────────────────────────

let fishjamRoomId     = null;
let fishjamAgentToken = null;

async function createFishjamRoom() {
  if (!FISHJAM_ID || !FISHJAM_MANAGEMENT_TOKEN) {
    console.warn('[Fishjam] FISHJAM_ID or FISHJAM_MANAGEMENT_TOKEN not set — skipping');
    return;
  }

  const baseUrl = `https://fishjam.io/api/v1/connect/${FISHJAM_ID}`;

  // Create room
  const roomRes = await fetch(`${baseUrl}/room`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${FISHJAM_MANAGEMENT_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!roomRes.ok) {
    throw new Error(`Fishjam room: ${roomRes.status} ${await roomRes.text()}`);
  }

  const roomData = await roomRes.json();
  fishjamRoomId  = roomData.data?.room?.id || roomData.id;

  // Create peer token for agent
  const peerRes = await fetch(`${baseUrl}/room/${fishjamRoomId}/peer`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${FISHJAM_MANAGEMENT_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ type: 'webrtc' }),
  });

  if (!peerRes.ok) {
    throw new Error(`Fishjam peer: ${peerRes.status} ${await peerRes.text()}`);
  }

  const peerData    = await peerRes.json();
  fishjamAgentToken = peerData.data?.peer?.token || peerData.token;

  console.log(`[Fishjam] ✅ Room created: ${fishjamRoomId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────────────────────────

const UI_DIR = path.join(__dirname, 'ui');
const MIME   = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
};

const httpServer = http.createServer((req, res) => {
  // Global CORS
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // ── GET /api/smelter-config ──────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/smelter-config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(smelter.getEndpoints()));
  }

  // ── PROXY /whip/* and /whep/* → Smelter on port 9000 ────────────────────
  if (req.url.startsWith('/whip/') || req.url.startsWith('/whep/')) {
    const options = {
      hostname: '127.0.0.1',
      port: 9000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:9000' },
    };
    const proxy = http.request(options, (smelterRes) => {
      res.writeHead(smelterRes.statusCode, smelterRes.headers);
      smelterRes.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('Smelter unavailable'); });
    req.pipe(proxy);
    return;
  }

  // ── GET /api/room-config ─────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/room-config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      fishjamUrl:  FISHJAM_ID ? `wss://fishjam.io/api/v1/connect/${FISHJAM_ID}` : null,
      agentToken:  fishjamAgentToken || null,
      roomId:      fishjamRoomId     || null,
    }));
  }

  // ── POST /api/overlay ────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/overlay') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        if (typeof text !== 'string' || !text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'text is required' }));
        }
        smelter.updateSuggestion(text.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  // ── Static files from ./ui/ ──────────────────────────────────────────────
  const urlPath  = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(UI_DIR, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(UI_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const mime = MIME[path.extname(filePath)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket server — agent audio → Gemini
// ─────────────────────────────────────────────────────────────────────────────

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (clientWs, req) => {
  const id = Date.now().toString(36);
  console.log(`[WS][${id}] Agent connected from ${req.socket.remoteAddress}`);

  let gemini        = null;
  let sessionActive = false;

  function send(obj) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(obj));
    }
  }

  // ── Gemini callbacks ───────────────────────────────────────────────────────

  function onSuggestion(type, message) {
    console.log(`[WS][${id}] Suggestion: ${type} — ${message}`);
    // 1. Send to agent UI
    send({ type: 'suggestion', signal: type, suggestion: message });
    // 2. Push to Smelter overlay (trainees see it on screen)
    smelter.updateSuggestion(message);
    // 3. Also available via POST /api/overlay for external triggers
  }

  function onTranscript(text) {
    send({ type: 'transcript', text });
  }

  // ── Session start ──────────────────────────────────────────────────────────

  async function startSession() {
    if (sessionActive) {
      return send({ type: 'status', message: 'Session already active' });
    }

    gemini = new GeminiClient(GEMINI_API_KEY, onSuggestion, onTranscript);

    try {
      await gemini.connect();
    } catch (err) {
      gemini = null;
      return send({ type: 'error', message: `Gemini connect failed: ${err.message}` });
    }

    sessionActive = true;
    send({ type: 'status', message: 'Session started — listening...' });
    console.log(`[WS][${id}] Session started`);
  }

  // ── Session stop ───────────────────────────────────────────────────────────

  function stopSession() {
    if (!sessionActive) return;
    sessionActive = false;
    if (gemini) { gemini.disconnect(); gemini = null; }
    send({ type: 'status', message: 'Session ended' });
    console.log(`[WS][${id}] Session stopped`);
  }

  // ── Message handler ────────────────────────────────────────────────────────

  clientWs.on('message', async (data, isBinary) => {
    // Binary = PCM Float32 audio from browser
    if (isBinary) {
      if (!sessionActive || !gemini) return;
      try {
        gemini.sendAudio(resampleFloat32To16kHz(data));
      } catch (err) {
        console.error(`[WS][${id}] Audio error: ${err.message}`);
      }
      return;
    }

    // JSON control messages
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return send({ type: 'error', message: 'Invalid JSON' });
    }

    switch (msg.type) {
      case 'start': await startSession(); break;
      case 'stop':  stopSession();        break;
      default:      send({ type: 'error', message: `Unknown type: ${msg.type}` });
    }
  });

  clientWs.on('close', () => {
    console.log(`[WS][${id}] Agent disconnected`);
    stopSession();
  });

  clientWs.on('error', err => console.error(`[WS][${id}] Error: ${err.message}`));

  send({ type: 'status', message: 'Connected to NegotiateAI backend' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────────────────────

async function start() {
  // 1. Smelter compositing pipeline
  await smelter.init().catch(err => {
    console.error('[Smelter] Failed to start:', err.message);
    console.error('[Smelter] Continuing without video compositing');
  });

  // 2. Fishjam room for agent camera broadcast
  await createFishjamRoom().catch(err => {
    console.warn('[Fishjam] Failed:', err.message);
  });

  // 3. HTTP server
  httpServer.listen(HTTP_PORT, () => {
    console.log(`[HTTP]   API + UI on http://localhost:${HTTP_PORT}`);
  });

  // 4. WebSocket server (already listening)
  console.log(`[WS]     Audio endpoint on ws://localhost:${WS_PORT}`);
  console.log('\n[Server] NegotiateAI v3 ready\n');
}

start();

// ─────────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ─────────────────────────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...');
  await smelter.terminate();
  wss.close();
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
