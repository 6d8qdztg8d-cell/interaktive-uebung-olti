export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Nur POST erlaubt' } });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'OPENAI_API_KEY fehlt in Vercel-Einstellungen.' } });

  const { action } = req.body;

  try {
    // ── TTS: Text → Sprache ──────────────────────────────────
    if (action === 'tts') {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'tts-1-hd', input: req.body.text, voice: 'nova', speed: 0.85 })
      });
      if (!response.ok) {
        const e = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: e.error || { message: 'TTS-Fehler' } });
      }
      const buf = Buffer.from(await response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    }

    // ── Chat & Fragengenerierung → GPT ────────────────────────
    if (action === 'chat' || action === 'questions') {
      const { messages, response_format, temperature, max_tokens } = req.body;
      const body = { model: 'gpt-4o-mini', messages };
      if (response_format) body.response_format = response_format;
      if (temperature  !== undefined) body.temperature  = temperature;
      if (max_tokens   !== undefined) body.max_tokens   = max_tokens;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return res.status(response.ok ? 200 : response.status).json(data);
    }

    return res.status(400).json({ error: { message: 'Unbekannte Aktion' } });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
