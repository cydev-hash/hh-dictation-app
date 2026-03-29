const GROQ_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { word } = req.body || {};
  if (!word) return res.status(400).json({ error: 'Missing word' });
  if (!GROQ_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a vocabulary assistant for a Hong Kong primary school student (age 10-11).
For the English word/phrase "${word}", provide the following in valid JSON only (no markdown):
{"partOfSpeech":"noun/verb/adjective/etc","forms":[{"form":"variation","label":"e.g. past tense"}],"synonyms":[{"word":"syn","zh":"中文"}],"antonyms":[{"word":"ant","zh":"中文"}],"related":[{"word":"related","zh":"中文"}],"example":"Simple sentence","exampleZh":"中文翻譯"}
For verbs: include past tense, past participle, present participle. For adjectives: comparative, superlative.
For proper nouns/places: related items in same category. Keep it simple for Primary 5 level. 2-3 items each. Return ONLY valid JSON.`;

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
        temperature: 0.3,
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
