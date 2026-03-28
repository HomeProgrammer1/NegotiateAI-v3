/**
 * smelterOverlay.js
 * Smelter video compositing pipeline for NegotiateAI Call Center Demo.
 *
 * What it does:
 *   - WHIP input  — receives webcam stream from agent browser (WebRTC)
 *   - React overlay — renders AI coaching hint over the video
 *   - WHEP output  — sends composed video to TV/projector (WebRTC)
 *
 * Trainees see: agent camera + hint text at the bottom.
 */

const React       = require('react');
const { EventEmitter } = require('events');
const SmelterNode = require('@swmansion/smelter-node');
const { View, Text, InputStream } = require('@swmansion/smelter');

const Smelter  = SmelterNode.default;
const emitter  = new EventEmitter();

const RESOLUTION = { width: 1280, height: 720 };

let instance  = null;
const endpoints = { whipEndpoint: null, whepEndpoint: null, bearerToken: null };

// ─────────────────────────────────────────────────────────────────────────────
// React overlay rendered by Smelter (runs in compositor process)
// ─────────────────────────────────────────────────────────────────────────────

function OverlayApp() {
  const [hint, setHint]       = React.useState('');
  const [visible, setVisible] = React.useState(false);
  const timerRef              = React.useRef(null);

  React.useEffect(() => {
    function onHint(text) {
      setHint(text);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    }

    emitter.on('hint', onHint);
    return () => {
      emitter.off('hint', onHint);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return React.createElement(
    View,
    { style: { width: RESOLUTION.width, height: RESOLUTION.height } },

    // Agent webcam fills entire frame
    React.createElement(InputStream, {
      inputId: 'webcam',
      style:   { width: RESOLUTION.width, height: RESOLUTION.height },
    }),

    // Hint banner — bottom center, auto-hides after 8s
    visible && hint
      ? React.createElement(
          View,
          {
            style: {
              bottom:          48,
              left:            120,
              width:           1040,
              backgroundColor: '#000000CC',
              borderRadius:    10,
              padding:         18,
            },
          },
          React.createElement(
            Text,
            {
              style: {
                fontSize:   28,
                color:      '#FFFFFFFF',
                align:      'center',
                wrap:       'word',
                fontFamily: 'Verdana',
              },
            },
            `\u2192  ${hint}`
          )
        )
      : null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  console.log('[Smelter] Initializing...');
  instance = new Smelter();
  await instance.init();

  // WHIP — agent browser pushes webcam here
  const inputResult = await instance.registerInput('webcam', { type: 'whip_server' });
  endpoints.whipEndpoint = inputResult.endpointRoute;
  endpoints.bearerToken  = inputResult.bearerToken;

  // WHEP — trainees pull composited video from here
  const outputResult = await instance.registerOutput(
    'output',
    React.createElement(OverlayApp),
    {
      type:  'whep_server',
      video: {
        resolution: RESOLUTION,
        encoder:    { type: 'ffmpeg_h264' },
      },
    }
  );
  endpoints.whepEndpoint = outputResult.endpointRoute;

  await instance.start();
  console.log('[Smelter] ✅ Compositing active');
  console.log(`[Smelter] WHIP  → http://localhost:9000${endpoints.whipEndpoint}`);
  console.log(`[Smelter] WHEP  ← http://localhost:9000${endpoints.whepEndpoint}`);

  return { ...endpoints };
}

/**
 * Push coaching hint text into the Smelter React overlay.
 * Called from server.js when Gemini fires suggest_directive.
 * @param {string} text
 */
function updateSuggestion(text) {
  console.log(`[Smelter] Overlay: "${text}"`);
  emitter.emit('hint', text);
}

function getEndpoints() {
  return { ...endpoints };
}

async function terminate() {
  if (instance) {
    await instance.terminate();
    instance = null;
    console.log('[Smelter] Terminated');
  }
}

module.exports = { init, updateSuggestion, getEndpoints, terminate };
