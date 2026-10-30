'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRoom } from '../../../../hooks/useRoom';
import HeatmapChart from '../../../../components/HeatmapChart';
import QuizResultChart from '../../../../components/QuizResultChart';
import MultiSliderChart from '../../../../components/MultiSliderChart';
import HistoryChart from '../../../../components/HistoryChart';

interface Props {
  params: { roomId: string };
}

type ViewTab = 'realtime' | 'history';

export default function ResultsDisplayPage({ params }: Props) {
  const { roomId } = params;

  /* ── タブ切り替え ── */
  const [activeTab, setActiveTab] = useState<ViewTab>('realtime');

  /* ── フルスクリーン制御 ── */
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

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
    snapshotHistory,
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

        {/* 右：接続状態 + 参加者数 + フルスクリーンボタン */}
        <div className="flex items-center gap-3">
          {/* フルスクリーントグル */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? '全画面解除' : '全画面表示'}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.35)',
              color: '#00d4ff',
              boxShadow: '0 0 8px rgba(0,212,255,0.20)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(0,212,255,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 8px rgba(0,212,255,0.20)')}
          >
            {isFullscreen ? (
              /* 縮小アイコン */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="10" y1="14" x2="3" y2="21" />
                <line x1="21" y1="3" x2="14" y2="10" />
              </svg>
            ) : (
              /* 拡大アイコン */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
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

      {/* ── タブバー ── */}
      <div
        className="relative flex items-center gap-1 px-8 py-2 shrink-0 z-10"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.12)' }}
      >
        {(['realtime', 'history'] as ViewTab[]).map((tab) => {
          const label = tab === 'realtime' ? '⚡ リアルタイム' : '📈 推移';
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-bold font-mono transition-all"
              style={{
                color: active ? '#020817' : 'rgba(0,212,255,0.6)',
                background: active ? '#00d4ff' : 'transparent',
                boxShadow: active ? '0 0 14px rgba(0,212,255,0.55)' : 'none',
                border: active ? 'none' : '1px solid rgba(0,212,255,0.25)',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── コンテンツエリア ── */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center z-10"
        style={{ padding: isFullscreen ? '24px 32px' : '32px' }}
      >
        {/* フルスクリーン時は max-w を外して画面幅いっぱいに広げる */}
        {(() => {
          const wrapCls = isFullscreen
            ? 'w-full space-y-4'
            : 'w-full max-w-4xl space-y-6';
          const chart = (content: React.ReactNode) => (
            <NeonChartWrapper fullscreen={isFullscreen}>{content}</NeonChartWrapper>
          );

          // ──────────────────────────────────────────
          // 推移タブ
          // ──────────────────────────────────────────
          if (activeTab === 'history') {
            if (!room) return (
              <p className="text-lg font-mono text-flicker" style={{ color: '#a855f7' }}>
                INITIALIZING...
              </p>
            );
            const q2ChoiceLabels: Record<string, string> = {
              A: '今回の開発プロセスと爆速構築の全容',
              B: '手動（人間）開発 vs Bob（AI）開発の決定的な差',
              C: 'WebSocket・リアルタイムアニメーション実装の難所突破術',
              D: 'Bob（AI）を相棒として使いこなすプロンプトのコツ',
            };

            // presentation モードは現在進行中のステップのチャートのみ表示
            if (room.mode === 'presentation') {
              if (presentationStep === 0) return (
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                  <div className="text-5xl" style={{ filter: 'drop-shadow(0 0 12px #00d4ff)' }}>⏳</div>
                  <p className="text-xl font-bold text-flicker" style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff80' }}>
                    WAITING FOR QUESTION...
                  </p>
                </div>
              );
              const presChartConfig = {
                1: { title: 'Q1 — この発表の楽しみ度合いは？', labels: undefined as Record<string, string> | undefined },
                2: { title: 'Q2 — 一番聴きたいトピックは？', labels: q2ChoiceLabels },
                3: { title: 'Q3 — このアプリを使ってみたい？楽しい？役に立ちそう？', labels: undefined as Record<string, string> | undefined },
              } as const;
              const cfg = presChartConfig[presentationStep];
              return (
                <div className={wrapCls}>
                  <SectionTitle step="📈">{cfg.title}（10秒単位）</SectionTitle>
                  {chart(
                    <HistoryChart
                      key={presentationStep}
                      history={snapshotHistory}
                      mode="presentation"
                      presentationStep={presentationStep}
                      choiceLabels={cfg.labels}
                    />
                  )}
                </div>
              );
            }

            return (
              <div className={wrapCls}>
                <SectionTitle step="📈">時間軸による推移（10秒単位）</SectionTitle>
                {chart(
                  <HistoryChart
                    history={snapshotHistory}
                    mode={room.mode}
                  />
                )}
              </div>
            );
          }

          // ──────────────────────────────────────────
          // リアルタイムタブ（既存の表示）
          // ──────────────────────────────────────────
          if (room?.mode === 'heatmap') return (
            <div className={wrapCls}>
              <SectionTitle step="①">納得度ヒートマップ — リアルタイム集計</SectionTitle>
              {heatmapStats ? chart(<HeatmapChart stats={heatmapStats} />) : <Waiting />}
            </div>
          );

          if (room?.mode === 'quiz') return (
            <div className={wrapCls}>
              <SectionTitle step="②">確信度つきクイズ — 集計結果</SectionTitle>
              {quizStats ? chart(<QuizResultChart stats={quizStats} />) : <Waiting />}
            </div>
          );

          if (room?.mode === 'multi_slider') return (
            <div className={wrapCls}>
              <SectionTitle step="③">各択スライダー投票 — 集計結果</SectionTitle>
              {multiSliderStats ? chart(<MultiSliderChart stats={multiSliderStats} />) : <Waiting />}
            </div>
          );

          if (room?.mode === 'presentation') return (
            <div className={wrapCls}>
              {presentationStep === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                  <div className="text-5xl" style={{ filter: 'drop-shadow(0 0 12px #00d4ff)' }}>⏳</div>
                  <p className="text-xl font-bold text-flicker" style={{ color: '#00d4ff', textShadow: '0 0 10px #00d4ff80' }}>
                    WAITING FOR QUESTION...
                  </p>
                </div>
              )}
              {presentationStep === 1 && (<>
                <SectionTitle step="Q1">この発表の楽しみ度合いは？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ1 ? chart(<HeatmapChart stats={presHeatmapStatsQ1} />) : <Waiting />}
              </>)}
              {presentationStep === 2 && (<>
                <SectionTitle step="Q2">一番聴きたいトピックは？（各択スライダー投票）</SectionTitle>
                {multiSliderStats ? chart(<MultiSliderChart stats={multiSliderStats} />) : <Waiting />}
              </>)}
              {presentationStep === 3 && (<>
                <SectionTitle step="Q3">このアプリを使ってみたい？楽しい？役に立ちそう？（感情 &amp; 納得度ヒートマップ）</SectionTitle>
                {presHeatmapStatsQ3 ? chart(<HeatmapChart stats={presHeatmapStatsQ3} />) : <Waiting />}
              </>)}
            </div>
          );

          return !room ? (
            <p className="text-lg font-mono text-flicker" style={{ color: '#a855f7', textShadow: '0 0 8px #a855f780' }}>
              INITIALIZING...
            </p>
          ) : null;
        })()}
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

function NeonChartWrapper({ children, fullscreen }: { children: React.ReactNode; fullscreen?: boolean }) {
  // フルスクリーン時: 余白を減らし、チャート高さを画面の約半分に拡大
  const innerCls = fullscreen
    ? 'relative z-10 text-lg [&_.text-xl]:!text-4xl [&_.text-lg]:!text-3xl [&_.text-sm]:!text-lg [&_.text-xs]:!text-base [&_.h-48]:!h-[55vh] [&_.h-2]:!h-4 [&_.h-3]:!h-5'
    : 'relative z-10 text-lg [&_.text-xl]:!text-3xl [&_.text-lg]:!text-2xl [&_.text-sm]:!text-base [&_.text-xs]:!text-sm [&_.h-48]:!h-80 [&_.h-2]:!h-3 [&_.h-3]:!h-4';

  return (
    <div
      className="rounded-2xl relative overflow-hidden [&_.recharts-wrapper]:!h-80 [&_.recharts-surface]:!h-80"
      style={{
        padding: fullscreen ? '20px 28px' : '32px',
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

      <div className={innerCls}>
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
