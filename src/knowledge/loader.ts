import { getKnowledgeDir } from '../utils/paths.js';
import { loadAllOKF } from './parser.js';
import type { OKFDocument } from './types.js';

export function loadKnowledge(hytraxRoot: string): OKFDocument[] {
  const knowledgeDir = getKnowledgeDir(hytraxRoot);
  return loadAllOKF(knowledgeDir);
}
