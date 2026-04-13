
export enum AppState {
  INITIAL = 'INITIAL',
  GENERATING = 'GENERATING',
  TESTING = 'TESTING',
  REVIEWING = 'REVIEWING',
  RESULTS = 'RESULTS'
}

export enum TextType {
  PLANO = 'plano',
  LIBRE = 'libre'
}

export interface ScoringResult {
  grossStrokes: number;
  netStrokes: number;
  penalties: number;
  errorCount: number;
  errorRate: number;
  isApt: boolean;
  reason?: string;
  timeSpent: number; // in seconds
  strokesPerMinute: number;
  diffMarkup: DiffChunk[];
}

export interface DiffChunk {
  type: 'match' | 'omission' | 'inclusion' | 'substitution' | 'spelling' | 'inversion';
  original: string;
  typed: string;
  reason?: string;
  penalty?: number;
}

export interface TestData {
  originalText: string;
  typedText: string;
}

export interface AIAuditError {
  word: string;
  correction: string;
  type: 'simple' | 'inversion' | 'multiple';
  reason: string;
  index: number;
}

export interface TestRecord {
  id: string;
  date: string;
  type: TextType;
  isApt: boolean;
  reason?: string;
  netStrokes: number;
  grossStrokes: number;
  errorRate: number;
  strokesPerMinute: number;
  timeSpent?: number;
}
