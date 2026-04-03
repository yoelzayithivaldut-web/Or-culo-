import { useState, useEffect, useCallback } from 'react';

const ADMIN_EMAILS = [
  'word.intelligence@gmail.com',
  'yoelzayithivaldut@gmail.com'
];

export interface UseAdminBypassReturn {
  isAdminBypass: boolean;
  enableBypass: () => void;
  disableBypass: () => void;
  checkIsAdmin: (email?: string | null) => boolean;
}

export function useAdminBypass(): UseAdminBypassReturn {
  const [isAdminBypass, setIsAdminBypass] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ADMIN_BYPASS') === 'true';
  });

  const enableBypass = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ADMIN_BYPASS', 'true');
      setIsAdminBypass(true);
    }
  }, []);

  const disableBypass = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ADMIN_BYPASS');
      setIsAdminBypass(false);
    }
  }, []);

  const checkIsAdmin = useCallback((email?: string | null): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.some(adminEmail => 
      email.toLowerCase() === adminEmail.toLowerCase()
    );
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('ADMIN_BYPASS') === 'true';
    if (stored !== isAdminBypass) {
      setIsAdminBypass(stored);
    }
  }, []);

  return {
    isAdminBypass,
    enableBypass,
    disableBypass,
    checkIsAdmin
  };
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(adminEmail => 
    email.toLowerCase() === adminEmail.toLowerCase()
  );
}