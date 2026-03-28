// ── FISHJAM + SMELTER ─────────────────────────────────────────────────────────
const BACKEND = 'https://flavorous-ungroomed-ardis.ngrok-free.dev';

async function initFishjam(cameraStream) {
  try {
    const cfg = await fetch(`${BACKEND}/api/room-config`).then(r => r.json());
    if (!cfg.agentToken) { console.warn('[Fishjam] No token'); return; }

    const { FishjamClient } = window.FishjamBrowserSDK;
    const client = new FishjamClient();
    await client.connect({ url: cfg.fishjamUrl, token: cfg.agentToken });
    await client.addTrack(cameraStream.getVideoTracks()[0], { simulcast: false });
    console.log('[Fishjam] Camera published to room', cfg.roomId);
  } catch(e) { console.warn('[Fishjam]', e.message); }
}

async function initWhipToSmelter(stream) {
  try {
    const cfg = await fetch(`${BACKEND}/api/smelter-config`).then(r => r.json()).catch(() => null);
    if (!cfg?.whipEndpoint) { console.warn('[Smelter] WHIP not ready'); return; }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise(r => {
      if (pc.iceGatheringState === 'complete') return r();
      pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r();
      setTimeout(r, 3000);
    });
    const answer = await fetch(`https://flavorous-ungroomed-ardis.ngrok-free.dev${cfg.whipEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp', 'Authorization': `Bearer ${cfg.bearerToken}` },
      body: pc.localDescription.sdp
    }).then(r => r.text());
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    console.log('[Smelter] WHIP connected');
  } catch(e) { console.warn('[WHIP]', e.message); }
}

async function initWhepFromSmelter() {
  try {
    const cfg = await fetch(`${BACKEND}/api/smelter-config`).then(r => r.json()).catch(() => null);
    if (!cfg?.whepEndpoint) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.ontrack = e => { document.getElementById('smelter-out').srcObject = e.streams[0]; };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise(r => {
      if (pc.iceGatheringState === 'complete') return r();
      pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && r();
      setTimeout(r, 3000);
    });
    const answer = await fetch(`https://flavorous-ungroomed-ardis.ngrok-free.dev${cfg.whepEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription.sdp
    }).then(r => r.text());
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    console.log('[Smelter] WHEP connected — trainee view active');
  } catch(e) { console.warn('[WHEP]', e.message); }
}

// ── i18n Dictionary ──

