/**
 * audioResample.js
 * Converts raw Float32 PCM (44100 Hz, from browser ScriptProcessor)
 * to Int16 PCM (16000 Hz, required by Gemini Live API).
 */

const INPUT_RATE  = 44100;
const OUTPUT_RATE = 16000;
const RATIO       = INPUT_RATE / OUTPUT_RATE; // 2.75625

/**
 * @param {Buffer} buf — Float32LE buffer from browser
 * @returns {Buffer}   — Int16LE buffer at 16kHz
 */
function resampleFloat32To16kHz(buf) {
  const inputSamples  = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const outputLength  = Math.floor(inputSamples.length / RATIO);
  const outputSamples = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIdx  = i * RATIO;
    const lo      = Math.floor(srcIdx);
    const hi      = Math.min(lo + 1, inputSamples.length - 1);
    const frac    = srcIdx - lo;
    const sample  = inputSamples[lo] * (1 - frac) + inputSamples[hi] * frac;
    outputSamples[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
  }

  return Buffer.from(outputSamples.buffer);
}

module.exports = { resampleFloat32To16kHz };
