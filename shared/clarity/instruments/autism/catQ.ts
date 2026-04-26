import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertScale,
  LikertValue,
  ScoreResult,
} from '../../core/instrumentTypes';

const SCALE_1_7: LikertScale = {
  min: 1,
  max: 7,
  labels: [
    'Strongly disagree',
    'Disagree',
    'Somewhat disagree',
    'Neither agree nor disagree',
    'Somewhat agree',
    'Agree',
    'Strongly agree',
  ],
};

const REVERSE = new Set<number>([3, 12, 19, 22, 24]);
const COMPENSATION = [1, 4, 5, 8, 11, 14, 17, 20, 23];
const MASKING = [2, 6, 9, 12, 15, 18, 21, 24];
const ASSIMILATION = [3, 7, 10, 13, 16, 19, 22, 25];

function getLikert17(responses: InstrumentResponse[], itemId: string): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  if (v < 1 || v > 7) return null;
  return v;
}

function scoreItem(raw: number, isReverse: boolean): number {
  return isReverse ? 8 - raw : raw;
}

function sum(session: InstrumentSession, itemNumbers: number[]): number {
  let t = 0;
  for (const n of itemNumbers) {
    const raw = getLikert17(session.responses, `catq_${n}`) ?? 1;
    t += scoreItem(raw, REVERSE.has(n));
  }
  return t;
}

export const catQ: InstrumentPlugin = {
  definition: {
    id: 'cat-q',
    title: 'CAT-Q (Camouflaging Autistic Traits Questionnaire) — 25 items',
    version: '1.0',
    intro:
      'Scoring runs locally.\n\nNote: This app ships placeholder prompts by default. Use “Edit item text (local)” to paste the official wording you want displayed.',
    items: Array.from({ length: 25 }, (_, idx) => ({
      id: `catq_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_1_7,
      prompt: `CAT-Q item ${idx + 1} (paste official wording via local override)`,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const compensation = sum(session, COMPENSATION);
    const masking = sum(session, MASKING);
    const assimilation = sum(session, ASSIMILATION);
    const total = compensation + masking + assimilation;

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: total >= 100 ? 'At/above threshold (100+)' : 'Below threshold',
      subscales: {
        Compensation: compensation,
        Masking: masking,
        Assimilation: assimilation,
      },
      triggers: [],
    };
  },
};
