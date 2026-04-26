import type { InstrumentPlugin, InstrumentSession, ScoreResult } from '../../core/instrumentTypes';

function getBool(session: InstrumentSession, itemId: string): boolean {
  return session.responses.find((r) => r.itemId === itemId)?.value === true;
}

export const aceQ: InstrumentPlugin = {
  definition: {
    id: 'ace-q',
    title: 'ACE Questionnaire (Adverse Childhood Experiences) — 10 items',
    version: '1.0',
    intro:
      'This questionnaire asks about adverse experiences before age 18. You can skip it if it feels activating. If you notice distress, consider pausing and using the Crisis button or reaching out for support.',
    items: [
      { id: 'ace_1', type: 'yes-no', required: true, prompt: 'Before age 18, did you experience emotional abuse (frequent insults, humiliation, or being put down)?' },
      { id: 'ace_2', type: 'yes-no', required: true, prompt: 'Before age 18, did you experience physical abuse (being hit, beaten, or physically harmed)?' },
      { id: 'ace_3', type: 'yes-no', required: true, prompt: 'Before age 18, did you experience sexual abuse or unwanted sexual contact?' },
      { id: 'ace_4', type: 'yes-no', required: true, prompt: 'Before age 18, did you experience emotional neglect (feeling unloved, unsupported, or not important)?' },
      { id: 'ace_5', type: 'yes-no', required: true, prompt: 'Before age 18, did you experience physical neglect (not having enough to eat, inadequate clothing, unsafe living conditions, or lack of care)?' },
      { id: 'ace_6', type: 'yes-no', required: true, prompt: 'Before age 18, did you witness domestic violence in the home (e.g., a parent/guardian being pushed, slapped, hit, or threatened)?' },
      { id: 'ace_7', type: 'yes-no', required: true, prompt: 'Before age 18, did you live with someone who had substance-use problems (alcohol or drugs)?' },
      { id: 'ace_8', type: 'yes-no', required: true, prompt: 'Before age 18, did you live with someone who had significant mental-health difficulties (e.g., depression, psychosis) or who attempted suicide?' },
      { id: 'ace_9', type: 'yes-no', required: true, prompt: 'Before age 18, did you have a parent/guardian separated/divorced or permanently absent due to abandonment?' },
      { id: 'ace_10', type: 'yes-no', required: true, prompt: 'Before age 18, did you live with someone who was incarcerated?' },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => {
    let total = 0;
    for (let i = 1; i <= 10; i++) {
      if (getBool(session, `ace_${i}`)) total += 1;
    }

    const severity = total >= 4 ? 'Higher ACE exposure (4+)' : total >= 1 ? 'Some ACE exposure (1–3)' : 'No ACE exposures endorsed';

    return {
      instrumentId: session.instrumentId,
      instrumentVersion: session.instrumentVersion,
      totalScore: total,
      severity,
      triggers: [],
    };
  },
};
