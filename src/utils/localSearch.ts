import { KnowledgeObject, ObjectType } from '../types/knowledge';

export interface SearchMatchExcerpt {
  field: string;
  before: string;
  matchedText: string;
  after: string;
  fullExcerptText: string;
}

export interface SearchResultItem {
  object: KnowledgeObject;
  score: number;
  snippets: SearchMatchExcerpt[];
  primarySnippetText: string;
  matchReasons: string[];
}

export interface SearchOptions {
  typeFilter?: ObjectType | 'all';
  topicFilter?: string | null;
  minScore?: number;
}

// 1. Irregular & Regular Plural / Stem Dictionary
const STEM_MAP: Record<string, string> = {
  women: 'woman',
  woman: 'woman',
  movies: 'movie',
  movie: 'movie',
  workouts: 'workout',
  workout: 'workout',
  questions: 'question',
  question: 'question',
  observations: 'observation',
  observation: 'observation',
  experiments: 'experiment',
  experiment: 'experiment',
  ideas: 'idea',
  idea: 'idea',
  claims: 'claim',
  claim: 'claim',
  sources: 'source',
  source: 'source',
  notes: 'note',
  note: 'note',
  decisions: 'decision',
  decision: 'decision',
  frictions: 'friction',
  friction: 'friction',
  behaviors: 'behavior',
  behavior: 'behavior',
  habits: 'habit',
  habit: 'habit',
  quotes: 'quote',
  quote: 'quote',
  results: 'result',
  result: 'result',
  hypotheses: 'hypothesis',
  hypothesis: 'hypothesis',
  trials: 'trial',
  trial: 'trial',
  practices: 'practice',
  practice: 'practice',
};

/**
 * Normalizes text for search indexing: lowercase, strips punctuation, normalizes spaces.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stems a word or returns basic singular/plural variants.
 */
export function stemWord(word: string): string {
  const norm = word.toLowerCase().trim();
  if (STEM_MAP[norm]) return STEM_MAP[norm];

  // Simple heuristic stemming for English plurals
  if (norm.length > 4 && norm.endsWith('ies')) {
    return norm.slice(0, -3) + 'y'; // e.g. memories -> memory
  }
  if (norm.length > 3 && norm.endsWith('s') && !norm.endsWith('ss')) {
    return norm.slice(0, -1); // e.g. books -> book
  }
  return norm;
}

/**
 * Tokenizes and normalizes a search query string into canonical stem tokens.
 */
export function tokenizeQuery(query: string): { original: string; normalized: string; tokens: string[]; stems: string[] } {
  const norm = normalizeText(query);
  const tokens = norm.split(' ').filter(Boolean);
  const stems = tokens.map(stemWord);
  return {
    original: query,
    normalized: norm,
    tokens,
    stems,
  };
}

/**
 * Extracts searchable text fields from a KnowledgeObject into an indexed bundle.
 */
function extractSearchableFields(obj: KnowledgeObject): {
  title: string;
  topics: string;
  sourceTitle: string;
  creator: string;
  content: string;
  summary: string;
  currentUnderstanding: string;
  hypotheses: string;
  experimentDetails: string;
  extractedItems: string;
  provenance: string;
  type: string;
} {
  const hypothesesText = (obj.hypotheses || []).map(h => `${h.statement} ${h.evidenceNotes || ''}`).join(' ');
  
  const expText = obj.experimentDetails 
    ? `${obj.experimentDetails.protocol} ${obj.experimentDetails.result} ${obj.experimentDetails.observation}`
    : '';

  const extText = obj.extractedItems
    ? `${(obj.extractedItems.noticed || []).join(' ')} ${(obj.extractedItems.ideas || []).join(' ')} ${(obj.extractedItems.questions || []).join(' ')} ${(obj.extractedItems.quotes || []).join(' ')}`
    : '';

  return {
    title: obj.title || '',
    topics: (obj.topics || []).join(' '),
    sourceTitle: obj.sourceTitle || '',
    creator: obj.creator || '',
    content: obj.content || '',
    summary: obj.summary || '',
    currentUnderstanding: obj.currentUnderstanding || '',
    hypotheses: hypothesesText,
    experimentDetails: expText,
    extractedItems: extText,
    provenance: obj.provenance || '',
    type: obj.type || '',
  };
}

