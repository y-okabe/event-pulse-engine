// ============================================================
// インメモリ状態管理ストア
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type {
  Room,
  HeatmapStats,
  QuizQuestion,
  QuizStats,
  QuizChoiceResult,
  MultiSliderQuestion,
  MultiSliderStats,
  Confidence,
  PresentationStep,
  SnapshotEntry,
} from '../../../shared/types/index';
import { SNAPSHOT_INTERVAL_MS } from '../../../shared/types/index';

// ------------------------------------------------------------------
// 型定義（サーバー内部）
// ------------------------------------------------------------------
interface SliderEntry {
  value: number;
}

interface QuizAnswerEntry {
  choiceKey: string;
  confidence: Confidence;
}

interface MultiSliderEntry {
  values: Record<string, number>;
}

interface RoomState {
  room: Room;
  participants: Set<string>; // socketId
  // 機能①
  sliderMap: Map<string, SliderEntry>;
  // 機能②
  currentQuestion: QuizQuestion | null;
  quizAnswers: Map<string, QuizAnswerEntry>; // socketId -> answer
  // 機能③
  currentMultiQuestion: MultiSliderQuestion | null;
  multiSliderMap: Map<string, MultiSliderEntry>; // socketId -> values
  // プレゼンモード
  presentationStep: PresentationStep;
  // プレゼンQ別スライダー（Q1/Q3用）
  presSliderQ1: Map<string, SliderEntry>;
  presSliderQ3: Map<string, SliderEntry>;
  // 時系列スナップショット
  snapshots: SnapshotEntry[];
  snapshotTimer: ReturnType<typeof setInterval> | null;
  snapshotEmitCallback: ((entry: SnapshotEntry) => void) | null;
}

// ------------------------------------------------------------------
// ストア本体
// ------------------------------------------------------------------
const store = new Map<string, RoomState>();

// ------------------------------------------------------------------
// ルーム操作
// ------------------------------------------------------------------
export function createRoom(title: string, mode: Room['mode']): Room {
  const room: Room = {
    id: uuidv4(),
    title,
    mode,
    createdAt: new Date().toISOString(),
  };
  const roomId = room.id;
  const state: RoomState = {
    room,
    participants: new Set(),
    sliderMap: new Map(),
    currentQuestion: null,
    quizAnswers: new Map(),
    currentMultiQuestion: null,
    multiSliderMap: new Map(),
    presentationStep: 0,
    presSliderQ1: new Map(),
    presSliderQ3: new Map(),
    snapshots: [],
    snapshotTimer: null,
    snapshotEmitCallback: null,
  };
  store.set(roomId, state);

  // 定期的にスナップショットを記録して接続中クライアントへ push
  state.snapshotTimer = setInterval(() => {
    const snap = buildSnapshot(roomId, state);
    if (snap) {
      state.snapshots.push(snap);
      state.snapshotEmitCallback?.(snap);
    }
  }, SNAPSHOT_INTERVAL_MS);

  return room;
}

export function getRoom(roomId: string): Room | null {
  return store.get(roomId)?.room ?? null;
}

export function listRooms(): Room[] {
  return [...store.values()].map((s) => s.room);
}

// ------------------------------------------------------------------
// 参加者操作
// ------------------------------------------------------------------
export function joinRoom(roomId: string, socketId: string): boolean {
  const state = store.get(roomId);
  if (!state) return false;
  state.participants.add(socketId);
  return true;
}

export function leaveRoom(socketId: string): string | null {
  for (const [roomId, state] of store) {
    if (state.participants.has(socketId)) {
      state.participants.delete(socketId);
      state.sliderMap.delete(socketId);
      state.quizAnswers.delete(socketId);
      state.multiSliderMap.delete(socketId);
      return roomId;
    }
  }
  return null;
}

export function getParticipantCount(roomId: string): number {
  return store.get(roomId)?.participants.size ?? 0;
}