// ── i18n Dictionary ──
const translations = {
  en: {
    role: "Head of Procurement · Comarch S.A.",
    zopaTitle: "Negotiation Space (ZOPA)",
    ourZone: "Our Zone",
    clientZone: "Client Zone",
    gazeZone: "gaze zone · camera",
    phaseCoop: "Phase: Cooperation",
    phaseOpp: "Phase: Confrontation",
    whatToSay: "→ what to say",
    factsData: "← facts · data",
    compMentioned: "⚡ Competitor mentioned",
    bcItem1: "SAP impl: 6–18 mos. — launch in 2 weeks",
    bcItem2: "40% lower TCO with similar features",
    bcItem3: "Native Zoom/Teams integration, no install",
    close: "Close",
    clientPrefix: "Client",
    youPrefix: "You",
    ourMinStr: "Our min: €",
    theirMaxStr: "Their max: €",
    agenda: ['Rapport & Agenda', 'Discovery (Pain)', 'Pitch / Demo', 'Trading (ZOPA)', 'Next Steps'],
  },
  pl: {
    role: "Dyrektor ds. Zakupów · Comarch S.A.",
    zopaTitle: "Przestrzeń negocjacji (ZOPA)",
    ourZone: "Nasza strefa",
    clientZone: "Strefa klienta",
    gazeZone: "strefa wzroku · kamera",
    phaseCoop: "Faza: Kooperacja",
    phaseOpp: "Faza: Konfrontacja",
    whatToSay: "→ co powiedzieć",
    factsData: "← fakty · dane",
    compMentioned: "⚡ Wspomniano konkurencję",
    bcItem1: "Wdrożenie SAP: 6–18 mies. — start w 2 tyg.",
    bcItem2: "TCO o 40% niższe przy podobnych funkcjach",
    bcItem3: "Natywna integracja Zoom/Teams, brak instalacji",
    close: "Zamknij",
    clientPrefix: "Klient",
    youPrefix: "Ty",
    ourMinStr: "Nasz min: €",
    theirMaxStr: "Ich max: €",
    agenda: ['Rapport & Agenda', 'Odkrywanie (Bóle)', 'Pitch / Demo', 'Negocjacje (ZOPA)', 'Kolejne kroki'],
  },
  ua: {
    role: "Директор із закупівель · Comarch S.A.",
    zopaTitle: "Простір торгів (ZOPA)",
    ourZone: "Наша зона",
    clientZone: "Зона клієнта",
    gazeZone: "зона погляду · камера",
    phaseCoop: "Фаза: Кооперація",
    phaseOpp: "Фаза: Протистояння",
    whatToSay: "→ що сказати",
    factsData: "← факти · дані",
    compMentioned: "⚡ Згадано конкурента",
    bcItem1: "Впровадження SAP: 6–18 міс. — старт за 2 тижні",
    bcItem2: "TCO на 40% нижче при аналогічних функціях",
    bcItem3: "Нативна інтеграція з Zoom/Teams, без установки",
    close: "Закрити",
    clientPrefix: "Клієнт",
    youPrefix: "Ви",
    ourMinStr: "Наш мін: €",
    theirMaxStr: "Їхній макс: €",
    agenda: ['Рапорт & Agenda', 'Діскавері (Болі)', 'Пітч / Демо', 'Торги (ZOPA)', 'Next Steps'],
  },
  ru: {
    role: "Директор по закупкам · Comarch S.A.",
    zopaTitle: "Пространство торга (ZOPA)",
    ourZone: "Наша зона",
    clientZone: "Зона клиента",
    gazeZone: "зона взгляда · камера",
    phaseCoop: "Фаза: Кооперация",
    phaseOpp: "Фаза: Противостояние",
    whatToSay: "→ что сказать",
    factsData: "← факты · данные",
    compMentioned: "⚡ Конкурент упомянут",
    bcItem1: "Внедрение SAP: 6–18 мес. — старт за 2 недели",
    bcItem2: "TCO на 40% ниже при аналогичных функциях",
    bcItem3: "Нативная интеграция с Zoom/Teams, без установки",
    close: "Закрыть",
    clientPrefix: "Клиент",
    youPrefix: "Вы",
    ourMinStr: "Наш мин: €",
    theirMaxStr: "Их макс: €",
    agenda: ['Раппорт & Agenda', 'Дискавери (Боли)', 'Питч / Демо', 'Торги (ZOPA)', 'Next Steps'],
  }
};

let currentLang = 'en';

window.setLanguage = function(lang) {
  currentLang = lang;
  document.getElementById('html-root').lang = lang;
  
  const selectEl = document.getElementById('lang-select');
  if (selectEl && selectEl.value !== lang) selectEl.value = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  updateHybridAgenda(true); 
  updatePhaseText();
  updateRatioLabels();
  forceZopaLabelsUpdate();
};

// ── TIMER & AGENDA ──
let secs = 0;
const agendaLimits = [3 * 60, 12 * 60, 25 * 60, 35 * 60, 40 * 60];
const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

function updateHybridAgenda(forceRebuild = false) {
  const container = document.getElementById('agenda-steps');
  if (!container) return;
  if (container.children.length === 0 || forceRebuild) {
    container.innerHTML = '';
    agendaLimits.forEach((_, i) => {
      const el = document.createElement('div');
      el.id = `step-${i}`;
      container.appendChild(el);
    });
  }

  const t = translations[currentLang];
  let currentFound = false;
  
  agendaLimits.forEach((limit, i) => {
    const stepName = t.agenda[i];
    const el = document.getElementById(`step-${i}`);
    if(!el) return;
    const prevLimit = i === 0 ? 0 : agendaLimits[i - 1];
    const stepDuration = limit - prevLimit;

    if (secs >= limit) {
      if (!currentFound && i === agendaLimits.length - 1) {
        currentFound = true;
        const elapsed = secs - prevLimit;
        el.className = 'g-step active danger';
        if (!el.querySelector('.g-fill')) {
          el.innerHTML = `<div class="g-active-top"><div class="g-active-title"><div class="g-dot"></div>${stepName}</div><div class="g-time" id="time-${i}"></div></div><div class="g-bar"><div class="g-fill" id="fill-${i}" style="width: 100%;"></div></div>`;
        } else if (forceRebuild) {
           el.querySelector('.g-active-title').innerHTML = `<div class="g-dot"></div>${stepName}`;
        }
        document.getElementById(`time-${i}`).textContent = `+${formatTime(elapsed - stepDuration)}`;
      } else {
        el.className = 'g-step done';
        el.innerHTML = '';
      }
    } else if (!currentFound) {
      currentFound = true;
      const elapsed = secs - prevLimit;
      const pct = Math.min((elapsed / stepDuration) * 100, 100);

      let stateClass = '';
      if (pct >= 90) stateClass = 'danger';
      else if (pct >= 75) stateClass = 'warn';

      el.className = `g-step active ${stateClass}`;
      
      if (!el.querySelector('.g-fill')) {
         el.innerHTML = `<div class="g-active-top"><div class="g-active-title"><div class="g-dot"></div>${stepName}</div><div class="g-time" id="time-${i}"></div></div><div class="g-bar"><div class="g-fill" id="fill-${i}"></div></div>`;
      } else if (forceRebuild) {
         el.querySelector('.g-active-title').innerHTML = `<div class="g-dot"></div>${stepName}`;
      }
      document.getElementById(`time-${i}`).textContent = `${formatTime(elapsed)} / ${formatTime(stepDuration)}`;
      document.getElementById(`fill-${i}`).style.width = `${pct}%`;

    } else {
      el.className = 'g-step upcoming';
      el.innerHTML = stepName;
    }
  });
}

