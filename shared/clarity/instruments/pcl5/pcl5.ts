import type {
  InstrumentPlugin,
  InstrumentResponse,
  InstrumentSession,
  LikertValue,
  ScoreResult,
} from '../../core/instrumentTypes';

const PCL5_SCALE = {
  min: 0,
  max: 4,
  labels: ['Not at all', 'A little bit', 'Moderately', 'Quite a bit', 'Extremely'],
} as const;

function getLikert(responses: InstrumentResponse[], itemId: string, min: number, max: number): LikertValue | null {
  const found = responses.find((r) => r.itemId === itemId);
  if (!found) return null;
  const v = found.value;
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

function sumRange(session: InstrumentSession, start: number, end: number): number {
  let total = 0;
  for (let i = start; i <= end; i++) {
    total += getLikert(session.responses, `pcl5_${i}`, 0, 4) ?? 0;
  }
  return total;
}

function getScreeningLabel(total: number): string {
  if (total >= 33) return 'At/above screening cutoff (33)';
  if (total >= 31) return 'Near suggested cutoff (31–32)';
  return 'Below screening cutoff';
}

export const pcl5: InstrumentPlugin = {
  definition: {
    id: 'pcl-5',
    title: 'PCL-5 (PTSD Checklist for DSM-5)',
    version: '2023-08',
    intro:
      'Keeping your worst event in mind, indicate how much you have been bothered by each problem in the past month.',
    items: [
      {
        id: 'pcl5_1',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Repeated, disturbing, and unwanted memories of the stressful experience?',
      },
      {
        id: 'pcl5_2',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Repeated, disturbing dreams of the stressful experience?',
      },
      {
        id: 'pcl5_3',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt:
          'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?',
      },
      {
        id: 'pcl5_4',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Feeling very upset when something reminded you of the stressful experience?',
      },
      {
        id: 'pcl5_5',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt:
          'Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?',
      },
      {
        id: 'pcl5_6',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Avoiding memories, thoughts, or feelings related to the stressful experience?',
      },
      {
        id: 'pcl5_7',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt:
          'Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?',
      },
      {
        id: 'pcl5_8',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Trouble remembering important parts of the stressful experience?',
      },
      {
        id: 'pcl5_9',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt:
          'Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?',
      },
      {
        id: 'pcl5_10',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Blaming yourself or someone else for the stressful experience or what happened after it?',
      },
      {
        id: 'pcl5_11',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame?',
      },
      {
        id: 'pcl5_12',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Loss of interest in activities that you used to enjoy?',
      },
      {
        id: 'pcl5_13',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Feeling distant or cut off from other people?',
      },
      {
        id: 'pcl5_14',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt:
          'Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?',
      },
      {
        id: 'pcl5_15',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Irritable behavior, angry outbursts, or acting aggressively?',
      },
      {
        id: 'pcl5_16',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Taking too many risks or doing things that could cause you harm?',
      },
      {
        id: 'pcl5_17',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Being “superalert” or watchful or on guard?',
      },
      {
        id: 'pcl5_18',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Feeling jumpy or easily startled?',
      },
      {
        id: 'pcl5_19',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Having difficulty concentrating?',
      },
      {
        id: 'pcl5_20',
        type: 'likert',
        scale: PCL5_SCALE,
        required: true,
        prompt: 'Trouble falling or staying asleep?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const total = sumRange(session, 1, 20);

    const subscales = {
      'Cluster B (Intrusions)': sumRange(session, 1, 5),
      'Cluster C (Avoidance)': sumRange(session, 6, 7),
      'Cluster D (Neg. Cognitions/Mood)': sumRange(session, 8, 14),
      'Cluster E (Hyperarousal)': sumRange(session, 15, 20),
    };

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity: getScreeningLabel(total),
      subscales,
      triggers: [],
    };
  },
};
