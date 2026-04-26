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
  { label: 'Moderately Severe', min: 15, max: 19 },
  { label: 'Severe', min: 20, max: 27 },
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

export const phq9: InstrumentPlugin = {
  definition: {
    id: 'phq-9',
    title: 'PHQ-9 (Depression Screening)',
    version: '1.0',
    intro:
      'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    items: [
      {
        id: 'phq9_1',
        type: 'likert-0-3',
        required: true,
        prompt: 'Little interest or pleasure in doing things',
      },
      {
        id: 'phq9_2',
        type: 'likert-0-3',
        required: true,
        prompt: 'Feeling down, depressed, or hopeless',
      },
      {
        id: 'phq9_3',
        type: 'likert-0-3',
        required: true,
        prompt: 'Trouble falling or staying asleep, or sleeping too much',
      },
      {
        id: 'phq9_4',
        type: 'likert-0-3',
        required: true,
        prompt: 'Feeling tired or having little energy',
      },
      {
        id: 'phq9_5',
        type: 'likert-0-3',
        required: true,
        prompt: 'Poor appetite or overeating',
      },
      {
        id: 'phq9_6',
        type: 'likert-0-3',
        required: true,
        prompt: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      },
      {
        id: 'phq9_7',
        type: 'likert-0-3',
        required: true,
        prompt: 'Trouble concentrating on things, such as reading the newspaper or watching television',
      },
      {
        id: 'phq9_8',
        type: 'likert-0-3',
        required: true,
        prompt:
          'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
      },
      {
        id: 'phq9_9',
        type: 'likert-0-3',
        required: true,
        prompt:
          'Thoughts that you would be better off dead or of hurting yourself in some way',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    let total = 0;
    for (const item of phq9.definition.items) {
      const v = getLikert03(session.responses, item.id);
      total += v ?? 0;
    }

    const triggers = [] as ScoreResult['triggers'];
    const item9 = getLikert03(session.responses, 'phq9_9');
    if (item9 !== null && item9 > 0) {
      triggers.push({
        type: 'show-crisis-resources',
        reason: 'PHQ-9 item 9 endorsed',
        instrumentId: session.instrumentId,
        itemId: 'phq9_9',
      });
    }

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: getSeverity(total),
      bands: BANDS,
      triggers,
    };
  },
};
