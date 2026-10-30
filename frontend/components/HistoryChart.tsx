'use client';
import { useEffect, useRef } from 'react';
import type { SnapshotEntry, RoomMode, PresentationStep } from '@eventpulse/shared';

interface Props {
  history: SnapshotEntry[];
  mode: RoomMode;
  /** multi_slider / presentation Q2 用のラベルマップ { key: label } */
  choiceLabels?: Record<string, string>;
  /**
   * presentation モード専用: このグラフが担当するステップ (1 | 2 | 3)。
   * 指定すると history をそのステップのエントリのみにフィルタして描画する。
   */
  presentationStep?: PresentationStep;
}

// ネオン配色
const LINE_COLORS = ['#00d4ff', '#a855f7', '#f0abfc', '#ffbe0b'];
const GLOW_COLORS = ['#00d4ff', '#a855f7', '#f0abfc', '#ffbe0b'];
const STDDEV_COLOR = '#00d4ff'; // stdDev バンドの色（heatmap 専用）

/** ISO 8601 → "HH:MM:SS" */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/**
 * データ点数に応じて X 軸に表示するインデックスを返す。
 * 最大 MAX_LABELS 個を均等間隔で選び、最後の点は必ず含める。
 */
function xLabelIndices(n: number, maxLabels = 8): number[] {
  if (n === 0) return [];
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / (maxLabels - 1));
  const indices: number[] = [];
  for (let i = 0; i < n - 1; i += step) indices.push(i);
  if (indices[indices.length - 1] !== n - 1) indices.push(n - 1);
  return indices;
}

