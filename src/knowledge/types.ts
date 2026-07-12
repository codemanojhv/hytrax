export type OKFType =
  | 'architecture'
  | 'decision'
  | 'constraint'
  | 'convention'
  | 'workflow'
  | 'api'
  | 'feature'
  | 'preference';

export type OKFStatus = 'active' | 'deprecated' | 'superseded';

export interface OKFMetadata {
  id: string;
  type: OKFType;
  title: string;
  summary: string;
  tags: string[];
  files: string[];
  status: OKFStatus;
}

export interface OKFDocument {
  metadata: OKFMetadata;
  body: string;
  filePath: string;
}

export type OutcomeStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED'
  | 'VERIFIED'
  | 'DEPRECATED'
  | 'SUPERSEDED';

export interface OutcomeRecord {
  id: string;
  task: string;
  type?: string;
  area?: string;
  status: OutcomeStatus;
  reason?: string;
  approach?: string;
  files: string[];
  timestamp: string;
  verification: {
    build: boolean;
    lint?: boolean;
    tests?: number;
  };
}

export interface OutcomeFacts {
  build: 'passed' | 'failed';
  lint?: 'passed' | 'failed';
  tests?: number;
  files?: string[];
  task?: string;
  approach?: string;
  'user-feedback'?: string;
}

export interface SearchResult {
  knowledge: OKFDocument[];
  outcomes: OutcomeRecord[];
}

export interface HytraxConfig {
  project: { name: string };
  search: { max_results: number };
  record: { promotion_threshold: number };
}
