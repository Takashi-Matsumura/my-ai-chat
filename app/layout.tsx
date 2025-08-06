import './globals.css';
import { ThreadProvider } from './contexts/ThreadContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OllamaProvider } from './contexts/OllamaContext';
import { ProxyProvider } from './contexts/ProxyContext';

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
      <body className="font-sans">
        <ThemeProvider>
          <ProxyProvider>
            <OllamaProvider>
              <ThreadProvider>
                {children}
              </ThreadProvider>
            </OllamaProvider>
          </ProxyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