export default function HistoryChart({ history, mode, choiceLabels, presentationStep }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef(history);
  // presentation モード: 担当ステップのエントリのみを使う
  const filtered =
    mode === 'presentation' && presentationStep !== undefined
      ? history.filter((e) => e.presentationStep === presentationStep)
      : history;
  historyRef.current = filtered;
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;

    function draw() {
      if (!ctx) return;
      const hist = historyRef.current;
      ctx.clearRect(0, 0, W, H);

      if (hist.length === 0) {
        ctx.save();
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(0,212,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('NO DATA YET — snapshots record every 10 sec', W / 2, H / 2);
        ctx.restore();
        return;
      }

      const PAD_L = 48, PAD_R = 16, PAD_T = 28, PAD_B = 52;
      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;

      // ------------------------------------------------------------------
      // データ系列を抽出
      // ------------------------------------------------------------------
      type Series = {
        label: string;
        color: string;
        glow: string;
        pts: number[];
        /** 上限バンド (mean + stdDev)。stdDev がある系列のみ */
        upper?: number[];
        /** 下限バンド (mean - stdDev) */
        lower?: number[];
      };
      const series: Series[] = [];

      if (mode === 'heatmap') {
        const pts = hist.map((e) => e.mean ?? 0);
        const upper = hist.map((e) => Math.min((e.mean ?? 0) + (e.stdDev ?? 0), 100));
        const lower = hist.map((e) => Math.max((e.mean ?? 0) - (e.stdDev ?? 0), 0));
        series.push({
          label: '平均',
          color: LINE_COLORS[0],
          glow: GLOW_COLORS[0],
          pts,
          upper,
          lower,
        });
      } else if (mode === 'multi_slider') {
        const keys = Object.keys(hist[hist.length - 1]?.choiceMeans ?? {});
        keys.forEach((k, i) => {
          series.push({
            label: choiceLabels?.[k] ?? k,
            color: LINE_COLORS[i % LINE_COLORS.length],
            glow: GLOW_COLORS[i % GLOW_COLORS.length],
            pts: hist.map((e) => e.choiceMeans?.[k] ?? 0),
          });
        });
      } else if (mode === 'presentation') {
        // presentationStep prop でフィルタ済みなので、エントリの種別は1種類のみ
        if (presentationStep === 1) {
          const pts = hist.map((e) => e.presQ1Mean ?? 0);
          const upper = hist.map((e) => Math.min((e.presQ1Mean ?? 0) + (e.presQ1StdDev ?? 0), 100));
          const lower = hist.map((e) => Math.max((e.presQ1Mean ?? 0) - (e.presQ1StdDev ?? 0), 0));
          series.push({ label: 'Q1 平均', color: LINE_COLORS[0], glow: GLOW_COLORS[0], pts, upper, lower });
        } else if (presentationStep === 2) {
          const keys = Object.keys(hist.find((e) => e.choiceMeans)?.choiceMeans ?? {});
          keys.forEach((k, i) => {
            series.push({
              label: choiceLabels?.[k] ?? `Q2-${k}`,
              color: LINE_COLORS[(i + 1) % LINE_COLORS.length],
              glow: GLOW_COLORS[(i + 1) % GLOW_COLORS.length],
              pts: hist.map((e) => e.choiceMeans?.[k] ?? 0),
            });
          });
        } else if (presentationStep === 3) {
          const pts = hist.map((e) => e.presQ3Mean ?? 0);
          const upper = hist.map((e) => Math.min((e.presQ3Mean ?? 0) + (e.presQ3StdDev ?? 0), 100));
          const lower = hist.map((e) => Math.max((e.presQ3Mean ?? 0) - (e.presQ3StdDev ?? 0), 0));
          series.push({ label: 'Q3 平均', color: LINE_COLORS[2], glow: GLOW_COLORS[2], pts, upper, lower });
        }
      }

      if (series.length === 0) {
        ctx.save();
        ctx.font = '13px monospace';
        ctx.fillStyle = 'rgba(0,212,255,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText('NO DATA YET', W / 2, H / 2);
        ctx.restore();
        return;
      }

      const n = hist.length;
      // Y 軸の range: stdDev バンドも含めた全値を使う
      const allVals = series.flatMap((s) => [
        ...s.pts,
        ...(s.upper ?? []),
        ...(s.lower ?? []),
      ]);
      const maxV = Math.max(...allVals, 1);
      const minV = Math.min(...allVals, 0);
      const range = maxV - minV || 1;

      const xOf = (i: number) =>
        PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
      const yOf = (v: number) =>
        PAD_T + chartH - ((v - minV) / range) * chartH;

      // ------------------------------------------------------------------
      // グリッド（5本線）
      // ------------------------------------------------------------------
      ctx.save();
      ctx.strokeStyle = 'rgba(0,212,255,0.07)';
      ctx.lineWidth = 1;
      const gridLines = 4;
      for (let g = 0; g <= gridLines; g++) {
        const y = PAD_T + (g / gridLines) * chartH;
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(PAD_L + chartW, y);
        ctx.stroke();
      }
      ctx.restore();

      // ------------------------------------------------------------------
      // Catmull-Rom スプラインパス生成ヘルパー
      // ------------------------------------------------------------------
      function buildPath(pts2d: [number, number][]) {
        ctx!.beginPath();
        ctx!.moveTo(pts2d[0][0], pts2d[0][1]);
        for (let i = 0; i < pts2d.length - 1; i++) {
          const p0 = pts2d[Math.max(i - 1, 0)];
          const p1 = pts2d[i];
          const p2 = pts2d[i + 1];
          const p3 = pts2d[Math.min(i + 2, pts2d.length - 1)];
          const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
          const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
          const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
          const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
          ctx!.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
        }
      }

      // ------------------------------------------------------------------
      // 各系列を描画
      // ------------------------------------------------------------------
      for (const ser of series) {
        const pts: [number, number][] = ser.pts.map((v, i) => [xOf(i), yOf(v)]);

        // ① stdDev バンド（塗り）
        if (ser.upper && ser.lower) {
          const upperPts: [number, number][] = ser.upper.map((v, i) => [xOf(i), yOf(v)]);
          const lowerPts: [number, number][] = ser.lower.map((v, i) => [xOf(i), yOf(v)]);
          ctx.save();
          ctx.beginPath();
          // 上辺（左→右）
          ctx.moveTo(upperPts[0][0], upperPts[0][1]);
          for (let i = 1; i < upperPts.length; i++) ctx.lineTo(upperPts[i][0], upperPts[i][1]);
          // 下辺（右→左）
          for (let i = lowerPts.length - 1; i >= 0; i--) ctx.lineTo(lowerPts[i][0], lowerPts[i][1]);
          ctx.closePath();
          ctx.fillStyle = `${ser.color}18`; // 9% 透過
          ctx.fill();
          // バンドの上辺・下辺をうっすら点線で縁取り
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = `${ser.color}50`;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(upperPts[0][0], upperPts[0][1]);
          for (let i = 1; i < upperPts.length; i++) ctx.lineTo(upperPts[i][0], upperPts[i][1]);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(lowerPts[0][0], lowerPts[0][1]);
          for (let i = 1; i < lowerPts.length; i++) ctx.lineTo(lowerPts[i][0], lowerPts[i][1]);
          ctx.stroke();
          ctx.restore();
        }

        // ② グロー
        ctx.save();
        ctx.filter = `blur(6px)`;
        ctx.strokeStyle = ser.glow;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        buildPath(pts);
        ctx.stroke();
        ctx.restore();

        // ③ コアライン
        ctx.save();
        ctx.strokeStyle = ser.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.95;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        buildPath(pts);
        ctx.stroke();
        ctx.restore();

        // ④ グラデーション塗り（mean ライン下）
        ctx.save();
        const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
        grad.addColorStop(0, `${ser.color}30`);
        grad.addColorStop(1, `${ser.color}00`);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.6;
        buildPath(pts);
        ctx.lineTo(pts[pts.length - 1][0], PAD_T + chartH);
        ctx.lineTo(pts[0][0], PAD_T + chartH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ⑤ 最新点に輝くドット
        const last = pts[pts.length - 1];
        ctx.save();
        ctx.filter = `blur(4px)`;
        ctx.fillStyle = ser.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(last[0], last[1], 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.fillStyle = ser.color;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(last[0], last[1], 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ------------------------------------------------------------------
      // X 軸ラベル（時刻）— データ量に応じて間引き
      // ------------------------------------------------------------------
      ctx.save();
      ctx.font = '9px monospace';
      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'center';
      const labelIdxs = xLabelIndices(n, 8);
      for (const i of labelIdxs) {
        ctx.fillText(fmtTime(hist[i].timestamp), xOf(i), H - 6);
      }
      ctx.restore();

      // ------------------------------------------------------------------
      // Y 軸ラベル
      // ------------------------------------------------------------------
      ctx.save();
      ctx.font = '9px monospace';
      ctx.fillStyle = '#67e8f9';
      ctx.textAlign = 'right';
      for (let g = 0; g <= gridLines; g++) {
        const val = Math.round(minV + (range * (gridLines - g)) / gridLines);
        const y = PAD_T + (g / gridLines) * chartH;
        ctx.fillText(String(val), PAD_L - 4, y + 3);
      }
      ctx.restore();
    }

    drawRef.current = draw;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    return () => {
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // history / presentationStep が変わったら再描画
  useEffect(() => {
    drawRef.current?.();
  }, [history, presentationStep]);

  // ------------------------------------------------------------------
  // 凡例（filtered を基準に構築）
  // ------------------------------------------------------------------
  const legendItems: { label: string; color: string; dashed?: boolean }[] = [];
  if (mode === 'heatmap') {
    legendItems.push({ label: '平均', color: LINE_COLORS[0] });
    legendItems.push({ label: '±標準偏差', color: STDDEV_COLOR, dashed: true });
  } else if (mode === 'multi_slider' && filtered.length > 0) {
    const keys = Object.keys(filtered[filtered.length - 1]?.choiceMeans ?? {});
    keys.forEach((k, i) => {
      legendItems.push({
        label: choiceLabels?.[k] ?? k,
        color: LINE_COLORS[i % LINE_COLORS.length],
      });
    });
  } else if (mode === 'presentation') {
    if (presentationStep === 1) {
      legendItems.push({ label: 'Q1 平均', color: LINE_COLORS[0] });
      legendItems.push({ label: '±標準偏差', color: STDDEV_COLOR, dashed: true });
    } else if (presentationStep === 2) {
      const keys = Object.keys(filtered.find((e) => e.choiceMeans)?.choiceMeans ?? {});
      keys.forEach((k, i) => {
        legendItems.push({
          label: choiceLabels?.[k] ?? `Q2-${k}`,
          color: LINE_COLORS[(i + 1) % LINE_COLORS.length],
        });
      });
    } else if (presentationStep === 3) {
      legendItems.push({ label: 'Q3 平均', color: LINE_COLORS[2] });
      legendItems.push({ label: '±標準偏差', color: STDDEV_COLOR, dashed: true });
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* スナップショット件数バッジ */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded-full"
          style={{
            color: '#00d4ff',
            border: '1px solid rgba(0,212,255,0.35)',
            background: 'rgba(0,212,255,0.08)',
          }}
        >
          {filtered.length} snapshots · 10-sec interval
        </span>
        {filtered.length > 0 && (
          <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>
            {fmtTime(filtered[0].timestamp)} → {fmtTime(filtered[filtered.length - 1].timestamp)}
          </span>
        )}
      </div>

      {/* Canvas グラフ */}
      <div className="h-48 w-full">
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      {/* 凡例 */}
      {legendItems.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-xs font-mono">
              {item.dashed ? (
                // stdDev バンドは点線アイコン
                <span
                  className="inline-block w-6 h-3 rounded-sm"
                  style={{
                    background: `${item.color}18`,
                    border: `1px dashed ${item.color}80`,
                  }}
                />
              ) : (
                <span
                  className="inline-block w-6 h-0.5 rounded-full"
                  style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }}
                />
              )}
              <span style={{ color: item.color }}>{item.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
