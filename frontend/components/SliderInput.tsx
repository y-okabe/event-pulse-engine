'use client';
import { motion } from 'framer-motion';

interface Props {
  value: number;           // 0〜100
  onChange: (v: number) => void;
  label?: string;
  color?: string;
}

export default function SliderInput({ value, onChange, label = '納得度', color = '#6366f1' }: Props) {
  return (
    <div className="w-full space-y-3">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          <motion.span
            key={value}
            initial={{ scale: 1.3, color: '#f59e0b' }}
            animate={{ scale: 1, color: '#f1f5f9' }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-bold tabular-nums"
          >
            {value}%
          </motion.span>
        </div>
      )}

      <div className="relative">
        <div
          className="absolute top-1/2 left-0 h-2 rounded-full -translate-y-1/2 pointer-events-none transition-all duration-75"
          style={{ width: `${value}%`, background: color }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full relative z-10"
          style={{ background: 'transparent' }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
