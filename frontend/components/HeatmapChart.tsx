'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { HeatmapStats } from '@eventpulse/shared';

type Theme = 'dark' | 'light';

interface Props {
  stats: HeatmapStats;
  theme?: Theme;
}

const BIN_LABELS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];

/* ── 3本ラインの定義 ── */
interface WaveConfig {
  darkColor: string;
  lightColor: string;
  darkGlow: string;
  lightGlow: string;
  amplitude: number;   // 波の振れ幅 (px)
  frequency: number;   // 1ライン上の波の個数
  speed: number;       // 位相速度 (rad/frame)
  phaseInit: number;   // 初期位相
  lineWidth: number;
  glowBlur: number;
  fillOpacity: number; // 塗りつぶし透明度 (メインラインのみ)
}

const WAVES: WaveConfig[] = [
  {
    darkColor:  '#00d4ff',
    lightColor: '#2563eb',
    darkGlow:   '#00d4ff',
    lightGlow:  '#2563eb',
    amplitude:   6,
    frequency:   2.5,
    speed:       0.025,
    phaseInit:   0,
    lineWidth:   2.5,
    glowBlur:    8,
    fillOpacity: 0.18,
  },
  {
    darkColor:  '#a855f7',
    lightColor: '#7c3aed',
    darkGlow:   '#a855f7',
    lightGlow:  '#7c3aed',
    amplitude:   4,
    frequency:   3.8,
    speed:       0.038,
    phaseInit:   Math.PI * 0.8,
    lineWidth:   1.8,
    glowBlur:    6,
    fillOpacity: 0,
  },
  {
    darkColor:  '#f0abfc',
    lightColor: '#a21caf',
    darkGlow:   '#f0abfc',
    lightGlow:  '#a21caf',
    amplitude:   2.5,
    frequency:   5.5,
    speed:       0.055,
    phaseInit:   Math.PI * 1.5,
    lineWidth:   1.2,
    glowBlur:    4,
    fillOpacity: 0,
  },
];

/* ── Canvas グラフコンポーネント ── */
interface ChartCanvasProps {
  distribution: number[];
  mean: number;
  theme: Theme;
}

/* 線形補間 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* 補間速度: 1フレームあたり何割近づくか (0〜1) */
const LERP_SPEED = 0.06;

