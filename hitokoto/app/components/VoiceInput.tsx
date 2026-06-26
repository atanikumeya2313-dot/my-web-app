'use client';
import { useRef, useState } from 'react';

// ── WAVエンコード（16bit PCM, モノラル） ───────────────
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
function mergeChunks(chunks: Float32Array[]): Float32Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Float32Array(len);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);           // 16bit
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

type Status = 'idle' | 'recording' | 'processing';

export default function VoiceInput({ onText, disabled }: { onText: (t: string) => void; disabled?: boolean }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error,  setError]  = useState('');

  const ctxRef    = useRef<AudioContext | null>(null);
  const procRef   = useRef<ScriptProcessorNode | null>(null);
  const srcRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const rateRef   = useRef(44100);

  function teardown() {
    try { procRef.current?.disconnect(); } catch {}
    try { srcRef.current?.disconnect(); } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { ctxRef.current?.close(); } catch {}
    procRef.current = null; srcRef.current = null; streamRef.current = null; ctxRef.current = null;
  }

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      rateRef.current = ctx.sampleRate;
      const src = ctx.createMediaStreamSource(stream);
      srcRef.current = src;
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      chunksRef.current = [];
      proc.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      src.connect(proc);
      proc.connect(ctx.destination);   // 出力バッファは未書き込み＝無音（ハウリングしない）
      setStatus('recording');
    } catch {
      setError('マイクを使えませんでした。ブラウザのマイク許可を確認してください。');
      teardown();
    }
  }

  async function stop() {
    if (status !== 'recording') return;
    const chunks = chunksRef.current;
    const rate = rateRef.current;
    teardown();
    setStatus('processing');
    try {
      const wav = encodeWAV(mergeChunks(chunks), rate);
      if (wav.size < 2000) {           // ほぼ無音/短すぎ
        setError('うまく録音できませんでした。もう一度お試しください。');
        setStatus('idle');
        return;
      }
      const audioBase64 = await blobToBase64(wav);
      const res = await fetch('/diary/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: 'audio/wav' }),
      });
      let data: { text?: string; error?: string } | null = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data?.text) {
        setError(res.status === 503 ? 'AI機能はまだ準備中です（APIキー未設定）' : (data?.error ?? '聞き取れませんでした'));
      } else {
        onText(data.text);
      }
    } catch {
      setError('文字起こしに失敗しました。少し待ってからお試しください。');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'recording' ? (
        <button type="button" onClick={stop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />停止
        </button>
      ) : (
        <button type="button" onClick={start} disabled={disabled || status === 'processing'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200 disabled:opacity-50">
          {status === 'processing' ? (
            <><span className="w-3 h-3 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />文字起こし中…</>
          ) : (
            <>🎤 音声で入力</>
          )}
        </button>
      )}
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}
