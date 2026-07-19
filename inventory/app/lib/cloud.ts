// クラウド同期クライアント（端末側でE2E暗号化）。
// 同期コード（合言葉）から、保存キー(storeId)と暗号鍵の両方を導出する。
// サーバー(/api/sync)には「暗号文」と「コードのハッシュ由来のキー」しか渡さない。

const BUCKET = 'inventory';                 // このアプリのデータの束
const NS = 'myapps-suite';                  // 名前空間（他用途との衝突回避）
export const CODE_KEY = 'cloud_sync_code';  // 同期コードの保存先（localStorage）

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s);
}
function unb64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

// 保存キー（コード＋バケット名のハッシュ。コード自体は送らない）
async function storeId(code: string): Promise<string> {
  return (await sha256Hex(`${NS}:${BUCKET}:${code}`)).slice(0, 40);
}

async function encryptStr(plain: string, code: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
  return `v1:${b64(salt)}:${b64(iv)}:${b64(ct)}`;
}
async function decryptStr(payload: string, code: string): Promise<string> {
  const [v, s, i, c] = payload.split(':');
  if (v !== 'v1') throw new Error('形式が不正です');
  const key = await deriveKey(code, unb64(s));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(i) as BufferSource }, key, unb64(c) as BufferSource);
  return dec.decode(pt);
}

async function api(action: 'push' | 'pull', key: string, blob?: string) {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, key, blob }),
  });
  let data: { blob?: string | null; at?: string | null; error?: string; ok?: boolean } | null = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    throw new Error(res.status === 503
      ? 'クラウド保存がまだ設定されていません（管理者側の設定待ち）'
      : (data?.error ?? 'クラウドへのアクセスに失敗しました'));
  }
  return data ?? {};
}

// データ(JSON文字列)を暗号化してアップロード
export async function cloudPush(code: string, json: string): Promise<void> {
  const key = await storeId(code);
  const blob = await encryptStr(json, code);
  await api('push', key, blob);
}

// クラウドから取得して復号（無ければ null）
export async function cloudPull(code: string): Promise<{ json: string | null; at: string | null }> {
  const key = await storeId(code);
  const data = await api('pull', key);
  if (!data.blob) return { json: null, at: data.at ?? null };
  const json = await decryptStr(data.blob, code);
  return { json, at: data.at ?? null };
}
