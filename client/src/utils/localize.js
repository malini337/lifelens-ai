// Picks the Tamil version of AI text when the user is viewing in Tamil and one exists.
// Falls back to English so nothing is ever blank.

export function localizeDocument(document, lang) {
  const ta = lang === 'ta' ? document?.translations?.ta : null;
  const pick = (english, tamil) => (tamil && (!Array.isArray(tamil) || tamil.length > 0) ? tamil : english);
  return {
    translated: Boolean(ta),
    title: pick(document.title, ta?.title),
    summary: pick(document.summary, ta?.summary),
    importantInformation: pick(document.importantInformation || [], ta?.importantInformation),
    requirements: pick(document.requirements || [], ta?.requirements),
    warnings: pick(document.warnings || [], ta?.warnings),
  };
}

export function localizeAction(action, lang) {
  if (lang === 'ta') {
    return {
      title: action.titleTa || action.title,
      description: action.descriptionTa || action.description,
    };
  }
  return { title: action.title, description: action.description };
}

export function hasTamil(document) {
  return Boolean(document?.translations?.ta);
}