/**
 * Calculates deterministic relevance score and extracts matched snippets for a single KnowledgeObject.
 * Weights:
 * - Exact Title Match: 120 pts
 * - Title Phrase Match: 80 pts
 * - Title Token / Stem Match: 40 pts per token
 * - Topic Match: 50 pts per topic match
 * - Source Title / Creator Match: 45 pts
 * - Exact Phrase Match in Content / Understanding: 60 pts
 * - Hypotheses & Experiment Match: 35 pts
 * - Individual Word Match in Content: 10 pts + frequency boost
 */
export function scoreKnowledgeObject(obj: KnowledgeObject, queryInfo: ReturnType<typeof tokenizeQuery>): SearchResultItem | null {
  if (!queryInfo.normalized || queryInfo.tokens.length === 0) return null;

  const fields = extractSearchableFields(obj);
  let totalScore = 0;
  const matchReasons: string[] = [];
  const queryNorm = queryInfo.normalized;

  // 1. TITLE MATCHES
  const normTitle = normalizeText(fields.title);
  if (normTitle === queryNorm) {
    totalScore += 120;
    matchReasons.push('Exact Title Match');
  } else if (normTitle.includes(queryNorm)) {
    totalScore += 80;
    matchReasons.push('Title Phrase Match');
  } else {
    let titleTokenMatches = 0;
    for (const qStem of queryInfo.stems) {
      if (normTitle.split(' ').some(t => stemWord(t) === qStem)) {
        titleTokenMatches++;
      }
    }
    if (titleTokenMatches > 0) {
      totalScore += titleTokenMatches * 35;
      matchReasons.push('Title Term Match');
    }
  }

  // 2. TOPIC MATCHES
  const normTopics = normalizeText(fields.topics);
  for (const qStem of queryInfo.stems) {
    if (normTopics.split(' ').some(t => stemWord(t) === qStem)) {
      totalScore += 45;
      matchReasons.push('Topic Match');
      break;
    }
  }

  // 3. SOURCE TITLE / CREATOR MATCHES
  const normSource = normalizeText(`${fields.sourceTitle} ${fields.creator}`);
  if (normSource) {
    if (normSource.includes(queryNorm)) {
      totalScore += 50;
      matchReasons.push('Source Match');
    } else {
      for (const qStem of queryInfo.stems) {
        if (normSource.split(' ').some(t => stemWord(t) === qStem)) {
          totalScore += 25;
          matchReasons.push('Source Term Match');
          break;
        }
      }
    }
  }

  // 4. CONTENT & UNDERSTANDING MATCHES
  const combinedBody = `${fields.content} ${fields.currentUnderstanding} ${fields.summary} ${fields.extractedItems}`.trim();
  const normBody = normalizeText(combinedBody);

  if (combinedBody) {
    if (normBody.includes(queryNorm)) {
      totalScore += 65;
      matchReasons.push('Exact Phrase in Content');
    }

    // Token frequency in body
    const bodyWords = normBody.split(' ');
    let wordHitCount = 0;
    for (const qStem of queryInfo.stems) {
      for (const bWord of bodyWords) {
        if (stemWord(bWord) === qStem) {
          wordHitCount++;
        }
      }
    }

    if (wordHitCount > 0) {
      totalScore += Math.min(wordHitCount * 12, 100);
      if (!matchReasons.includes('Exact Phrase in Content')) {
        matchReasons.push('Content Match');
      }
    }
  }

  // 5. HYPOTHESES & EXPERIMENTS MATCHES
  const normExpHyp = normalizeText(`${fields.hypotheses} ${fields.experimentDetails}`);
  if (normExpHyp) {
    for (const qStem of queryInfo.stems) {
      if (normExpHyp.split(' ').some(t => stemWord(t) === qStem)) {
        totalScore += 30;
        matchReasons.push('Experiment/Hypothesis Match');
        break;
      }
    }
  }

  // Filter out non-matching objects
  if (totalScore === 0) return null;

  // Extract snippet highlighting
  const snippets = extractSnippets(obj, queryInfo);
  const primarySnippetText = snippets.length > 0 ? snippets[0].fullExcerptText : obj.summary || obj.content.slice(0, 180);

  return {
    object: obj,
    score: totalScore,
    snippets,
    primarySnippetText,
    matchReasons: Array.from(new Set(matchReasons)),
  };
}

