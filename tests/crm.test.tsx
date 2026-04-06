import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/services/supabaseService', () => ({
  supabaseService: {
    subscribeToCollection: vi.fn(() => vi.fn()),
    addDocument: vi.fn(() => Promise.resolve('new-client-id')),
    deleteDocument: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('CRM Service', () => {
  it('should mock supabase service for CRM', async () => {
    const { supabaseService } = await import('@/services/supabaseService');
    expect(supabaseService.addDocument).toBeDefined();
    expect(supabaseService.deleteDocument).toBeDefined();
  });
});
