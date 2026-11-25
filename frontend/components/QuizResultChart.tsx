'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizStats, Confidence } from '@eventpulse/shared';

type Theme = 'dark' | 'light';

interface Props {
  stats: QuizStats;
  theme?: Theme;
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  intuition: '直感',
  unsure:    '半信半疑',
  confident: '確信',
};

/* 確信度カラー（ダーク） */
const DARK_CONFIDENCE_COLORS: Record<Confidence, string> = {
  intuition: '#ffbe0b',
  unsure:    '#a855f7',
  confident: '#39ff14',
};

/* 確信度カラー（ライト） */
const LIGHT_CONFIDENCE_COLORS: Record<Confidence, string> = {
  intuition: '#d97706',
  unsure:    '#7c3aed',
  confident: '#16a34a',
};

const DARK_CONFIDENCE_GLOW: Record<Confidence, string> = {
  intuition: '0 0 8px #ffbe0b90, 0 0 20px #ffbe0b50',
  unsure:    '0 0 8px #a855f790, 0 0 20px #a855f750',
  confident: '0 0 8px #39ff1490, 0 0 20px #39ff1450',
};

const LIGHT_CONFIDENCE_GLOW: Record<Confidence, string> = {
  intuition: '0 1px 3px rgba(217,119,6,0.30)',
  unsure:    '0 1px 3px rgba(124,58,237,0.30)',
  confident: '0 1px 3px rgba(22,163,74,0.30)',
};

/* 正解・不正解カラー */
const DARK_CORRECT_COLOR   = '#39ff14';
const LIGHT_CORRECT_COLOR  = '#16a34a';

export default function QuizResultChart({ stats, theme = 'dark' }: Props) {
  const isDark = theme === 'dark';
  const CONFIDENCE_COLORS = isDark ? DARK_CONFIDENCE_COLORS : LIGHT_CONFIDENCE_COLORS;
  const CONFIDENCE_GLOW   = isDark ? DARK_CONFIDENCE_GLOW   : LIGHT_CONFIDENCE_GLOW;
  const CORRECT_COLOR     = isDark ? DARK_CORRECT_COLOR : LIGHT_CORRECT_COLOR;
  const INCORRECT_COLOR   = isDark ? '#334155' : '#94a3b8';
  const NEUTRAL_COLOR     = isDark ? '#00d4ff'  : '#2563eb';

  const maxPct = Math.max(...stats.results.map((r) => r.percentage), 1);

  return (
    <div className="w-full space-y-3">
      {/* 票数バッジ */}
      <div className="flex justify-end">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full border"
          style={
            isDark
              ? {
                  color: '#00d4ff',
                  borderColor: '#00d4ff50',
                  background: '#00d4ff10',
                  textShadow: '0 0 8px #00d4ff',
                  boxShadow: '0 0 12px #00d4ff30',
                }
              : {
                  color: '#1e40af',
                  borderColor: 'rgba(37,99,235,0.35)',
                  background: 'rgba(37,99,235,0.07)',
                }
          }
        >
          {stats.totalAnswers} 票
        </span>
      </div>

      <AnimatePresence>
        {stats.results.map((r, idx) => {
          const isCorrect   = r.isCorrect === true;
          const isIncorrect = r.isCorrect === false;
          const barColor    = isCorrect ? CORRECT_COLOR : isIncorrect ? (isDark ? '#6366f1' : '#6366f1') : NEUTRAL_COLOR;
          const glowColor   = barColor;

          return (
            <motion.div
              key={r.key}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="rounded-xl p-4 border relative overflow-hidden"
              style={
                isDark
                  ? {
                      background: isCorrect
                        ? `linear-gradient(135deg, ${CORRECT_COLOR}14, #020817)`
                        : 'rgba(13,27,46,0.85)',
                      borderColor: isCorrect ? `${CORRECT_COLOR}60` : '#1e3a5f',
                      boxShadow: isCorrect
                        ? `0 0 18px 2px ${CORRECT_COLOR}25, inset 0 0 30px ${CORRECT_COLOR}08`
                        : 'none',
                    }
                  : {
                      background: isCorrect
                        ? `linear-gradient(135deg, ${CORRECT_COLOR}0d, #ffffff)`
                        : '#f8fafc',
                      borderColor: isCorrect ? `${CORRECT_COLOR}50` : 'rgba(100,116,139,0.20)',
                      boxShadow: isCorrect ? `0 2px 12px ${CORRECT_COLOR}20` : '0 1px 3px rgba(0,0,0,0.05)',
                    }
              }
            >
              {/* 正解時のコーナーグロー（ダークのみ） */}
              {isCorrect && isDark && (
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
                      textShadow: isDark ? `0 0 8px ${barColor}` : 'none',
                      boxShadow: isDark ? `0 0 10px ${barColor}40` : 'none',
                    }}
                    animate={isDark ? { boxShadow: [
                      `0 0 6px ${barColor}40`,
                      `0 0 16px ${barColor}80`,
                      `0 0 6px ${barColor}40`,
                    ]} : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {r.key}
                  </motion.span>

                  <span
                    className="font-semibold"
                    style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}
                  >
                    {r.label}
                  </span>

                  {isCorrect && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        color: CORRECT_COLOR,
                        border: `1px solid ${CORRECT_COLOR}70`,
                        background: `${CORRECT_COLOR}15`,
                        textShadow: isDark ? `0 0 8px ${CORRECT_COLOR}` : 'none',
                        boxShadow: isDark ? `0 0 12px ${CORRECT_COLOR}40` : `0 1px 4px ${CORRECT_COLOR}30`,
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
                    textShadow: isDark ? `0 0 10px ${barColor}, 0 0 24px ${barColor}80` : 'none',
                  }}
                >
                  {r.percentage}%
                </motion.span>
              </div>

              {/* 得票バー */}
              <div
                className="h-2.5 rounded-full overflow-hidden mb-3 relative z-10"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(100,116,139,0.12)',
                  border: `1px solid ${barColor}20`,
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${barColor}cc, ${barColor}80)`,
                    boxShadow: isDark ? `0 0 10px ${barColor}80, 0 0 24px ${barColor}40` : `0 1px 4px ${barColor}40`,
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
                      textShadow: isDark ? `0 0 6px ${CONFIDENCE_COLORS[c]}80` : 'none',
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