let timerInterval = null;

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    secs++;
    document.getElementById('timer').textContent = formatTime(secs);
    updateHybridAgenda();
  }, 1000);
}

function resetTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  secs = 0;
  document.getElementById('timer').textContent = formatTime(secs);
  updateHybridAgenda();
}

updateHybridAgenda();

// ── NEGOTIATION MODE & ZOPA DYNAMICS ──
let currentPhase = null;
let currentSentiment = "Neutral";

function updatePhaseText() {
    const el = document.getElementById('mode-glow');
    const txt = document.getElementById('mode-text');
    if(!txt || !el) return;

    if (!currentPhase) {
        txt.textContent = `Phase: Awaiting AI...`;
        el.className = 'mode-glow coop';
        txt.className = 'mode-text coop';
        txt.style.color = "var(--blue)";
        txt.style.textShadow = "0 0 12px rgba(59,130,246,0.6)";
        el.style.background = "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 75%)";
        return;
    }

    txt.textContent = `Phase: ${currentPhase}`;
    
    if (currentSentiment === "Positive") {
        el.className = 'mode-glow coop';
        txt.className = 'mode-text coop';
    } else if (currentSentiment === "Friction") {
        el.className = 'mode-glow opp';
        txt.className = 'mode-text opp';
    } else {
        // Neutral (custom look or fallback to coop)
        el.className = 'mode-glow coop';
        txt.className = 'mode-text coop';
        txt.style.color = "var(--blue)";
        txt.style.textShadow = "0 0 12px rgba(59,130,246,0.6)";
        el.style.background = "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.20) 0%, transparent 75%)";
    }
}

const BASE_MIN = 20; 
const BASE_MAX = 200; 
let usMinVal = null; 
let lastThemMaxVal = null;

function updateZopaVisuals() {
    const zUs = document.getElementById('z-us');
    const zThem = document.getElementById('z-them');
    const lUsMin = document.getElementById('l-us-min');
    const lThemMax = document.getElementById('l-them-max');
    const zopa = document.getElementById('z-zopa');
    if(!zUs) return;

    if (usMinVal === null || lastThemMaxVal === null) {
        zUs.style.display = 'none';
        zThem.style.display = 'none';
        zopa.classList.remove('active');
        zopa.textContent = '';
        return;
    }
    
    zUs.style.display = 'block';
    zThem.style.display = 'block';

    const usMinPct = ((usMinVal - BASE_MIN) / (BASE_MAX - BASE_MIN)) * 100;
    const themMaxPct = ((lastThemMaxVal - BASE_MIN) / (BASE_MAX - BASE_MIN)) * 100;

    zUs.style.left = usMinPct + '%';
    zThem.style.right = (100 - themMaxPct) + '%';
    lUsMin.style.left = usMinPct + '%';
    lThemMax.style.left = themMaxPct + '%';
    
    forceZopaLabelsUpdate();

    if (usMinPct < themMaxPct) {
        zopa.style.left = usMinPct + '%';
        zopa.style.right = (100 - themMaxPct) + '%';
        zopa.classList.add('active');
        zopa.textContent = `ZOPA (€${lastThemMaxVal - usMinVal}k)`;
    } else {
        zopa.classList.remove('active');
        zopa.textContent = '';
    }
}

