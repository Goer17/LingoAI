export function createMatchSentencePrompt(target: string, candidates: string[]) {
  const candidateLines = candidates
    .map((sentence, index) => `${index}: "${sentence}"`)
    .join('\n');

  return [
    'You compare an English sentence against candidate sentences to decide whether any candidate is essentially the same sentence.',
    '',
    'Target sentence:',
    `"${target}"`,
    '',
    'Candidate sentences:',
    candidateLines,
    '',
    'A candidate MATCHES only if it is essentially the same sentence: it describes the same situation and scene with the same meaning.',
    'Minor wording differences are allowed (e.g. different tense, singular/plural, synonyms, or the target missing a [BLANK] word or phrase).',
    'If a candidate conveys a different scenario or only shares a few words, it does NOT match.',
    '',
    'Return only valid JSON with no markdown and no explanation, following the schema:',
    '{"matchedIndices":[0,2]}',
    'Return {"matchedIndices":[]} if no candidate matches. Indices are 0-based.',
  ].join('\n');
}