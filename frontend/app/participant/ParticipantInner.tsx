'use client';
import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRoom } from '../../hooks/useRoom';
import SliderInput from '../../components/SliderInput';
import { EVENTS } from '@eventpulse/shared';
import type { Confidence } from '@eventpulse/shared';

const CHOICE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];
const CONFIDENCE_OPTIONS: { value: Confidence; label: string }[] = [
  { value: 'intuition', label: '直感' },
  { value: 'unsure', label: '半信半疑' },
  { value: 'confident', label: '確信' },
];

export default function ParticipantInner() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') ?? '';

  const { socket, connected, room, currentQuestion, currentMultiQuestion } = useRoom(roomId);

  // 機能① ヒートマップ
  const [sliderValue, setSliderValue] = useState(50);
  const heatmapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHeatmapSlider = useCallback(
    (v: number) => {
      setSliderValue(v);
      if (heatmapTimerRef.current) clearTimeout(heatmapTimerRef.current);
      heatmapTimerRef.current = setTimeout(() => {
        socket?.emit(EVENTS.SLIDER_UPDATE, { roomId, value: v });
      }, 80);
    },
    [socket, roomId]
  );

  // 機能② クイズ
  const [selectedChoice, setSelectedChoice] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('unsure');
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  function submitQuiz() {
    if (!socket || !currentQuestion || !selectedChoice) return;
    socket.emit(EVENTS.QUIZ_ANSWER, {
      roomId,
      questionId: currentQuestion.id,
      choiceKey: selectedChoice,
      confidence,
    });
    setQuizSubmitted(true);
  }

  // 機能③ 多軸スライダー
  const [multiValues, setMultiValues] = useState<Record<string, number>>({});
  const multiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMultiSlider(key: string, value: number) {
    const next = { ...multiValues, [key]: value };
    setMultiValues(next);
    if (multiTimerRef.current) clearTimeout(multiTimerRef.current);
    multiTimerRef.current = setTimeout(() => {
      if (!socket || !currentMultiQuestion) return;
      socket.emit(EVENTS.MULTI_SLIDER_UPDATE, {
        roomId,
        questionId: currentMultiQuestion.id,
        values: next,
      });
    }, 80);
  }

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-400">URLに roomId が指定されていません。QRコードから入室してください。</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-violet-300">{room?.title ?? '接続中...'}</h1>
        </div>
        <span className={`flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          {connected ? '接続済み' : '接続中...'}
        </span>
      </div>

      {/* 機能① ヒートマップ */}
      {room?.mode === 'heatmap' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          <h2 className="font-semibold text-indigo-300">あなたの納得度・共感度は？</h2>
          <p className="text-sm text-slate-400">スライダーを動かして、今この瞬間の気持ちを表現してください</p>
          <SliderInput
            value={sliderValue}
            onChange={handleHeatmapSlider}
            label="納得度・共感度"
          />
        </section>
      )}

      {/* 機能② クイズ */}
      {room?.mode === 'quiz' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          {currentQuestion ? (
            <>
              <h2 className="font-semibold text-indigo-300">{currentQuestion.text}</h2>

              {/* 選択肢 */}
              <div className="space-y-2">
                {currentQuestion.choices.map((c) => (
                  <button
                    key={c.key}
                    disabled={quizSubmitted}
                    onClick={() => setSelectedChoice(c.key)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      selectedChoice === c.key
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-200'
                        : 'border-slate-700 bg-slate-700/40 text-slate-300 hover:border-slate-500'
                    } disabled:opacity-60`}
                  >
                    <span className="font-bold mr-2">{c.key}.</span>{c.label}
                  </button>
                ))}
              </div>

              {/* 確信度 */}
              <div className="space-y-2">
                <p className="text-sm text-slate-400">どのくらい自信がありますか？</p>
                <div className="flex gap-2">
                  {CONFIDENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={quizSubmitted}
                      onClick={() => setConfidence(opt.value)}
                      className={`flex-1 rounded-xl border py-2 text-sm transition-all ${
                        confidence === opt.value
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-slate-700 text-slate-400'
                      } disabled:opacity-60`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {quizSubmitted ? (
                <p className="text-center text-green-400 font-semibold py-2">✅ 回答済み！結果を待っています...</p>
              ) : (
                <button
                  onClick={submitQuiz}
                  disabled={!selectedChoice}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 py-3 font-semibold text-white"
                >
                  回答を送信
                </button>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">主催者が問題を配信するのを待っています...</p>
          )}
        </section>
      )}

      {/* 機能③ 多軸スライダー */}
      {room?.mode === 'multi_slider' && (
        <section className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
          {currentMultiQuestion ? (
            <>
              <h2 className="font-semibold text-violet-300">{currentMultiQuestion.text}</h2>
              <p className="text-sm text-slate-400">各選択肢に対するあなたの度合いを0〜100%で設定してください</p>
              <div className="space-y-6">
                {currentMultiQuestion.choices.map((c, idx) => (
                  <div key={c.key}>
                    <SliderInput
                      value={multiValues[c.key] ?? 50}
                      onChange={(v) => handleMultiSlider(c.key, v)}
                      label={`${c.key}. ${c.label}`}
                      color={CHOICE_COLORS[idx % CHOICE_COLORS.length]}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">主催者が投票を配信するのを待っています...</p>
          )}
        </section>
      )}
    </main>
  );
}
