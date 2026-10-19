import { ChatSession, ThemeMode } from '@/types/chat';

const SESSIONS_STORAGE_KEY = 'noviq_ai_sessions_v1';
const ACTIVE_SESSION_KEY = 'noviq_ai_active_session_id';
const THEME_STORAGE_KEY = 'noviq_ai_theme';

export function loadChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Validate each session structure
    return parsed.filter(
      (item): item is ChatSession =>
        Boolean(item && typeof item.id === 'string' && Array.isArray(item.messages))
    );
  } catch (error) {
    console.warn('Failed to load chat sessions from localStorage, resetting:', error);
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save chat sessions to localStorage:', error);
  }
}

export function loadActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (error) {
    console.error('Failed to save active session ID:', error);
  }
}

export function loadStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return 'dark'; // Dark theme default as requested
  } catch {
    return 'dark';
  }
}

export function saveStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}
