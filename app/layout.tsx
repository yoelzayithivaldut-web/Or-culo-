import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/components/AuthProvider';
import { DatabaseSetupOverlay } from '@/components/DatabaseSetupOverlay';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Oráculo CRM - Inteligência Literária',
  description: 'O CRM definitivo para autores e editoras.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <DatabaseSetupOverlay />
            <Toaster position="top-right" theme="dark" richColors />
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
