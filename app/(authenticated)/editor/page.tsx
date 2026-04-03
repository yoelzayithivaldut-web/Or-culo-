'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/books?new=true');
  }, [router]);

  return null;
}
