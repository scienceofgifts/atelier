export type ObjectType =
  | 'question'
  | 'idea'
  | 'observation'
  | 'source'
  | 'experiment'
  | 'claim'
  | 'concept'
  | 'note'
  | 'experience'
  | 'quote';

export type SourceMedium =
  | 'movie'
  | 'book'
  | 'article'
  | 'video'
  | 'podcast'
  | 'conversation'
  | 'experience'
  | 'other';

export type ProvenanceType =
  | 'tested'        // "I tested this"
  | 'experienced'   // "I experienced this"
  | 'observed'      // "I repeatedly observed this"
  | 'believed'      // "I currently believe this"
  | 'thought'       // "I think this is true"
  | 'read';         // "I read this somewhere"

export type HypothesisStatus =
  | 'untested'
  | 'testing'
  | 'promising'
  | 'supported'
  | 'weak'
  | 'rejected';

export type ConfidenceLevel = 'low' | 'moderate' | 'high' | 'provisional';

export interface Hypothesis {
  id: string;
  statement: string;
  status: HypothesisStatus;
  confidence: ConfidenceLevel;
  evidenceNotes?: string;
  experimentIds?: string[];
  supportingNoteIds?: string[];
  contradictingNoteIds?: string[];
  lastTestedAt?: string;
}

export interface ExperimentRun {
  protocol: string;
  durationDays?: number;
  result: string;
  observation: string;
  status: 'planning' | 'active' | 'completed' | 'paused';
  completedDate?: string;
}

export interface SynthesisHistoryEntry {
  id: string;
  timestamp: string;
  previousUnderstanding: string;
  newUnderstanding: string;
  contributingItemIds?: string[];
  explanation?: string;
}

export interface KnowledgeObject {
  id: string;
  title: string;
  type: ObjectType;
  summary?: string;
  content: string;
  topics: string[];
  
  // Provenance & Confidence
  provenance?: ProvenanceType;
  confidence?: ConfidenceLevel;
  evidenceIds?: string[];
  
  // Source metadata (if this is a source, or derived from one)
  sourceId?: string;
  sourceTitle?: string;
  sourceMedium?: SourceMedium;
  medium?: SourceMedium;
  creator?: string;
  year?: string;
  
  // Specific to Open Questions & Synthesis Tracking
  currentUnderstanding?: string;
  lastSynthesizedAt?: string;
  synthesisHistory?: SynthesisHistoryEntry[];
  hypotheses?: Hypothesis[];
  
  // Specific to Experiments
  experimentDetails?: ExperimentRun;
  relatedQuestionId?: string;
  
  // Specific to Sources (extracted insights)
  extractedItems?: {
    noticed: string[];
    ideas: string[];
    questions: string[];
    quotes: string[];
  };
  
  // Relational connections
  connectedObjectIds: string[];
  
  // Timestamps & Revisiting
  createdAt: string;
  updatedAt: string;
  lastRevisitedAt?: string;
  revisitCount?: number;
  isStarred?: boolean;
}

export interface SynthesisResult {
  query: string;
  summary: string;
  whatYouKnow: string[];
  supportingEvidence: {
    text: string;
    source: string;
    type: string;
  }[];
  sources: {
    title: string;
    medium: string;
    relevance: string;
  }[];
  experiments: {
    protocol: string;
    result: string;
    takeaway: string;
  }[];
  contradictions: string[];
  openQuestions: string[];
  relatedKnowledgeIds: string[];
  timestamp: string;
  provider?: string;
}

export interface ConnectionPattern {
  id: string;
  title: string;
  observation: string;
  relatedItemIds: string[];
  confidence: 'high' | 'moderate' | 'provisional';
  suggestedAction: string;
  accepted?: boolean;
  dismissed?: boolean;
}

export type ActiveView = 
  | 'desk'
  | 'knowledge'
  | 'questions'
  | 'sources'
  | 'topics'
  | 'experiments'
  | 'revisit';
