// ============================================================
// EventPulse Engine — 共通 TypeScript 型定義
// フロントエンド・バックエンド間で共有するスキーマ
// ============================================================

// ------------------------------------------------------------------
// セッション / ルーム
// ------------------------------------------------------------------
export interface Room {
  id: string;
  title: string;
  mode: RoomMode;
  createdAt: string;
}

export type RoomMode = 'heatmap' | 'quiz' | 'multi_slider' | 'presentation';

// ------------------------------------------------------------------
// プレゼンモード
// ------------------------------------------------------------------

/** プレゼンモードのQステップ (0=待機, 1=Q1, 2=Q2, 3=Q3) */
export type PresentationStep = 0 | 1 | 2 | 3;

/** サーバー → 全員: 現在のQステップ通知 */
export interface PresentationStepPayload {
  roomId: string;
  step: PresentationStep;
}

/** 主催者 → サーバー: 次のQへ進む */
export interface PresentationNextPayload {
  roomId: string;
}

// ------------------------------------------------------------------
// 参加者
// ------------------------------------------------------------------
export interface Participant {
  socketId: string;
  roomId: string;
  joinedAt: string;
}

// ------------------------------------------------------------------
// 機能① スライダー型「感情 & 納得度」リアルタイム・ヒートマップ
// ------------------------------------------------------------------

/** 参加者 → サーバー: スライダー値の送信 */
export interface SliderUpdatePayload {
  roomId: string;
  value: number; // 0 〜 100
}

/** サーバー → 全員: 集計結果のブロードキャスト */
export interface HeatmapStats {
  roomId: string;
  count: number;       // 参加者数
  mean: number;        // 平均値
  stdDev: number;      // 標準偏差
  distribution: number[]; // 0〜100 を 10 分割したビン（各ビンの人数）
  updatedAt: string;
}

// ------------------------------------------------------------------
// 機能② 「確信度つき」クイズ & ナレッジチェック
// ------------------------------------------------------------------

export type Confidence = 'intuition' | 'unsure' | 'confident';

/** 主催者 → サーバー: クイズ問題の配信 */
export interface QuizQuestion {
  id: string;
  roomId: string;
  text: string;
  choices: { key: string; label: string }[]; // e.g. [{key:'A', label:'...'}]
  correctKey: string | null; // null = 正解非公開
}

/** 参加者 → サーバー: クイズ回答の送信 */
export interface QuizAnswerPayload {
  roomId: string;
  questionId: string;
  choiceKey: string;
  confidence: Confidence;
}

/** サーバー → 全員: クイズ集計結果 */
export interface QuizStats {
  roomId: string;
  questionId: string;
  totalAnswers: number;
  results: QuizChoiceResult[];
  updatedAt: string;
}

export interface QuizChoiceResult {
  key: string;
  label: string;
  count: number;
  percentage: number;
  confidenceBreakdown: Record<Confidence, number>;
  isCorrect: boolean | null;
}

// ------------------------------------------------------------------
// 機能③ 「各択スライダー」多軸合意度投票
// ------------------------------------------------------------------

/** 主催者 → サーバー: 投票問題の配信 */
export interface MultiSliderQuestion {
  id: string;
  roomId: string;
  text: string;
  choices: { key: string; label: string }[]; // 各択（最大4択）
}

/** 参加者 → サーバー: 各択のスライダー値を一括送信 */
export interface MultiSliderUpdatePayload {
  roomId: string;
  questionId: string;
  values: Record<string, number>; // { A: 80, B: 40, C: 20, D: 30 }
}

/** サーバー → 全員: 多軸集計結果 */
export interface MultiSliderStats {
  roomId: string;
  questionId: string;
  count: number;
  choices: MultiSliderChoiceStats[];
  topKey: string; // 平均値が最大の択
  updatedAt: string;
}

export interface MultiSliderChoiceStats {
  key: string;
  label: string;
  mean: number;     // 全参加者の平均
  isTop: boolean;   // 最高値フラグ
}

// ------------------------------------------------------------------
// Socket.io イベント名の定数
// ------------------------------------------------------------------
export const EVENTS = {
  // 接続
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_JOINED: 'room_joined',
  PARTICIPANT_COUNT: 'participant_count',

  // 機能① ヒートマップ
  SLIDER_UPDATE: 'slider_update',
  HEATMAP_STATS: 'heatmap_stats',

  // 機能② クイズ
  QUIZ_START: 'quiz_start',
  QUIZ_ANSWER: 'quiz_answer',
  QUIZ_STATS: 'quiz_stats',
  QUIZ_REVEAL: 'quiz_reveal',

  // 機能③ 多軸スライダー投票
  MULTI_SLIDER_START: 'multi_slider_start',
  MULTI_SLIDER_UPDATE: 'multi_slider_update',
  MULTI_SLIDER_STATS: 'multi_slider_stats',

  // プレゼンモード
  PRESENTATION_NEXT_Q: 'presentation_next_q',
  PRESENTATION_PREV_Q: 'presentation_prev_q',
  PRESENTATION_STEP: 'presentation_step',

  // エラー
  ERROR: 'error',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
