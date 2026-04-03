import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from '@/app/login/page';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Mock AuthProvider
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    onboardingCompleted: false,
    isBypass: false,
    refreshAuth: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument();
    expect(screen.getByText('Entrar na Plataforma')).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { session: { user: { id: '123', email: 'test@example.com' } } },
      error: null,
    });

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByText('Entrar na Plataforma'));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('Login realizado com sucesso!');
    });
  });

  it('handles login failure', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid credentials', code: 'INVALID_LOGIN' },
    });

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'wrongpass' } });
    
    fireEvent.click(screen.getByText('Entrar na Plataforma'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Erro: Invalid credentials'), expect.any(Object));
    });
  });

  it('handles magic link login', async () => {
    (supabase.auth.signInWithOtp as any).mockResolvedValue({
      data: {},
      error: null,
    });

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'magic@example.com' } });
    fireEvent.click(screen.getByText('Link'));

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'magic@example.com',
        options: expect.any(Object),
      });
      expect(toast.success).toHaveBeenCalledWith('Link mágico enviado!');
    });
  });

  it('handles google login', async () => {
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({
      data: {},
      error: null,
    });

    render(<Login />);
    
    fireEvent.click(screen.getByText('Google'));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.any(Object),
      });
    });
  });

  it('handles signup flow', async () => {
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: { id: '123' }, session: null },
      error: null,
    });

    render(<Login />);
    
    fireEvent.click(screen.getByText('Não tem conta? Cadastre-se'));
    
    fireEvent.change(screen.getByPlaceholderText('Nome Completo'), { target: { value: 'Novo Usuário' } });
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar Senha'), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByText('Criar Conta Segura'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: expect.any(Object),
      });
    });
  });
});
