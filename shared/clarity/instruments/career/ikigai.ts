import type { InstrumentPlugin, InstrumentSession, ScoreResult } from '../../core/instrumentTypes';

export const ikigai: InstrumentPlugin = {
  definition: {
    id: 'ikigai',
    title: 'Ikigai Reflection',
    version: '1.0',
    intro:
      'This is a guided reflection exercise (not a clinical instrument). Your responses are stored locally and shown on the results page for reflection.',
    items: [
      {
        id: 'ikigai_love',
        type: 'text',
        required: true,
        prompt: 'What do you love doing? (activities, topics, environments)',
      },
      {
        id: 'ikigai_good',
        type: 'text',
        required: true,
        prompt: 'What are you good at? (skills, strengths, traits)',
      },
      {
        id: 'ikigai_need',
        type: 'text',
        required: true,
        prompt: 'What does the world need (that you care about)? (problems, causes, people you want to help)',
      },
      {
        id: 'ikigai_paid',
        type: 'text',
        required: true,
        prompt: 'What can you be paid for (or rewarded for)? (roles, services, outcomes)',
      },
      {
        id: 'ikigai_synthesis',
        type: 'text',
        required: false,
        prompt: 'Synthesis: based on the above, write a 1–3 sentence “north star” for what you want to build next.',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => ({
    instrumentId: session.instrumentId,
    instrumentVersion: session.instrumentVersion,
    triggers: [],
  }),
};
