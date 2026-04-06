import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    plan: 'free',
    isUnlimited: false,
    loading: false,
  }),
}));

vi.mock('@/services/supabaseService', () => ({
  supabaseService: {
    subscribeToCollection: vi.fn(() => vi.fn()),
    addDocument: vi.fn(() => Promise.resolve('new-id')),
    deleteDocument: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('Books Service', () => {
  it('should mock supabase service', async () => {
    const { supabaseService } = await import('@/services/supabaseService');
    expect(supabaseService.addDocument).toBeDefined();
  });
});
