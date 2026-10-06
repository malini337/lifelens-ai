// POST /api/analyze: validate input -> read text/image -> AI -> validate -> save document + tasks.
// Uploaded files live only in memory during this request; they are never saved.
const pdfParse = require('pdf-parse/lib/pdf-parse.js'); // direct path avoids pdf-parse's debug-mode bug
const Document = require('../models/Document');
const Action = require('../models/Action');
const { analyzeContent } = require('../services/ai');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { isValidISODate, isoToDate, todayISO } = require('../utils/dateHelpers');

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 20000;

// Checks the real file signature, because the browser-reported type can be wrong or faked.
function matchesSignature(file) {
  const b = file.buffer;
  if (!b || b.length < 4) return false;
  switch (file.mimetype) {
    case 'application/pdf':
      return b.slice(0, 4).toString('latin1') === '%PDF';
    case 'image/png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case 'image/jpeg':
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'text/plain':
      return !b.includes(0); // plain text has no NUL bytes
    default:
      return false;
  }
}

// Turns the request into { text } and/or { image } for the AI.
async function readInput(req) {
  const file = req.file;
  const pastedText = typeof req.body.text === 'string' ? req.body.text.trim() : '';

  if (file) {
    if (file.size === 0) throw new AppError('That file is empty. Please choose another one.', 400);
    if (!matchesSignature(file)) {
      throw new AppError('This file does not look like a valid PDF, PNG, JPG or TXT file.', 415);
    }

    if (file.mimetype.startsWith('image/')) {
      return { image: { mimeType: file.mimetype, base64: file.buffer.toString('base64') } };
    }

    let text;
    if (file.mimetype === 'application/pdf') {
      try {
        // pdf-parse's bundled PDF reader fails on Node Buffers in newer Node versions, so pass a plain Uint8Array.
        text = (await pdfParse(new Uint8Array(file.buffer))).text || '';
      } catch (err) {
        throw new AppError('This PDF could not be read. It may be damaged or password protected.', 422);
      }
      if (text.trim().length < MIN_TEXT_LENGTH) {
        throw new AppError('This PDF has no readable text (it may be a scan). Take a photo or screenshot of it and upload that image instead.', 422);
      }
    } else {
      text = file.buffer.toString('utf8');
    }

    text = text.trim();
    if (text.length < MIN_TEXT_LENGTH) throw new AppError('This file does not contain enough text to analyze.', 422);
    return { text: text.slice(0, MAX_TEXT_LENGTH) };
  }

  if (pastedText.length < MIN_TEXT_LENGTH) {
    throw new AppError('Please upload a file, take a photo, or paste some text to analyze.', 400);
  }
  if (pastedText.length > MAX_TEXT_LENGTH) {
    throw new AppError(`That text is too long. Please keep it under ${MAX_TEXT_LENGTH.toLocaleString('en-US')} characters.`, 400);
  }
  return { text: pastedText };
}

const analyze = asyncHandler(async (req, res) => {
  const input = await readInput(req);

  // The browser sends its local date so "today" matches the user's calendar.
  const today = isValidISODate(req.body.today) ? req.body.today : todayISO();

  const { result, usedFallback } = await analyzeContent({ ...input, today });

  let sourceType = 'text';
  if (req.file) sourceType = req.body.sourceType === 'camera' && input.image ? 'camera' : 'file';

  const document = await Document.create({
    userId: req.user._id,
    title: result.title,
    originalFileName: req.file ? String(req.file.originalname).slice(0, 200) : '',
    documentType: result.documentType,
    sourceType,
    summary: result.summary,
    importantInformation: result.importantInformation,
    dates: result.dates,
    requirements: result.requirements,
    warnings: result.warnings,
    confidence: result.confidence,
    usedFallback,
    translations: result.ta ? { ta: result.ta } : null,
  });

  let actions = [];
  try {
    actions = await Action.insertMany(
      result.actions.map((item, index) => ({
        userId: req.user._id,
        documentId: document._id,
        title: item.title,
        titleTa: result.ta?.actions?.[index]?.title || '',
        description: item.description,
        descriptionTa: result.ta?.actions?.[index]?.description || '',
        deadline: isoToDate(item.deadline),
        priority: item.priority,
        requiredItems: item.requiredItems,
        status: 'Pending',
      }))
    );
  } catch (err) {
    await Document.findByIdAndDelete(document._id); // do not leave a half-saved result behind
    throw err;
  }

  res.status(201).json({ document, actions, usedFallback });
});

module.exports = { analyze };