/**
 * Extracts real excerpts surrounding matching query terms in the object text.
 */
export function extractSnippets(obj: KnowledgeObject, queryInfo: ReturnType<typeof tokenizeQuery>, maxSnippets = 2): SearchMatchExcerpt[] {
  const snippets: SearchMatchExcerpt[] = [];
  const textSources: { fieldName: string; text: string }[] = [
    { fieldName: 'content', text: obj.content || '' },
    { fieldName: 'currentUnderstanding', text: obj.currentUnderstanding || '' },
    { fieldName: 'summary', text: obj.summary || '' },
    { fieldName: 'extractedItems', text: obj.extractedItems ? `${(obj.extractedItems.noticed || []).join('. ')} ${(obj.extractedItems.ideas || []).join('. ')} ${(obj.extractedItems.quotes || []).join('. ')}` : '' },
    { fieldName: 'hypotheses', text: (obj.hypotheses || []).map(h => h.statement).join('. ') },
    { fieldName: 'experimentDetails', text: obj.experimentDetails ? `${obj.experimentDetails.protocol} ${obj.experimentDetails.result} ${obj.experimentDetails.observation}` : '' },
  ];

  for (const src of textSources) {
    if (!src.text.trim()) continue;
    const lowerText = src.text.toLowerCase();

    // Check for each token/stem
    for (const token of queryInfo.tokens) {
      const idx = lowerText.indexOf(token.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(src.text.length, idx + token.length + 90);
        
        const before = (start > 0 ? '...' : '') + src.text.substring(start, idx);
        const matchedText = src.text.substring(idx, idx + token.length);
        const after = src.text.substring(idx + token.length, end) + (end < src.text.length ? '...' : '');

        snippets.push({
          field: src.fieldName,
          before,
          matchedText,
          after,
          fullExcerptText: `${before}${matchedText}${after}`,
        });

        if (snippets.length >= maxSnippets) return snippets;
      }
    }
  }

  return snippets;
}

/**
 * Executes a deterministic local search across an array of KnowledgeObjects.
 */
export function executeLocalSearch(
  items: KnowledgeObject[],
  rawQuery: string,
  options: SearchOptions = {}
): SearchResultItem[] {
  const queryInfo = tokenizeQuery(rawQuery);
  if (!queryInfo.normalized) return [];

  let results: SearchResultItem[] = [];

  for (const item of items) {
    // Never return deleted/tombstoned objects in search results
    if (item.isDeleted) {
      continue;
    }

    // Optional filters
    if (options.typeFilter && options.typeFilter !== 'all' && item.type !== options.typeFilter) {
      continue;
    }
    if (options.topicFilter && !item.topics?.includes(options.topicFilter)) {
      continue;
    }

    const match = scoreKnowledgeObject(item, queryInfo);
    if (match && match.score >= (options.minScore || 1)) {
      results.push(match);
    }
  }

  // Sort by relevance score descending, then by updatedAt descending
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(b.object.updatedAt).getTime() - new Date(a.object.updatedAt).getTime();
  });

  return results;
}
