export type Role = 'user' | 'assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
}

export interface ChatLimitsInfo {
  chatCount: number;
  maxChats: number;
  chatMessageCount: number;
  maxChatMessages: number;
  userTotalMessages: number;
  maxUserTotalMessages: number;
  isChatLimitReached: boolean;
  isUserLimitReached: boolean;
  isAccountMessageLimitReached: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ChatSettings {
  theme: ThemeMode;
  systemPrompt?: string;
  streamResponse: boolean;
}
