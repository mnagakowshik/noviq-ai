import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Noviq AI — Think. Ask. Discover.',
  description: 'A modern, high-performance AI chatbot powered by Google Gemini 3.8 Flash. Ask anything, explore new ideas, and write code effortlessly.',
  keywords: ['Noviq AI', 'Gemini 3.8 Flash', 'AI Chatbot', 'Conversational AI', 'Next.js'],
  authors: [{ name: 'Noviq AI Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#101522',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('noviq_ai_theme');
                  const supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (storedTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] antialiased transition-colors duration-200`}>
        {children}
      </body>
    </html>
  );
}
