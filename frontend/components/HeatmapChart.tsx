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

/* カスタム Tooltip */
const NeonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(2,8,23,0.92)',
      border: '1px solid #00d4ff60',
      borderRadius: 8,
      padding: '8px 14px',
      boxShadow: '0 0 16px #00d4ff40',
      color: '#00d4ff',
      fontSize: 13,
    }}>
      <p style={{ margin: 0, color: '#a5f3fc', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0 }}>{payload[0].value} 人</p>
    </div>
  );
};

export default function HeatmapChart({ stats }: Props) {
  const data = stats.distribution.map((count, i) => ({
    range: BIN_LABELS[i],
    count,
  }));

  return (
    <div className="w-full space-y-4">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="参加者数" value={`${stats.count}人`} color="#00d4ff" glowClass="neon-pulse-violet" />
        <StatCard label="平均" value={`${stats.mean}%`} color="#a855f7" glowClass="neon-pulse-violet" highlight />
        <StatCard label="標準偏差" value={`±${stats.stdDev}`} color="#f0abfc" glowClass="neon-pulse-pink" />
      </div>

      {/* 分布グラフ */}
      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              {/* メインのネオングラデーション */}
              <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00d4ff" stopOpacity={0.7} />
                <stop offset="50%"  stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              {/* ライン用グロー filter */}
              <filter id="neonGlow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.10)" />
            <XAxis
              dataKey="range"
              tick={{ fill: '#67e8f9', fontSize: 10 }}
              axisLine={{ stroke: '#00d4ff30' }}
              tickLine={{ stroke: '#00d4ff30' }}
            />
            <YAxis
              tick={{ fill: '#67e8f9', fontSize: 10 }}
              axisLine={{ stroke: '#00d4ff30' }}
              tickLine={{ stroke: '#00d4ff30' }}
              allowDecimals={false}
            />
            <Tooltip content={<NeonTooltip />} />
            <ReferenceLine
              x={BIN_LABELS[Math.min(Math.floor(stats.mean / 10), 9)]}
              stroke="#ffbe0b"
              strokeDasharray="4 2"
              strokeWidth={2}
              label={{ value: `avg ${stats.mean}%`, fill: '#ffbe0b', fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#00d4ff"
              strokeWidth={3}
              fill="url(#neonGrad)"
              filter="url(#neonGlow)"
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  glowClass: string;
  highlight?: boolean;
}

function StatCard({ label, value, color, glowClass, highlight }: StatCardProps) {
  return (
    <motion.div
      layout
      className={`rounded-xl p-3 text-center border relative overflow-hidden ${glowClass}`}
      style={{
        background: highlight
          ? `linear-gradient(135deg, ${color}18, ${color}08)`
          : 'rgba(13,27,46,0.8)',
        borderColor: `${color}50`,
      }}
    >
      {/* 背景グロー */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 100%, ${color}20, transparent 70%)` }}
      />
      <div className="relative z-10">
        <div className="text-xs font-medium" style={{ color: `${color}99` }}>{label}</div>
        <motion.div
          key={value}
          initial={{ y: -6, opacity: 0, scale: 1.15 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'backOut' }}
          className="text-xl font-bold mt-1 tabular-nums"
          style={{
            color,
            textShadow: `0 0 8px ${color}, 0 0 20px ${color}80`,
          }}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}
