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

type Keying = '+' | '-';

type FacetSpec = {
  facet: string;
  domain: string;
  items: { prompt: string; keyed: Keying }[];
};

const FACETS: FacetSpec[] = [
  // Neuroticism
  {
    domain: 'Neuroticism',
    facet: 'N1 Anxiety',
    items: [
      { prompt: 'Worry about things.', keyed: '+' },
      { prompt: 'Fear for the worst.', keyed: '+' },
      { prompt: 'Am afraid of many things.', keyed: '+' },
      { prompt: 'Get stressed out easily.', keyed: '+' },
    ],
  },
  {
    domain: 'Neuroticism',
    facet: 'N2 Anger',
    items: [
      { prompt: 'Get angry easily.', keyed: '+' },
      { prompt: 'Get irritated easily.', keyed: '+' },
      { prompt: 'Lose my temper.', keyed: '+' },
      { prompt: 'Am not easily annoyed.', keyed: '-' },
    ],
  },
  {
    domain: 'Neuroticism',
    facet: 'N3 Depression',
    items: [
      { prompt: 'Often feel blue.', keyed: '+' },
      { prompt: 'Dislike myself.', keyed: '+' },
      { prompt: 'Am often down in the dumps.', keyed: '+' },
      { prompt: 'Feel comfortable with myself.', keyed: '-' },
    ],
  },
  {
    domain: 'Neuroticism',
    facet: 'N4 Self-Consciousness',
    items: [
      { prompt: 'Find it difficult to approach others.', keyed: '+' },
      { prompt: 'Am afraid to draw attention to myself.', keyed: '+' },
      { prompt: 'Only feel comfortable with friends.', keyed: '+' },
      { prompt: 'Am not bothered by difficult social situations.', keyed: '-' },
    ],
  },
  {
    domain: 'Neuroticism',
    facet: 'N5 Immoderation',
    items: [
      { prompt: 'Go on binges.', keyed: '+' },
      { prompt: 'Rarely overindulge.', keyed: '-' },
      { prompt: 'Easily resist temptations.', keyed: '-' },
      { prompt: 'Am able to control my cravings.', keyed: '-' },
    ],
  },
  {
    domain: 'Neuroticism',
    facet: 'N6 Vulnerability',
    items: [
      { prompt: 'Panic easily.', keyed: '+' },
      { prompt: 'Become overwhelmed by events.', keyed: '+' },
      { prompt: "Feel that I'm unable to deal with things.", keyed: '+' },
      { prompt: 'Remain calm under pressure.', keyed: '-' },
    ],
  },
  // Extraversion
  {
    domain: 'Extraversion',
    facet: 'E1 Friendliness',
    items: [
      { prompt: 'Make friends easily.', keyed: '+' },
      { prompt: 'Feel comfortable around people.', keyed: '+' },
      { prompt: 'Avoid contacts with others.', keyed: '-' },
      { prompt: 'Keep others at a distance.', keyed: '-' },
    ],
  },
  {
    domain: 'Extraversion',
    facet: 'E2 Gregariousness',
    items: [
      { prompt: 'Love large parties.', keyed: '+' },
      { prompt: 'Talk to a lot of different people at parties.', keyed: '+' },
      { prompt: 'Prefer to be alone.', keyed: '-' },
      { prompt: 'Avoid crowds.', keyed: '-' },
    ],
  },
  {
    domain: 'Extraversion',
    facet: 'E3 Assertiveness',
    items: [
      { prompt: 'Take charge.', keyed: '+' },
      { prompt: 'Try to lead others.', keyed: '+' },
      { prompt: 'Take control of things.', keyed: '+' },
      { prompt: 'Wait for others to lead the way.', keyed: '-' },
    ],
  },
  {
    domain: 'Extraversion',
    facet: 'E4 Activity Level',
    items: [
      { prompt: 'Am always busy.', keyed: '+' },
      { prompt: 'Am always on the go.', keyed: '+' },
      { prompt: 'Do a lot in my spare time.', keyed: '+' },
      { prompt: 'Like to take it easy.', keyed: '-' },
    ],
  },
  {
    domain: 'Extraversion',
    facet: 'E5 Excitement-Seeking',
    items: [
      { prompt: 'Love excitement.', keyed: '+' },
      { prompt: 'Seek adventure.', keyed: '+' },
      { prompt: 'Enjoy being reckless.', keyed: '+' },
      { prompt: 'Act wild and crazy.', keyed: '+' },
    ],
  },
  {
    domain: 'Extraversion',
    facet: 'E6 Cheerfulness',
    items: [
      { prompt: 'Radiate joy.', keyed: '+' },
      { prompt: 'Have a lot of fun.', keyed: '+' },
      { prompt: 'Love life.', keyed: '+' },
      { prompt: 'Look at the bright side of life.', keyed: '+' },
    ],
  },
  // Openness
  {
    domain: 'Openness',
    facet: 'O1 Imagination',
    items: [
      { prompt: 'Have a vivid imagination.', keyed: '+' },
      { prompt: 'Enjoy wild flights of fantasy.', keyed: '+' },
      { prompt: 'Love to daydream.', keyed: '+' },
      { prompt: 'Like to get lost in thought.', keyed: '+' },
    ],
  },
  {
    domain: 'Openness',
    facet: 'O2 Artistic Interests',
    items: [
      { prompt: 'Believe in the importance of art.', keyed: '+' },
      { prompt: 'See beauty in things that others might not notice.', keyed: '+' },
      { prompt: 'Do not like poetry.', keyed: '-' },
      { prompt: 'Do not enjoy going to art museums.', keyed: '-' },
    ],
  },
  {
    domain: 'Openness',
    facet: 'O3 Emotionality',
    items: [
      { prompt: 'Experience my emotions intensely.', keyed: '+' },
      { prompt: "Feel others' emotions.", keyed: '+' },
      { prompt: 'Rarely notice my emotional reactions.', keyed: '-' },
      { prompt: "Don't understand people who get emotional.", keyed: '-' },
    ],
  },
  {
    domain: 'Openness',
    facet: 'O4 Adventurousness',
    items: [
      { prompt: 'Prefer variety to routine.', keyed: '+' },
      { prompt: 'Prefer to stick with things that I know.', keyed: '-' },
      { prompt: 'Dislike changes.', keyed: '-' },
      { prompt: 'Am attached to conventional ways.', keyed: '-' },
    ],
  },
  {
    domain: 'Openness',
    facet: 'O5 Intellect',
    items: [
      { prompt: 'Love to read challenging material.', keyed: '+' },
      { prompt: 'Avoid philosophical discussions.', keyed: '-' },
      { prompt: 'Have difficulty understanding abstract ideas.', keyed: '-' },
      { prompt: 'Am not interested in theoretical discussions.', keyed: '-' },
    ],
  },
  {
    domain: 'Openness',
    facet: 'O6 Liberalism',
    items: [
      { prompt: 'Tend to vote for liberal political candidates.', keyed: '+' },
      { prompt: 'Believe that there is no absolute right and wrong.', keyed: '+' },
      { prompt: 'Tend to vote for conservative political candidates.', keyed: '-' },
      { prompt: 'Believe that we should be tough on crime.', keyed: '-' },
    ],
  },
  // Agreeableness
  {
    domain: 'Agreeableness',
    facet: 'A1 Trust',
    items: [
      { prompt: 'Trust others.', keyed: '+' },
      { prompt: 'Believe that others have good intentions.', keyed: '+' },
      { prompt: 'Trust what people say.', keyed: '+' },
      { prompt: 'Distrust people.', keyed: '-' },
    ],
  },
  {
    domain: 'Agreeableness',
    facet: 'A2 Morality',
    items: [
      { prompt: 'Use others for my own ends.', keyed: '-' },
      { prompt: 'Cheat to get ahead.', keyed: '-' },
      { prompt: 'Take advantage of others.', keyed: '-' },
      { prompt: "Obstruct others' plans.", keyed: '-' },
    ],
  },
  {
    domain: 'Agreeableness',
    facet: 'A3 Altruism',
    items: [
      { prompt: 'Am concerned about others.', keyed: '+' },
      { prompt: 'Love to help others.', keyed: '+' },
      { prompt: 'Am indifferent to the feelings of others.', keyed: '-' },
      { prompt: 'Take no time for others.', keyed: '-' },
    ],
  },
  {
    domain: 'Agreeableness',
    facet: 'A4 Cooperation',
    items: [
      { prompt: 'Love a good fight.', keyed: '-' },
      { prompt: 'Yell at people.', keyed: '-' },
      { prompt: 'Insult people.', keyed: '-' },
      { prompt: 'Get back at others.', keyed: '-' },
    ],
  },
  {
    domain: 'Agreeableness',
    facet: 'A5 Modesty',
    items: [
      { prompt: 'Believe that I am better than others.', keyed: '-' },
      { prompt: 'Think highly of myself.', keyed: '-' },
      { prompt: 'Have a high opinion of myself.', keyed: '-' },
      { prompt: 'Boast about my virtues.', keyed: '-' },
    ],
  },
  {
    domain: 'Agreeableness',
    facet: 'A6 Sympathy',
    items: [
      { prompt: 'Sympathize with the homeless.', keyed: '+' },
      { prompt: 'Feel sympathy for those who are worse off than myself.', keyed: '+' },
      { prompt: "Am not interested in other people's problems.", keyed: '-' },
      { prompt: 'Try not to think about the needy.', keyed: '-' },
    ],
  },
  // Conscientiousness
  {
    domain: 'Conscientiousness',
    facet: 'C1 Self-Efficacy',
    items: [
      { prompt: 'Complete tasks successfully.', keyed: '+' },
      { prompt: 'Excel in what I do.', keyed: '+' },
      { prompt: 'Handle tasks smoothly.', keyed: '+' },
      { prompt: 'Know how to get things done.', keyed: '+' },
    ],
  },
  {
    domain: 'Conscientiousness',
    facet: 'C2 Orderliness',
    items: [
      { prompt: 'Like to tidy up.', keyed: '+' },
      { prompt: 'Often forget to put things back in their proper place.', keyed: '-' },
      { prompt: 'Leave a mess in my room.', keyed: '-' },
      { prompt: 'Leave my belongings around.', keyed: '-' },
    ],
  },
  {
    domain: 'Conscientiousness',
    facet: 'C3 Dutifulness',
    items: [
      { prompt: 'Keep my promises.', keyed: '+' },
      { prompt: 'Tell the truth.', keyed: '+' },
      { prompt: 'Break rules.', keyed: '-' },
      { prompt: 'Break my promises.', keyed: '-' },
    ],
  },
  {
    domain: 'Conscientiousness',
    facet: 'C4 Achievement-Striving',
    items: [
      { prompt: "Do more than what's expected of me.", keyed: '+' },
      { prompt: 'Work hard.', keyed: '+' },
      { prompt: 'Put little time and effort into my work.', keyed: '-' },
      { prompt: 'Do just enough work to get by.', keyed: '-' },
    ],
  },
  {
    domain: 'Conscientiousness',
    facet: 'C5 Self-Discipline',
    items: [
      { prompt: 'Am always prepared.', keyed: '+' },
      { prompt: 'Carry out my plans.', keyed: '+' },
      { prompt: 'Waste my time.', keyed: '-' },
      { prompt: 'Have difficulty starting tasks.', keyed: '-' },
    ],
  },
  {
    domain: 'Conscientiousness',
    facet: 'C6 Cautiousness',
    items: [
      { prompt: 'Jump into things without thinking.', keyed: '-' },
      { prompt: 'Make rash decisions.', keyed: '-' },
      { prompt: 'Rush into things.', keyed: '-' },
      { prompt: 'Act without thinking.', keyed: '-' },
    ],
  },
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

export const ipipNeo120: InstrumentPlugin = {
  definition: {
    id: 'ipip-neo-120',
    title: 'IPIP-NEO-120 (Big Five + 30 facets) — 120 items',
    version: '1.0',
    intro:
      'Public-domain 120-item inventory (Johnson, 2014). Higher scores indicate more of each facet/domain after reverse-keying.\n\nTip: Results can be interpreted by comparing domains and the strongest facets within each domain.',
    items: FACETS.flatMap((f) => f.items).map((it, idx) => ({
      id: `neo120_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_1_5,
      prompt: it.prompt,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const facetScores: Record<string, number> = {};
    const domainScores: Record<string, number> = {};

    let itemIdx = 0;
    for (const facet of FACETS) {
      let facetTotal = 0;
      for (const it of facet.items) {
        itemIdx += 1;
        const v = getLikert15(session.responses, `neo120_${itemIdx}`) ?? 3;
        facetTotal += scoreValue(v, it.keyed);
      }
      facetScores[facet.facet] = facetTotal;
      domainScores[facet.domain] = (domainScores[facet.domain] ?? 0) + facetTotal;
    }

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      subscales: {
        ...domainScores,
        ...facetScores,
      },
      triggers: [],
    };
  },
};
