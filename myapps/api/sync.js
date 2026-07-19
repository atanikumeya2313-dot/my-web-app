// 同期API（ハブに1つだけ設置）。全アプリが同一オリジンから /api/sync を呼ぶ。
// 端末側でE2E暗号化した「暗号文(blob)」を、キー(key)ごとに保存/取得するだけ。
// 保存先は Vercel KV / Upstash Redis（REST）。中身はサーバーからは読めない。

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POSTのみ対応' });
    return;
  }
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    res.status(503).json({ error: 'クラウド保存がまだ設定されていません（ストレージ未接続）' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const { action, key, blob } = body;

  if (!key || typeof key !== 'string' || !/^[a-f0-9]{8,64}$/.test(key)) {
    res.status(400).json({ error: 'キーが不正です' });
    return;
  }
  const storeKey = `sync:${key}`;

  // Upstash/Vercel KV の REST にコマンド配列をPOSTする
  const call = async (cmd) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    if (!r.ok) throw new Error(`kv ${r.status}`);
    return r.json();
  };

  try {
    if (action === 'push') {
      if (typeof blob !== 'string' || blob.length === 0) {
        res.status(400).json({ error: 'データがありません' }); return;
      }
      if (blob.length > 1_500_000) {
        res.status(413).json({ error: 'データが大きすぎます' }); return;
      }
      const at = new Date().toISOString();
      await call(['SET', storeKey, blob]);
      await call(['SET', `${storeKey}:at`, at]);
      res.status(200).json({ ok: true, at });
      return;
    }
    if (action === 'pull') {
      const got = await call(['GET', storeKey]);
      const at = await call(['GET', `${storeKey}:at`]);
      res.status(200).json({ blob: got && got.result != null ? got.result : null, at: at ? at.result : null });
      return;
    }
    res.status(400).json({ error: '不明な操作です' });
  } catch {
    res.status(502).json({ error: 'クラウドへのアクセスに失敗しました。少し待って再試行してください。' });
  }
};
