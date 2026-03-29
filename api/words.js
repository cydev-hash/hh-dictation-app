const GH_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'admin123';
const REPO = 'cydev-hash/hh-dictation-app';
const FILE_PATH = 'words.json';
const BRANCH = 'main';

async function getWordsFromGitHub() {
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}&t=${Date.now()}`;
  const res = await fetch(url, {
    headers: GH_TOKEN ? { 'Authorization': `Bearer ${GH_TOKEN}` } : {}
  });
  if (!res.ok) throw new Error('Failed to read words.json from GitHub');
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { words: JSON.parse(content), sha: data.sha };
}

async function saveWordsToGitHub(words, sha) {
  if (!GH_TOKEN) throw new Error('GITHUB_TOKEN not configured');
  const content = Buffer.from(JSON.stringify(words, null, 2)).toString('base64');
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update word list from app',
      content,
      sha,
      branch: BRANCH
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save to GitHub');
  }
  return await res.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: return current word list
  if (req.method === 'GET') {
    try {
      const { words } = await getWordsFromGitHub();
      return res.status(200).json(words);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST: update word list or verify admin
  if (req.method === 'POST') {
    const { password, words, action } = req.body || {};
    if (password !== ADMIN_PW) {
      return res.status(401).json({ error: 'Wrong admin password' });
    }

    // Verify-only mode: just check password
    if (action === 'verify') {
      return res.status(200).json({ ok: true, verified: true });
    }

    // Save mode: update words
    if (!Array.isArray(words)) {
      return res.status(400).json({ error: 'words must be an array' });
    }
    try {
      const current = await getWordsFromGitHub();
      await saveWordsToGitHub(words, current.sha);
      return res.status(200).json({ ok: true, count: words.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
