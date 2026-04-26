import type {
  InstrumentPlugin,
  InstrumentSession,
  ScoreResult,
  CrisisTrigger,
} from '../../core/instrumentTypes';

/**
 * C-SSRS Screener (Columbia Suicide Severity Rating Scale) — 6-item Screener Version
 *
 * Public domain. Developed by Columbia University.
 * See: https://cssrs.columbia.edu/
 *
 * The screener version asks about lifetime and recent (past month) suicidal ideation and behavior.
 * ANY positive response triggers crisis resources.
 *
 * This is NOT a diagnostic tool. Any endorsement should prompt professional evaluation.
 */

function getBool(session: InstrumentSession, itemId: string): boolean {
  return session.responses.find((r) => r.itemId === itemId)?.value === true;
}

export const cssrsScreener: InstrumentPlugin = {
  definition: {
    id: 'cssrs-screener',
    title: 'C-SSRS Screener (Suicide Safety Screening)',
    version: '1.0',
    intro:
      'This is the Columbia Suicide Severity Rating Scale — Screener Version.\n\n' +
      'It asks about thoughts and behaviors related to suicide. Your answers are stored locally and never shared.\n\n' +
      'If you are in immediate danger, please call 988 (Suicide & Crisis Lifeline) or 911 now.\n\n' +
      'You can stop at any time. Any "Yes" answer will immediately show crisis support resources.\n\n' +
      'Source: Columbia University / cssrs.columbia.edu. Public domain.',
    items: [
      {
        id: 'cssrs_1',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you wished you were dead or wished you could go to sleep and not wake up?',
      },
      {
        id: 'cssrs_2',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you actually had any thoughts of killing yourself?',
      },
      {
        id: 'cssrs_3',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you been thinking about how you might do this?',
      },
      {
        id: 'cssrs_4',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you had these thoughts and had some intention of acting on them?',
      },
      {
        id: 'cssrs_5',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?',
      },
      {
        id: 'cssrs_6',
        type: 'yes-no',
        required: true,
        prompt:
          'Have you ever done anything, started to do anything, or prepared to do anything to end your life?\n\nExamples: Collected pills, obtained a gun, gave away valuables, wrote a will or suicide note, took out pills but didn\'t swallow any, held a gun but changed your mind or it was grabbed from your hand, went to the roof but didn\'t jump; or actually took pills, tried to shoot yourself, cut yourself, tried to hang yourself, etc.',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    const triggers: CrisisTrigger[] = [];

    const q1 = getBool(session, 'cssrs_1');
    const q2 = getBool(session, 'cssrs_2');
    const q3 = getBool(session, 'cssrs_3');
    const q4 = getBool(session, 'cssrs_4');
    const q5 = getBool(session, 'cssrs_5');
    const q6 = getBool(session, 'cssrs_6');

    const anyPositive = q1 || q2 || q3 || q4 || q5 || q6;
    const ideationLevel = q5 ? 5 : q4 ? 4 : q3 ? 3 : q2 ? 2 : q1 ? 1 : 0;
    const hasBehavior = q6;

    let severity: string;
    if (q4 || q5 || q6) {
      severity = 'High risk — immediate professional evaluation recommended';
    } else if (q2 || q3) {
      severity = 'Moderate risk — professional evaluation recommended';
    } else if (q1) {
      severity = 'Low risk — wish to be dead endorsed; monitoring recommended';
    } else {
      severity = 'No suicidal ideation or behavior endorsed';
    }

    if (anyPositive) {
      triggers.push({
        type: 'show-crisis-resources',
        reason: `C-SSRS: Suicidal ideation level ${ideationLevel}${hasBehavior ? ' with lifetime behavior' : ''}`,
        instrumentId: 'cssrs-screener',
      });
    }

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: ideationLevel,
      severity,
      subscales: {
        'Ideation level (0-5)': ideationLevel,
        'Lifetime behavior': hasBehavior ? 1 : 0,
      },
      triggers,
    };
  },
};
