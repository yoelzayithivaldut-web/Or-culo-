import { Layout } from '@/components/Layout';
import { Suspense } from 'react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Carregando...</div>}>
      <Layout>{children}</Layout>
    </Suspense>
  );
}
