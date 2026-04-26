import type { InstrumentPlugin, InstrumentSession, ScoreResult } from '../../core/instrumentTypes';

export const valuesClarification: InstrumentPlugin = {
  definition: {
    id: 'values-clarification',
    title: 'Values Clarification',
    version: '1.0',
    intro:
      'This is a guided exercise (not a clinical instrument). Your responses are stored locally and shown on the results page for reflection.',
    items: [
      {
        id: 'values_list',
        type: 'text',
        required: true,
        prompt: 'List 5–10 personal values that matter to you most right now (one per line).',
      },
      {
        id: 'values_top3',
        type: 'text',
        required: true,
        prompt: 'Pick your top 3 values. Why these three?',
      },
      {
        id: 'values_example',
        type: 'text',
        required: false,
        prompt: 'Describe a recent situation where you acted in alignment with your values (or felt out of alignment).',
      },
      {
        id: 'values_next',
        type: 'text',
        required: false,
        prompt: 'What is one small action you can take this week to live your values more fully?',
      },
    ],
  },

  score: (session: InstrumentSession): ScoreResult => ({
    instrumentId: session.instrumentId,
    instrumentVersion: session.instrumentVersion,
    triggers: [],
  }),
};