// ------------------------------------------------------------------
// 機能① ヒートマップ集計
// ------------------------------------------------------------------
export function updateSlider(roomId: string, socketId: string, value: number): HeatmapStats | null {
  const state = store.get(roomId);
  if (!state) return null;
  state.sliderMap.set(socketId, { value });
  return calcHeatmapStats(roomId, state);
}

function calcHeatmapStats(roomId: string, state: RoomState): HeatmapStats {
  const values = [...state.sliderMap.values()].map((e) => e.value);
  const count = values.length;
  const mean = count > 0 ? values.reduce((a, b) => a + b, 0) / count : 0;
  const variance =
    count > 0 ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count : 0;
  const stdDev = Math.sqrt(variance);

  // 0〜100 を 10 ビン（0-9, 10-19, ...90-100）
  const distribution = Array(10).fill(0) as number[];
  for (const v of values) {
    const bin = Math.min(Math.floor(v / 10), 9);
    distribution[bin]++;
  }

  return {
    roomId,
    count,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    distribution,
    updatedAt: new Date().toISOString(),
  };
}

export function getHeatmapStats(roomId: string): HeatmapStats | null {
  const state = store.get(roomId);
  if (!state) return null;
  return calcHeatmapStats(roomId, state);
}

// ------------------------------------------------------------------
// 機能② クイズ
// ------------------------------------------------------------------
export function startQuiz(roomId: string, question: QuizQuestion): boolean {
  const state = store.get(roomId);
  if (!state) return false;
  state.currentQuestion = question;
  state.quizAnswers.clear();
  return true;
}

export function submitQuizAnswer(
  roomId: string,
  socketId: string,
  choiceKey: string,
  confidence: Confidence
): QuizStats | null {
  const state = store.get(roomId);
  if (!state || !state.currentQuestion) return null;
  state.quizAnswers.set(socketId, { choiceKey, confidence });
  return calcQuizStats(roomId, state);
}

function calcQuizStats(roomId: string, state: RoomState): QuizStats {
  const q = state.currentQuestion!;
  const totalAnswers = state.quizAnswers.size;

  const results: QuizChoiceResult[] = q.choices.map((c: { key: string; label: string }) => {
    const answers = [...state.quizAnswers.values()].filter((a) => a.choiceKey === c.key);
    const count = answers.length;
    const confidenceBreakdown: Record<Confidence, number> = {
      intuition: 0,
      unsure: 0,
      confident: 0,
    };
    for (const a of answers) confidenceBreakdown[a.confidence]++;
    return {
      key: c.key,
      label: c.label,
      count,
      percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
      confidenceBreakdown,
      isCorrect: q.correctKey !== null ? c.key === q.correctKey : null,
    };
  });

  return {
    roomId,
    questionId: q.id,
    totalAnswers,
    results,
    updatedAt: new Date().toISOString(),
  };
}

export function getQuizStats(roomId: string): QuizStats | null {
  const state = store.get(roomId);
  if (!state || !state.currentQuestion) return null;
  return calcQuizStats(roomId, state);
}

export function getCurrentQuestion(roomId: string): QuizQuestion | null {
  return store.get(roomId)?.currentQuestion ?? null;
}

// ------------------------------------------------------------------
// 機能③ 多軸スライダー投票
// ------------------------------------------------------------------
export function startMultiSlider(roomId: string, question: MultiSliderQuestion): boolean {
  const state = store.get(roomId);
  if (!state) return false;
  state.currentMultiQuestion = question;
  state.multiSliderMap.clear();
  return true;
}

export function updateMultiSlider(
  roomId: string,
  socketId: string,
  values: Record<string, number>
): MultiSliderStats | null {
  const state = store.get(roomId);
  if (!state || !state.currentMultiQuestion) return null;
  state.multiSliderMap.set(socketId, { values });
  return calcMultiSliderStats(roomId, state);
}

