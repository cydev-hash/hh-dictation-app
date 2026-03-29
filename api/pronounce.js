const GROQ_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { word } = req.body || {};
  if (!word) return res.status(400).json({ error: 'Missing word' });
  if (!GROQ_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a pronunciation teacher for a Hong Kong primary school student (age 10-11).

For the English word/phrase: "${word}"

Teach the student how to pronounce it correctly and connect sounds to spelling.

Return ONLY valid JSON (no markdown):
{
  "ipa": "IPA pronunciation (e.g. /ˈmɛlbərn/)",
  "phonetic": "Simple phonetic spelling a child can read (e.g. MEL-burn)",
  "syllables": [
    {"text": "mel", "sound": "like 'mel' in melon", "soundZh": "像melon嘅mel"},
    {"text": "bourne", "sound": "sounds like 'burn'", "soundZh": "聽起來像burn"}
  ],
  "stress": "Which syllable to stress (e.g. First syllable: MEL)",
  "stressZh": "重音在第一個音節: MEL",
  "tips": [
    {"en": "The 'ou' in 'bourne' is silent - say it like 'burn'", "zh": "bourne入面嘅ou唔發音，讀起來似burn"},
    {"en": "Remember: MEL (like melon) + BURN = Melbourne", "zh": "記住：MEL（似melon）+ BURN = Melbourne"}
  ],
  "rhymes": ["burn", "turn", "learn"]
}

Rules:
- Break into real syllables, explain each sound simply
- For each syllable, explain what it sounds like using words kids know
- Give 1-2 spelling/pronunciation tips connecting sound to letters
- Provide 2-3 rhyming words to help remember the sound
- All Chinese in 繁體中文
- Keep explanations very simple and fun`;

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
        temperature: 0.5,
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
