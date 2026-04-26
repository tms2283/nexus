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

function sumByPrefix(session: InstrumentSession, prefix: string): number {
  let total = 0;
  for (const r of session.responses) {
    if (!r.itemId.startsWith(prefix)) continue;
    const v = getLikert04(session.responses, r.itemId);
    total += v ?? 0;
  }
  return total;
}

// Original, non-validated checklist inspired by common OCD symptom domains.
// Not OCI-R and not a substitute for clinical evaluation.
export const ocdSymptomChecklist: InstrumentPlugin = {
  definition: {
    id: 'ocd-symptom-checklist',
    title: 'OCD Symptom Checklist (Proxy follow-up, non-diagnostic)',
    version: '1.1',
    intro:
      'This is an original self-reflection checklist and is not a validated clinical instrument (and is not OCI-R).\n\nTimeframe: past month. Use it to notice patterns and decide whether to seek a professional evaluation.',
    items: [
      // Washing/contamination (3)
      {
        id: 'ocd_wash_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you worry about germs/contamination in a way that feels hard to dismiss?',
      },
      {
        id: 'ocd_wash_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you wash/clean more than you think is necessary to feel “safe” or “clean enough”?',
      },
      {
        id: 'ocd_wash_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you avoid places/objects because they feel contaminated, even if others think it is excessive?',
      },

      // Checking (3)
      {
        id: 'ocd_check_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you re-check locks, switches, appliances, or messages because you feel uncertain you did it correctly?',
      },
      {
        id: 'ocd_check_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you go back to re-check something even after you already checked it once?',
      },
      {
        id: 'ocd_check_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often does checking take longer than you want or interfere with leaving on time / finishing tasks?',
      },

      // Ordering/symmetry (3)
      {
        id: 'ocd_order_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel strong discomfort when things are uneven, misaligned, or “not just right”?',
      },
      {
        id: 'ocd_order_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you rearrange items until they feel exactly right, even if it costs time?',
      },
      {
        id: 'ocd_order_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel a need for symmetry (e.g., equal pressure, balanced placement) to reduce discomfort?',
      },

      // Intrusive thoughts / mental distress (3)
      {
        id: 'ocd_intrusive_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you experience unwanted thoughts, images, or urges that feel intrusive or distressing?',
      },
      {
        id: 'ocd_intrusive_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you get stuck analyzing or trying to “prove” what a distressing thought means about you?',
      },
      {
        id: 'ocd_intrusive_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do intrusive thoughts disrupt your focus or your ability to enjoy what you are doing?',
      },

      // Neutralizing / rituals (3)
      {
        id: 'ocd_neutralize_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you repeat actions or phrases (out loud or in your head) to reduce anxiety or prevent something bad?',
      },
      {
        id: 'ocd_neutralize_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you count, tap, or do things in a specific number to feel okay?',
      },
      {
        id: 'ocd_neutralize_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you seek reassurance from others to calm a worry (and need to ask again later)?',
      },

      // Hoarding-like difficulty discarding (3)
      {
        id: 'ocd_discard_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel strong distress when discarding items, even low-value ones?',
      },
      {
        id: 'ocd_discard_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you keep items “just in case” to the point that it creates clutter or stress?',
      },
      {
        id: 'ocd_discard_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often does clutter or keeping things make it harder to use your space the way you want?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const washing = sumByPrefix(session, 'ocd_wash_');
    const checking = sumByPrefix(session, 'ocd_check_');
    const ordering = sumByPrefix(session, 'ocd_order_');
    const intrusive = sumByPrefix(session, 'ocd_intrusive_');
    const neutralizing = sumByPrefix(session, 'ocd_neutralize_');
    const discarding = sumByPrefix(session, 'ocd_discard_');

    const total = washing + checking + ordering + intrusive + neutralizing + discarding;

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      subscales: {
        Washing: washing,
        Checking: checking,
        Ordering: ordering,
        Obsessing: intrusive,
        Neutralizing: neutralizing,
        Hoarding: discarding,
      },
      triggers: [],
    };
  },
};
