const GROQ_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { word, zh } = req.body || {};
  if (!word) return res.status(400).json({ error: 'Missing word' });
  if (!GROQ_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a fun and engaging vocabulary assistant for a Hong Kong primary school student (age 10-11, Primary 5).

The student just correctly spelled the word: "${word}" (${zh || ''})

Generate interesting, educational content related to this word. Adapt your response based on the word type:

- If it's a VERB (e.g. "went"): show all forms (go/went/gone/going), use each in a simple sentence
- If it's a PLACE (e.g. "Melbourne"): share 2-3 fun facts (capital? population? famous for?), list 2-3 related places in same category
- If it's an ADJECTIVE (e.g. "strong"): give synonyms, antonyms, comparative/superlative forms
- If it's a NOUN: give related words in the same category, a fun fact
- If it's a PERSON (e.g. "Steve Irwin"): who they are, why famous, fun facts

Return ONLY valid JSON (no markdown):
{
  "emoji": "one relevant emoji",
  "title": "short catchy title in English (e.g. 'Did you know?' or 'Word Family' or 'Explore Melbourne!')",
  "facts": [
    {"icon": "emoji", "text": "interesting fact or related info in simple English", "zh": "繁體中文翻譯"},
    {"icon": "emoji", "text": "another fact", "zh": "中文翻譯"}
  ],
  "related": [
    {"word": "related word", "zh": "中文", "emoji": "emoji"}
  ],
  "tip": "A short spelling tip or memory trick for this word in English with Chinese translation"
}

Keep it fun, simple, age-appropriate. 3-4 facts, 2-4 related words. All Chinese in 繁體中文.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
