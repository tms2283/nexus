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
  labels: ['Strongly dislike', 'Dislike', 'Neutral', 'Like', 'Strongly like'],
};

type RIASEC = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

type ItemSpec = {
  prompt: string;
  code: RIASEC;
};

const ITEMS: ItemSpec[] = [
  // Realistic
  { code: 'R', prompt: 'Build, repair, or maintain something mechanical or physical.' },
  { code: 'R', prompt: 'Work with tools, equipment, or machines.' },
  { code: 'R', prompt: 'Do hands-on work that produces a tangible result.' },
  { code: 'R', prompt: 'Work outdoors or in a practical, physical environment.' },
  { code: 'R', prompt: 'Troubleshoot and fix practical problems.' },
  { code: 'R', prompt: 'Learn a trade or craft with clear techniques.' },

  // Investigative
  { code: 'I', prompt: 'Analyze data to find patterns and explanations.' },
  { code: 'I', prompt: 'Solve complex problems using logic or science.' },
  { code: 'I', prompt: 'Research a topic deeply to understand how it works.' },
  { code: 'I', prompt: 'Work on puzzles, diagnostics, or debugging.' },
  { code: 'I', prompt: 'Design experiments or tests to answer questions.' },
  { code: 'I', prompt: 'Learn advanced concepts (math, science, theory) for their own sake.' },

  // Artistic
  { code: 'A', prompt: 'Create art, music, writing, or other original work.' },
  { code: 'A', prompt: 'Explore ideas through imagination and creativity.' },
  { code: 'A', prompt: 'Design visuals or experiences (graphics, UI, video, style).' },
  { code: 'A', prompt: 'Express emotions or meaning through creative work.' },
  { code: 'A', prompt: 'Try unconventional approaches and experiment with style.' },
  { code: 'A', prompt: 'Work in an environment that values originality over rules.' },

  // Social
  { code: 'S', prompt: 'Teach, coach, or mentor someone.' },
  { code: 'S', prompt: 'Help people solve personal or interpersonal problems.' },
  { code: 'S', prompt: 'Provide care, support, or guidance to others.' },
  { code: 'S', prompt: 'Work in a role that involves listening and empathy.' },
  { code: 'S', prompt: 'Facilitate group learning or collaboration.' },
  { code: 'S', prompt: 'Work toward improving wellbeing in a community.' },

  // Enterprising
  { code: 'E', prompt: 'Persuade or influence others to take action.' },
  { code: 'E', prompt: 'Lead a team toward goals and outcomes.' },
  { code: 'E', prompt: 'Negotiate, sell, or advocate for an idea.' },
  { code: 'E', prompt: 'Start projects or ventures and take calculated risks.' },
  { code: 'E', prompt: 'Make decisions in ambiguous situations.' },
  { code: 'E', prompt: 'Compete to win or achieve measurable success.' },

  // Conventional
  { code: 'C', prompt: 'Organize information and keep systems running smoothly.' },
  { code: 'C', prompt: 'Work with schedules, checklists, and structured processes.' },
  { code: 'C', prompt: 'Manage details, records, or documentation carefully.' },
  { code: 'C', prompt: 'Prefer clear expectations and stable routines.' },
  { code: 'C', prompt: 'Create order in messy situations (sorting, filing, procedures).' },
  { code: 'C', prompt: 'Work with numbers, forms, or administrative workflows.' },
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

export const riasec: InstrumentPlugin = {
  definition: {
    id: 'riasec',
    title: 'Holland Code (RIASEC) — Interest Survey (proxy)',
    version: '1.0',
    intro:
      'This is a brief, original interest survey inspired by the RIASEC model. It is not an official Holland SDS instrument. Higher scores suggest stronger interest in that theme.',
    items: ITEMS.map((it, idx) => ({
      id: `ria_${idx + 1}`,
      type: 'likert' as const,
      required: true,
      scale: SCALE_1_5,
      prompt: it.prompt,
    })),
  },

  score: (session: InstrumentSession): ScoreResult => {
    const sums: Record<RIASEC, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    ITEMS.forEach((spec, idx) => {
      const v = getLikert15(session.responses, `ria_${idx + 1}`) ?? 3;
      sums[spec.code] += v;
    });

    const ranked = (Object.entries(sums) as Array<[RIASEC, number]>).sort((a, b) => b[1] - a[1]);
    const code3 = ranked.slice(0, 3).map(([c]) => c).join('');

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      severity: `Holland code: ${code3}`,
      subscales: {
        Realistic: sums.R,
        Investigative: sums.I,
        Artistic: sums.A,
        Social: sums.S,
        Enterprising: sums.E,
        Conventional: sums.C,
      },
      triggers: [],
    };
  },
};
