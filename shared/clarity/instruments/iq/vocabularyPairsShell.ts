import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  ScoreResult,
} from '../../core/instrumentTypes';

type McValue = string | null;

function getChoice(responses: InstrumentResponse[], itemId: string): McValue {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  return typeof found.value === 'string' ? found.value : null;
}

function scoreKeyedItems(session: InstrumentSession, answerKey: Record<string, string>) {
  let correct = 0;
  let incorrect = 0;
  let omitted = 0;

  for (const [itemId, correctOptionId] of Object.entries(answerKey)) {
    const v = getChoice(session.responses, itemId);
    if (!v || v === 'dont_know') {
      omitted += 1;
      continue;
    }
    if (v === correctOptionId) correct += 1;
    else incorrect += 1;
  }

  return { correct, incorrect, omitted };
}

// NOTE:
// - This instrument is a *shell* for objective multiple-choice cognitive items.
// - It is designed to support local-only prompt overrides, so licensed/protected
//   wording can be added by a user who has permission without redistribution.
// - As shipped, this provides raw scoring only; an IQ-scaled estimate requires
//   a validated norm table.
export const vocabularyPairsShell: InstrumentPlugin = {
  definition: {
    id: 'vocabulary-pairs-shell',
    title: 'Vocabulary Matching (IQ estimate shell; local item text required)',
    version: '0.1',
    intro:
      'This is an objective multiple-choice format suitable for vocabulary-based cognitive testing.\n\nImportant: This instrument ships without a validated norm table, so it cannot produce a defensible IQ estimate by default. It reports raw performance only.\n\nIf you have permission to use a specific test’s word sets, paste them locally using “Edit item text (local)”.\n\nAnswer format: each question shows five words. Choose the pair (1–5) that best match in meaning, or choose “Don’t know”.',
    items: [
      {
        id: 'vp_1',
        type: 'multiple-choice',
        required: true,
        prompt:
          'Words: (1) WORD1  (2) WORD2  (3) WORD3  (4) WORD4  (5) WORD5\n\nSelect the best matching pair:',
        options: [
          { id: '1_2', label: '1 & 2' },
          { id: '1_3', label: '1 & 3' },
          { id: '1_4', label: '1 & 4' },
          { id: '1_5', label: '1 & 5' },
          { id: '2_3', label: '2 & 3' },
          { id: '2_4', label: '2 & 4' },
          { id: '2_5', label: '2 & 5' },
          { id: '3_4', label: '3 & 4' },
          { id: '3_5', label: '3 & 5' },
          { id: '4_5', label: '4 & 5' },
          { id: 'dont_know', label: "Don't know" },
        ],
      },
      {
        id: 'vp_2',
        type: 'multiple-choice',
        required: true,
        prompt:
          'Words: (1) WORD1  (2) WORD2  (3) WORD3  (4) WORD4  (5) WORD5\n\nSelect the best matching pair:',
        options: [
          { id: '1_2', label: '1 & 2' },
          { id: '1_3', label: '1 & 3' },
          { id: '1_4', label: '1 & 4' },
          { id: '1_5', label: '1 & 5' },
          { id: '2_3', label: '2 & 3' },
          { id: '2_4', label: '2 & 4' },
          { id: '2_5', label: '2 & 5' },
          { id: '3_4', label: '3 & 4' },
          { id: '3_5', label: '3 & 5' },
          { id: '4_5', label: '4 & 5' },
          { id: 'dont_know', label: "Don't know" },
        ],
      },
      {
        id: 'vp_3',
        type: 'multiple-choice',
        required: true,
        prompt:
          'Words: (1) WORD1  (2) WORD2  (3) WORD3  (4) WORD4  (5) WORD5\n\nSelect the best matching pair:',
        options: [
          { id: '1_2', label: '1 & 2' },
          { id: '1_3', label: '1 & 3' },
          { id: '1_4', label: '1 & 4' },
          { id: '1_5', label: '1 & 5' },
          { id: '2_3', label: '2 & 3' },
          { id: '2_4', label: '2 & 4' },
          { id: '2_5', label: '2 & 5' },
          { id: '3_4', label: '3 & 4' },
          { id: '3_5', label: '3 & 5' },
          { id: '4_5', label: '4 & 5' },
          { id: 'dont_know', label: "Don't know" },
        ],
      },
      {
        id: 'vp_4',
        type: 'multiple-choice',
        required: true,
        prompt:
          'Words: (1) WORD1  (2) WORD2  (3) WORD3  (4) WORD4  (5) WORD5\n\nSelect the best matching pair:',
        options: [
          { id: '1_2', label: '1 & 2' },
          { id: '1_3', label: '1 & 3' },
          { id: '1_4', label: '1 & 4' },
          { id: '1_5', label: '1 & 5' },
          { id: '2_3', label: '2 & 3' },
          { id: '2_4', label: '2 & 4' },
          { id: '2_5', label: '2 & 5' },
          { id: '3_4', label: '3 & 4' },
          { id: '3_5', label: '3 & 5' },
          { id: '4_5', label: '4 & 5' },
          { id: 'dont_know', label: "Don't know" },
        ],
      },
      {
        id: 'vp_5',
        type: 'multiple-choice',
        required: true,
        prompt:
          'Words: (1) WORD1  (2) WORD2  (3) WORD3  (4) WORD4  (5) WORD5\n\nSelect the best matching pair:',
        options: [
          { id: '1_2', label: '1 & 2' },
          { id: '1_3', label: '1 & 3' },
          { id: '1_4', label: '1 & 4' },
          { id: '1_5', label: '1 & 5' },
          { id: '2_3', label: '2 & 3' },
          { id: '2_4', label: '2 & 4' },
          { id: '2_5', label: '2 & 5' },
          { id: '3_4', label: '3 & 4' },
          { id: '3_5', label: '3 & 5' },
          { id: '4_5', label: '4 & 5' },
          { id: 'dont_know', label: "Don't know" },
        ],
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    // Placeholder key: by default, treat everything as omitted so we don't
    // ship a third-party answer key. Users can fork/extend locally if they
    // have rights to specific materials.
    const answerKey: Record<string, string> = {};
    const { correct, incorrect, omitted } = scoreKeyedItems(session, answerKey);

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: correct,
      subscales: {
        Correct: correct,
        Incorrect: incorrect,
        "Don't know/omitted": omitted,
      },
      triggers: [],
    };
  },
};
