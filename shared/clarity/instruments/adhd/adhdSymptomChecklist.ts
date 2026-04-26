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

// This is intentionally NOT the ASRS 18-item checklist and is not a validated diagnostic tool.
// It exists as a privacy-first self-reflection follow-up when licensed text is unavailable.
export const adhdSymptomChecklist: InstrumentPlugin = {
  definition: {
    id: 'adhd-symptom-checklist',
    title: 'ADHD Symptom Checklist (Proxy follow-up, non-diagnostic)',
    version: '1.1',
    intro:
      'This is an original follow-up checklist for personal reflection only. It is not a validated clinical instrument and cannot diagnose ADHD.\n\nIf you want a validated screener, use ASRS v1.1 (the 6-question screener). For licensed/validated full checklists, use a permitted source and (if needed) load exact item text via local instrument text overrides.\n\nTimeframe: past 6 months.',
    items: [
      // Inattention (9)
      {
        id: 'adhd_inatt_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you make avoidable mistakes on details (work, school, forms, messages) because you miss or overlook things?',
      },
      {
        id: 'adhd_inatt_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you find it hard to stay focused on a task or conversation, even when you want to?',
      },
      {
        id: 'adhd_inatt_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you realize you “spaced out” and missed part of what someone said to you?',
      },
      {
        id: 'adhd_inatt_4',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do unfinished tasks pile up even when you intended to finish them?',
      },
      {
        id: 'adhd_inatt_5',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often does planning, organizing, or prioritizing steps feel harder than the task itself?',
      },
      {
        id: 'adhd_inatt_6',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you delay mentally demanding tasks (reading, forms, paperwork, long emails) until the last minute?',
      },
      {
        id: 'adhd_inatt_7',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you misplace important items (keys, phone, wallet, documents) or spend time searching for them?',
      },
      {
        id: 'adhd_inatt_8',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you get pulled off-task by unrelated thoughts, notifications, or nearby activity?',
      },
      {
        id: 'adhd_inatt_9',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do appointments, bills, or replies slip unless you set multiple reminders?',
      },

      // Hyperactivity / Impulsivity (9)
      {
        id: 'adhd_hyp_1',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel physically or mentally restless when you are expected to sit still for a while?',
      },
      {
        id: 'adhd_hyp_2',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you get up or change locations when it would be more appropriate to stay seated?',
      },
      {
        id: 'adhd_hyp_3',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel unable to relax or “switch off,” even during downtime?',
      },
      {
        id: 'adhd_hyp_4',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you feel compelled to stay busy or feel uncomfortable doing “nothing”?',
      },
      {
        id: 'adhd_hyp_5',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do others comment that you talk a lot, talk fast, or have trouble pausing?',
      },
      {
        id: 'adhd_hyp_6',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you answer before someone finishes their question or finish their sentences?',
      },
      {
        id: 'adhd_hyp_7',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you find waiting your turn difficult (in conversations, lines, meetings, or games)?',
      },
      {
        id: 'adhd_hyp_8',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you interrupt, jump in, or take over (talking over people, changing topics, or grabbing tasks)?',
      },
      {
        id: 'adhd_hyp_9',
        type: 'likert',
        required: true,
        scale: SCALE_0_4,
        prompt: 'How often do you make impulsive decisions (spending, messaging, commitments) and regret it later?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const inattIds = adhdSymptomChecklist.definition.items
      .filter((i) => i.id.startsWith('adhd_inatt_'))
      .map((i) => i.id);
    const hypIds = adhdSymptomChecklist.definition.items
      .filter((i) => i.id.startsWith('adhd_hyp_'))
      .map((i) => i.id);

    const inatt = sumItems(session, inattIds);
    const hyp = sumItems(session, hypIds);

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: inatt + hyp,
      subscales: {
        Inattention: inatt,
        'Hyperactivity/Impulsivity': hyp,
      },
      triggers: [],
    };
  },
};
