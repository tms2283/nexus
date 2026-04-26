import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertScale,
  LikertValue,
  ScoreResult,
} from '../../core/instrumentTypes';

const SCALE_0_3: LikertScale = {
  min: 0,
  max: 3,
  labels: ['Never true', 'True only when I was young', 'True only now', 'True now and when I was young'],
};

const NORMATIVE_ITEMS = new Set<number>([1, 6, 11, 18, 23, 26, 33, 37, 43, 47, 48, 53, 58, 62, 68, 72, 77]);

function getLikert03(responses: InstrumentResponse[], itemId: string): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  if (v < 0 || v > 3) return null;
  return v;
}

export const raadsR: InstrumentPlugin = {
  definition: {
    id: 'raads-r',
    title: 'RAADS-R (Autism) — 80 items',
    version: '1.0',
    intro:
      'Scoring runs locally. This instrument is typically used as part of a broader evaluation and is not diagnostic.\n\nNote: This app ships placeholder prompts to avoid distributing copyrighted item wording. Use “Edit item text (local)” to paste the official wording you want displayed.',
    items: Array.from({ length: 80 }, (_, idx) => ({
      id: `raads_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_0_3,
      prompt: `RAADS-R item ${idx + 1} (paste official wording via local override)`,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    let total = 0;
    for (let i = 1; i <= 80; i++) {
      const v = getLikert03(session.responses, `raads_${i}`) ?? 0;
      const points = NORMATIVE_ITEMS.has(i) ? 3 - v : v;
      total += points;
    }

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: total >= 65 ? 'At/above threshold (65+)' : 'Below threshold',
      triggers: [],
    };
  },
};