function forceZopaLabelsUpdate() {
  const t = translations[currentLang];
  const lUsMin = document.getElementById('l-us-min');
  const lThemMax = document.getElementById('l-them-max');
  if(lUsMin && usMinVal !== null) lUsMin.textContent = `${t.ourMinStr}${usMinVal}k`;
  else if (lUsMin) lUsMin.textContent = '';
  
  if(lThemMax && lastThemMaxVal !== null) lThemMax.textContent = `${t.theirMaxStr}${lastThemMaxVal}k`;
  else if (lThemMax) lThemMax.textContent = '';
}


// ── WAVEFORM & TALK-TO-LISTEN RATIO ──
let ratioUs = 0.50;
let speaking = false; 

function updateRatioLabels() {
    const t = translations[currentLang];
    const sThem = document.getElementById('sr-them');
    const sUs = document.getElementById('sr-us');
    if(sThem) sThem.textContent = `${t.clientPrefix}: ${Math.round((1 - ratioUs) * 100)}%`;
    if(sUs) sUs.textContent = `${t.youPrefix}: ${Math.round(ratioUs * 100)}%`;
}

// Waveform drawing
(function() {
  const cv = document.getElementById('wv');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const N = 40; 
  let h   = Array.from({length:N}, () => Math.random()*0.2+0.05);
  let tgt = Array.from({length:N}, () => Math.random()*0.2+0.05);
  let f = 0;

  function draw() {
    ctx.clearRect(0,0,cv.width,cv.height);
    const bw = cv.width/N, cy = cv.height/2;

    if (f % 60 === 0) {
        // Very slow smoothing of ratio based on speaking var from VAD
        ratioUs += (speaking ? -0.005 : 0.005);
        ratioUs = Math.max(0.1, Math.min(ratioUs, 0.9));
        updateRatioLabels();
        
        document.getElementById('sr-them').className = !speaking ? 'sr-them sr-active' : 'sr-them sr-inactive';
        document.getElementById('sr-us').className = speaking ? 'sr-us sr-active' : 'sr-us sr-inactive';
    }

    h = h.map((v,i) => v + (tgt[i]-v)*0.2);

    if (f%4===0) {
      tgt = tgt.map((_,i) => {
        const isUsBar = (i / N) >= (1 - ratioUs);
        const isActiveSide = isUsBar ? !speaking : speaking; // system loopback is usually the other party (Client)
        if (isActiveSide) { 
            const w = Math.sin(f*0.04+i*0.5)*0.25+0.3; 
            return Math.random()*w+0.1; 
        }
        return Math.random()*0.1+0.02; 
      });
    }

    h.forEach((bh,i) => {
      const x=i*bw+bw*0.18, w=bw*0.64, barH=bh*cv.height*0.88;
      const isUsBar = (i / N) >= (1 - ratioUs);
      const isActiveSide = isUsBar ? !speaking : speaking;

      const a = isActiveSide ? Math.min(0.45+bh*0.95, 1) : 0.25;
      ctx.fillStyle = isUsBar ? `rgba(59,130,246,${a})` : `rgba(168,85,247,${a})`;

      const r=w/2, y=cy-barH/2;
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+barH-r); ctx.arcTo(x+w,y+barH,x+w-r,y+barH,r);
      ctx.lineTo(x+r,y+barH); ctx.arcTo(x,y+barH,x,y+barH-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); ctx.fill();
    });
    f++; requestAnimationFrame(draw);
  }
  draw();
})();

// ── BATTLECARD ──
let bcSecs = 10, bcInt = null;
window.hideCard = function() {
  const el = document.getElementById('bc');
  if(el) el.classList.remove('show');
  if (bcInt) clearInterval(bcInt);
}

function showBattlecard(competitorName, points, duration_s = 15) {
  const bc = document.getElementById('bc');
  if(!bc) return;
  
  bc.querySelector('.bc-title').textContent = `NegotiateAI vs ${competitorName}`;
  const list = bc.querySelector('.bc-list');
  list.innerHTML = '';
  points.forEach(pt => {
      const div = document.createElement('div');
      div.className = 'bc-item';
      div.textContent = pt;
      list.appendChild(div);
  });
  
  bcSecs = duration_s;
  bc.classList.add('show');
  document.getElementById('bc-t').textContent = `${bcSecs}s`;
  document.getElementById('bc-fill').style.width = '100%';
  document.getElementById('bc-fill').style.transition = `width ${duration_s}s linear`;
  
  setTimeout(() => { document.getElementById('bc-fill').style.width = '0%'; }, 50);

  if (bcInt) clearInterval(bcInt);
  bcInt = setInterval(() => {
    bcSecs--;
    document.getElementById('bc-t').textContent = `${bcSecs}s`;
    if (bcSecs <= 0) hideCard();
  }, 1000);
}


