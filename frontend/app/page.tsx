import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          EventPulse Engine
        </h1>
        <p className="text-slate-400 text-lg">
          感情の揺れをリアルタイムで可視化するインタラクティブ・イベントプラットフォーム
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
        <Link
          href="/host"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-6 hover:bg-indigo-500/20 transition-colors"
        >
          <span className="text-3xl">🎤</span>
          <span className="font-semibold text-indigo-300">主催者ダッシュボード</span>
          <span className="text-xs text-slate-400">ルーム作成・問題配信・集計表示</span>
        </Link>

        <Link
          href="/participant"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-6 hover:bg-violet-500/20 transition-colors"
        >
          <span className="text-3xl">📱</span>
          <span className="font-semibold text-violet-300">参加者画面</span>
          <span className="text-xs text-slate-400">スライダーで直感的に回答</span>
        </Link>
      </div>
    </main>
  );
}
