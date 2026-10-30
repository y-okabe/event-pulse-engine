import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EVENTS } from '@eventpulse/shared';
import type {
  Room,
  HeatmapStats,
  QuizQuestion,
  QuizStats,
  MultiSliderQuestion,
  MultiSliderStats,
  PresentationStep,
  SnapshotEntry,
} from '@eventpulse/shared';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export interface RoomState {
  socket: Socket | null;
  connected: boolean;
  participantCount: number;
  room: Room | null;
  // 機能①
  heatmapStats: HeatmapStats | null;
  // 機能②
  currentQuestion: QuizQuestion | null;
  quizStats: QuizStats | null;
  // 機能③
  currentMultiQuestion: MultiSliderQuestion | null;
  multiSliderStats: MultiSliderStats | null;
  // プレゼンモード
  presentationStep: PresentationStep;
  presHeatmapStatsQ1: HeatmapStats | null;
  presHeatmapStatsQ3: HeatmapStats | null;
  // 時系列スナップショット
  snapshotHistory: SnapshotEntry[];
}

export function useRoom(roomId: string): RoomState {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<RoomState>({
    socket: null,
    connected: false,
    participantCount: 0,
    room: null,
    heatmapStats: null,
    currentQuestion: null,
    quizStats: null,
    currentMultiQuestion: null,
    multiSliderStats: null,
    presentationStep: 0,
    presHeatmapStatsQ1: null,
    presHeatmapStatsQ3: null,
    snapshotHistory: [],
  });

  useEffect(() => {
    if (!roomId) return;
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(EVENTS.JOIN_ROOM, { roomId });
      setState((s) => ({ ...s, socket, connected: true }));
    });

    socket.on('disconnect', () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.on(EVENTS.ROOM_JOINED, (data: {
      room: Room;
      currentQuestion: QuizQuestion | null;
      currentMultiQuestion: MultiSliderQuestion | null;
      presentationStep: PresentationStep;
    }) => {
      setState((s) => ({
        ...s,
        room: data.room,
        currentQuestion: data.currentQuestion,
        currentMultiQuestion: data.currentMultiQuestion,
        presentationStep: data.presentationStep ?? 0,
      }));
    });

    socket.on(EVENTS.PARTICIPANT_COUNT, (data: { count: number }) => {
      setState((s) => ({ ...s, participantCount: data.count }));
    });

    socket.on(EVENTS.HEATMAP_STATS, (stats: HeatmapStats) => {
      setState((s) => ({ ...s, heatmapStats: stats }));
    });

    socket.on(EVENTS.QUIZ_START, (q: QuizQuestion) => {
      setState((s) => ({ ...s, currentQuestion: q, quizStats: null }));
    });

    socket.on(EVENTS.QUIZ_STATS, (stats: QuizStats) => {
      setState((s) => ({ ...s, quizStats: stats }));
    });

    socket.on(EVENTS.MULTI_SLIDER_START, (q: MultiSliderQuestion) => {
      setState((s) => ({ ...s, currentMultiQuestion: q, multiSliderStats: null }));
    });

    socket.on(EVENTS.MULTI_SLIDER_STATS, (stats: MultiSliderStats) => {
      setState((s) => ({ ...s, multiSliderStats: stats }));
    });

    // プレゼンモード: Qステップ変更
    socket.on(EVENTS.PRESENTATION_STEP, (data: { step: PresentationStep }) => {
      setState((s) => ({ ...s, presentationStep: data.step }));
    });

    // プレゼンモード: Q1/Q3 ヒートマップ集計
    socket.on('pres_heatmap_stats_1', (stats: HeatmapStats) => {
      setState((s) => ({ ...s, presHeatmapStatsQ1: stats }));
    });
    socket.on('pres_heatmap_stats_3', (stats: HeatmapStats) => {
      setState((s) => ({ ...s, presHeatmapStatsQ3: stats }));
    });

    // 時系列スナップショット: 初回接続時に全履歴を受信
    socket.on(EVENTS.SNAPSHOT_HISTORY, (data: { roomId: string; history: SnapshotEntry[] }) => {
      setState((s) => ({ ...s, snapshotHistory: data.history }));
    });

    // 時系列スナップショット: 新規エントリのプッシュ
    socket.on(EVENTS.SNAPSHOT_PUSH, (entry: SnapshotEntry) => {
      setState((s) => ({ ...s, snapshotHistory: [...s.snapshotHistory, entry] }));
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  return state;
}
