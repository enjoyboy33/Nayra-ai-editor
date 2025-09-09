
export enum View {
  SPLASH = 'SPLASH',
  GENERATOR = 'GENERATOR',
  EDITOR = 'EDITOR',
  COMBINER = 'COMBINER',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
}

export type HistoryItemType = 'Generated' | 'Edited' | 'Combined';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  image: string; // base64 data URL
  prompt: string;
  timestamp: number;
}

export interface User {
  name: string;
  email: string;
}
