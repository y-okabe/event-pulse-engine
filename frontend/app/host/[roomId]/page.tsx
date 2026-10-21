'use client';
import { useState } from 'react';
import { useRoom } from '../../../hooks/useRoom';
import HeatmapChart from '../../../components/HeatmapChart';
import QuizResultChart from '../../../components/QuizResultChart';
import MultiSliderChart from '../../../components/MultiSliderChart';
import { QRCodeSVG } from 'qrcode.react';
import { EVENTS } from '@eventpulse/shared';
import type { QuizQuestion, MultiSliderQuestion } from '@eventpulse/shared';
import { v4 as uuidv4 } from 'uuid';

const FRONTEND_URL =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

interface Props {
  params: { roomId: string };
}

export default function HostRoomPage({ params }: Props) {
  const { roomId } = params;
  const {
    socket,
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

  // クイズ作成フォーム
  const [quizText, setQuizText] = useState('');
  const [quizChoices, setQuizChoices] = useState([
    { key: 'A', label: '' },
    { key: 'B', label: '' },
    { key: 'C', label: '' },
    { key: 'D', label: '' },
  ]);
  const [correctKey, setCorrectKey] = useState<string>('');

  // 多軸スライダー作成フォーム
  const [msText, setMsText] = useState('');
  const [msChoices, setMsChoices] = useState([
    { key: 'A', label: '' },
    { key: 'B', label: '' },
    { key: 'C', label: '' },
    { key: 'D', label: '' },
  ]);

  function sendQuiz() {
    if (!socket || !quizText.trim()) return;
    const q: QuizQuestion = {
      id: uuidv4(),
      roomId,
      text: quizText,
      choices: quizChoices.filter((c) => c.label.trim()),
      correctKey: correctKey || null,
    };
    socket.emit(EVENTS.QUIZ_START, q);
  }

  function sendMultiSlider() {
    if (!socket || !msText.trim()) return;
    const q: MultiSliderQuestion = {
      id: uuidv4(),
      roomId,
      text: msText,
      choices: msChoices.filter((c) => c.label.trim()),
    };
    socket.emit(EVENTS.MULTI_SLIDER_START, q);
  }

  const participantUrl = `${FRONTEND_URL}/participant?roomId=${roomId}`;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-indigo-300">{room?.title ?? '読み込み中...'}</h1>
          <p className="text-xs text-slate-400">Room ID: {roomId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm text-slate-400">{participantCount}人参加中</span>
          <a
            href={`/host/${roomId}/results`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 font-semibold transition-colors"
          >
            📺 大画面表示
          </a>
        </div>
      </div>

      {/* QRコード */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 flex flex-col items-center gap-3">
        <p className="text-sm text-slate-400">参加者はこちらのQRコードを読み取ってください</p>
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG value={participantUrl} size={160} />
        </div>
        <p className="text-xs text-slate-500 break-all">{participantUrl}</p>
      </div>

      {/* モード別コンテンツ */}
      {room?.mode === 'heatmap' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h2 className="font-semibold text-indigo-300">① 納得度ヒートマップ（リアルタイム集計）</h2>
          {heatmapStats ? (
            <HeatmapChart stats={heatmapStats} />
          ) : (
            <p className="text-slate-500 text-sm">参加者のスライダー操作を待っています...</p>
          )}
        </section>
      )}

      {room?.mode === 'quiz' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h2 className="font-semibold text-indigo-300">② 確信度つきクイズ</h2>

          {/* 問題作成フォーム */}
          <div className="space-y-3 border-b border-slate-700 pb-4">
            <input
              type="text"
              placeholder="問題文を入力"
              value={quizText}
              onChange={(e) => setQuizText(e.target.value)}
              className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-2 text-slate-100 outline-none"
            />
            {quizChoices.map((c, i) => (
              <div key={c.key} className="flex gap-2 items-center">
                <span className="text-slate-400 w-6 text-sm font-bold">{c.key}</span>
                <input
                  type="text"
                  placeholder={`選択肢 ${c.key}`}
                  value={c.label}
                  onChange={(e) => {
                    const next = [...quizChoices];
                    next[i] = { ...next[i], label: e.target.value };
                    setQuizChoices(next);
                  }}
                  className="flex-1 rounded-xl bg-slate-700 border border-slate-600 px-3 py-1.5 text-slate-100 outline-none text-sm"
                />
                <button
                  onClick={() => setCorrectKey(c.key)}
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    correctKey === c.key ? 'border-green-500 bg-green-500/20 text-green-300' : 'border-slate-600 text-slate-400'
                  }`}
                >
                  正解
                </button>
              </div>
            ))}
            <button
              onClick={sendQuiz}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 font-semibold text-white text-sm"
            >
              問題を配信
            </button>
          </div>

          {/* 集計結果 */}
          {quizStats && <QuizResultChart stats={quizStats} />}
        </section>
      )}

      {room?.mode === 'multi_slider' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h2 className="font-semibold text-indigo-300">③ 各択スライダー投票</h2>

          {/* 問題作成フォーム */}
          <div className="space-y-3 border-b border-slate-700 pb-4">
            <input
              type="text"
              placeholder="投票の質問文を入力"
              value={msText}
              onChange={(e) => setMsText(e.target.value)}
              className="w-full rounded-xl bg-slate-700 border border-slate-600 px-4 py-2 text-slate-100 outline-none"
            />
            {msChoices.map((c, i) => (
              <div key={c.key} className="flex gap-2 items-center">
                <span className="text-slate-400 w-6 text-sm font-bold">{c.key}</span>
                <input
                  type="text"
                  placeholder={`選択肢 ${c.key}`}
                  value={c.label}
                  onChange={(e) => {
                    const next = [...msChoices];
                    next[i] = { ...next[i], label: e.target.value };
                    setMsChoices(next);
                  }}
                  className="flex-1 rounded-xl bg-slate-700 border border-slate-600 px-3 py-1.5 text-slate-100 outline-none text-sm"
                />
              </div>
            ))}
            <button
              onClick={sendMultiSlider}
              className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 py-2 font-semibold text-white text-sm"
            >
              投票を配信
            </button>
          </div>

          {/* 集計結果 */}
          {multiSliderStats && <MultiSliderChart stats={multiSliderStats} />}
        </section>
      )}

      {/* ============================================================
          プレゼンモード: 主催者コントロール
          ============================================================ */}
      {room?.mode === 'presentation' && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-5">
          <h2 className="font-semibold text-amber-300">🎤 プレゼンモード — 主催者コントロール</h2>

          {/* ステップ表示 */}
          <div className="flex gap-2">
            {(['待機中', 'Q1', 'Q2', 'Q3'] as const).map((label, i) => (
              <div
                key={i}
                className={`flex-1 text-center rounded-xl py-2 text-sm font-semibold border transition-all ${
                  presentationStep === i
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                    : presentationStep > i
                    ? 'border-slate-600 bg-slate-700/40 text-slate-500 line-through'
                    : 'border-slate-700 bg-slate-800/60 text-slate-500'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Q内容説明 */}
          <div className="space-y-2 text-sm text-slate-400">
            <div className={`px-3 py-2 rounded-xl border ${presentationStep === 1 ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300' : 'border-slate-700'}`}>
              <span className="font-bold text-slate-300">Q1</span>：この発表の楽しみ度合いはどうですか？（感情 & 納得度ヒートマップ）
            </div>
            <div className={`px-3 py-2 rounded-xl border ${presentationStep === 2 ? 'border-violet-500/60 bg-violet-500/10 text-violet-300' : 'border-slate-700'}`}>
              <span className="font-bold text-slate-300">Q2</span>：本日のプレゼンで一番聴きたいトピックは？（各択スライダー投票・4択）
            </div>
            <div className={`px-3 py-2 rounded-xl border ${presentationStep === 3 ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300' : 'border-slate-700'}`}>
              <span className="font-bold text-slate-300">Q3</span>：このアプリ使ってみたい？楽しい？役に立ちそう？（感情 & 納得度ヒートマップ）
            </div>
          </div>

          {/* 次のQへボタン */}
          {presentationStep < 3 ? (
            <button
              onClick={() => socket?.emit(EVENTS.PRESENTATION_NEXT_Q, { roomId })}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 font-bold text-slate-900 text-sm transition-colors"
            >
              {presentationStep === 0 ? '▶ Q1 を開始する' : `▶ Q${presentationStep + 1} へ進む`}
            </button>
          ) : (
            <div className="w-full text-center rounded-xl bg-green-500/20 border border-green-500/40 py-3 text-green-300 font-semibold text-sm">
              ✅ 全質問完了！お疲れ様でした
            </div>
          )}

          {/* リアルタイム集計 */}
          {presentationStep === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Q1 集計結果</p>
              {presHeatmapStatsQ1 ? (
                <HeatmapChart stats={presHeatmapStatsQ1} />
              ) : (
                <p className="text-slate-500 text-sm">参加者の回答を待っています...</p>
              )}
            </div>
          )}
          {presentationStep === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Q2 集計結果</p>
              {multiSliderStats ? (
                <MultiSliderChart stats={multiSliderStats} />
              ) : (
                <p className="text-slate-500 text-sm">参加者の回答を待っています...</p>
              )}
            </div>
          )}
          {presentationStep === 3 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Q3 集計結果</p>
              {presHeatmapStatsQ3 ? (
                <HeatmapChart stats={presHeatmapStatsQ3} />
              ) : (
                <p className="text-slate-500 text-sm">参加者の回答を待っています...</p>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
