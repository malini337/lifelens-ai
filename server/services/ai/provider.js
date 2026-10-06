// The ONLY file that talks to an AI vendor. To add another provider, add a function below and
// register it in PROVIDERS. Nothing else in the app needs to change.
//
// Supported out of the box: "anthropic" (default) and "gemini". Selected with AI_PROVIDER in .env.
const { AppError } = require('../../middleware/errorHandler');

const REQUEST_TIMEOUT_MS = 90000;

// Temporary overloads (503), rate limits (429) and brief server errors are retried a couple of times.
const RETRYABLE_STATUS = [429, 500, 502, 503, 504];
const RETRY_DELAYS_MS = [2000, 5000]; // so at most 3 attempts in total
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5-5',
  gemini: 'gemini-3.8-flash',
};

function getProviderName() {
  return (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
}

function isConfigured() {
  return Boolean(process.env.AI_API_KEY) && Boolean(PROVIDERS[getProviderName()]);
}

// fetch() with a timeout so a slow AI call can never hang the request forever.
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new AppError('The AI service took too long to respond. Please try again.', 504);
    throw new AppError('Could not reach the AI service. Check your internet connection and try again.', 502);
  } finally {
    clearTimeout(timer);
  }
}

// Calls fetchWithTimeout, retrying only when the AI service says it is temporarily busy.
async function requestWithRetry(url, options) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetchWithTimeout(url, options);
    if (res.ok || !RETRYABLE_STATUS.includes(res.status) || attempt >= RETRY_DELAYS_MS.length) return res;
    console.warn(`AI service busy (status ${res.status}). Retrying in ${RETRY_DELAYS_MS[attempt] / 1000}s...`);
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

async function failFromResponse(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message || '';
  } catch (e) {
    // ignore - body was not JSON
  }
  console.error(`AI provider error ${res.status}: ${detail}`);
  if (res.status === 401 || res.status === 403) {
    throw new AppError('The AI service rejected the server\'s API key. Please check AI_API_KEY.', 502);
  }
  if (res.status === 404) {
    throw new AppError('The configured AI model was not found. Set AI_MODEL in server/.env to a model your key can use.', 502);
  }
  if (res.status === 429 || res.status === 503) {
    throw new AppError('The AI service is busy right now. Please try again in a moment.', 503);
  }
  throw new AppError('The AI service could not process this document. Please try again.', 502);
}

// ---- Anthropic (Claude) ----
async function callAnthropic({ system, userText, image }) {
  const content = [];
  if (image) {
    content.push({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } });
  }
  content.push({ type: 'text', text: userText });

  const res = await requestWithRetry('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.AI_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || DEFAULT_MODELS.anthropic,
      max_tokens: 6000,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) await failFromResponse(res);

  const data = await res.json();
  return (data.content || []).filter((block) => block.type === 'text').map((block) => block.text).join('');
}

// ---- Google Gemini ----
async function callGemini({ system, userText, image }) {
  const model = process.env.AI_MODEL || DEFAULT_MODELS.gemini;
  const parts = [{ text: userText }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });

  const res = await requestWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.AI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8000 },
      }),
    }
  );
  if (!res.ok) await failFromResponse(res);

  const data = await res.json();
  const candidateParts = data?.candidates?.[0]?.content?.parts || [];
  return candidateParts.map((part) => part.text || '').join('');
}

const PROVIDERS = {
  anthropic: callAnthropic,
  gemini: callGemini,
};

// Returns the model's raw text reply.
async function generate({ system, userText, image }) {
  const call = PROVIDERS[getProviderName()];
  if (!call) throw new AppError('The configured AI provider is not supported.', 500);
  if (!process.env.AI_API_KEY) throw new AppError('AI is not configured on the server.', 503);
  return call({ system, userText, image });
}

module.exports = { generate, isConfigured, getProviderName };