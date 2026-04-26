import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertScale,
  LikertValue,
  ScoreResult,
} from '../../core/instrumentTypes';

const SCALE_0_4: LikertScale = {
  min: 0,
  max: 4,
  labels: ['Not at all', 'A little', 'Moderately', 'A lot', 'Extremely'],
};

function getLikert04(responses: InstrumentResponse[], itemId: string): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  if (v < 0 || v > 4) return null;
  return v;
}

function sumByNumbers(session: InstrumentSession, itemNumbers: number[]): number {
  let t = 0;
  for (const n of itemNumbers) t += getLikert04(session.responses, `ocir_${n}`) ?? 0;
  return t;
}

export const ociR: InstrumentPlugin = {
  definition: {
    id: 'oci-r',
    title: 'OCI-R (Obsessive-Compulsive Inventory — Revised) — 18 items',
    version: '1.0',
    intro:
      'Timeframe: past month.\n\nNote: This app ships placeholder prompts to avoid distributing copyrighted item wording. Use “Edit item text (local)” to paste the official wording you want displayed.',
    items: Array.from({ length: 18 }, (_, idx) => ({
      id: `ocir_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_0_4,
      prompt: `OCI-R item ${idx + 1} (paste official wording via local override)`,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const hoarding = sumByNumbers(session, [1, 7, 13]);
    const checking = sumByNumbers(session, [2, 8, 14]);
    const ordering = sumByNumbers(session, [3, 9, 15]);
    const neutralizing = sumByNumbers(session, [4, 10, 16]);
    const washing = sumByNumbers(session, [5, 11, 17]);
    const obsessing = sumByNumbers(session, [6, 12, 18]);
    const total = hoarding + checking + ordering + neutralizing + washing + obsessing;

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: total >= 21 ? 'At/above cutoff (21+)' : 'Below cutoff',
      subscales: {
        Hoarding: hoarding,
        Checking: checking,
        Ordering: ordering,
        Neutralizing: neutralizing,
        Washing: washing,
        Obsessing: obsessing,
      },
      triggers: [],
    };
  },
};
