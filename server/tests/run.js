// Dependency-free tests for the pure logic (no database or AI key needed).
// Run with:  npm test
const assert = require('assert');
const { isValidISODate, deadlineStatus, daysBetween } = require('../utils/dateHelpers');
const { validateResult, extractJSON, InvalidAIResultError } = require('../services/ai/validateResult');
const { analyzeWithFallback, findDates } = require('../services/ai/fallback');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${err.message}`);
    process.exitCode = 1;
  }
}

const TODAY = '2026-10-04';
const SAMPLE = `Internal Assessment Notice

Students must submit the completed project report by 15 October 2026.

The report must include the signed approval form.

Students who fail to submit before the deadline may not be considered for evaluation.`;

console.log('dateHelpers');
test('accepts real dates only', () => {
  assert.strictEqual(isValidISODate('2026-10-15'), true);
  assert.strictEqual(isValidISODate('2026-02-31'), false);
  assert.strictEqual(isValidISODate('tomorrow'), false);
  assert.strictEqual(isValidISODate(''), false);
  assert.strictEqual(isValidISODate(null), false);
});
test('classifies deadlines', () => {
  assert.strictEqual(deadlineStatus('2026-10-01', TODAY), 'overdue');
  assert.strictEqual(deadlineStatus('2026-10-04', TODAY), 'today');
  assert.strictEqual(deadlineStatus('2026-10-15', TODAY), 'upcoming');
  assert.strictEqual(deadlineStatus('', TODAY), 'none');
  assert.strictEqual(daysBetween(TODAY, '2026-10-15'), 11);
});

console.log('validateResult');
test('cleans a good AI result', () => {
  const result = validateResult({
    title: 'Examination Form Submission',
    documentType: 'exam',
    summary: 'Submit the exam form.',
    actions: [{ title: 'Submit form', deadline: '2026-10-15', priority: 'HIGH', requiredItems: ['Form'] }],
    dates: [{ label: 'Deadline', date: '2026-10-15', description: 'Last day' }],
    confidence: 0.9,
  });
  assert.strictEqual(result.actions[0].priority, 'High');
  assert.strictEqual(result.actions[0].deadline, '2026-10-15');
  assert.strictEqual(result.confidence, 90);
});
test('never keeps invented/invalid dates or priorities', () => {
  const result = validateResult({
    summary: 'x',
    actions: [{ title: 'Pay fee', deadline: 'next Friday', priority: 'urgent!!' }],
  });
  assert.strictEqual(result.actions[0].deadline, '');
  assert.strictEqual(result.actions[0].priority, 'Medium');
});
test('drops actions without a title and keeps Tamil aligned', () => {
  const result = validateResult({
    summary: 'x',
    actions: [{ title: '' }, { title: 'Pay fee' }],
    ta: { summary: 'ச', actions: [{ title: 'தவறு' }, { title: 'கட்டணம் செலுத்து' }] },
  });
  assert.strictEqual(result.actions.length, 1);
  assert.strictEqual(result.ta.actions[0].title, 'கட்டணம் செலுத்து');
});
test('rejects junk', () => {
  assert.throws(() => validateResult(null), InvalidAIResultError);
  assert.throws(() => validateResult({}), InvalidAIResultError);
  assert.throws(() => validateResult([]), InvalidAIResultError);
});
test('extracts JSON from fenced / chatty replies', () => {
  assert.deepStrictEqual(extractJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepStrictEqual(extractJSON('Here you go: {"a":1} Hope that helps'), { a: 1 });
  assert.throws(() => extractJSON('not json at all'), InvalidAIResultError);
  assert.throws(() => extractJSON('{"a": '), InvalidAIResultError);
});

console.log('exact quotes and confidence cap');
const SRC = 'Students must submit the completed\nproject report by 15 October 2026.\nThe report must include the signed approval form.';
test('keeps exact quotes (case, line breaks, curly quotes ignored) and drops paraphrases', () => {
  const r = validateResult(
    {
      summary: 'x',
      importantInformation: ['Students must submit the completed project report by 15 October 2026.', 'Failure to submit may result in penalty.', 'THE REPORT MUST INCLUDE THE SIGNED APPROVAL FORM'],
      requirements: ['Signed approval form', 'Completed project report'],
    },
    { sourceText: SRC }
  );
  assert.strictEqual(r.importantInformation.length, 2);
  assert.ok(!r.importantInformation.some((x) => x.includes('penalty')));
  assert.deepStrictEqual(r.requirements, ['Signed approval form', 'Completed project report']);
});
test('rejects a requirement that is not in the text', () => {
  const r = validateResult({ summary: 'x', requirements: ['Passport photo'] }, { sourceText: SRC });
  assert.deepStrictEqual(r.requirements, []);
});
test('Tamil lines stay matched to the English lines that were kept', () => {
  const r = validateResult(
    {
      summary: 'x',
      importantInformation: ['Made up sentence', 'The report must include the signed approval form.'],
      ta: { summary: 'ச', importantInformation: ['கற்பனை', 'அறிக்கையுடன் ஒப்புதல் படிவம் தேவை'] },
    },
    { sourceText: SRC }
  );
  assert.deepStrictEqual(r.importantInformation, ['The report must include the signed approval form.']);
  assert.deepStrictEqual(r.ta.importantInformation, ['அறிக்கையுடன் ஒப்புதல் படிவம் தேவை']);
});
test('no source text (photos): nothing is filtered', () => {
  const r = validateResult({ summary: 'x', importantInformation: ['anything'] });
  assert.deepStrictEqual(r.importantInformation, ['anything']);
});
test('confidence never shows above 95', () => {
  assert.strictEqual(validateResult({ summary: 'x', confidence: 100 }).confidence, 95);
  assert.strictEqual(validateResult({ summary: 'x', confidence: 1 }).confidence, 95);
  assert.strictEqual(validateResult({ summary: 'x', confidence: 0.6 }).confidence, 60);
  assert.strictEqual(validateResult({ summary: 'x', confidence: 'abc' }).confidence, 0);
});

console.log('fallback');
test('finds dates in several formats', () => {
  const isos = findDates('Pay by 15 October 2026, or Oct 20, 2026, or 2026-11-01, or 05/12/2026.', TODAY).map((d) => d.iso);
  assert.deepStrictEqual(isos.sort(), ['2026-10-15', '2026-10-20', '2026-11-01', '2026-12-05'].sort());
});
test('does not read "October 2026" as October 20', () => {
  assert.deepStrictEqual(findDates('Exams in October 2026.', TODAY), []);
});
test('extracts the sample notice', () => {
  const r = analyzeWithFallback(SAMPLE, TODAY);
  assert.ok(r.actions.length >= 1);
  assert.strictEqual(r.actions[0].deadline, '2026-10-15');
  assert.strictEqual(r.actions[0].priority, 'High');
  assert.ok(r.warnings[0].includes('deterministic fallback'));
});
test('fallback output passes validation', () => {
  const r = analyzeWithFallback(SAMPLE, TODAY);
  const cleaned = validateResult(r);
  assert.strictEqual(cleaned.actions[0].deadline, '2026-10-15');
});
test('no date in text means no deadline', () => {
  const r = analyzeWithFallback('Please bring your ID card to the office.', TODAY);
  assert.ok(r.actions.every((a) => a.deadline === ''));
});

console.log(`\n${passed} tests passed`);