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
  labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
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

function sumItems(session: InstrumentSession, itemIds: string[]): number {
  let total = 0;
  for (const id of itemIds) total += getLikert04(session.responses, id) ?? 0;
  return total;
}

export const asrsPartB12q: InstrumentPlugin = {
  definition: {
    id: 'asrs-partb-12q',
    title: 'ASRS v1.1 (ADHD) — Part B (12 follow-up items)',
    version: '1.0',
    intro:
      'Follow-up questions commonly used with the ASRS v1.1.\n\nNote: This app ships placeholder prompts to avoid distributing copyrighted wording. Use “Edit item text (local)” to paste the licensed/official wording you want displayed.',
    items: Array.from({ length: 12 }, (_, idx) => {
      const n = idx + 7;
      return {
        id: `asrsb_${n}`,
        type: 'likert' as const,
        required: true,
        scale: SCALE_0_4,
        prompt: `ASRS Part B item ${n} (paste official wording via local override)`,
      };
    }),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const allItemIds = asrsPartB12q.definition.items.map((i) => i.id);
    const inattentionIds = ['asrsb_7', 'asrsb_8', 'asrsb_9'];
    const hyperImpulsiveIds = allItemIds.filter((id) => !inattentionIds.includes(id));

    const inattention = sumItems(session, inattentionIds);
    const hyperImpulsive = sumItems(session, hyperImpulsiveIds);
    const total = inattention + hyperImpulsive;

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      subscales: {
        'Inattention (items 7–9)': inattention,
        'Hyperactivity/Impulsivity (items 10–18)': hyperImpulsive,
      },
      triggers: [],
    };
  },
};
