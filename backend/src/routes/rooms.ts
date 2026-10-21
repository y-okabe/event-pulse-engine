// ============================================================
// REST API: ルーム管理
// ============================================================
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRoom, getRoom, listRooms } from '../store/roomStore';
import type { Room } from '../../../shared/types/index';

export const roomRouter = Router();

// GET /api/rooms — ルーム一覧
roomRouter.get('/', (_req, res) => {
  res.json(listRooms());
});

// GET /api/rooms/:id — ルーム詳細
roomRouter.get('/:id', (req, res) => {
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  return res.json(room);
});

// POST /api/rooms — ルーム作成
roomRouter.post('/', (req, res) => {
  const { title, mode } = req.body as Partial<Room>;
  if (!title || !mode) {
    return res.status(400).json({ error: 'title and mode are required' });
  }
  const validModes: Room['mode'][] = ['heatmap', 'quiz', 'multi_slider', 'presentation'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of: ${validModes.join(', ')}` });
  }
  const room = createRoom(title, mode);
  return res.status(201).json(room);
});
