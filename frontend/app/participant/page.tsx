'use client';
import { Suspense } from 'react';
import ParticipantInner from './ParticipantInner';

export default function ParticipantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>}>
      <ParticipantInner />
    </Suspense>
  );
}
