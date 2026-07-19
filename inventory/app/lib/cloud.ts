// クラウド同期クライアント（端末側でE2E暗号化）。バケット名でデータの束を分ける。
// サーバー(/api/sync)には暗号文と、コード由来のキーしか渡さない。

const NS = 'myapps-suite';
export const CODE_KEY = 'cloud_sync_code';

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
async function storeId(code: string, bucket: string): Promise<string> {
  return (await sha256Hex(`${NS}:${bucket}:${code}`)).slice(0, 40);
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

async function apiCall(action: 'push' | 'pull', key: string, blob?: string) {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, key, blob }),
  });
  let data: { blob?: string | null; at?: string | null; error?: string } | null = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    throw new Error(res.status === 503
      ? 'クラウド保存がまだ設定されていません'
      : (data?.error ?? 'クラウドへのアクセスに失敗しました'));
  }
  return data ?? {};
}

export async function cloudPush(code: string, bucket: string, json: string): Promise<{ at: string | null }> {
  const data = await apiCall('push', await storeId(code, bucket), await encryptStr(json, code));
  return { at: data.at ?? null };
}
export async function cloudPull(code: string, bucket: string): Promise<{ json: string | null; at: string | null }> {
  const data = await apiCall('pull', await storeId(code, bucket));
  if (!data.blob) return { json: null, at: data.at ?? null };
  return { json: await decryptStr(data.blob, code), at: data.at ?? null };
}
