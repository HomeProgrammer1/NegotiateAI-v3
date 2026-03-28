# NegotiateAI — Demo Guide

## What is this?
AI-powered real-time coaching for call center agents.
The system listens to a live conversation and suggests what to say next — instantly.

---

## Requirements
- Chrome or Edge browser (latest)
- Microphone access
- Internet connection

---

## How to start

### Step 1 — Open the app
Go to the link provided by the demo host:
```
https://flavorous-ungroomed-ardis.ngrok-free.dev
```
> If the browser shows a warning "Visit Site" — click it to proceed.

### Step 2 — Allow microphone
When the browser asks for microphone permission — click **Allow**.

### Step 3 — Start the session
Click the **▶ Start Session** button.

Status will change to: `Session started — listening...`

### Step 4 — Speak
Talk as if you're a call center agent on a call.
The AI will analyze what you say and show **coaching suggestions** on screen in real time.

---

## What you'll see

| Element | Description |
|---|---|
| **Status** | Connection state (Connected / Listening) |
| **Suggestion box** | AI coaching hint — appears after each sentence |
| **Transcript** | Live text of what was said |

---

## To stop
Click **⏹ Stop Session**.

---

## Troubleshooting

**Microphone not working?**
→ Check that the browser has microphone permission (browser address bar → lock icon → allow mic)

**Page not loading?**
→ Ask the demo host for the current link (ngrok URL changes on restart)

**No suggestions appearing?**
→ Speak clearly for 5–10 seconds, AI needs context to generate a hint

---

*Demo hosted on VPS. Backend: Node.js + Gemini Live API.*