// ── DIRECTIVES ──
function showDirective(type, message) {
    const el = document.getElementById('hint');
    const textNode = document.getElementById('hint-text');
    if(!el) return;
    
    el.classList.add('fadeout');
    setTimeout(() => {
        textNode.textContent = message;
        if(type === 'warning') {
            el.style.background = 'rgba(239,68,68,0.07)';
            el.style.border = '1px solid rgba(239,68,68,0.18)';
        } else {
            el.style.background = 'rgba(59,130,246,0.07)';
            el.style.border = '1px solid rgba(59,130,246,0.18)';
        }
        el.classList.remove('fadeout');
    }, 360);
}

// ── TRIGGERS ──
function addTrigger(emoji, label) {
    const log = document.getElementById('trigger-log');
    if(!log) return;
    const div = document.createElement('div');
    div.className = 'trig fresh';
    const t = formatTime(secs);
    div.textContent = `${emoji || '⚡'} ${label} · ${t}`;
    log.prepend(div);
    
    // remove fresh class slowly
    setTimeout(() => div.classList.remove('fresh'), 3000);
}


// ── GEMINI LIVE API INTEGRATION ──

let ws;
let audioCtx;
let source;
let processor;
let mediaStream;
let intentionalStop = false;
window.sessionLogs = [];

// Dev Console
window.toggleDevConsole = function() {
    const dc = document.getElementById('dev-console');
    if(!dc) return;
    if (dc.style.display === 'none' || dc.style.display === '') {
        dc.style.display = 'flex';
    } else {
        dc.style.display = 'none';
    }
}

function logToDevConsole(type, data) {
    const logs = document.getElementById('dev-logs');
    if(!logs) return;
    
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.style.borderRadius = '5px';
    div.style.wordBreak = 'break-all';
    div.style.whiteSpace = 'pre-wrap';

    if (type === 'SENT') {
        div.style.background = 'rgba(59,130,246,0.1)';
        div.style.border = '1px solid rgba(59,130,246,0.2)';
        div.style.color = '#93c5fd'; // blue-300
    } else if (type === 'RECV') {
        div.style.background = 'rgba(168,85,247,0.1)';
        div.style.border = '1px solid rgba(168,85,247,0.2)';
        div.style.color = '#d8b4fe'; // purple-300
    } else {
        div.style.background = 'rgba(239,68,68,0.1)';
        div.style.border = '1px solid rgba(239,68,68,0.2)';
        div.style.color = '#fca5a5'; // red-300
    }

    let payloadStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    // don't log raw binary audio to console
    if (payloadStr.includes('"mimeType": "audio/pcm;rate=16000"')) {
        payloadStr = '{ realtimeInput: { audio: [PCM Data...] } }';
    }

    div.textContent = `[${type}] ${new Date().toLocaleTimeString()}\n${payloadStr}`;
    logs.prepend(div);
}

