import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertScale,
  LikertValue,
  ScoreResult,
} from '../../core/instrumentTypes';

const SCALE_1_5: LikertScale = {
  min: 1,
  max: 5,
  labels: [
    'Very Inaccurate',
    'Moderately Inaccurate',
    'Neither Accurate nor Inaccurate',
    'Moderately Accurate',
    'Very Accurate',
  ],
};

type Factor = 1 | 2 | 3 | 4 | 5;
type Keying = '+' | '-';

type ItemSpec = {
  prompt: string;
  factor: Factor;
  keyed: Keying;
};

// Public-domain item set from IPIP's 50-item sample questionnaire.
const ITEMS: ItemSpec[] = [
  { prompt: 'Am the life of the party.', factor: 1, keyed: '+' },
  { prompt: 'Feel little concern for others.', factor: 2, keyed: '-' },
  { prompt: 'Am always prepared.', factor: 3, keyed: '+' },
  { prompt: 'Get stressed out easily.', factor: 4, keyed: '-' },
  { prompt: 'Have a rich vocabulary.', factor: 5, keyed: '+' },
  { prompt: "Don't talk a lot.", factor: 1, keyed: '-' },
  { prompt: 'Am interested in people.', factor: 2, keyed: '+' },
  { prompt: 'Leave my belongings around.', factor: 3, keyed: '-' },
  { prompt: 'Am relaxed most of the time.', factor: 4, keyed: '+' },
  { prompt: 'Have difficulty understanding abstract ideas.', factor: 5, keyed: '-' },
  { prompt: 'Feel comfortable around people.', factor: 1, keyed: '+' },
  { prompt: 'Insult people.', factor: 2, keyed: '-' },
  { prompt: 'Pay attention to details.', factor: 3, keyed: '+' },
  { prompt: 'Worry about things.', factor: 4, keyed: '-' },
  { prompt: 'Have a vivid imagination.', factor: 5, keyed: '+' },
  { prompt: 'Keep in the background.', factor: 1, keyed: '-' },
  { prompt: "Sympathize with others' feelings.", factor: 2, keyed: '+' },
  { prompt: 'Make a mess of things.', factor: 3, keyed: '-' },
  { prompt: 'Seldom feel blue.', factor: 4, keyed: '+' },
  { prompt: 'Am not interested in abstract ideas.', factor: 5, keyed: '-' },
  { prompt: 'Start conversations.', factor: 1, keyed: '+' },
  { prompt: "Am not interested in other people's problems.", factor: 2, keyed: '-' },
  { prompt: 'Get chores done right away.', factor: 3, keyed: '+' },
  { prompt: 'Am easily disturbed.', factor: 4, keyed: '-' },
  { prompt: 'Have excellent ideas.', factor: 5, keyed: '+' },
  { prompt: 'Have little to say.', factor: 1, keyed: '-' },
  { prompt: 'Have a soft heart.', factor: 2, keyed: '+' },
  { prompt: 'Often forget to put things back in their proper place.', factor: 3, keyed: '-' },
  { prompt: 'Get upset easily.', factor: 4, keyed: '-' },
  { prompt: 'Do not have a good imagination.', factor: 5, keyed: '-' },
  { prompt: 'Talk to a lot of different people at parties.', factor: 1, keyed: '+' },
  { prompt: 'Am not really interested in others.', factor: 2, keyed: '-' },
  { prompt: 'Like order.', factor: 3, keyed: '+' },
  { prompt: 'Change my mood a lot.', factor: 4, keyed: '-' },
  { prompt: 'Am quick to understand things.', factor: 5, keyed: '+' },
  { prompt: "Don't like to draw attention to myself.", factor: 1, keyed: '-' },
  { prompt: 'Take time out for others.', factor: 2, keyed: '+' },
  { prompt: 'Shirk my duties.', factor: 3, keyed: '-' },
  { prompt: 'Have frequent mood swings.', factor: 4, keyed: '-' },
  { prompt: 'Use difficult words.', factor: 5, keyed: '+' },
  { prompt: "Don't mind being the center of attention.", factor: 1, keyed: '+' },
  { prompt: "Feel others' emotions.", factor: 2, keyed: '+' },
  { prompt: 'Follow a schedule.', factor: 3, keyed: '+' },
  { prompt: 'Get irritated easily.', factor: 4, keyed: '-' },
  { prompt: 'Spend time reflecting on things.', factor: 5, keyed: '+' },
  { prompt: 'Am quiet around strangers.', factor: 1, keyed: '-' },
  { prompt: 'Make people feel at ease.', factor: 2, keyed: '+' },
  { prompt: 'Am exacting in my work.', factor: 3, keyed: '+' },
  { prompt: 'Often feel blue.', factor: 4, keyed: '-' },
  { prompt: 'Am full of ideas.', factor: 5, keyed: '+' },
];

function getLikert15(responses: InstrumentResponse[], itemId: string): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  if (v < 1 || v > 5) return null;
  return v;
}

function scoreValue(v: number, keyed: Keying): number {
  return keyed === '+' ? v : 6 - v;
}

const FACTOR_LABELS: Record<Factor, string> = {
  1: 'Extraversion',
  2: 'Agreeableness',
  3: 'Conscientiousness',
  4: 'Emotional Stability',
  5: 'Intellect/Imagination',
};

export const ipip50: InstrumentPlugin = {
  definition: {
    id: 'ipip-50',
    title: 'IPIP Big Five — 50 items',
    version: '1.0',
    intro:
      'Describe yourself as you generally are now. Higher scores indicate more of each trait.\n\nThis instrument uses the public-domain IPIP 50-item Big Five markers.',
    items: ITEMS.map((it, idx) => ({
      id: `ipip50_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_1_5,
      prompt: it.prompt,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const totals: Record<Factor, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    ITEMS.forEach((spec, idx) => {
      const v = getLikert15(session.responses, `ipip50_${idx + 1}`) ?? 3;
      totals[spec.factor] += scoreValue(v, spec.keyed);
    });

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      subscales: {
        [FACTOR_LABELS[1]]: totals[1],
        [FACTOR_LABELS[2]]: totals[2],
        [FACTOR_LABELS[3]]: totals[3],
        [FACTOR_LABELS[4]]: totals[4],
        [FACTOR_LABELS[5]]: totals[5],
      },
      triggers: [],
    };
  },
};
