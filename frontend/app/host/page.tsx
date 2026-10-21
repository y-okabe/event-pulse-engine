'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Room } from '@eventpulse/shared';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export default function HostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Room['mode']>('heatmap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 開催中ルーム一覧
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`);
      if (res.ok) setRooms(await res.json());
    } catch {
      // フェッチ失敗は無視（一覧は補助機能）
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

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

  const MODE_LABEL: Record<Room['mode'], string> = {
    heatmap: '感情 & 納得度ヒートマップ',
    quiz: '確信度つきクイズ',
    multi_slider: '各択スライダー投票',
  };

  const MODE_OPTIONS: { value: Room['mode']; label: string; desc: string }[] = [
    { value: 'heatmap', label: '①感情 & 納得度ヒートマップ', desc: '参加者がスライダーで0〜100%をリアルタイム操作' },
    { value: 'quiz', label: '②確信度つきクイズ', desc: '選択肢＋確信度（直感/半信半疑/確信）で回答' },
    { value: 'multi_slider', label: '③各択スライダー投票', desc: '各選択肢に独立したスライダーで多軸投票' },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-indigo-300">🎤 主催者ダッシュボード — ルーム作成</h1>

        {/* 開催中ルーム一覧 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">開催中のルーム</h2>
            <button
              onClick={fetchRooms}
              disabled={roomsLoading}
              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
            >
              {roomsLoading ? '更新中...' : '↻ 更新'}
            </button>
          </div>
          {rooms.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              {roomsLoading ? '取得中...' : 'まだルームがありません'}
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => router.push(`/host/${r.id}`)}
                    className="w-full text-left rounded-xl border border-slate-700 bg-slate-800/60 hover:border-indigo-500 hover:bg-indigo-500/10 px-4 py-3 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200 truncate">{r.title}</span>
                      <span className="shrink-0 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-2 py-0.5">
                        {MODE_LABEL[r.mode]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      作成: {new Date(r.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-slate-700" />

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
