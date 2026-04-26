import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  Likert03,
  ScoreResult,
  SeverityBand,
} from '../../core/instrumentTypes';

const BANDS: SeverityBand[] = [
  { label: 'Minimal', min: 0, max: 4 },
  { label: 'Mild', min: 5, max: 9 },
  { label: 'Moderate', min: 10, max: 14 },
  { label: 'Severe', min: 15, max: 21 },
];

function getLikert03(responses: InstrumentResponse[], itemId: string): Likert03 | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (v === 0 || v === 1 || v === 2 || v === 3) return v;
  return null;
}

function getSeverity(score: number): string {
  const band = BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? 'Unknown';
}

export const gad7: InstrumentPlugin = {
  definition: {
    id: 'gad-7',
    title: 'GAD-7 (Anxiety Screening)',
    version: '1.1',
    intro:
      'Over the last 2 weeks, how often have you been bothered by the following problems?\n\nDeveloped by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke, and colleagues. No permission required to reproduce, translate, display, or distribute.',
    items: [
      {
        id: 'gad7_1',
        type: 'likert-0-3',
        required: true,
        prompt: 'Feeling nervous, anxious, or on edge',
      },
      {
        id: 'gad7_2',
        type: 'likert-0-3',
        required: true,
        prompt: 'Not being able to stop or control worrying',
      },
      {
        id: 'gad7_3',
        type: 'likert-0-3',
        required: true,
        prompt: 'Worrying too much about different things',
      },
      {
        id: 'gad7_4',
        type: 'likert-0-3',
        required: true,
        prompt: 'Trouble relaxing',
      },
      {
        id: 'gad7_5',
        type: 'likert-0-3',
        required: true,
        prompt: 'Being so restless that it is hard to sit still',
      },
      {
        id: 'gad7_6',
        type: 'likert-0-3',
        required: true,
        prompt: 'Becoming easily annoyed or irritable',
      },
      {
        id: 'gad7_7',
        type: 'likert-0-3',
        required: true,
        prompt: 'Feeling afraid, as if something awful might happen',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    let total = 0;
    for (const item of gad7.definition.items) {
      const v = getLikert03(session.responses, item.id);
      total += v ?? 0;
    }

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: getSeverity(total),
      bands: BANDS,
      triggers: [],
    };
  },
};
