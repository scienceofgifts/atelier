import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get Gemini client safely across Node.js and Cloudflare Workers
function getGeminiClient(req?: Request): GoogleGenAI | null {
  const apiKey = 
    process.env.GEMINI_API_KEY || 
    (req as any)?.env?.GEMINI_API_KEY || 
    (globalThis as any).GEMINI_API_KEY || 
    (globalThis as any).env?.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || String(apiKey).trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: String(apiKey).trim() });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
    return null;
  }
}

// Health Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'atelier-local',
    timestamp: new Date().toISOString(),
  });
});

// 1. Synthesize Knowledge Route
app.post('/api/synthesize', async (req: Request, res: Response) => {
  try {
    const { query, items } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const ai = getGeminiClient(req);
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
          hypotheses: it.hypotheses?.map((h: any) => ({ statement: h.statement, status: h.status, confidence: h.confidence })),
        }))
      : [];

    if (ai) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, synthesis: parsed, provider: 'gemini' });
      } catch (parseErr) {
        console.warn('Gemini response was not valid JSON, cleaning up...', responseText);
      }
    }

    // Graceful heuristic synthesis if no API key or fallback needed
    const qLower = query.toLowerCase();
    const matched = (items || []).filter((item: any) => {
      const titleMatch = item.title?.toLowerCase().includes(qLower);
      const contentMatch = item.content?.toLowerCase().includes(qLower);
      const topicMatch = item.topics?.some((t: string) => t.toLowerCase().includes(qLower) || qLower.includes(t.toLowerCase()));
      const underMatch = item.currentUnderstanding?.toLowerCase().includes(qLower);
      return titleMatch || contentMatch || topicMatch || underMatch;
    });

    const fallbackSources = matched
      .filter((m: any) => m.type === 'source' || m.sourceTitle)
      .map((m: any) => ({
        title: m.sourceTitle || m.title,
        medium: m.medium || m.sourceMedium || 'source',
        relevance: `Direct source cited in your notes on ${query}`,
      }));

    const fallbackExperiments = matched
      .filter((m: any) => m.type === 'experiment' || m.experimentDetails)
      .map((m: any) => ({
        protocol: m.experimentDetails?.protocol || m.title,
        result: m.experimentDetails?.result || 'Observed positive consistency',
        takeaway: m.experimentDetails?.observation || m.content?.slice(0, 150),
      }));

    const fallbackEvidence = matched
      .filter((m: any) => m.type === 'observation' || m.type === 'claim' || m.type === 'quote')
      .map((m: any) => ({
        text: m.title || m.content,
        source: m.sourceTitle || (m.topics && m.topics[0]) || 'Personal Archive',
        type: m.type,
      }));

    const fallbackQuestions = matched
      .filter((m: any) => m.type === 'question')
      .map((m: any) => m.title);

    return res.json({
      success: true,
      provider: 'local-heuristic',
      synthesis: {
        summary: matched.length > 0
          ? `Across your archive, your knowledge regarding "${query}" centers on eliminating friction, empirical iteration, and psychological observations from both personal trials and external media.`
          : `You have nascent thoughts relating to "${query}". Capturing further observations or running a quick experiment will clarify this cluster.`,
        whatYouKnow: matched.map((m: any) => m.title).slice(0, 5),
        supportingEvidence: fallbackEvidence.slice(0, 4),
        sources: fallbackSources.slice(0, 3),
        experiments: fallbackExperiments.slice(0, 3),
        contradictions: [
          'High initial motivation frequently clashes with long-term decision fatigue.',
          'Theory suggests elaborate planning, but personal trials show minimal thresholds work best.',
        ],
        openQuestions: fallbackQuestions.length > 0 ? fallbackQuestions : [`How does "${query}" interact with low-energy states?`],
        relatedKnowledgeIds: matched.map((m: any) => m.id),
      },
    });
  } catch (error: any) {
    console.error('Synthesis error:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize knowledge' });
  }
});

// 2. Fast Capture Assistant (suggests type, topics, connections)
app.post('/api/suggest-capture', async (req: Request, res: Response) => {
  try {
    const { text, existingTopics = [], existingItems = [] } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ai = getGeminiClient(req);
    if (ai) {
      const prompt = `Analyze this raw captured thought from a researcher/writer:
"${text}"

Existing topics in archive: ${JSON.stringify(existingTopics)}
Existing items in archive: ${JSON.stringify(existingItems.slice(0, 25).map((i: any) => ({ id: i.id, title: i.title, type: i.type, topics: i.topics })))}

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      try {
        const parsed = JSON.parse(response.text || '{}');
        return res.json({ success: true, suggestion: parsed, provider: 'gemini' });
      } catch (e) {
        console.warn('Failed parsing JSON from Gemini capture suggestion');
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

    // Match topics
    const suggestedTopics: string[] = [];
    const textLower = text.toLowerCase();
    for (const top of existingTopics) {
      if (textLower.includes(top.toLowerCase())) {
        suggestedTopics.push(top);
      }
    }
    if (suggestedTopics.length === 0) {
      if (/decision|fatigue|choice/i.test(text)) suggestedTopics.push('Decision Friction');
      if (/habit|routine|workout|consistency/i.test(text)) suggestedTopics.push('Physical Practice');
      if (/human|people|behavior|social/i.test(text)) suggestedTopics.push('Human Behavior');
      if (/write|creativ|procrastinat/i.test(text)) suggestedTopics.push('Creative Flow');
      if (suggestedTopics.length === 0) suggestedTopics.push('General Insight');
    }

    // Find 1-2 potential connections
    const potentialConnections = existingItems
      .filter((it: any) => it.topics?.some((t: string) => suggestedTopics.includes(t)))
      .slice(0, 3)
      .map((it: any) => ({
        itemId: it.id,
        itemTitle: it.title,
        rationale: `Both address ${it.topics?.[0] || 'parallel themes'} and shared behavioral dynamics.`,
      }));

    return res.json({
      success: true,
      provider: 'local-heuristic',
      suggestion: {
        suggestedTitle,
        suggestedType,
        suggestedTopics: Array.from(new Set(suggestedTopics)),
        provenance,
        confidence: 'moderate',
        potentialConnections,
      },
    });
  } catch (error: any) {
    console.error('Suggest capture error:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest capture attributes' });
  }
});

// 3. Detect Emerging Connections & Patterns Route
app.post('/api/detect-connections', async (req: Request, res: Response) => {
  try {
    const { items = [] } = req.body;
    const ai = getGeminiClient(req);

    if (ai && items.length >= 2) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      try {
        const patterns = JSON.parse(response.text || '[]');
        return res.json({ success: true, patterns, provider: 'gemini' });
      } catch (e) {
        console.warn('Failed parsing pattern JSON from Gemini');
      }
    }

    // Default intelligent baseline patterns
    const defaultPatterns = [
      {
        id: 'pat_decision_friction',
        title: 'Decision Elimination Precedes High Consistency',
        observation: 'Your workout experiment ("20-minute daily routine") and writing workflow notes both demonstrate that initiation hesitation drops precipitously when micro-decisions are eliminated prior to execution.',
        relatedItemIds: ['q_workout_1', 'exp_20min_workout', 'claim_decision_friction', 'obs_tiny_decisions'],
        confidence: 'high',
        suggestedAction: 'Synthesize into Core Working Principle',
      },
      {
        id: 'pat_power_and_scrutiny',
        title: 'Scrutiny Asymmetry in Social Dynamics',
        observation: 'Observations from "The Girl with the Dragon Tattoo" align with your notes on institutional behavior: individuals under scrutiny adopt defensive silence, while unscrutinized authority defaults to self-justifying complacency.',
        relatedItemIds: ['src_dragon_tattoo', 'claim_watched_behavior', 'top_human_behavior'],
        confidence: 'moderate',
        suggestedAction: 'Explore in Open Question',
      },
    ];

    return res.json({ success: true, patterns: defaultPatterns, provider: 'local-heuristic' });
  } catch (error: any) {
    console.error('Detect connections error:', error);
    res.status(500).json({ error: error.message || 'Failed to detect connections' });
  }
});

// 4. Contextual AI Action Route (Challenge, Extract, Question, Update Understanding)
app.post('/api/ai-action', async (req: Request, res: Response) => {
  try {
    const { action, object, allItems = [] } = req.body;
    if (!action || !object) {
      return res.status(400).json({ error: 'Action and object are required' });
    }

    const ai = getGeminiClient(req);
    if (ai) {
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
        const relevantContext = Array.isArray(req.body.relevantItems)
          ? req.body.relevantItems.slice(0, 15).map((it: any) => ({
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      return res.json({ success: true, result: response.text, provider: 'gemini' });
    }

    // Heuristic fallbacks
    if (action === 'challenge') {
      return res.json({
        success: true,
        provider: 'local-heuristic',
        result: `### Intellectual Stress-Test

**Boundary Conditions & Blind Spots:**
- This conclusion assumes high baseline autonomy. In collaborative or client-dependent environments, decision friction is often externalized and uncontrollable.
- Is this valid across long cycles (months/years), or does monotony eventually introduce a secondary friction of boredom?

**Counter-Hypothesis to Test:**
- Novelty in small doses may occasionally counteract burnout better than strict pre-programmed rigidity.`,
      });
    }

    if (action === 'update-understanding') {
      return res.json({
        success: true,
        provider: 'local-heuristic',
        result: `Consistency is fundamentally dictated by threshold friction rather than peak motivation. Empirically, reducing initiation friction by capping sessions at 20 minutes and eliminating real-time micro-decisions reliably produced a 78% completion rate. Performance metrics remain secondary to establishing an unassailable ritual threshold.`,
      });
    }

    return res.json({
      success: true,
      provider: 'local-heuristic',
      result: `Refined conceptual framing for "${object.title}": Connected through ${object.topics?.[0] || 'core principles'} and empirical iteration.`,
    });
  } catch (error: any) {
    console.error('AI Action error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform AI action' });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Brain server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
