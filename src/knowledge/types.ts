/**
 * OKF types — open-ended per Google OKF v0.1 spec.
 * These are common conventions, not a closed enum.
 */
export type OKFType = string;

export type OKFStatus = 'active' | 'deprecated' | 'superseded';

/**
 * OKF metadata, aligned with Google's Open Knowledge Format v0.1:
 *   https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing
 *
 * Standard OKF fields: type (required), title, description, resource, tags, timestamp.
 * Hytrax extensions: id, files, status.
 */
export interface OKFMetadata {
  /** Unique document ID (Hytrax extension) */
  id: string;
  /** Knowledge type (OKF standard) */
  type: string;
  /** Human title (OKF standard) */
  title: string;
  /** Description / summary (OKF standard — was 'summary' in pre-v0.1) */
  description: string;
  /** Resource URL (OKF standard) */
  resource?: string;
  /** Tags for search (OKF standard) */
  tags: string[];
  /** Related file paths (Hytrax extension) */
  files: string[];
  /** Document lifecycle status (Hytrax extension) */
  status: OKFStatus;
  /** ISO timestamp when this knowledge was created/updated (OKF standard) */
  timestamp?: string;
  /** Outcome that caused an automatically generated constraint */
  sourceOutcome?: string;
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
}

export type HandoffStatus = 'open' | 'completed' | 'superseded';

export interface HandoffRecord {
  id: string;
  type: 'handoff';
  status: HandoffStatus;
  sourceAgent: string;
  task: string;
  parent?: string;
  tags: string[];
  files: string[];
  createdAt: string;
  body: string;
  filePath: string;
}
