import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EventPulse Engine',
  description: '感情の揺れ・理解度のグラデーションをリアルタイムで可視化するインタラクティブ・イベントプラットフォーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
