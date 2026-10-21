'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { MultiSliderStats } from '@eventpulse/shared';

interface Props {
  stats: MultiSliderStats;
}

/* ネオンカラーパレット */
const NEON_COLORS = ['#00d4ff', '#a855f7', '#f0abfc', '#ffbe0b'];
const NEON_GLOWS  = [
  '0 0 12px #00d4ff80, 0 0 32px #00d4ff40',
  '0 0 12px #a855f780, 0 0 32px #a855f740',
  '0 0 12px #f0abfc80, 0 0 32px #f0abfc40',
  '0 0 12px #ffbe0b80, 0 0 32px #ffbe0b40',
];

export default function MultiSliderChart({ stats }: Props) {
  return (
    <div className="w-full space-y-3">
      {/* 回答者バッジ */}
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
          {stats.count} 人が回答
        </span>
      </div>

      <AnimatePresence>
        {stats.choices.map((choice, idx) => {
          const color   = NEON_COLORS[idx % NEON_COLORS.length];
          const glow    = NEON_GLOWS[idx % NEON_GLOWS.length];
          const barPct  = (choice.mean / 100) * 100;
          const isTop   = choice.isTop;

          return (
            <motion.div
              key={choice.key}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="relative rounded-xl p-4 border overflow-hidden"
              style={{
                background: isTop
                  ? `linear-gradient(135deg, ${color}16, #020817 60%)`
                  : 'rgba(13,27,46,0.85)',
                borderColor: isTop ? `${color}70` : '#1e3a5f',
                boxShadow: isTop ? `0 0 20px 2px ${color}28, inset 0 0 40px ${color}08` : 'none',
              }}
            >
              {/* TOPグロー背景 */}
              {isTop && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 0% 50%, ${color}20, transparent 65%)` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                />
              )}

              {/* ヘッダー行 */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  {/* 色付きキーバッジ */}
                  <motion.span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      background: `${color}25`,
                      border: `1.5px solid ${color}90`,
                      color,
                      textShadow: `0 0 8px ${color}`,
                    }}
                    animate={{ boxShadow: [
                      `0 0 6px ${color}40`,
                      `0 0 18px ${color}90`,
                      `0 0 6px ${color}40`,
                    ]}}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  >
                    {choice.key}
                  </motion.span>

                  <span className="font-semibold text-slate-200">{choice.label}</span>

                  {isTop && (
                    <motion.span
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        color,
                        border: `1px solid ${color}80`,
                        background: `${color}18`,
                        textShadow: `0 0 8px ${color}`,
                        boxShadow: `0 0 14px ${color}50`,
                      }}
                    >
                      ★ TOP
                    </motion.span>
                  )}
                </div>

                {/* 平均値 */}
                <motion.span
                  key={choice.mean}
                  initial={{ scale: 1.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'backOut' }}
                  className="text-xl font-black tabular-nums"
                  style={{
                    color,
                    textShadow: `0 0 10px ${color}, 0 0 28px ${color}80`,
                  }}
                >
                  {choice.mean}%
                </motion.span>
              </div>

              {/* メインバー */}
              <div
                className="h-3 rounded-full overflow-hidden relative z-10"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${color}20`,
                }}
              >
                <motion.div
                  className="h-full rounded-full bar-breathe"
                  style={{
                    background: `linear-gradient(90deg, ${color}, ${color}80)`,
                    boxShadow: glow,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>

              {/* 背景スキャンライン（装飾） */}
              <div
                className="absolute bottom-0 left-0 right-0 h-px pointer-events-none z-0"
                style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
