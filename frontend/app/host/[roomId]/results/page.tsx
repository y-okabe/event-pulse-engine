'use client';
import { useRoom } from '../../../../hooks/useRoom';
import HeatmapChart from '../../../../components/HeatmapChart';
import QuizResultChart from '../../../../components/QuizResultChart';
import MultiSliderChart from '../../../../components/MultiSliderChart';

interface Props {
  params: { roomId: string };
}

export default function ResultsDisplayPage({ params }: Props) {
  const { roomId } = params;
  const {
    connected,
    participantCount,
    room,
    heatmapStats,
    quizStats,
    multiSliderStats,
    presentationStep,
    presHeatmapStatsQ1,
    presHeatmapStatsQ3,
  } = useRoom(roomId);

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      {/* ヘッダーバー */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-indigo-300 tracking-tight">
            {room?.title ?? '読み込み中...'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Room ID: {roomId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-base text-slate-400 font-semibold">{participantCount}人参加中</span>
        </div>
      </header>

      {/* コンテンツエリア */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* ── heatmap モード ── */}
        {room?.mode === 'heatmap' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle>① 納得度ヒートマップ — リアルタイム集計</SectionTitle>
            {heatmapStats ? (
              <LargeChartWrapper>
                <HeatmapChart stats={heatmapStats} />
              </LargeChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── quiz モード ── */}
        {room?.mode === 'quiz' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle>② 確信度つきクイズ — 集計結果</SectionTitle>
            {quizStats ? (
              <LargeChartWrapper>
                <QuizResultChart stats={quizStats} />
              </LargeChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── multi_slider モード ── */}
        {room?.mode === 'multi_slider' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle>③ 各択スライダー投票 — 集計結果</SectionTitle>
            {multiSliderStats ? (
              <LargeChartWrapper>
                <MultiSliderChart stats={multiSliderStats} />
              </LargeChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── presentation モード ── */}
        {room?.mode === 'presentation' && (
          <div className="w-full max-w-4xl space-y-6">
            {/* 待機中 */}
            {presentationStep === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-500">
                <span className="text-5xl">⏳</span>
                <p className="text-xl font-semibold">質問の開始を待っています...</p>
              </div>
            )}

            {/* Q1: ヒートマップ */}
            {presentationStep === 1 && (
              <>
                <SectionTitle>Q1：この発表の楽しみ度合いは？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ1 ? (
                  <LargeChartWrapper>
                    <HeatmapChart stats={presHeatmapStatsQ1} />
                  </LargeChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}

            {/* Q2: 多軸スライダー */}
            {presentationStep === 2 && (
              <>
                <SectionTitle>Q2：一番聴きたいトピックは？（各択スライダー投票）</SectionTitle>
                {multiSliderStats ? (
                  <LargeChartWrapper>
                    <MultiSliderChart stats={multiSliderStats} />
                  </LargeChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}

            {/* Q3: ヒートマップ */}
            {presentationStep === 3 && (
              <>
                <SectionTitle>Q3：このアプリを使ってみたい？楽しい？役に立ちそう？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ3 ? (
                  <LargeChartWrapper>
                    <HeatmapChart stats={presHeatmapStatsQ3} />
                  </LargeChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}
          </div>
        )}

        {/* ルーム未取得時 */}
        {!room && (
          <div className="text-slate-500 text-lg">ルーム情報を読み込み中...</div>
        )}
      </div>
    </main>
  );
}

/* ── 補助コンポーネント ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-indigo-300 tracking-tight">{children}</h2>
  );
}

function LargeChartWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-8 [&_.recharts-wrapper]:!h-80 [&_.recharts-surface]:!h-80">
      <div className="text-lg [&_.text-xl]:!text-3xl [&_.text-lg]:!text-2xl [&_.text-sm]:!text-base [&_.text-xs]:!text-sm [&_.h-48]:!h-80 [&_.h-2]:!h-3 [&_.h-3]:!h-4">
        {children}
      </div>
    </div>
  );
}

function Waiting() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
      <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-lg font-medium">参加者の回答を待っています...</p>
    </div>
  );
}
