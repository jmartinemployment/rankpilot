import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rankpilot-backend',
  });
});

router.get('/debug/fetch-test', async (req, res) => {
  const url = typeof req.query['url'] === 'string' ? req.query['url'] : 'https://geekatyourspot.com';
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const text = await resp.text();
    const title = /< *title[^>]*>([^<]*)<\/ *title *>/i.exec(text)?.[1] ?? '(no title)';
    res.json({
      status: resp.status,
      finalUrl: resp.url,
      title: title.trim(),
      bodyLength: text.length,
      hasCaptcha: text.includes('sgcaptcha') || text.includes('Robot Challenge'),
      snippet: text.substring(0, 500),
    });
  } catch (error: unknown) {
    res.json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