function ChartCanvas({ distribution, mean, theme }: ChartCanvasProps) {
  const isDark = theme === 'dark';
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const phases     = useRef<number[]>(WAVES.map((w) => w.phaseInit));
  const themeRef   = useRef<Theme>(theme);
  themeRef.current = theme;

  // 「現在表示中の値」— RAFループが毎フレーム lerp で目標に近づける
  const displayRef = useRef({
    distribution: [...distribution],
    mean,
    maxVal: Math.max(...distribution, 1),
  });
  // 「目標値」— props 変化時に即座に上書き
  const targetRef  = useRef({ distribution, mean });
  targetRef.current = { distribution, mean };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* ── リサイズ対応 ── */
    let W = 0, H = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* ── 描画ループ ── */
    const PAD_L = 36, PAD_R = 12, PAD_T = 32, PAD_B = 48;

    const draw = () => {
      const currentTheme = themeRef.current;
      const dark = currentTheme === 'dark';

      /* ── 表示値を目標値へ lerp ── */
      const target = targetRef.current;
      const disp   = displayRef.current;
      const targetMax = Math.max(...target.distribution, 1);

      disp.maxVal = Math.max(lerp(disp.maxVal, targetMax, LERP_SPEED), targetMax);
      disp.mean = lerp(disp.mean, target.mean, LERP_SPEED);
      for (let i = 0; i < disp.distribution.length; i++) {
        disp.distribution[i] = lerp(
          disp.distribution[i],
          target.distribution[i] ?? 0,
          LERP_SPEED,
        );
      }

      const dist   = disp.distribution;
      const avg    = disp.mean;
      const bins   = dist.length;
      const maxVal = disp.maxVal;

      ctx.clearRect(0, 0, W, H);

      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;

      const maxAmplitudePx = Math.max(...WAVES.map((w) => w.amplitude));
      const scaledMargin = chartH > 0 ? maxAmplitudePx * maxVal / chartH : 0;
      const effectiveMax = maxVal + scaledMargin;

      /* X座標: ビンの中心 */
      const xOf = (i: number) => PAD_L + (i + 0.5) * (chartW / bins);
      /* Y座標: データ値 → ピクセル（effectiveMax でスケール） */
      const yOf = (v: number) => PAD_T + chartH - (v / effectiveMax) * chartH;

      /* ── グリッド線 ── */
      ctx.save();
      ctx.strokeStyle = dark ? 'rgba(0,212,255,0.08)' : 'rgba(100,116,139,0.15)';
      ctx.lineWidth   = 1;
      const gridLines = 4;
      for (let g = 0; g <= gridLines; g++) {
        const y = PAD_T + (g / gridLines) * chartH;
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(PAD_L + chartW, y);
        ctx.stroke();
      }
      ctx.restore();

      /* ── 各ラインを描画 ── */
      const buildSmoothPath = (pts: [number, number][]) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(i - 1, 0)];
          const p1 = pts[i];
          const p2 = pts[i + 1];
          const p3 = pts[Math.min(i + 2, pts.length - 1)];
          const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
          const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
          const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
          const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
        }
      };

      WAVES.forEach((wave, wi) => {
        const phase = phases.current[wi];
        const color     = dark ? wave.darkColor : wave.lightColor;
        const glowColor = dark ? wave.darkGlow  : wave.lightGlow;

        /* データポイントを通りながら波打つ点列を生成 */
        const pts: [number, number][] = [];
        for (let i = 0; i < bins; i++) {
          const x = xOf(i);
          const t = (i / (bins - 1)) * Math.PI * 2 * wave.frequency;
          const wobble = Math.sin(t - phase) * wave.amplitude;
          pts.push([x, yOf(dist[i]) + wobble]);
        }

        /* ── グロー(ぼかし)パス（ダークのみ） ── */
        if (dark) {
          ctx.save();
          ctx.filter      = `blur(${wave.glowBlur}px)`;
          ctx.strokeStyle = glowColor;
          ctx.lineWidth   = wave.lineWidth * 2.5;
          ctx.globalAlpha = 0.45;
          ctx.lineCap     = 'round';
          ctx.lineJoin    = 'round';
          buildSmoothPath(pts);
          ctx.stroke();
          ctx.restore();
        }

        /* ── コアライン ── */
        ctx.save();
        ctx.filter      = 'none';
        ctx.strokeStyle = color;
        ctx.lineWidth   = wave.lineWidth;
        ctx.globalAlpha = dark ? 0.95 : 0.85;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        buildSmoothPath(pts);
        ctx.stroke();
        ctx.restore();

        /* ── メインラインのみ塗りつぶし ── */
        if (wave.fillOpacity > 0) {
          ctx.save();
          ctx.filter = 'none';
          const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
          grad.addColorStop(0,   `${color}50`);
          grad.addColorStop(0.6, `${color}18`);
          grad.addColorStop(1,   `${color}00`);
          ctx.fillStyle   = grad;
          ctx.globalAlpha = wave.fillOpacity;
          buildSmoothPath(pts);
          ctx.lineTo(PAD_L + chartW, PAD_T + chartH);
          ctx.lineTo(PAD_L,          PAD_T + chartH);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        /* 位相を進める */
        phases.current[wi] = phase + wave.speed;
      });

      /* ── 平均ライン ── */
      const meanBin = Math.min(Math.floor(avg / 10), bins - 1);
      const mx      = xOf(meanBin);
      const avgColor = dark ? '#ffbe0b' : '#d97706';
      ctx.save();
      if (dark) {
        ctx.filter      = 'blur(3px)';
        ctx.strokeStyle = avgColor;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(mx, PAD_T);
        ctx.lineTo(mx, PAD_T + chartH);
        ctx.stroke();
        ctx.filter = 'none';
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = avgColor;
      ctx.lineWidth   = dark ? 2 : 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, PAD_T);
      ctx.lineTo(mx, PAD_T + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      /* avg ラベル */
      ctx.save();
      ctx.font        = '10px monospace';
      ctx.fillStyle   = avgColor;
      ctx.globalAlpha = 1;
      ctx.textAlign   = 'center';
      ctx.fillText(`avg ${Math.round(avg)}%`, mx, PAD_T - 2);
      ctx.restore();

      /* ── X軸ラベル ── */
      ctx.save();
      ctx.font      = '9px monospace';
      ctx.fillStyle = dark ? '#67e8f9' : '#475569';
      ctx.textAlign = 'center';
      for (let i = 0; i < bins; i++) {
        ctx.fillText(BIN_LABELS[i], xOf(i), H - 6);
      }
      ctx.restore();

      /* ── Y軸ラベル ── */
      ctx.save();
      ctx.font      = '9px monospace';
      ctx.fillStyle = dark ? '#67e8f9' : '#475569';
      ctx.textAlign = 'right';
      for (let g = 0; g <= gridLines; g++) {
        const val = Math.round((maxVal * (gridLines - g)) / gridLines);
        const y   = PAD_T + (g / gridLines) * chartH;
        ctx.fillText(String(val), PAD_L - 4, y + 3);
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

/* ── メインコンポーネント ── */
export default function HeatmapChart({ stats, theme = 'dark' }: Props) {
  const isDark = theme === 'dark';
  return (
    <div className="w-full space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="参加者数"
          value={`${stats.count}人`}
          darkColor="#00d4ff"
          lightColor="#2563eb"
          glowClass={isDark ? 'neon-pulse-violet' : ''}
          theme={theme}
        />
        <StatCard
          label="平均"
          value={`${stats.mean}%`}
          darkColor="#a855f7"
          lightColor="#7c3aed"
          glowClass={isDark ? 'neon-pulse-violet' : ''}
          highlight
          theme={theme}
        />
        <StatCard
          label="標準偏差"
          value={`±${stats.stdDev}`}
          darkColor="#f0abfc"
          lightColor="#a21caf"
          glowClass={isDark ? 'neon-pulse-pink' : ''}
          theme={theme}
        />
      </div>

      {/* 分布グラフ（Canvas自前描画） */}
      <div className="h-48 w-full">
        <ChartCanvas distribution={stats.distribution} mean={stats.mean} theme={theme} />
      </div>

    </div>
  );
}

/* ── StatCard ── */
interface StatCardProps {
  label: string;
  value: string;
  darkColor: string;
  lightColor: string;
  glowClass: string;
  highlight?: boolean;
  theme: Theme;
}

function StatCard({ label, value, darkColor, lightColor, glowClass, highlight, theme }: StatCardProps) {
  const isDark = theme === 'dark';
  const color = isDark ? darkColor : lightColor;

  return (
    <motion.div
      layout
      className={`rounded-xl p-3 text-center border relative overflow-hidden ${glowClass}`}
      style={
        isDark
          ? {
              background: highlight
                ? `linear-gradient(135deg, ${color}18, ${color}08)`
                : 'rgba(13,27,46,0.8)',
              borderColor: `${color}50`,
            }
          : {
              background: highlight
                ? `linear-gradient(135deg, ${color}12, #f8fafc)`
                : '#f1f5f9',
              borderColor: `${color}40`,
              boxShadow: `0 1px 4px rgba(0,0,0,0.06)`,
            }
      }
    >
      {isDark && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 100%, ${color}20, transparent 70%)` }}
        />
      )}
      <div className="relative z-10">
        <div
          className="text-xs font-medium"
          style={{ color: isDark ? `${color}99` : '#64748b' }}
        >
          {label}
        </div>
        <motion.div
          key={value}
          initial={{ y: -6, opacity: 0, scale: 1.15 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'backOut' }}
          className="text-xl font-bold mt-1 tabular-nums"
          style={{
            color,
            textShadow: isDark ? `0 0 8px ${color}, 0 0 20px ${color}80` : 'none',
          }}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}
