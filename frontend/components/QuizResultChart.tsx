'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizStats, Confidence } from '@eventpulse/shared';

interface Props {
  stats: QuizStats;
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  intuition: '直感',
  unsure: '半信半疑',
  confident: '確信',
};

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  intuition: '#f59e0b',
  unsure: '#6366f1',
  confident: '#22c55e',
};

export default function QuizResultChart({ stats }: Props) {
  const maxPct = Math.max(...stats.results.map((r) => r.percentage), 1);

  return (
    <div className="w-full space-y-3">
      <div className="text-sm text-slate-400 text-right">{stats.totalAnswers}票</div>
      <AnimatePresence>
        {stats.results.map((r) => (
          <motion.div
            key={r.key}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-xl p-3 border transition-all ${
              r.isCorrect === true
                ? 'border-green-500/60 bg-green-500/10'
                : r.isCorrect === false
                ? 'border-slate-700/40 bg-slate-800/40'
                : 'border-slate-700/40 bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200">
                {r.key}. {r.label}
              </span>
              <motion.span
                key={r.percentage}
                initial={{ scale: 1.2, color: '#f59e0b' }}
                animate={{ scale: 1, color: '#f1f5f9' }}
                className="text-lg font-bold"
              >
                {r.percentage}%
              </motion.span>
            </div>

            {/* 得票バー */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full rounded-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(r.percentage / maxPct) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* 確信度バー */}
            <div className="flex gap-1 h-2">
              {(['intuition', 'unsure', 'confident'] as Confidence[]).map((c) => {
                const cnt = r.confidenceBreakdown[c];
                const pct = r.count > 0 ? (cnt / r.count) * 100 : 0;
                return (
                  <motion.div
                    key={c}
                    title={`${CONFIDENCE_LABELS[c]}: ${cnt}票`}
                    className="h-full rounded-full"
                    style={{ background: CONFIDENCE_COLORS[c], opacity: 0.8 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                );
              })}
            </div>
            <div className="flex gap-3 mt-1">
              {(['intuition', 'unsure', 'confident'] as Confidence[]).map((c) => (
                <span key={c} className="text-xs" style={{ color: CONFIDENCE_COLORS[c] }}>
                  {CONFIDENCE_LABELS[c]}: {r.confidenceBreakdown[c]}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
