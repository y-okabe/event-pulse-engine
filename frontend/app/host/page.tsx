'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Room } from '@eventpulse/shared';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export default function HostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Room['mode']>('heatmap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createRoom() {
    if (!title.trim()) { setError('タイトルを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mode }),
      });
      if (!res.ok) throw new Error('ルーム作成に失敗しました');
      const room: Room = await res.json();
      router.push(`/host/${room.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  const MODE_OPTIONS: { value: Room['mode']; label: string; desc: string }[] = [
    { value: 'heatmap', label: '①感情 & 納得度ヒートマップ', desc: '参加者がスライダーで0〜100%をリアルタイム操作' },
    { value: 'quiz', label: '②確信度つきクイズ', desc: '選択肢＋確信度（直感/半信半疑/確信）で回答' },
    { value: 'multi_slider', label: '③各択スライダー投票', desc: '各選択肢に独立したスライダーで多軸投票' },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-indigo-300">🎤 主催者ダッシュボード — ルーム作成</h1>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">セッションタイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: AIの未来について考える"
            className="w-full rounded-xl bg-slate-800 border border-slate-600 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">モード選択</label>
          <div className="space-y-2">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  mode === opt.value
                    ? 'border-indigo-500 bg-indigo-500/20'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'
                }`}
              >
                <div className="font-medium text-slate-200">{opt.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={createRoom}
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 font-semibold text-white transition-colors"
        >
          {loading ? '作成中...' : 'ルームを作成'}
        </button>
      </div>
    </main>
  );
}
