import type { InstrumentPlugin } from '../core/instrumentTypes';
import { phq9 } from './phq9/phq9';
import { gad7 } from './gad7/gad7';
import { pcl5 } from './pcl5/pcl5';
import { asrs6q } from './asrs/asrs6q';
import { asrsPartB12q } from './asrs/asrsPartB12q';
import { adhdSymptomChecklist } from './adhd/adhdSymptomChecklist';
import { ocdSymptomChecklist } from './ocd/ocdSymptomChecklist';
import { ociR } from './ocd/ociR';
import { viqt } from './iq/viqt';
import { aq10Gateway } from './autism/aq10Gateway';
import { raadsR } from './autism/raadsR';
import { catQ } from './autism/catQ';
import { aceQ } from './trauma/aceQ';
import { cssrsScreener } from './cssrs/cssrsScreener';
import { ipip50 } from './personality/ipip50';
import { ipipNeo120 } from './personality/ipipNeo120';
import { ipipViaCore } from './strengths/ipipViaCore';
import { riasec } from './career/riasec';
import { valuesClarification } from './career/valuesClarification';
import { skillsInventory } from './career/skillsInventory';
import { ikigai } from './career/ikigai';
import {
  emotionalIntelligence,
  attachmentStyle,
  cognitiveStyle,
  socialBehavior,
  stressCoping,
  selfPerception,
  philosophicalViews,
} from './additional/additional';

export const instrumentRegistry: InstrumentPlugin[] = [
  phq9,
  gad7,
  pcl5,
  cssrsScreener,
  asrs6q,
  asrsPartB12q,
  adhdSymptomChecklist,
  ocdSymptomChecklist,
  ociR,
  viqt,
  aq10Gateway,
  raadsR,
  catQ,
  aceQ,
  ipip50,
  ipipNeo120,
  ipipViaCore,
  riasec,
  valuesClarification,
  skillsInventory,
  ikigai,
  emotionalIntelligence,
  attachmentStyle,
  cognitiveStyle,
  socialBehavior,
  stressCoping,
  selfPerception,
  philosophicalViews,
];

export function getInstrumentById(id: string): InstrumentPlugin | undefined {
  return instrumentRegistry.find((p) => p.definition.id === id);
}