function calcMultiSliderStats(roomId: string, state: RoomState): MultiSliderStats {
  const q = state.currentMultiQuestion!;
  const count = state.multiSliderMap.size;

  const choiceStats: { key: string; label: string; mean: number; isTop: boolean }[] = q.choices.map((c: { key: string; label: string }) => {
    const vals = [...state.multiSliderMap.values()].map((e) => e.values[c.key] ?? 0);
    const mean =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { key: c.key, label: c.label, mean: Math.round(mean * 10) / 10, isTop: false };
  });

  // 最高値の択を特定
  const maxMean = Math.max(...choiceStats.map((s: { mean: number }) => s.mean));
  const topKey = choiceStats.find((s: { mean: number; key: string }) => s.mean === maxMean)?.key ?? '';
  for (const s of choiceStats) s.isTop = s.key === topKey;

  return {
    roomId,
    questionId: q.id,
    count,
    choices: choiceStats,
    topKey,
    updatedAt: new Date().toISOString(),
  };
}

export function getMultiSliderStats(roomId: string): MultiSliderStats | null {
  const state = store.get(roomId);
  if (!state || !state.currentMultiQuestion) return null;
  return calcMultiSliderStats(roomId, state);
}

export function getCurrentMultiQuestion(roomId: string): MultiSliderQuestion | null {
  return store.get(roomId)?.currentMultiQuestion ?? null;
}

// ------------------------------------------------------------------
// プレゼンモード
// ------------------------------------------------------------------

/** 次のQへ進む。0→1→2→3 で固定。3以上なら何もしない。 */
export function advancePresentationStep(roomId: string): PresentationStep | null {
  const state = store.get(roomId);
  if (!state) return null;
  if (state.presentationStep >= 3) return state.presentationStep;
  state.presentationStep = (state.presentationStep + 1) as PresentationStep;

  // ステップ切り替え時にデータをリセット
  if (state.presentationStep === 1) {
    state.presSliderQ1.clear();
  } else if (state.presentationStep === 2) {
    state.multiSliderMap.clear();
  } else if (state.presentationStep === 3) {
    state.presSliderQ3.clear();
  }

  return state.presentationStep;
}

/** 前のQへ戻る。1→0→ 下限。0のままなら変化なし。 */
export function goBackPresentationStep(roomId: string): PresentationStep | null {
  const state = store.get(roomId);
  if (!state) return null;
  if (state.presentationStep <= 0) return state.presentationStep;
  state.presentationStep = (state.presentationStep - 1) as PresentationStep;

  // 戻り先ステップのデータをリセット（再回答できるよう）
  if (state.presentationStep === 0) {
    // 待機中: Q1 のデータをリセット
    state.presSliderQ1.clear();
  } else if (state.presentationStep === 1) {
    // Q1 に戻る: Q2 のデータをリセット
    state.multiSliderMap.clear();
    state.currentMultiQuestion = null;
  } else if (state.presentationStep === 2) {
    // Q2 に戻る: Q3 のデータをリセット
    state.presSliderQ3.clear();
  }

  return state.presentationStep;
}

export function getPresentationStep(roomId: string): PresentationStep {
  return store.get(roomId)?.presentationStep ?? 0;
}

/** Q1/Q3 用プレゼンヒートマップのスライダー更新 */
export function updatePresSlider(
  roomId: string,
  socketId: string,
  step: 1 | 3,
  value: number
): HeatmapStats | null {
  const state = store.get(roomId);
  if (!state) return null;
  const map = step === 1 ? state.presSliderQ1 : state.presSliderQ3;
  map.set(socketId, { value });
  return calcPresHeatmapStats(roomId, state, step);
}

