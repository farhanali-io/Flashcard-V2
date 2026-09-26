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
function generateCardsHeuristically(text, maxCount = 12) {
  if (!text || typeof text !== 'string') return [];
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]|\b\d{1,2}:\d{2}\b/g, '') // remove timestamps
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length < 20) return [];

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

// Gemini API generator
let aiClient = null;
try {
  aiClient = new GoogleGenAI({});
} catch (e) {
  console.warn('[AI Studio] GoogleGenAI init deferred:', e.message);
}

// POST /api/generate-cards
app.post('/api/generate-cards', async (req, res) => {
  const { text, count = 12, topic = '' } = req.body;
  const numCards = Math.min(Math.max(parseInt(count, 10) || 12, 4), 50);

  if (!text || typeof text !== 'string' || text.trim().length < 15) {
    return res.status(400).json({
      error: 'Please provide at least a couple of sentences of notes or text.'
    });
  }

  const trimmedText = text.trim();

  // If GEMINI_API_KEY is available and client initialized, use Gemini 3.8 Flash
  if (process.env.GEMINI_API_KEY && aiClient) {
    try {
      const prompt = `You are a professional academic flashcard creator designed for Anki and active recall.
Target: Create exactly ${numCards} high-yield, factual study flashcards based ONLY on the provided study text.
${topic ? `Context/Topic: ${topic}` : ''}

Rules:
1. Question ("q"): Must be a clear, direct study question (e.g. "What is X?", "What is the function of Y?", "How does Z compare to W?"). NEVER use vague meta questions like "What does this note say about...".
2. Answer ("a"): Concise, accurate, direct, and factual (1-3 sentences or bullet points).
3. Maximize active recall value for students preparing for exams.

Study Text:
${trimmedText.slice(0, 35000)}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
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
        }
      });

      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({
          success: true,
          model: 'gemini-3.8-flash',
          cards: parsed.slice(0, numCards)
        });
      }
    } catch (err) {
      console.warn('[Gemini API] Generation error, falling back to smart heuristic:', err.message);
    }
  }

  // Smart heuristic fallback
  const cards = generateCardsHeuristically(trimmedText, numCards);
  return res.json({
    success: true,
    model: 'heuristic',
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
