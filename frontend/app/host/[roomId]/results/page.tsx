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
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#020817' }}>

      {/* ── サイバーグリッド背景 ── */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* ── 上部・下部のネオン境界線 ── */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #00d4ff80, #a855f780, transparent)' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #a855f780, #00d4ff80, transparent)' }}
      />

      {/* ── ヘッダーバー ── */}
      <header
        className="relative flex items-center justify-between px-8 py-4 shrink-0 z-10"
        style={{
          background: 'rgba(2,8,23,0.85)',
          borderBottom: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 1px 40px rgba(0,212,255,0.10)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* 左：タイトル */}
        <div>
          <h1
            className="text-2xl font-black tracking-widest text-flicker"
            style={{
              color: '#00d4ff',
              textShadow: '0 0 10px #00d4ff, 0 0 30px #00d4ff80, 0 0 60px #a855f760',
              letterSpacing: '0.12em',
            }}
          >
            {room?.title ?? '— LOADING —'}
          </h1>
          <p
            className="text-xs mt-0.5 font-mono"
            style={{ color: '#a855f790', letterSpacing: '0.1em' }}
          >
            ROOM ▸ {roomId}
          </p>
        </div>

        {/* 右：接続状態 + 参加者数 */}
        <div className="flex items-center gap-3">
          {/* パルスインジケーター */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                connected ? 'bg-cyan-400' : 'bg-red-500'
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                connected ? 'bg-cyan-400' : 'bg-red-500'
              }`}
              style={{ boxShadow: connected ? '0 0 8px #00d4ff' : '0 0 8px #ef4444' }}
            />
          </span>
          <span
            className="text-base font-black tabular-nums"
            style={{
              color: '#00d4ff',
              textShadow: '0 0 8px #00d4ff80',
              letterSpacing: '0.05em',
            }}
          >
            {participantCount} <span style={{ color: '#a855f7', fontSize: '0.75rem', fontWeight: 600 }}>LIVE</span>
          </span>
        </div>
      </header>

      {/* ── コンテンツエリア ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 z-10">

        {/* ── heatmap モード ── */}
        {room?.mode === 'heatmap' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle step="①">納得度ヒートマップ — リアルタイム集計</SectionTitle>
            {heatmapStats ? (
              <NeonChartWrapper>
                <HeatmapChart stats={heatmapStats} />
              </NeonChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── quiz モード ── */}
        {room?.mode === 'quiz' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle step="②">確信度つきクイズ — 集計結果</SectionTitle>
            {quizStats ? (
              <NeonChartWrapper>
                <QuizResultChart stats={quizStats} />
              </NeonChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── multi_slider モード ── */}
        {room?.mode === 'multi_slider' && (
          <div className="w-full max-w-4xl space-y-6">
            <SectionTitle step="③">各択スライダー投票 — 集計結果</SectionTitle>
            {multiSliderStats ? (
              <NeonChartWrapper>
                <MultiSliderChart stats={multiSliderStats} />
              </NeonChartWrapper>
            ) : (
              <Waiting />
            )}
          </div>
        )}

        {/* ── presentation モード ── */}
        {room?.mode === 'presentation' && (
          <div className="w-full max-w-4xl space-y-6">
            {presentationStep === 0 && (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div
                  className="text-5xl"
                  style={{ filter: 'drop-shadow(0 0 12px #00d4ff)' }}
                >
                  ⏳
                </div>
                <p
                  className="text-xl font-bold text-flicker"
                  style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff80' }}
                >
                  WAITING FOR QUESTION...
                </p>
              </div>
            )}

            {presentationStep === 1 && (
              <>
                <SectionTitle step="Q1">この発表の楽しみ度合いは？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ1 ? (
                  <NeonChartWrapper>
                    <HeatmapChart stats={presHeatmapStatsQ1} />
                  </NeonChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}

            {presentationStep === 2 && (
              <>
                <SectionTitle step="Q2">一番聴きたいトピックは？（各択スライダー投票）</SectionTitle>
                {multiSliderStats ? (
                  <NeonChartWrapper>
                    <MultiSliderChart stats={multiSliderStats} />
                  </NeonChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}

            {presentationStep === 3 && (
              <>
                <SectionTitle step="Q3">このアプリを使ってみたい？楽しい？役に立ちそう？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ3 ? (
                  <NeonChartWrapper>
                    <HeatmapChart stats={presHeatmapStatsQ3} />
                  </NeonChartWrapper>
                ) : (
                  <Waiting />
                )}
              </>
            )}
          </div>
        )}

        {/* ルーム未取得時 */}
        {!room && (
          <p
            className="text-lg font-mono text-flicker"
            style={{ color: '#a855f7', textShadow: '0 0 8px #a855f780' }}
          >
            INITIALIZING...
          </p>
        )}
      </div>
    </main>
  );
}

/* ── 補助コンポーネント ── */

function SectionTitle({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3">
      <span
        className="text-xs font-black px-2.5 py-1 rounded-full font-mono"
        style={{
          color: '#020817',
          background: '#00d4ff',
          boxShadow: '0 0 12px #00d4ff80, 0 0 28px #00d4ff40',
        }}
      >
        {step}
      </span>
      <span
        className="text-xl font-bold tracking-wide"
        style={{
          color: '#e2e8f0',
          textShadow: '0 0 6px rgba(0,212,255,0.3)',
        }}
      >
        {children}
      </span>
    </h2>
  );
}

function NeonChartWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-8 relative overflow-hidden [&_.recharts-wrapper]:!h-80 [&_.recharts-surface]:!h-80"
      style={{
        background: 'rgba(13,27,46,0.80)',
        border: '1px solid rgba(0,212,255,0.20)',
        boxShadow: '0 0 40px rgba(0,212,255,0.08), inset 0 0 60px rgba(168,85,247,0.04)',
      }}
    >
      {/* 四隅のネオンコーナー */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-2xl pointer-events-none"
        style={{ borderColor: '#00d4ff80' }} />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-2xl pointer-events-none"
        style={{ borderColor: '#a855f780' }} />
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-2xl pointer-events-none"
        style={{ borderColor: '#a855f780' }} />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-2xl pointer-events-none"
        style={{ borderColor: '#00d4ff80' }} />

      <div className="relative z-10 text-lg [&_.text-xl]:!text-3xl [&_.text-lg]:!text-2xl [&_.text-sm]:!text-base [&_.text-xs]:!text-sm [&_.h-48]:!h-80 [&_.h-2]:!h-3 [&_.h-3]:!h-4">
        {children}
      </div>
    </div>
  );
}

function Waiting() {
  return (
    <div className="flex flex-col items-center gap-4 py-20">
      {/* ネオンスピナー */}
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 animate-spin" fill="none" viewBox="0 0 48 48">
          <circle
            cx="24" cy="24" r="20"
            stroke="rgba(0,212,255,0.15)" strokeWidth="4"
          />
          <path
            d="M24 4 a20 20 0 0 1 20 20"
            stroke="#00d4ff" strokeWidth="4" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px #00d4ff)' }}
          />
        </svg>
        <svg
          className="w-8 h-8 animate-spin absolute top-2 left-2"
          style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}
          fill="none" viewBox="0 0 32 32"
        >
          <path
            d="M16 2 a14 14 0 0 1 14 14"
            stroke="#a855f7" strokeWidth="3" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }}
          />
        </svg>
      </div>
      <p
        className="text-base font-bold font-mono text-flicker"
        style={{ color: '#00d4ff', textShadow: '0 0 8px #00d4ff80', letterSpacing: '0.1em' }}
      >
        AWAITING INPUT...
      </p>
    </div>
  );
}
