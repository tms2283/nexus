export interface BktParams {
  pInit: number;
  pLearn: number;
  pSlip: number;
  pGuess: number;
}

export const DEFAULT_BKT: BktParams = {
  pInit: 0.10,
  pLearn: 0.20,
  pSlip: 0.10,
  pGuess: 0.20,
};

export const MASTERY_THRESHOLD = 0.85;

export function bktUpdate(
  priorKnown: number,
  correct: boolean,
  params: BktParams = DEFAULT_BKT
): { pKnown: number; mastered: boolean } {
  const { pLearn, pSlip, pGuess } = params;
  const pL = Math.max(0, Math.min(1, priorKnown));

  const givenObs = correct
    ? (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * pGuess)
    : (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - pGuess));

  const pKnown = givenObs + (1 - givenObs) * pLearn;
  return { pKnown, mastered: pKnown >= MASTERY_THRESHOLD };
}