function calcPresHeatmapStats(
  roomId: string,
  state: RoomState,
  step: 1 | 3
): HeatmapStats {
  const map = step === 1 ? state.presSliderQ1 : state.presSliderQ3;
  const values = [...map.values()].map((e) => e.value);
  const count = values.length;
  const mean = count > 0 ? values.reduce((a, b) => a + b, 0) / count : 0;
  const variance =
    count > 0 ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count : 0;
  const stdDev = Math.sqrt(variance);
  const distribution = Array(10).fill(0) as number[];
  for (const v of values) {
    const bin = Math.min(Math.floor(v / 10), 9);
    distribution[bin]++;
  }
  return {
    roomId,
    count,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    distribution,
    updatedAt: new Date().toISOString(),
  };
}

export function getPresHeatmapStats(roomId: string, step: 1 | 3): HeatmapStats | null {
  const state = store.get(roomId);
  if (!state) return null;
  return calcPresHeatmapStats(roomId, state, step);
}

// ------------------------------------------------------------------
// 時系列スナップショット
// ------------------------------------------------------------------

/**
 * 現時点の集計値から SnapshotEntry を生成する。
 * データが1件もない場合は null を返す（空スナップショットを記録しない）。
 */
function buildSnapshot(roomId: string, state: RoomState): SnapshotEntry | null {
  const timestamp = new Date().toISOString();
  const mode = state.room.mode;

  if (mode === 'heatmap') {
    if (state.sliderMap.size === 0) return null;
    const stats = calcHeatmapStats(roomId, state);
    return {
      timestamp,
      count: stats.count,
      mean: stats.mean,
      stdDev: stats.stdDev,
      distribution: stats.distribution,
    };
  }

  if (mode === 'multi_slider') {
    if (state.multiSliderMap.size === 0 || !state.currentMultiQuestion) return null;
    const stats = calcMultiSliderStats(roomId, state);
    const choiceMeans: Record<string, number> = {};
    for (const c of stats.choices) choiceMeans[c.key] = c.mean;
    return { timestamp, count: stats.count, choiceMeans };
  }

  if (mode === 'presentation') {
    const step = state.presentationStep;
    if (step === 0) return null;

    if (step === 1) {
      if (state.presSliderQ1.size === 0) return null;
      const stats = calcPresHeatmapStats(roomId, state, 1);
      return {
        timestamp,
        count: stats.count,
        presQ1Mean: stats.mean,
        presQ1StdDev: stats.stdDev,
        presentationStep: step,
      };
    }
    if (step === 2) {
      if (state.multiSliderMap.size === 0 || !state.currentMultiQuestion) return null;
      const stats = calcMultiSliderStats(roomId, state);
      const choiceMeans: Record<string, number> = {};
      for (const c of stats.choices) choiceMeans[c.key] = c.mean;
      return { timestamp, count: stats.count, choiceMeans, presentationStep: step };
    }
    if (step === 3) {
      if (state.presSliderQ3.size === 0) return null;
      const stats = calcPresHeatmapStats(roomId, state, 3);
      return {
        timestamp,
        count: stats.count,
        presQ3Mean: stats.mean,
        presQ3StdDev: stats.stdDev,
        presentationStep: step,
      };
    }
    return null;
  }

  // quiz モードはスナップショット対象外（回答は1回確定なのでリアルタイムで十分）
  return null;
}

/** 指定ルームのスナップショット履歴を取得 */
export function getSnapshots(roomId: string): SnapshotEntry[] {
  return store.get(roomId)?.snapshots ?? [];
}

/** スナップショット発火時に呼ばれる emit コールバックを登録（handlers.ts から io で設定） */
export function setSnapshotEmitCallback(
  roomId: string,
  callback: (entry: SnapshotEntry) => void
): void {
  const state = store.get(roomId);
  if (state) state.snapshotEmitCallback = callback;
}

/** スナップショットタイマーを停止してルームを削除（将来の掃除用） */
export function deleteRoom(roomId: string): void {
  const state = store.get(roomId);
  if (!state) return;
  if (state.snapshotTimer) clearInterval(state.snapshotTimer);
  store.delete(roomId);
}
