/**
 * geminiClient.js
 * Gemini Live API client using @google/genai SDK.
 * Model: gemini-2.5-flash-native-audio-latest
 *
 * Flow:
 *   1. connect() — opens session, waits for setupComplete
 *   2. sendAudio(int16Buffer) — streams PCM 16kHz audio
 *   3. Gemini responds with audio + transcription → onSuggestion fires
 *   4. disconnect() — closes session
 */

const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.5-flash-native-audio-latest';

const SYSTEM_PROMPT = `You are a real-time negotiation coach giving tactical advice during live negotiations.

RULES:
- Respond ONLY when you detect a significant negotiation moment
- Give ONE complete sentence of advice (15-20 words max)
- ALWAYS end your response with a period, exclamation or question mark
- Include WHY briefly when helpful (e.g. "Counter with a higher anchor — it shifts the reference point.")
- Do NOT respond to small talk or neutral conversation
- Respond in the SAME language as the conversation (EN/PL/UK)
- Never explain yourself — just give the actionable tip

Negotiation signals to detect:
- ANCHOR: first price or position stated → suggest how to counter and why
- OBJECTION: pushback or "no" → suggest how to reframe it
- CONCESSION: someone giving ground → remind to stay patient
- URGENCY: false deadline mentioned → suggest probing if it's real
- GOOD MOMENT: natural pause or agreement signal → suggest asking for a concession

If nothing significant happens — stay silent, respond with nothing.`;

class GeminiClient {
  /**
   * @param {string}   apiKey
   * @param {Function} onSuggestion — called with (type, message)
   * @param {Function} onTranscript — called with (text)
   */
  constructor(apiKey, onSuggestion, onTranscript) {
    this.apiKey       = apiKey;
    this.onSuggestion = onSuggestion;
    this.onTranscript = onTranscript;
    this.session      = null;
    this.ai           = new GoogleGenAI({ apiKey });
    this.outputBuffer = '';
    this._setupResolve = null;
    this._setupReject  = null;
  }

  connect() {
    return new Promise(async (resolve, reject) => {
      this._setupResolve = resolve;
      this._setupReject  = reject;

      try {
        this.session = await this.ai.live.connect({
          model: MODEL,
          config: {
            responseModalities: ['AUDIO'],
            outputAudioTranscription: {},
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          },
          callbacks: {
            onopen:   () => console.log('[Gemini] WebSocket open'),
            onmessage: (msg) => this._handleMessage(msg),
            onerror:  (e) => {
              console.error('[Gemini] Error:', e);
              if (this._setupReject) { this._setupReject(new Error(String(e))); }
            },
            onclose:  (e) => {
              console.log(`[Gemini] Closed: ${e?.code} ${e?.reason}`);
              if (this._setupReject) { this._setupReject(new Error(`Closed: ${e?.code}`)); }
            },
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  sendAudio(int16Buffer) {
    if (!this.session) return;
    try {
      this.session.sendRealtimeInput({
        audio: {
          data:     int16Buffer.toString('base64'),
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (err) {
      console.error('[Gemini] sendAudio error:', err.message);
    }
  }

  disconnect() {
    this.outputBuffer  = '';
    this._setupResolve = null;
    this._setupReject  = null;
    if (this.session) {
      try { this.session.close(); } catch (_) {}
      this.session = null;
    }
  }

  _handleMessage(msg) {
    // Setup complete
    if (msg?.setupComplete && this._setupResolve) {
      console.log('[Gemini] Session ready');
      this._setupResolve();
      this._setupResolve = null;
      this._setupReject  = null;
    }

    // Input transcription — що каже агент
    const inputText = msg?.serverContent?.inputTranscription?.text;
    if (inputText?.trim()) {
      this.onTranscript(inputText.trim());
    }

    // Output transcription — підказка від AI (приходить частинами)
    const outputText = msg?.serverContent?.outputTranscription?.text;
    if (outputText) {
      this.outputBuffer += outputText;
      const trimmed = this.outputBuffer.trim();
      // Емітуємо коли речення завершене
      if (trimmed.length >= 15 && /[.!?]$/.test(trimmed)) {
        this._emitSuggestion();
      }
    }

    // Turn complete — емітуємо залишок буфера
    if (msg?.serverContent?.turnComplete) {
      if (this.outputBuffer.trim()) {
        this._emitSuggestion();
      }
    }
  }

  _emitSuggestion() {
    const text = this.outputBuffer.trim();
    this.outputBuffer = '';
    if (!text) return;
    console.log('[Gemini] Suggestion:', text);
    this.onSuggestion('COACHING', text);
  }
}

module.exports = GeminiClient;
