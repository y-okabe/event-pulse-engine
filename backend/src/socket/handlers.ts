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
  advancePresentationStep,
  goBackPresentationStep,
  getPresentationStep,
  updatePresSlider,
  getPresHeatmapStats,
  getSnapshots,
  setSnapshotEmitCallback,
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
        presentationStep: getPresentationStep(roomId),
      });

      // 接続時にスナップショット履歴を送信
      const history = getSnapshots(roomId);
      if (history.length > 0) {
        socket.emit(EVENTS.SNAPSHOT_HISTORY, { roomId, history });
      }

      // タイマー発火時に io でルーム全員へ push するコールバックを登録
      setSnapshotEmitCallback(roomId, (entry) => {
        io.to(roomId).emit(EVENTS.SNAPSHOT_PUSH, entry);
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
    // プレゼンモード: 次のQへ進む（主催者が送信）
    // ------------------------------------------------------------------
    socket.on(EVENTS.PRESENTATION_NEXT_Q, (payload: { roomId: string }) => {
      const { roomId } = payload;
      const newStep = advancePresentationStep(roomId);
      if (newStep === null) {
        socket.emit(EVENTS.ERROR, { message: 'Room not found' });
        return;
      }
      // 全員にステップ変更を通知
      io.to(roomId).emit(EVENTS.PRESENTATION_STEP, { roomId, step: newStep });

      // Q2 開始時: 多軸スライダー問題を自動配信
      if (newStep === 2) {
        const q2: import('../../../shared/types/index').MultiSliderQuestion = {
          id: `pres-q2-${roomId}`,
          roomId,
          text: '本日のプレゼンで一番聴きたいトピックは？',
          choices: [
            { key: 'A', label: '今回の開発プロセスと爆速構築の全容' },
            { key: 'B', label: '手動（人間）開発 vs Bob（AI）開発の決定的な差' },
            { key: 'C', label: 'WebSocket・リアルタイムアニメーション実装の難所突破術' },
            { key: 'D', label: 'Bob（AI）を相棒として使いこなすプロンプトのコツ' },
          ],
        };
        startMultiSlider(roomId, q2);
        io.to(roomId).emit(EVENTS.MULTI_SLIDER_START, q2);
        const stats = getMultiSliderStats(roomId);
        if (stats) io.to(roomId).emit(EVENTS.MULTI_SLIDER_STATS, stats);
      }

      console.log(`[Presentation] room ${roomId} → step ${newStep}`);
    });

    // プレゼンモード: 前のQへ戻る（主催者が送信）
    socket.on(EVENTS.PRESENTATION_PREV_Q, (payload: { roomId: string }) => {
      const { roomId } = payload;
      const newStep = goBackPresentationStep(roomId);
      if (newStep === null) {
        socket.emit(EVENTS.ERROR, { message: 'Room not found' });
        return;
      }
      // 全員にステップ変更を通知
      io.to(roomId).emit(EVENTS.PRESENTATION_STEP, { roomId, step: newStep });

      // Q2 に戻った場合: 多軸スライダー問題を再配信
      if (newStep === 2) {
        const q2: import('../../../shared/types/index').MultiSliderQuestion = {
          id: `pres-q2-${roomId}`,
          roomId,
          text: '本日のプレゼンで一番聴きたいトピックは？',
          choices: [
            { key: 'A', label: '今回の開発プロセスと爆速構築の全容' },
            { key: 'B', label: '手動（人間）開発 vs Bob（AI）開発の決定的な差' },
            { key: 'C', label: 'WebSocket・リアルタイムアニメーション実装の難所突破術' },
            { key: 'D', label: 'Bob（AI）を相棒として使いこなすプロンプトのコツ' },
          ],
        };
        startMultiSlider(roomId, q2);
        io.to(roomId).emit(EVENTS.MULTI_SLIDER_START, q2);
        const stats = getMultiSliderStats(roomId);
        if (stats) io.to(roomId).emit(EVENTS.MULTI_SLIDER_STATS, stats);
      }

      console.log(`[Presentation] room ${roomId} ← step ${newStep} (back)`);
    });

    // プレゼンモード: Q1/Q3 ヒートマップのスライダー値受信（参加者が送信）
    socket.on(
      'pres_slider_update',
      (payload: { roomId: string; step: 1 | 3; value: number }) => {
        const { roomId, step, value } = payload;
        if (value < 0 || value > 100) return;
        const prev = sliderTimers.get(socket.id);
        if (prev) clearTimeout(prev);
        sliderTimers.set(
          socket.id,
          setTimeout(() => {
            const stats = updatePresSlider(roomId, socket.id, step, value);
            if (stats) io.to(roomId).emit(`pres_heatmap_stats_${step}`, stats);
            sliderTimers.delete(socket.id);
          }, 80)
        );
      }
    );

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
