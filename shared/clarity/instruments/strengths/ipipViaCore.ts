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

type ScaleSpec = {
  name: string;
  items: { prompt: string; keyed: Keying }[];
};

const SCALES: ScaleSpec[] = [
  {
    name: 'Positivity',
    items: [
      { prompt: 'Remain hopeful despite challenges.', keyed: '+' },
      { prompt: 'Look forward to each new day.', keyed: '+' },
      { prompt: 'Know that there are people in my life who care as much for me as for themselves.', keyed: '+' },
      { prompt: 'Find few things in my life to be grateful for.', keyed: '-' },
      { prompt: 'Find it hard to forgive others.', keyed: '-' },
      { prompt: 'Have difficulty accepting love from anyone.', keyed: '-' },
    ],
  },
  {
    name: 'Dependability',
    items: [
      { prompt: 'Make careful choices.', keyed: '+' },
      { prompt: 'Would never be described as arrogant.', keyed: '+' },
      { prompt: "Believe that everyone's rights are equally important.", keyed: '+' },
      { prompt: 'Lie to get myself out of trouble.', keyed: '-' },
      { prompt: 'Get impatient when others talk to me about their problems.', keyed: '-' },
      { prompt: 'Take advantage of others.', keyed: '-' },
    ],
  },
  {
    name: 'Mastery',
    items: [
      { prompt: 'Am an original thinker.', keyed: '+' },
      { prompt: 'Have a mature view on life.', keyed: '+' },
      { prompt: 'Am valued by my friends for my good judgment.', keyed: '+' },
      { prompt: 'Do not stand up for my beliefs.', keyed: '-' },
      { prompt: 'Have trouble guessing how others will react.', keyed: '-' },
      { prompt: 'Have difficulty getting others to work together.', keyed: '-' },
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

export const ipipViaCore: InstrumentPlugin = {
  definition: {
    id: 'ipip-via-core',
    title: 'VIA (brief) — IPIP-VIA-R Core Strengths (18 items)',
    version: '1.0',
    intro:
      'Brief strengths profile using the IPIP-VIA-R-based Global Core Strength Scales (Partsch et al., 2022). Higher scores indicate more of each core strength after reverse-keying.',
    items: SCALES.flatMap((s) => s.items).map((it, idx) => ({
      id: `via_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_1_5,
      prompt: it.prompt,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const subscales: Record<string, number> = {};

    let idx = 0;
    for (const s of SCALES) {
      let total = 0;
      for (const it of s.items) {
        idx += 1;
        const v = getLikert15(session.responses, `via_${idx}`) ?? 3;
        total += scoreValue(v, it.keyed);
      }
      subscales[s.name] = total;
    }

    const top = Object.entries(subscales).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      severity: top ? `Top core strength: ${top}` : undefined,
      subscales,
      triggers: [],
    };
  },
};
