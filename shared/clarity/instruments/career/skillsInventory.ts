import type { InstrumentPlugin, InstrumentSession, ScoreResult } from '../../core/instrumentTypes';

export const skillsInventory: InstrumentPlugin = {
  definition: {
    id: 'skills-inventory',
    title: 'Skills Inventory',
    version: '1.0',
    intro:
      'This is a guided exercise (not a clinical instrument). Your responses are stored locally and shown on the results page for reflection.',
    items: [
      {
        id: 'skills_strengths',
        type: 'text',
        required: true,
        prompt: 'List skills you are strong at (technical, interpersonal, creative, practical).',
      },
      {
        id: 'skills_enjoy',
        type: 'text',
        required: false,
        prompt: 'Which skills do you enjoy using the most? Why?',
      },
      {
        id: 'skills_develop',
        type: 'text',
        required: false,
        prompt: 'Which 1–3 skills do you want to develop next?',
      },
      {
        id: 'skills_evidence',
        type: 'text',
        required: false,
        prompt: 'What evidence (projects, feedback, outcomes) supports your strengths?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => ({
    instrumentId: session.instrumentId,
    instrumentVersion: session.instrumentVersion,
    triggers: [],
  }),
};
