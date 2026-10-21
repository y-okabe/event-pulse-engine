'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import type { HeatmapStats } from '@eventpulse/shared';

interface Props {
  stats: HeatmapStats;
}

const BIN_LABELS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];

export default function HeatmapChart({ stats }: Props) {
  const data = stats.distribution.map((count, i) => ({
    range: BIN_LABELS[i],
    count,
  }));

  return (
    <div className="w-full space-y-4">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="参加者数" value={`${stats.count}人`} />
        <StatCard label="平均" value={`${stats.mean}%`} highlight />
        <StatCard label="標準偏差" value={`±${stats.stdDev}`} />
      </div>

      {/* 分布グラフ */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#f1f5f9' }}
              itemStyle={{ color: '#6366f1' }}
            />
            <ReferenceLine
              x={BIN_LABELS[Math.min(Math.floor(stats.mean / 10), 9)]}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: `avg ${stats.mean}%`, fill: '#f59e0b', fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#heatGrad)"
              isAnimationActive
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <motion.div
      layout
      className={`rounded-xl p-3 text-center ${highlight ? 'bg-indigo-600/20 border border-indigo-500/40' : 'bg-slate-800/60 border border-slate-700/40'}`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <motion.div
        key={value}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`text-xl font-bold mt-1 ${highlight ? 'text-indigo-300' : 'text-slate-200'}`}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
