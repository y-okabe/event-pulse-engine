'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizStats, Confidence } from '@eventpulse/shared';

interface Props {
  stats: QuizStats;
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  intuition: '直感',
  unsure:    '半信半疑',
  confident: '確信',
};

/* ネオンカラー: 直感=アンバー / 半信半疑=バイオレット / 確信=グリーン */
const CONFIDENCE_COLORS: Record<Confidence, string> = {
  intuition: '#ffbe0b',
  unsure:    '#a855f7',
  confident: '#39ff14',
};

const CONFIDENCE_GLOW: Record<Confidence, string> = {
  intuition: '0 0 8px #ffbe0b90, 0 0 20px #ffbe0b50',
  unsure:    '0 0 8px #a855f790, 0 0 20px #a855f750',
  confident: '0 0 8px #39ff1490, 0 0 20px #39ff1450',
};

/* 正解・不正解で異なるネオン色 */
const CORRECT_COLOR   = '#39ff14';  // ネオングリーン
const INCORRECT_COLOR = '#334155';  // ダーク（目立たせない）
const NEUTRAL_COLOR   = '#00d4ff';  // ネオンブルー

export default function QuizResultChart({ stats }: Props) {
  const maxPct = Math.max(...stats.results.map((r) => r.percentage), 1);

  return (
    <div className="w-full space-y-3">
      {/* 票数バッジ */}
      <div className="flex justify-end">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full border"
          style={{
            color: '#00d4ff',
            borderColor: '#00d4ff50',
            background: '#00d4ff10',
            textShadow: '0 0 8px #00d4ff',
            boxShadow: '0 0 12px #00d4ff30',
          }}
        >
          {stats.totalAnswers} 票
        </span>
      </div>

      <AnimatePresence>
        {stats.results.map((r, idx) => {
          const isCorrect   = r.isCorrect === true;
          const isIncorrect = r.isCorrect === false;
          const barColor    = isCorrect ? CORRECT_COLOR : isIncorrect ? '#6366f1' : NEUTRAL_COLOR;
          const glowColor   = isCorrect ? CORRECT_COLOR : isIncorrect ? '#6366f1' : NEUTRAL_COLOR;

          return (
            <motion.div
              key={r.key}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="rounded-xl p-4 border relative overflow-hidden"
              style={{
                background: isCorrect
                  ? `linear-gradient(135deg, ${CORRECT_COLOR}14, #020817)`
                  : isIncorrect
                  ? 'rgba(13,27,46,0.85)'
                  : 'rgba(13,27,46,0.85)',
                borderColor: isCorrect ? `${CORRECT_COLOR}60` : '#1e3a5f',
                boxShadow: isCorrect
                  ? `0 0 18px 2px ${CORRECT_COLOR}25, inset 0 0 30px ${CORRECT_COLOR}08`
                  : 'none',
              }}
            >
              {/* 正解時のコーナーグロー */}
              {isCorrect && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${CORRECT_COLOR}15, transparent 60%)` }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}

              {/* ヘッダー行 */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  {/* 選択肢キーバッジ */}
                  <motion.span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      background: `${barColor}20`,
                      border: `1.5px solid ${barColor}80`,
                      color: barColor,
                      textShadow: `0 0 8px ${barColor}`,
                      boxShadow: `0 0 10px ${barColor}40`,
                    }}
                    animate={{ boxShadow: [
                      `0 0 6px ${barColor}40`,
                      `0 0 16px ${barColor}80`,
                      `0 0 6px ${barColor}40`,
                    ]}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {r.key}
                  </motion.span>

                  <span className="font-semibold text-slate-200">{r.label}</span>

                  {isCorrect && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        color: CORRECT_COLOR,
                        border: `1px solid ${CORRECT_COLOR}70`,
                        background: `${CORRECT_COLOR}15`,
                        textShadow: `0 0 8px ${CORRECT_COLOR}`,
                        boxShadow: `0 0 12px ${CORRECT_COLOR}40`,
                      }}
                    >
                      ✓ 正解
                    </motion.span>
                  )}
                </div>

                {/* パーセンテージ */}
                <motion.span
                  key={r.percentage}
                  initial={{ scale: 1.3, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-lg font-black tabular-nums"
                  style={{
                    color: barColor,
                    textShadow: `0 0 10px ${barColor}, 0 0 24px ${barColor}80`,
                  }}
                >
                  {r.percentage}%
                </motion.span>
              </div>

              {/* 得票バー */}
              <div
                className="h-2.5 rounded-full overflow-hidden mb-3 relative z-10"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${barColor}20` }}
              >
                <motion.div
                  className="h-full rounded-full bar-breathe"
                  style={{
                    background: `linear-gradient(90deg, ${barColor}cc, ${barColor}80)`,
                    boxShadow: `0 0 10px ${barColor}80, 0 0 24px ${barColor}40`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.percentage / maxPct) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              {/* 確信度バー */}
              <div className="flex gap-1 h-2 relative z-10">
                {(['intuition', 'unsure', 'confident'] as Confidence[]).map((c) => {
                  const cnt = r.confidenceBreakdown[c];
                  const pct = r.count > 0 ? (cnt / r.count) * 100 : 0;
                  return (
                    <motion.div
                      key={c}
                      title={`${CONFIDENCE_LABELS[c]}: ${cnt}票`}
                      className="h-full rounded-full"
                      style={{
                        background: CONFIDENCE_COLORS[c],
                        boxShadow: CONFIDENCE_GLOW[c],
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  );
                })}
              </div>

              {/* 確信度ラベル */}
              <div className="flex gap-3 mt-1.5 relative z-10">
                {(['intuition', 'unsure', 'confident'] as Confidence[]).map((c) => (
                  <span
                    key={c}
                    className="text-xs font-medium"
                    style={{
                      color: CONFIDENCE_COLORS[c],
                      textShadow: `0 0 6px ${CONFIDENCE_COLORS[c]}80`,
                    }}
                  >
                    {CONFIDENCE_LABELS[c]}: {r.confidenceBreakdown[c]}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