const toolDeclarations = [
  {
    name: "update_zopa",
    description: "Update ZOPA panel when numerical terms are mentioned in the conversation.",
    parameters: {
      type: "object",
      properties: {
        ourWalkaway: { type: "number", description: "Our minimum/walkaway price in €k (if revealed)" },
        clientMentionedBudget: { type: "number", description: "Budget the client mentioned in €k" },
        currentOffer: { type: "number", description: "Current offer on table in €k" }
      }
    }
  },
  {
    name: "update_analytics",
    description: "Update the phase of negotiation and sentiment.",
    parameters: {
      type: "object",
      properties: {
        phase: { type: "string", enum: ["Rapport","Discovery","Negotiation","Closing"] },
        sentiment: { type: "string", enum: ["Positive","Neutral","Friction"] }
      }
    }
  },
  {
    name: "suggest_directive",
    description: "Give a direct coaching hint to the seller based on exactly what was just said.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["tactic","warning"] },
        message: { type: "string", description: "A very short, punchy instruction (max 10 words)" }
      },
      required: ["type","message"]
    }
  },
  {
    name: "show_battlecard",
    description: "Show a competitor battlecard when a competitor is mentioned.",
    parameters: {
      type: "object",
      properties: {
        competitorName: { type: "string" },
        talkingPoints: { type: "array", items: { type: "string" } },
        displaySeconds: { type: "number" }
      },
      required: ["competitorName","talkingPoints"]
    }
  },
  {
    name: "add_trigger",
    description: "Add a minor event chip to the log (like 'budget gap' or 'pause 7s' or 'contradiction').",
    parameters: {
      type: "object",
      properties: {
        emoji: { type: "string", description: "A single emoji representing the event" },
        label: { type: "string", description: "Short textual description (max 3 words)" }
      },
      required: ["label"]
    }
  }
];

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function startAudioCapture(stream) {
  mediaStream = stream;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  source = audioCtx.createMediaStreamSource(stream);
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  
  source.connect(processor);
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0; 
  processor.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const pcm16 = new Int16Array(inputData.length);
    let sumSquares = 0;
    for (let i = 0; i < inputData.length; i++) {
        let val = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
        sumSquares += val * val;
    }
    
    const rms = Math.sqrt(sumSquares / inputData.length);
    speaking = rms > 0.01; 

    if (ws && ws.readyState === WebSocket.OPEN) {
      const audioPayload = {
        realtimeInput: {
          audio: {
            data: arrayBufferToBase64(pcm16.buffer),
            mimeType: "audio/pcm;rate=16000"
          }
        }
      };
      ws.send(JSON.stringify(audioPayload));
      // purposefully NOT logging audio chunks to dev console to avoid freezing UI
    }
  };
}

