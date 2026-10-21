// ============================================================
// Socket.io イベントハンドラ
// ============================================================
import { Server, Socket } from 'socket.io';
import { EVENTS } from '../../../shared/types/index';
import type {
  SliderUpdatePayload,
  QuizQuestion,
  QuizAnswerPayload,
  MultiSliderQuestion,
  MultiSliderUpdatePayload,
} from '../../../shared/types/index';
import {
  joinRoom,
  leaveRoom,
  getRoom,
  getParticipantCount,
  updateSlider,
  startQuiz,
  submitQuizAnswer,
  getQuizStats,
  getCurrentQuestion,
  startMultiSlider,
  updateMultiSlider,
  getMultiSliderStats,
  getCurrentMultiQuestion,
} from '../store/roomStore';

// デバウンス用タイマー管理（socketId → timer）
const sliderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const multiSliderTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 80;

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    // ------------------------------------------------------------------
    // ルーム参加
    // ------------------------------------------------------------------
    socket.on(EVENTS.JOIN_ROOM, (payload: { roomId: string }) => {
      const { roomId } = payload;
      const room = getRoom(roomId);
      if (!room) {
        socket.emit(EVENTS.ERROR, { message: 'Room not found' });
        return;
      }
      joinRoom(roomId, socket.id);
      socket.join(roomId);

      socket.emit(EVENTS.ROOM_JOINED, {
        room,
        currentQuestion: getCurrentQuestion(roomId),
        currentMultiQuestion: getCurrentMultiQuestion(roomId),
      });

      // 参加者数をルーム全員にブロードキャスト
      io.to(roomId).emit(EVENTS.PARTICIPANT_COUNT, {
        roomId,
        count: getParticipantCount(roomId),
      });
      console.log(`[Socket] ${socket.id} joined room ${roomId}`);
    });

    // ------------------------------------------------------------------
    // 機能① ヒートマップ: スライダー値の受信
    // ------------------------------------------------------------------
    socket.on(EVENTS.SLIDER_UPDATE, (payload: SliderUpdatePayload) => {
      const { roomId, value } = payload;
      if (value < 0 || value > 100) return;

      // デバウンス: 80ms 以内の連続送信は最新値のみ処理
      const prev = sliderTimers.get(socket.id);
      if (prev) clearTimeout(prev);
      sliderTimers.set(
        socket.id,
        setTimeout(() => {
          const stats = updateSlider(roomId, socket.id, value);
          if (stats) io.to(roomId).emit(EVENTS.HEATMAP_STATS, stats);
          sliderTimers.delete(socket.id);
        }, DEBOUNCE_MS)
      );
    });

    // ------------------------------------------------------------------
    // 機能② クイズ: 問題の開始（主催者が送信）
    // ------------------------------------------------------------------
    socket.on(EVENTS.QUIZ_START, (payload: QuizQuestion) => {
      const ok = startQuiz(payload.roomId, payload);
      if (!ok) {
        socket.emit(EVENTS.ERROR, { message: 'Room not found' });
        return;
      }
      io.to(payload.roomId).emit(EVENTS.QUIZ_START, payload);
      // 初期集計（0回答）をブロードキャスト
      const stats = getQuizStats(payload.roomId);
      if (stats) io.to(payload.roomId).emit(EVENTS.QUIZ_STATS, stats);
      console.log(`[Quiz] started in room ${payload.roomId}`);
    });

    // 機能② クイズ: 回答の受信
    socket.on(EVENTS.QUIZ_ANSWER, (payload: QuizAnswerPayload) => {
      const { roomId, questionId, choiceKey, confidence } = payload;
      const stats = submitQuizAnswer(roomId, socket.id, choiceKey, confidence);
      if (stats && stats.questionId === questionId) {
        io.to(roomId).emit(EVENTS.QUIZ_STATS, stats);
      }
    });

    // 機能② クイズ: 正解公開（主催者が送信）
    socket.on(EVENTS.QUIZ_REVEAL, (payload: { roomId: string }) => {
      const stats = getQuizStats(payload.roomId);
      if (stats) io.to(payload.roomId).emit(EVENTS.QUIZ_STATS, stats);
    });

    // ------------------------------------------------------------------
    // 機能③ 多軸スライダー投票: 問題の開始（主催者が送信）
    // ------------------------------------------------------------------
    socket.on(EVENTS.MULTI_SLIDER_START, (payload: MultiSliderQuestion) => {
      const ok = startMultiSlider(payload.roomId, payload);
      if (!ok) {
        socket.emit(EVENTS.ERROR, { message: 'Room not found' });
        return;
      }
      io.to(payload.roomId).emit(EVENTS.MULTI_SLIDER_START, payload);
      const stats = getMultiSliderStats(payload.roomId);
      if (stats) io.to(payload.roomId).emit(EVENTS.MULTI_SLIDER_STATS, stats);
      console.log(`[MultiSlider] started in room ${payload.roomId}`);
    });

    // 機能③ 多軸スライダー投票: スライダー値の受信
    socket.on(EVENTS.MULTI_SLIDER_UPDATE, (payload: MultiSliderUpdatePayload) => {
      const { roomId, values } = payload;

      const prev = multiSliderTimers.get(socket.id);
      if (prev) clearTimeout(prev);
      multiSliderTimers.set(
        socket.id,
        setTimeout(() => {
          const stats = updateMultiSlider(roomId, socket.id, values);
          if (stats) io.to(roomId).emit(EVENTS.MULTI_SLIDER_STATS, stats);
          multiSliderTimers.delete(socket.id);
        }, DEBOUNCE_MS)
      );
    });

    // ------------------------------------------------------------------
    // 切断処理
    // ------------------------------------------------------------------
    socket.on('disconnect', () => {
      // タイマーのクリア
      const st = sliderTimers.get(socket.id);
      if (st) { clearTimeout(st); sliderTimers.delete(socket.id); }
      const mt = multiSliderTimers.get(socket.id);
      if (mt) { clearTimeout(mt); multiSliderTimers.delete(socket.id); }

      const roomId = leaveRoom(socket.id);
      if (roomId) {
        io.to(roomId).emit(EVENTS.PARTICIPANT_COUNT, {
          roomId,
          count: getParticipantCount(roomId),
        });
      }
      console.log(`[Socket] disconnected: ${socket.id}`);
    });
  });
}
