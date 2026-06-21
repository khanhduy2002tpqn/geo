import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'Toán Học Thông Minh — Hình học 3D Tương tác',
  description: 'Nền tảng học hình học không gian 3D tương tác với AI và giọng nói tiếng Việt dành cho học sinh trung học.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <footer className="pointer-events-none fixed bottom-0 left-0 z-10 pb-2 pl-3 md:left-80">
          <p className="rounded-full bg-slate-950/60 px-3 py-0.5 text-sm text-slate-300 backdrop-blur-sm">
            © 2026 Phan Thị Mai
          </p>
        </footer>
      </body>
    </html>
  );
}
