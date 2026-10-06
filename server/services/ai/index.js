// The one entry point controllers use for AI work: analyzeContent().
// Flow: build prompt -> call provider -> extract JSON -> validate. Retries once if the reply is malformed.
const { generate, isConfigured } = require('./provider');
const { buildSystemPrompt, buildUserInstruction } = require('./prompts');
const { validateResult, extractJSON, InvalidAIResultError } = require('./validateResult');
const { analyzeWithFallback } = require('./fallback');
const { AppError } = require('../../middleware/errorHandler');

const MAX_ATTEMPTS = 2;

// input: { text?: string, image?: { mimeType, base64 }, today: "YYYY-MM-DD" }
// returns: { result, usedFallback }
async function analyzeContent({ text, image, today }) {
  const hasText = Boolean(text);
  const hasImage = Boolean(image);

  if (!isConfigured()) {
    if (hasText) return { result: analyzeWithFallback(text, today), usedFallback: true };
    throw new AppError('AI is not configured on the server, so images cannot be analyzed. Add AI_API_KEY to server/.env or paste the text instead.', 503);
  }

  const system = buildSystemPrompt();
  const userText = buildUserInstruction({ today, hasImage, hasText, text });

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const reply = await generate({ system, userText, image });
      // sourceText lets the validator keep only exact quotes in the "extracted" lists (text input only).
      const result = validateResult(extractJSON(reply), { sourceText: text });
      return { result, usedFallback: false };
    } catch (err) {
      lastError = err;
      if (!(err instanceof InvalidAIResultError)) break; // network/key errors will not fix themselves
      console.warn(`AI reply was malformed (attempt ${attempt}): ${err.message}`);
    }
  }

  // The AI failed. Text can still get a clearly-labelled fallback; images cannot.
  if (hasText) {
    console.warn(`Using deterministic fallback because the AI failed: ${lastError?.message}`);
    return { result: analyzeWithFallback(text, today), usedFallback: true };
  }
  if (lastError instanceof InvalidAIResultError) {
    throw new AppError('The AI could not confidently read this document. Try a clearer photo or paste the text.', 502);
  }
  throw lastError;
}

module.exports = { analyzeContent };