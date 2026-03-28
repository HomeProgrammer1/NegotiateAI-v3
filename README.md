<div align="center">

# 🎯 NegotiateAI

### Real-time AI negotiation coach

**Detects objections live and surfaces the right tactic in under 800ms.**

*Not a chatbot — a tactical layer on the conversation.*

[![Hackathon](https://img.shields.io/badge/Software_Mansion_x_Gemini-Hackathon_2026-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://www.kaggle.com/)
[![Track](https://img.shields.io/badge/Track_2-Gemini_Live_API-FF6F00?style=for-the-badge)](https://www.kaggle.com/)
[![Location](https://img.shields.io/badge/📍-Kraków_2026-E91E63?style=for-the-badge)](https://www.kaggle.com/)

---

<br>

> *Your rep has 3 seconds.*
> *The buyer just said something unexpected.*
> *The wrong answer loses the deal.*

<br>

</div>

## The Problem

Sales reps lose deals not because they don't know the answer — but because they can't access it **under pressure**.

Post-call tools like Gong tell you what went wrong. By then, the deal is gone.

There's a gap between **knowing** the right response and **delivering** it in real-time when a buyer throws an unexpected objection, asks a hardball question, or shifts the negotiation dynamic.

**NegotiateAI closes that gap.**

## How It Works

NegotiateAI listens to your live sales call and provides a real-time overlay with tactical coaching — the right word, at the right second.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🎙️  Live Call (Fishjam Video Room)                        │
│   ┌───────────────────────────────────────────────────┐     │
│   │                                                   │     │
│   │         Your video call runs normally              │     │
│   │                                                   │     │
│   │   ┌─────────────────────────────────────────┐     │     │
│   │   │  💡 TACTIC: Mirror their last phrase,   │     │     │
│   │   │  then reframe around value delivered.   │     │     │
│   │   │                                         │     │     │
│   │   │  "So it's really about timeline..."     │     │     │
│   │   └─────────────────────────────────────────┘     │     │
│   │              ▲ Smelter Overlay                     │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
│   🧠 Gemini Live API ← audio stream ← mic                  │
│      Latency: < 800ms from objection → tactic on screen     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pipeline

1. **Audio capture** — Mic stream from the live call
2. **Gemini Live API** — Streams audio in real-time, detects objections, classifies negotiation dynamics
3. **Tactic engine** — Maps detected patterns to proven negotiation frameworks (Chris Voss, SPIN Selling, Challenger Sale)
4. **Smelter overlay** — Renders coaching cards directly on top of the video call UI — no tab switching, no distraction

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Video rooms** | [Fishjam](https://fishjam.io/) (by Software Mansion) | WebRTC video infrastructure |
| **Overlay rendering** | [Smelter](https://github.com/software-mansion/smelter) | Composites coaching UI on top of live video |
| **AI / Audio analysis** | [Gemini Live API](https://ai.google.dev/gemini-api/docs/live) | Real-time audio streaming + objection detection |
| **Frontend** | TypeScript + React | Application shell |

## Architecture

```
Browser (Rep's screen)
  │
  ├── Mic audio ──► Gemini Live API (WebSocket)
  │                     │
  │                     ├── Objection detected?
  │                     │       │
  │                     │       ▼
  │                     │   Tactic selection
  │                     │       │
  │                     ▼       ▼
  │                 Response payload
  │                     │
  ├── Fishjam Room ◄────┘
  │       │
  │       ▼
  └── Smelter Overlay ──► Coaching card rendered
                          (< 800ms end-to-end)
```

## Key Design Decisions

- **Browser-side audio routing** — Avoids extra hop through a backend proxy; keeps latency minimal
- **Overlay, not sidebar** — Smelter composites directly onto the video feed so the rep never looks away from the buyer's face
- **Streaming, not request-response** — Gemini Live API maintains a persistent WebSocket session; no cold-start penalty per utterance
- **Session management** — Uses `contextWindowCompression` + session resumption to handle long calls without hitting token limits

## Latency Budget

| Step | Target |
|------|--------|
| Audio capture → Gemini | ~100ms |
| Gemini processing | ~500ms |
| Tactic rendering | ~200ms |
| **End-to-end** | **< 800ms** |

## Getting Started

### Prerequisites

- Node.js 18+
- Gemini API key ([get one here](https://aistudio.google.com/apikey))
- Fishjam server instance

### Installation

```bash
git clone https://github.com/your-org/negotiate-ai.git
cd negotiate-ai
npm install
```

### Environment

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your_gemini_api_key
FISHJAM_URL=your_fishjam_server_url
FISHJAM_TOKEN=your_fishjam_token
```

### Run

```bash
npm run dev
```

## Project Structure

```
negotiate-ai/
├── src/
│   ├── gemini/          # Gemini Live API integration
│   │   ├── session.ts   # WebSocket session management
│   │   ├── audio.ts     # Audio stream handling
│   │   └── tactics.ts   # Objection → tactic mapping
│   ├── overlay/         # Smelter overlay components
│   │   ├── CoachCard.tsx
│   │   └── TacticBadge.tsx
│   ├── room/            # Fishjam room management
│   └── types/           # Shared TypeScript types
├── SPEC.md              # Full project specification
├── CLAUDE.md            # AI coding assistant context
├── GEMINI.md            # Gemini API integration notes
├── CONTRIBUTING.md      # Contribution guidelines
└── package.json
```

## Team

| Name | Role |
|------|------|
| **Oleh** | Gemini Live API integration |
| **Romain** | Product & UX |
| **Michail** | Project management |

## Acknowledgments

Built at the **Software Mansion x Gemini Hackathon** in Kraków, March 2026.

Powered by [Fishjam](https://fishjam.io/) · [Smelter](https://github.com/software-mansion/smelter) · [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)

---

<div align="center">

**Real-time negotiation overlay — the right word, at the right second.**

</div>
