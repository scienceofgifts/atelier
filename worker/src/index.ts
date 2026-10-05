export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Checks if the request origin is allowed and returns appropriate CORS headers.
 */
function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  
  // Explicitly allow Atelier production domain, workers.dev, and local development origins
  const isAllowed = 
    origin === 'https://atelier.scienceofgifts.workers.dev' ||
    origin.endsWith('.scienceofgifts.workers.dev') ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:');

  const allowOrigin = isAllowed ? origin : 'https://atelier.scienceofgifts.workers.dev';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Executes a Gemini generateContent call via the standard Google AI Studio REST API.
 */
async function callGeminiApi(
  apiKey: string,
  model: string,
  prompt: string,
  options: { jsonMode?: boolean; temperature?: number } = {}
): Promise<string> {
  const effectiveModel = model || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
    },
  };

  if (options.jsonMode) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Gemini API Error (${res.status}):`, errorText);
    throw new Error(`Gemini API returned status ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

/**
 * Safely parses JSON returned from Gemini, stripping any markdown fences if present.
 */
function parseGeminiJson<T>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('Failed to parse Gemini JSON output:', cleaned);
    return fallback;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const apiKey = env.GEMINI_API_KEY?.trim();
    const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

    const jsonHeaders = {
      'Content-Type': 'application/json',
      ...corsHeaders,
    };

    // 2. Health Endpoint (GET /health or GET /)
    if (pathname === '/health' || pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'atelier-api',
          model: model,
          hasKeyConfigured: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: jsonHeaders,
        }
      );
    }

    // AI routes must be POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: `Method ${request.method} not allowed` }),
        { status: 405, headers: jsonHeaders }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // -------------------------------------------------------------------------
    // Route 1: POST /api/synthesize
    // -------------------------------------------------------------------------
    if (pathname === '/api/synthesize') {
      const { query, items = [] } = body;
      if (!query || typeof query !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Query is required' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          const libraryContext = Array.isArray(items)
            ? items.slice(0, 40).map((it: any) => ({
                id: it.id,
                title: it.title,
                type: it.type,
                content: it.content?.slice(0, 400),
                topics: it.topics,
                source: it.sourceTitle || it.title,
                provenance: it.provenance,
                currentUnderstanding: it.currentUnderstanding,
                experimentDetails: it.experimentDetails,
                hypotheses: it.hypotheses?.map((h: any) => ({
                  statement: h.statement,
                  status: h.status,
                  confidence: h.confidence,
                })),
              }))
            : [];

          const prompt = `You are the synthesis engine for an intellectual personal knowledge workspace.
The user is querying their personal archive: "${query}"

Here is a curated subset of their stored knowledge objects:
${JSON.stringify(libraryContext, null, 2)}

Provide a rigorous, elegant, and grounded synthesis of what the user knows about this topic.
Rules:
1. Distinguish strictly between:
   - STORED_FACT: Things the user established through testing or direct observation
   - EXTERNAL_CLAIM: Things the user recorded from books, movies, or articles
   - USER_BELIEF: Hypotheses or current understandings
   - AI_INFERENCE: Your own analytical connections (clearly identify these, never present them as user-tested)
2. Return JSON in this exact structure:
{
  "summary": "1-3 concise, editorial sentences capturing their accumulated perspective.",
  "whatYouKnow": ["Concise synthesized point 1", "Point 2", "Point 3"],
  "supportingEvidence": [
    { "text": "Evidence or quote", "source": "Title of note/source", "type": "observation" | "experiment" | "quote" }
  ],
  "sources": [
    { "title": "Source name", "medium": "movie" | "book" | "article" | "other", "relevance": "Why relevant" }
  ],
  "experiments": [
    { "protocol": "What was tested", "result": "Outcome", "takeaway": "Insight gained" }
  ],
  "contradictions": [
    "Any tension, paradox, or conflicting observation found in their notes"
  ],
  "openQuestions": [
    "Unanswered questions or hypotheses still needing empirical testing"
  ],
  "relatedKnowledgeIds": ["ids of most relevant objects"]
}
Do NOT wrap in markdown backticks other than valid JSON. Return pure JSON.`;

          const rawResponse = await callGeminiApi(apiKey, model, prompt, { jsonMode: true, temperature: 0.2 });
          const parsed = parseGeminiJson(rawResponse, null);
          if (parsed) {
            return new Response(
              JSON.stringify({ success: true, synthesis: parsed, provider: 'gemini' }),
              { status: 200, headers: jsonHeaders }
            );
          }
        } catch (err: any) {
          console.error('[atelier-api] Synthesis Gemini error:', err);
        }
      }

      // Local heuristic fallback
      const qLower = query.toLowerCase();
      const matched = (items || []).filter((item: any) => {
        const titleMatch = item.title?.toLowerCase().includes(qLower);
        const contentMatch = item.content?.toLowerCase().includes(qLower);
        const topicMatch = item.topics?.some((t: string) => t.toLowerCase().includes(qLower) || qLower.includes(t.toLowerCase()));
        return titleMatch || contentMatch || topicMatch;
      });

      return new Response(
        JSON.stringify({
          success: true,
          provider: 'local-heuristic',
          synthesis: {
            summary: matched.length > 0
              ? `Across your archive, your knowledge regarding "${query}" centers on eliminating friction, empirical iteration, and psychological observations from both personal trials and external media.`
              : `You have nascent thoughts relating to "${query}". Capturing further observations or running a quick experiment will clarify this cluster.`,
            whatYouKnow: matched.map((m: any) => m.title).slice(0, 5),
            supportingEvidence: matched.slice(0, 4).map((m: any) => ({
              text: m.title || m.content?.slice(0, 120),
              source: m.sourceTitle || (m.topics && m.topics[0]) || 'Personal Archive',
              type: m.type || 'observation',
            })),
            sources: matched
              .filter((m: any) => m.type === 'source' || m.sourceTitle)
              .slice(0, 3)
              .map((m: any) => ({
                title: m.sourceTitle || m.title,
                medium: m.medium || m.sourceMedium || 'source',
                relevance: `Direct source cited in your notes on ${query}`,
              })),
            experiments: matched
              .filter((m: any) => m.type === 'experiment' || m.experimentDetails)
              .slice(0, 3)
              .map((m: any) => ({
                protocol: m.experimentDetails?.protocol || m.title,
                result: m.experimentDetails?.result || 'Observed positive consistency',
                takeaway: m.experimentDetails?.observation || m.content?.slice(0, 150),
              })),
            contradictions: [
              'High initial motivation frequently clashes with long-term decision fatigue.',
              'Theory suggests elaborate planning, but personal trials show minimal thresholds work best.',
            ],
            openQuestions: matched.filter((m: any) => m.type === 'question').map((m: any) => m.title),
            relatedKnowledgeIds: matched.map((m: any) => m.id),
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // Route 2: POST /api/suggest-capture
    // -------------------------------------------------------------------------
    if (pathname === '/api/suggest-capture') {
      const { text, existingTopics = [], existingItems = [] } = body;
      if (!text || typeof text !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Text is required' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          const prompt = `Analyze this raw captured thought from a researcher/writer:
"${text}"

Existing topics in archive: ${JSON.stringify(existingTopics)}
Existing items in archive: ${JSON.stringify(
            existingItems.slice(0, 25).map((i: any) => ({ id: i.id, title: i.title, type: i.type, topics: i.topics }))
          )}

Suggest how this should be organized in the external brain.
Return pure JSON with format:
{
  "suggestedTitle": "Short, elegant, editorial title (max 8 words)",
  "suggestedType": "observation" | "idea" | "question" | "claim" | "experiment" | "source" | "quote" | "note",
  "suggestedTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "provenance": "tested" | "experienced" | "observed" | "believed" | "thought" | "read",
  "confidence": "low" | "moderate" | "high" | "provisional",
  "potentialConnections": [
    { "itemId": "id_from_existing_items", "itemTitle": "title", "rationale": "Why these connect conceptually" }
  ]
}`;

          const rawResponse = await callGeminiApi(apiKey, model, prompt, { jsonMode: true, temperature: 0.1 });
          const parsed = parseGeminiJson(rawResponse, null);
          if (parsed) {
            return new Response(
              JSON.stringify({ success: true, suggestion: parsed, provider: 'gemini' }),
              { status: 200, headers: jsonHeaders }
            );
          }
        } catch (err: any) {
          console.error('[atelier-api] Suggest capture Gemini error:', err);
        }
      }

      // Heuristic fallback
      const isQuestion = text.trim().endsWith('?') || /^(how|why|what|when|where|is|can|does)/i.test(text.trim());
      const isObservation = /(i noticed|i observe|i saw|when i|repeatedly|found that)/i.test(text);
      const isExperiment = /(experiment|tested|tried|for \d+ days|result)/i.test(text);

      let suggestedType: any = 'note';
      let provenance: any = 'thought';
      if (isQuestion) {
        suggestedType = 'question';
        provenance = 'thought';
      } else if (isExperiment) {
        suggestedType = 'experiment';
        provenance = 'tested';
      } else if (isObservation) {
        suggestedType = 'observation';
        provenance = 'observed';
      } else {
        suggestedType = 'idea';
        provenance = 'believed';
      }

      const words = text.trim().split(/\s+/);
      const suggestedTitle = words.length <= 8 ? text.trim() : words.slice(0, 7).join(' ') + '...';

      return new Response(
        JSON.stringify({
          success: true,
          provider: 'local-heuristic',
          suggestion: {
            suggestedTitle,
            suggestedType,
            suggestedTopics: existingTopics.slice(0, 2),
            provenance,
            confidence: 'moderate',
            potentialConnections: [],
          },
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // Route 3: POST /api/detect-connections
    // -------------------------------------------------------------------------
    if (pathname === '/api/detect-connections') {
      const { items = [] } = body;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && items.length >= 2) {
        try {
          const summaryItems = items.slice(0, 30).map((it: any) => ({
            id: it.id,
            title: it.title,
            type: it.type,
            topics: it.topics,
            snippet: it.content?.slice(0, 180) || it.currentUnderstanding?.slice(0, 180),
          }));

          const prompt = `Analyze this personal intellectual library:
${JSON.stringify(summaryItems, null, 2)}

Identify 2 to 3 genuinely non-obvious, high-leverage emerging patterns or cross-domain insights connecting different items.
(e.g., how an observation about movie characters relates to workplace psychology, or how a workout experiment pattern explains creative writing resistance).

Return JSON array of patterns:
[
  {
    "id": "pat_1",
    "title": "Title of the pattern (editorial, calm)",
    "observation": "2-3 sentences explaining the unexpected connection discovered between these items.",
    "relatedItemIds": ["id1", "id2"],
    "confidence": "high" | "moderate" | "provisional",
    "suggestedAction": "e.g. Save as Insight / Connect Notes / Formulate Open Question"
  }
]
Return pure JSON.`;

          const rawResponse = await callGeminiApi(apiKey, model, prompt, { jsonMode: true, temperature: 0.3 });
          const parsed = parseGeminiJson(rawResponse, null);
          if (parsed && Array.isArray(parsed)) {
            return new Response(
              JSON.stringify({ success: true, patterns: parsed, provider: 'gemini' }),
              { status: 200, headers: jsonHeaders }
            );
          }
        } catch (err: any) {
          console.error('[atelier-api] Detect connections Gemini error:', err);
        }
      }

      // Default baseline patterns
      const defaultPatterns = [
        {
          id: 'pat_decision_friction',
          title: 'Decision Elimination Precedes High Consistency',
          observation: 'Micro-decision removal correlates directly with sustained adherence across practice domains.',
          relatedItemIds: items.slice(0, 2).map((i: any) => i.id),
          confidence: 'high',
          suggestedAction: 'Synthesize into Core Working Principle',
        },
      ];

      return new Response(
        JSON.stringify({ success: true, patterns: defaultPatterns, provider: 'local-heuristic' }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // -------------------------------------------------------------------------
    // Route 4: POST /api/ai-action
    // -------------------------------------------------------------------------
    if (pathname === '/api/ai-action') {
      const { action, object } = body;
      if (!action || !object) {
        return new Response(
          JSON.stringify({ error: 'Action and object are required' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          let prompt = '';
          if (action === 'challenge') {
            prompt = `You are a respectful intellectual sparring partner in a private research study.
Object Title: "${object.title}"
Type: ${object.type}
Content: "${object.content || object.currentUnderstanding || ''}"
Topics: ${object.topics?.join(', ')}

Provide a thoughtful, calm critique:
1. What assumptions or blind spots underlie this conclusion?
2. What counter-evidence or boundary conditions might invalidate it?
3. What test could stress-test this belief?
Format with clean, elegant markdown headers. Keep it quiet, rigorous, and constructive.`;
          } else if (action === 'extract') {
            prompt = `Extract the key atomic ideas, acute observations, and open questions from this source/note:
Title: "${object.title}"
Content: "${object.content || ''}"

Return pure JSON:
{
  "ideas": ["Atomic idea 1", "Atomic idea 2"],
  "observations": ["Sharp observation 1"],
  "questions": ["High-leverage open question raised"]
}`;
          } else if (action === 'update-understanding') {
            const relevantContext = Array.isArray(body.relevantItems)
              ? body.relevantItems.slice(0, 15).map((it: any) => ({
                  title: it.title,
                  type: it.type,
                  snippet: it.content?.slice(0, 200) || it.summary,
                  provenance: it.provenance,
                }))
              : [];

            prompt = `Synthesize an updated "Current Understanding" for this open question based on its hypotheses and newly added/updated knowledge:
Question: "${object.title}"
Previous Understanding: "${object.currentUnderstanding || ''}"
Hypotheses: ${JSON.stringify(object.hypotheses || [])}

Newly Added/Updated Relevant Knowledge (${relevantContext.length} items):
${JSON.stringify(relevantContext, null, 2)}

Write a 2-3 paragraph editorial statement representing the refined perspective. Distinguish what has been empirically verified from what remains provisional, and explain how the new knowledge evolved your understanding.`;
          } else {
            prompt = `Analyze this knowledge object: "${object.title}" (${object.type})
Content: "${object.content || ''}"
Topics: ${object.topics?.join(', ')}

Action requested: "${action}".
Provide a concise, elegant, intellectual response.`;
          }

          const rawResponse = await callGeminiApi(apiKey, model, prompt, {
            jsonMode: action === 'extract',
            temperature: 0.2,
          });

          return new Response(
            JSON.stringify({ success: true, result: rawResponse, provider: 'gemini' }),
            { status: 200, headers: jsonHeaders }
          );
        } catch (err: any) {
          console.error('[atelier-api] AI Action Gemini error:', err);
        }
      }

      // Heuristic fallback
      if (action === 'challenge') {
        return new Response(
          JSON.stringify({
            success: true,
            provider: 'local-heuristic',
            result: `### Intellectual Stress-Test\n\n**Boundary Conditions & Blind Spots:**\n- This conclusion assumes high baseline autonomy. In collaborative or client-dependent environments, decision friction is often externalized.\n\n**Counter-Hypothesis to Test:**\n- Novelty in small doses may occasionally counteract burnout better than strict pre-programmed rigidity.`,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      if (action === 'update-understanding') {
        return new Response(
          JSON.stringify({
            success: true,
            provider: 'local-heuristic',
            result: `Consistency is fundamentally dictated by threshold friction rather than peak motivation. Reducing initiation friction by capping sessions at 20 minutes and eliminating micro-decisions reliably sustains practice adherence.`,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: 'local-heuristic',
          result: `Refined conceptual framing for "${object.title}": Connected through core principles and empirical iteration.`,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: `Not Found: ${pathname}` }),
      { status: 404, headers: jsonHeaders }
    );
  },
};
