'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { MultiSliderStats } from '@eventpulse/shared';

interface Props {
  stats: MultiSliderStats;
}

const CHOICE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function MultiSliderChart({ stats }: Props) {
  const maxMean = Math.max(...stats.choices.map((c) => c.mean), 1);

  return (
    <div className="w-full space-y-3">
      <div className="text-sm text-slate-400 text-right">{stats.count}人が回答</div>
      <AnimatePresence>
        {stats.choices.map((choice, idx) => {
          const color = CHOICE_COLORS[idx % CHOICE_COLORS.length];
          const barPct = (choice.mean / 100) * 100;
          const isTop = choice.isTop;

          return (
            <motion.div
              key={choice.key}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative rounded-xl p-4 border transition-all overflow-hidden ${
                isTop
                  ? 'border-amber-400/60 bg-amber-400/5'
                  : 'border-slate-700/40 bg-slate-800/60'
              }`}
            >
              {/* トップ強調グロー */}
              {isTop && (
                <motion.div
                  layoutId="top-glow"
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ boxShadow: '0 0 24px 4px rgba(251,191,36,0.2)' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {choice.key}
                  </span>
                  <span className="font-medium text-slate-200">{choice.label}</span>
                  {isTop && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs font-bold text-amber-400 border border-amber-400/50 rounded-full px-2 py-0.5"
                    >
                      ★ TOP
                    </motion.span>
                  )}
                </div>
                <motion.span
                  key={choice.mean}
                  initial={{ scale: 1.3, color: '#f59e0b' }}
                  animate={{ scale: 1, color: isTop ? '#fbbf24' : '#f1f5f9' }}
                  className="text-xl font-bold tabular-nums"
                >
                  {choice.mean}%
                </motion.span>
              </div>

              {/* バー */}
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative z-10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
