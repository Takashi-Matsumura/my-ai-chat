import './globals.css';
import { Inter } from 'next/font/google';
import { ThreadProvider } from './contexts/ThreadContext';
import { ThemeProvider } from './contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Chat - Ollama チャットアプリ',
  description: 'Ollamaを使用した多機能チャットアプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ThemeProvider>
          <ThreadProvider>
            {children}
          </ThreadProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
