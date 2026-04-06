export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'basic' | 'premium';
export type BookStatus = 'writing' | 'published' | 'draft' | 'review' | 'completed';
export type BookType = 'book' | 'ebook' | 'audiobook' | 'children';
export type ClientStatus = 'active' | 'inactive' | 'lead' | 'prospect';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  onboarding_completed: boolean;
  address: string | null;
  phone: string | null;
  education_level: string | null;
  main_genre: string | null;
  writing_goal: string | null;
  plan: UserPlan;
  role: UserRole;
  updated_at: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
    onboarding_completed?: boolean;
    avatar_url?: string;
  };
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  genre: string | null;
  synopsis: string | null;
  content: string | null;
  status: BookStatus;
  language: string;
  cover_url: string | null;
  back_cover_url: string | null;
  back_cover_text: string | null;
  progress: number;
  type: BookType;
  updated_at: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  notes: string | null;
  phone: string | null;
  status: ClientStatus;
  updated_at: string;
  created_at: string;
}

export interface PlanLimit {
  maxBooks: number;
  maxClients: number;
  aiFeatures: boolean;
  exportPdf: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimit> = {
  free: {
    maxBooks: 3,
    maxClients: 5,
    aiFeatures: false,
    exportPdf: false,
    prioritySupport: false,
  },
  basic: {
    maxBooks: 10,
    maxClients: 25,
    aiFeatures: true,
    exportPdf: false,
    prioritySupport: false,
  },
  premium: {
    maxBooks: -1,
    maxClients: -1,
    aiFeatures: true,
    exportPdf: true,
    prioritySupport: true,
  },
};

export interface FilterOptions {
  search?: string;
  status?: BookStatus;
  genre?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface SubscriptionCallbacks {
  onInsert?: (data: Book | Client) => void;
  onUpdate?: (data: Book | Client) => void;
  onDelete?: (id: string) => void;
}

export type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE';