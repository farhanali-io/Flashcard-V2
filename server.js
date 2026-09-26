import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Heuristic fallback flashcard extractor
function generateCardsHeuristically(text, requestedCount = 12) {
  if (!text || typeof text !== 'string') return [];
  const target = Math.min(Math.max(parseInt(requestedCount, 10) || 12, 4), 50);
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}\b/g, '') // remove timestamps
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length < 20) return [];

  // If text is extensive (>1200 chars), automatically allow expanding up to 36 cards
  // If text is short, stick to target as upper bound, never adding artificial fluff
  const maxCount = clean.length > 1200
    ? Math.max(target, Math.min(36, Math.floor(clean.length / 115)))
    : target;

  const cards = [];
  const seenQ = new Set();

  function addCard(q, a) {
    if (!q || !a) return;
    const cleanQ = q.trim().replace(/\s+/g, ' ');
    const cleanA = a.trim().replace(/\s+/g, ' ');
    const qKey = cleanQ.toLowerCase();
    if (seenQ.has(qKey) || cleanA.length < 5) return;
    seenQ.add(qKey);
    cards.push({ q: cleanQ, a: cleanA });
  }

  // 1. Definition patterns: Term is/are [a/the] ...
  const defRegex = /(?:^|[.!?]\s*)([A-Z][a-zA-Z0-9\s/_-]{2,35})\s+(?:is defined as|refers to|means|is the process of|is a type of|is known as)\s+([^.!?]+[.!?])/gi;
  let match;
  while ((match = defRegex.exec(clean)) !== null && cards.length < maxCount) {
    const term = match[1].trim();
    const rest = match[2].trim();
    addCard(`What is ${term}?`, `${term} ${match[0].toLowerCase().includes('refers to') ? 'refers to' : 'is'} ${rest}`);
  }

  // 2. Colon patterns: Concept / Term: Explanation
  const colonRegex = /(?:^|\n|[.!?]\s*)([A-Z][a-zA-Z0-9\s/_-]{2,30}):\s*([A-Za-z0-9][^.!?\n]{15,}[.!?]?)/g;
  while ((match = colonRegex.exec(text)) !== null && cards.length < maxCount) {
    const term = match[1].trim();
    const explanation = match[2].trim();
    if (!/^(note|e\.g|i\.e|warning|tip|p|page|url|http)$/i.test(term)) {
      addCard(`Explain the concept of ${term}:`, explanation);
    }
  }

  // 3. Functional patterns: "The primary function / role of X is Y"
  const funcRegex = /(?:The\s+)?(?:primary|main|key)?\s*(?:function|role|purpose|objective)\s+of\s+([A-Z][a-zA-Z0-9\s/_-]{2,30})\s+(?:is|are)\s+to\s+([^.!?]+[.!?])/gi;
  while ((match = funcRegex.exec(clean)) !== null && cards.length < maxCount) {
    const term = match[1].trim();
    const role = match[2].trim();
    addCard(`What is the primary function of ${term}?`, `The function of ${term} is to ${role}`);
  }

  // 4. Comparison / Difference: "The difference between X and Y is Z"
  const diffRegex = /(?:The\s+)?difference\s+between\s+([A-Za-z0-9\s/_-]{2,25})\s+and\s+([A-Za-z0-9\s/_-]{2,25})\s+(?:is|lies in)\s+([^.!?]+[.!?])/gi;
  while ((match = diffRegex.exec(clean)) !== null && cards.length < maxCount) {
    const termA = match[1].trim();
    const termB = match[2].trim();
    const diff = match[3].trim();
    addCard(`What is the key difference between ${termA} and ${termB}?`, diff);
  }

  // 5. Existing questions with answers in text
  const qRegex = /([A-Z][^?]{8,80}\?)\s*([A-Z][^.!?\n]+[.!?])/g;
  while ((match = qRegex.exec(clean)) !== null && cards.length < maxCount) {
    addCard(match[1].trim(), match[2].trim());
  }

  // 6. Sentences broken into informative cards
  if (cards.length < maxCount) {
    const rawSentences = clean
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 35 && s.length <= 250);

    for (const s of rawSentences) {
      if (cards.length >= maxCount) break;
      const stripped = s.replace(/[.?!]+$/, '');
      const words = stripped.split(/\s+/);
      if (words.length < 6) continue;

      // Check if starts with a subject noun
      const isDefinition = /\b(is|are|was|were|describes|contains|provides)\b/i.exec(stripped);
      if (isDefinition && isDefinition.index > 3 && isDefinition.index < 45) {
        const subject = stripped.slice(0, isDefinition.index).trim();
        const predicate = stripped.slice(isDefinition.index).trim();
        if (subject.length > 2 && subject.length < 35 && !/^(it|they|this|that|these|there|we|you)$/i.test(subject)) {
          addCard(`What is the definition or role of ${subject}?`, `${subject} ${predicate}.`);
          continue;
        }
      }

      // Cause / effect or key takeaway
      if (/^(because|since|when|if|in order to)\b/i.test(stripped)) {
        addCard(`What happens ${stripped.slice(0, 30)}...?`, stripped + '.');
      } else {
        const lead = words.slice(0, Math.min(4, words.length)).join(' ');
        addCard(`Key takeaway regarding "${lead}...":`, stripped + '.');
      }
    }
  }

  // If still no cards, generate at least a summary card
  if (cards.length === 0 && clean.length > 10) {
    cards.push({
      q: 'What is the main topic covered in these notes?',
      a: clean.slice(0, 280) + (clean.length > 280 ? '...' : '')
    });
  }

  return cards.slice(0, maxCount);
}

// Initialize Google GenAI client with required aistudio-build User-Agent
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// POST /api/generate-cards
app.post('/api/generate-cards', async (req, res) => {
  const { text, count = 12, topic = '' } = req.body;
  const requestedCount = Math.min(Math.max(parseInt(count, 10) || 12, 4), 50);

  if (!text || typeof text !== 'string' || text.trim().length < 15) {
    return res.status(400).json({
      error: 'Please provide at least a couple of sentences of notes or text.'
    });
  }

  const trimmedText = text.trim();
  const client = getAiClient();

  // If client initialized with key and aistudio-build header, use Gemini
  if (client) {
    const prompt = `You are a professional academic flashcard creator designed for Anki and active recall.
Target guide: The user requested ~${requestedCount} cards, BUT you must dynamically adapt the card count based on the content:

DYNAMIC CARD COUNT RULES:
1. SHORT / FOCUSED TOPIC:
   If the study text is short or contains only a few distinct facts, concepts, or definitions, DO NOT inflate, hallucinate, repeat points, or invent random filler just to reach ${requestedCount} cards. Generate ONLY the maximum high-yield cards that the text genuinely supports (e.g. 3, 5, or 8 cards). Zero fluff or low-value filler.

2. LARGE / EXTENSIVE TOPIC:
   If the study text is extensive, dense, or covers multiple subtopics, mechanisms, formulas, or definitions that cannot fit into ${requestedCount} cards without missing key testable facts, AUTOMATICALLY generate more than ${requestedCount} cards (e.g. 14, 18, 24, up to 40 cards as needed) without asking. Prioritize complete factual coverage over the ${requestedCount} guide so no essential exam facts are omitted.

3. BALANCED TOPIC:
   Only generate approximately ${requestedCount} cards if the text naturally contains about ${requestedCount} distinct high-yield facts.

FLASHCARD RULES:
- Question ("q"): Clear, direct study question (e.g. "What is X?", "What is the function of Y?", "How does Z compare to W?"). NEVER use vague meta questions like "What does this note say about...".
- Answer ("a"): Concise, accurate, direct, and factual (1-3 sentences or bullet points).
- Maximize active recall value for students preparing for exams.

${topic ? `Context/Topic: ${topic}` : ''}

Study Text:
${trimmedText.slice(0, 35000)}`;

    const schemaConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            q: { type: 'STRING', description: 'The question or prompt for the front of the card' },
            a: { type: 'STRING', description: 'The factual answer for the back of the card' }
          },
          required: ['q', 'a']
        }
      }
    };

    // Use high-throughput gemini-3.1-flash-lite, with gemini-3.8-flash as secondary
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: schemaConfig
        });

        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep the adaptively generated count without truncating down to requestedCount!
          const finalCards = parsed.slice(0, 50);
          return res.json({
            success: true,
            model,
            requestedCount,
            actualCount: finalCards.length,
            cards: finalCards
          });
        }
      } catch (_err) {
        // Gracefully attempt next model without crashing
        continue;
      }
    }
  }

  // Smart heuristic fallback
  const cards = generateCardsHeuristically(trimmedText, requestedCount);
  return res.json({
    success: true,
    model: 'heuristic',
    requestedCount,
    actualCount: cards.length,
    cards
  });
});

// POST /api/youtube-transcript
app.post('/api/youtube-transcript', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Please provide a YouTube video URL or ID' });
  }

  let videoId = '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  if (match) {
    videoId = match[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
    videoId = url.trim();
  }

  if (!videoId) {
    return res.status(400).json({ error: 'Could not detect a valid YouTube Video ID from that link.' });
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await pageRes.text();

    // Look for captionTracks in ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/s);
    let captionTracks = null;
    let videoTitle = 'YouTube Video';

    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        videoTitle = playerResponse?.videoDetails?.title || videoTitle;
        captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      } catch (e) {
        // ignore parse error
      }
    }

    if (!captionTracks || !captionTracks.length) {
      return res.status(404).json({
        success: false,
        videoId,
        videoTitle,
        error: 'No automatic captions were found for this video. You can open YouTube, click "Show transcript", copy the text, and paste it directly into the box.'
      });
    }

    // Pick English or first track
    const track = captionTracks.find(t => t.languageCode === 'en' || (t.name?.simpleText || '').toLowerCase().includes('english')) || captionTracks[0];
    const trackUrl = track.baseUrl;

    const capRes = await fetch(trackUrl);
    const xml = await capRes.text();

    // Strip XML tags to plain text
    const cleanText = xml
      .replace(/<text[^>]*>/g, ' ')
      .replace(/<\/text>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return res.json({
      success: true,
      videoId,
      videoTitle,
      transcript: cleanText
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Unable to fetch YouTube transcript: ' + err.message
    });
  }
});

// Serve static assets from root directory
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Fallback to 404.html
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
