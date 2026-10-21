'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { HeatmapStats } from '@eventpulse/shared';

interface Props {
  stats: HeatmapStats;
}

const BIN_LABELS = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];

/* ── 3本ラインの定義 ── */
interface WaveConfig {
  color: string;
  glowColor: string;
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
    color:       '#00d4ff',
    glowColor:   '#00d4ff',
    amplitude:   6,
    frequency:   2.5,
    speed:       0.025,
    phaseInit:   0,
    lineWidth:   2.5,
    glowBlur:    8,
    fillOpacity: 0.18,
  },
  {
    color:       '#a855f7',
    glowColor:   '#a855f7',
    amplitude:   4,
    frequency:   3.8,
    speed:       0.038,
    phaseInit:   Math.PI * 0.8,
    lineWidth:   1.8,
    glowBlur:    6,
    fillOpacity: 0,
  },
  {
    color:       '#f0abfc',
    glowColor:   '#f0abfc',
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
}

/* 線形補間 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* 補間速度: 1フレームあたり何割近づくか (0〜1) */
const LERP_SPEED = 0.06;

function ChartCanvas({ distribution, mean }: ChartCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const phases     = useRef<number[]>(WAVES.map((w) => w.phaseInit));

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
      /* ── 表示値を目標値へ lerp ── */
      const target = targetRef.current;
      const disp   = displayRef.current;
      const targetMax = Math.max(...target.distribution, 1);

      // maxVal は「現在値と目標値の大きい方」を常に使う
      // → データが増えた瞬間でもスケール不足による100%超えを防ぐ
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

      /* 波の最大振れ幅をデータ値スケールに逆算してスケールに余白を加える。
         これにより yOf(v) + wobble が常に chartH の範囲内に収まる。  */
      const maxAmplitudePx = Math.max(...WAVES.map((w) => w.amplitude));
      // px → データ値スケール: amplitude_data = amplitude_px * maxVal / chartH
      // ゼロ除算を避けるため chartH が確定してから計算
      const scaledMargin = chartH > 0 ? maxAmplitudePx * maxVal / chartH : 0;
      const effectiveMax = maxVal + scaledMargin;

      /* X座標: ビンの中心 */
      const xOf = (i: number) => PAD_L + (i + 0.5) * (chartW / bins);
      /* Y座標: データ値 → ピクセル（effectiveMax でスケール） */
      const yOf = (v: number) => PAD_T + chartH - (v / effectiveMax) * chartH;

      /* ── グリッド線 ── */
      ctx.save();
      ctx.strokeStyle = 'rgba(0,212,255,0.08)';
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

      /* Catmull-Rom スプライン補間でなめらかな曲線パスを構築する */
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

        /* データポイントを通りながら波打つ点列を生成 */
        const pts: [number, number][] = [];
        for (let i = 0; i < bins; i++) {
          const x = xOf(i);
          const t = (i / (bins - 1)) * Math.PI * 2 * wave.frequency;
          const wobble = Math.sin(t - phase) * wave.amplitude;
          pts.push([x, yOf(dist[i]) + wobble]);
        }

        /* ── グロー(ぼかし)パス ── */
        ctx.save();
        ctx.filter      = `blur(${wave.glowBlur}px)`;
        ctx.strokeStyle = wave.glowColor;
        ctx.lineWidth   = wave.lineWidth * 2.5;
        ctx.globalAlpha = 0.45;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        buildSmoothPath(pts);
        ctx.stroke();
        ctx.restore();

        /* ── コアライン ── */
        ctx.save();
        ctx.filter      = 'none';
        ctx.strokeStyle = wave.color;
        ctx.lineWidth   = wave.lineWidth;
        ctx.globalAlpha = 0.95;
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
          grad.addColorStop(0,   `${wave.color}50`);
          grad.addColorStop(0.6, `${wave.color}18`);
          grad.addColorStop(1,   `${wave.color}00`);
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
      ctx.save();
      ctx.filter      = 'blur(3px)';
      ctx.strokeStyle = '#ffbe0b';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, PAD_T);
      ctx.lineTo(mx, PAD_T + chartH);
      ctx.stroke();
      ctx.filter      = 'none';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(mx, PAD_T);
      ctx.lineTo(mx, PAD_T + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      /* avg ラベル */
      ctx.save();
      ctx.font        = '10px monospace';
      ctx.fillStyle   = '#ffbe0b';
      ctx.globalAlpha = 1;
      ctx.textAlign   = 'center';
      ctx.fillText(`avg ${Math.round(avg)}%`, mx, PAD_T - 2);
      ctx.restore();

      /* ── X軸ラベル ── */
      ctx.save();
      ctx.font      = '9px monospace';
      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      for (let i = 0; i < bins; i++) {
        ctx.fillText(BIN_LABELS[i], xOf(i), H - 6);
      }
      ctx.restore();

      /* ── Y軸ラベル ── */
      ctx.save();
      ctx.font      = '9px monospace';
      ctx.fillStyle = '#67e8f9';
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
export default function HeatmapChart({ stats }: Props) {
  return (
    <div className="w-full space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="参加者数" value={`${stats.count}人`}    color="#00d4ff" glowClass="neon-pulse-violet" />
        <StatCard label="平均"     value={`${stats.mean}%`}      color="#a855f7" glowClass="neon-pulse-violet" highlight />
        <StatCard label="標準偏差" value={`±${stats.stdDev}`}    color="#f0abfc" glowClass="neon-pulse-pink" />
      </div>

      {/* 分布グラフ（Canvas自前描画） */}
      <div className="h-48 w-full">
        <ChartCanvas distribution={stats.distribution} mean={stats.mean} />
      </div>

    </div>
  );
}

/* ── StatCard ── */
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
          style={{ color, textShadow: `0 0 8px ${color}, 0 0 20px ${color}80` }}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}
