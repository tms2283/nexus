import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertScale,
  LikertValue,
  ScoreResult,
  SeverityBand,
} from '../../core/instrumentTypes';

const SCALE_0_4: LikertScale = {
  min: 0,
  max: 4,
  labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
};

// Source: Harvard NCS ASRS page (posted Feb 28, 2024) describes a 0–24 scoring update.
const BANDS: SeverityBand[] = [
  { label: 'Low negative', min: 0, max: 9 },
  { label: 'High negative', min: 10, max: 13 },
  { label: 'Low positive', min: 14, max: 17 },
  { label: 'High positive', min: 18, max: 24 },
];

function getLikert04(responses: InstrumentResponse[], itemId: string): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  if (v < 0 || v > 4) return null;
  return v;
}

function getBandLabel(score: number): string {
  const band = BANDS.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? 'Unknown';
}

export const asrs6q: InstrumentPlugin = {
  definition: {
    id: 'asrs-6q',
    title: 'ASRS v1.1 (ADHD) — 6-Question Screener',
    version: '1.0',
    intro:
      'Check the option that best describes how you have felt and conducted yourself over the past 6 months.\n\nScoring note: This app uses the ASRS v1.1 0–24 scoring update (cutoff ≥ 14) as posted by Harvard NCS (Feb 28, 2024).\n\nCopyright © New York University and President and Fellows of Harvard College. All rights reserved.\nCitation: Kessler RC et al. (2005). Psychological Medicine, 35(2), 245–256.',
    items: [
      {
        id: 'asrs6q_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt:
          'How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?',
      },
      {
        id: 'asrs6q_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt:
          'How often do you have difficulty getting things in order when you have to do a task that requires organization?',
      },
      {
        id: 'asrs6q_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you have problems remembering appointments or obligations?',
      },
      {
        id: 'asrs6q_4',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt:
          'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?',
      },
      {
        id: 'asrs6q_5',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt:
          'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?',
      },
      {
        id: 'asrs6q_6',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt:
          'How often do you feel overly active and compelled to do things, like you were driven by a motor?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    let total = 0;
    for (const item of asrs6q.definition.items) {
      const v = getLikert04(session.responses, item.id);
      total += v ?? 0;
    }

    const severity = getBandLabel(total);

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity,
      bands: BANDS,
      triggers: [],
    };
  },
};
