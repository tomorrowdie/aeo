import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Layout/Navbar';

export const metadata: Metadata = {
  title: 'AEO — Get Found by AI',
  description:
    'Paste your URL. Get found by AI. Free scan → AI score → Generate fix code → Get found by ChatGPT, Claude & Perplexity.',
  openGraph: {
    title: 'AEO — Get Found by AI',
    description: 'Free AI-readiness scan for your website.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0d0f1a] text-gray-100 antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