function handleToolCall(tc) {
    const fn = tc.functionCalls[0];
    if (!fn) return;
    
    console.log("[GEMINI TOOL CALL]", fn.name, fn.args);
    const args = fn.args;

    if (fn.name === "update_zopa") {
        if(args.ourWalkaway) usMinVal = args.ourWalkaway;
        if(args.clientMentionedBudget) lastThemMaxVal = args.clientMentionedBudget; 
        updateZopaVisuals();
    } 
    else if (fn.name === "update_analytics") {
        if(args.phase) currentPhase = args.phase;
        if(args.sentiment) currentSentiment = args.sentiment;
        updatePhaseText();
    }
    else if (fn.name === "suggest_directive") {
        showDirective(args.type, args.message);
        fetch(`${BACKEND}/api/overlay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: args.message })
        }).catch(() => {});
    }
    else if (fn.name === "show_battlecard") {
        showBattlecard(args.competitorName, args.talkingPoints, args.displaySeconds || 15);
    }
    else if (fn.name === "add_trigger") {
        addTrigger(args.emoji, args.label);
    }

    // Acknowledge the tool call
    if (ws && ws.readyState === WebSocket.OPEN) {
        const toolRes = {
            toolResponse: {
                functionResponses: [{
                    id: fn.id,
                    name: fn.name,
                    response: { result: "ok" }
                }]
            }
        };
        ws.send(JSON.stringify(toolRes));
        logToDevConsole("SENT", toolRes);
    }
}

function stopSession() {
  const intentionallyStopped = intentionalStop === false; // If intentionalStop wasn't already true, the user actively fired the click.
  intentionalStop = true;
  if (processor) processor.disconnect();
  if (source) source.disconnect();
  if (audioCtx) audioCtx.close();
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  if (ws) ws.close();

  if (intentionallyStopped) {
      if (window.sessionLogs && window.sessionLogs.length > 0) {
          const formattedLogs = window.sessionLogs.map(log => {
              try { return JSON.stringify(JSON.parse(log), null, 2); }
              catch(e) { return log; }
          }).join("\n\n========================================\n\n");
          
          const logBlob = new Blob([formattedLogs], {type: "text/plain"});
          const url = URL.createObjectURL(logBlob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `gemini-session-${Date.now()}.txt`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          a.remove();
          window.sessionLogs = [];
      }
  }

  resetTimer();
  document.getElementById('status-text').textContent = 'Idle';
  document.getElementById('status-dot').style.background = 'var(--muted)';
  document.getElementById('status-dot').style.animation = 'none';
  const btn = document.getElementById('btn-session');
  btn.textContent = '🎙 Start Session';
  btn.style.background = 'var(--blue)';
  btn.onclick = window.startSession;
  speaking = false;
}

window.startSession = async function() {
  intentionalStop = false;
  
  const apiKeyInp = document.getElementById('api-key-input');
  if(!apiKeyInp || !apiKeyInp.value.trim()) {
      alert("Please enter a Google Gemini API Key first.");
      return;
  }
  const API_KEY = apiKeyInp.value.trim();
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  const src = document.getElementById('audio-src').value;
  try {
    let stream;
    if (src === 'system') {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: false, audio: { echoCancellation: false, noiseSuppression: false } });
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    document.getElementById('status-text').textContent = 'Connecting...';
    
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      const setupObj = {
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"]
          },
          systemInstruction: {
            parts: [{ text: `You are an expert negotiation AI observing a live sales call. 
You MUST act instantly on every utterance by using one of your tools.
1. ANY time a number, budget, price, or cost is mentioned (e.g. 100, 200k, dollars, euros), YOU MUST call 'update_zopa' with the extracted numbers.
2. ANY time a competitor is mentioned (e.g. SAP, Oracle, Salesforce), YOU MUST call 'show_battlecard'.
3. Every time someone finishes a thought, YOU MUST call 'update_analytics' to assess the phase.
4. If you have advice, call 'suggest_directive'.

Do NOT just listen silently. You are required to call a tool every time you process speech!` }]
          },
          tools: [{ functionDeclarations: toolDeclarations }]
        }
      };
      
      ws.send(JSON.stringify(setupObj));
      logToDevConsole("SENT", setupObj);

      // Wait for setupComplete before streaming
      
      document.getElementById('status-text').textContent = 'Connecting...';
      
      const btn = document.getElementById('btn-session');
      btn.textContent = '⏹ Stop Session';
      btn.style.background = 'var(--red)';
      btn.onclick = stopSession;
    };
    
    ws.onmessage = async (evt) => {
        let msgStr = evt.data;
        if (evt.data instanceof Blob) {
            msgStr = await evt.data.text();
        }
        
        // VISUAL MARKER FOR THE USER
        console.log("WS RECV:", msgStr);
        window.sessionLogs.push(msgStr);
        logToDevConsole("RECV", msgStr);
        
        try {
            document.getElementById('status-text').textContent = 'Recv: ' + msgStr.substring(0, 30) + '...';
        } catch(e) {}

        let msg;
        try { msg = JSON.parse(msgStr); } catch(e){ 
            console.error("JSON Error", e, msgStr);
            return; 
        }
        
        if (msg.setupComplete) {
            startAudioCapture(stream);
            startTimer();
            document.getElementById('status-text').textContent = 'Listening (Setup OK)';
            document.getElementById('status-dot').style.background = 'var(--green)';
            document.getElementById('status-dot').style.animation = 'pulse 2s infinite';
            addTrigger('✅', 'Connected & Listening');

            // Камера агента → Fishjam + Smelter
            navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(camStream => {
              const videoLocal = document.getElementById('video-local');
              if (videoLocal) videoLocal.srcObject = camStream;
              initFishjam(camStream);
              initWhipToSmelter(camStream);
              setTimeout(() => initWhepFromSmelter(), 2000);
            }).catch(e => console.warn('[Camera]', e.message));
        }

        if(msg.toolCall) {
            handleToolCall(msg.toolCall);
        }
        
        if(msg.serverContent) {
            // It sent a raw text or audio reply
            console.log("Server responded with content:", msg.serverContent);
        }
    };
    
    ws.onclose = (evt) => {
        console.log("WebSocket Closed: code=" + evt.code + " reason=" + evt.reason);
        if (!intentionalStop && evt.code === 1011) {
            console.log("Auto-reconnecting due to 1011...");
            stopSession();
            setTimeout(() => window.startSession(), 1000);
        } else {
            stopSession();
        }
    };
    ws.onerror = (e) => {
        console.error("Gemini WebSocket Error:", e);
        logToDevConsole("ERROR", "WebSocket Error occurred.");
        if (!intentionalStop) {
            stopSession();
            setTimeout(() => window.startSession(), 1000);
        }
    };
  } catch(e) {
    console.error("Error starting session:", e);
    alert("Could not start audio stream. " + e.message);
  }
};

// Start logic wire up
window.onload = () => {
  setLanguage('en');
  updateZopaVisuals();
  
  const btn = document.getElementById('btn-session');
  if(btn) btn.onclick = window.startSession;
};
