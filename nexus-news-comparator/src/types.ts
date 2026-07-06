
export interface Source {
  title: string;
  url: string;
}

export interface NewsAnalysisResult {
  markdownContent: string;
  sources: Source[];
}

export interface NewsSite {
  id: string;
  name: string;
  domain: string;
  country: string;
  selected: boolean;
}

// Fixed: Changed from enum to const object to satisfy modern TypeScript bundlers
export const AppState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;

export type AppState = typeof AppState[keyof typeof AppState];

export type SortOption = 'relevance' | 'date';

export interface HistoryRecord {
  ID: number;
  Theme: string;
  Date: string;
  Filters: string;
  Summary: string;
  Differences: string;
  Conclusion: string;
}