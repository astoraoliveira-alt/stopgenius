
export enum GameState {
  START = 'START',
  BROWSER = 'BROWSER',
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  JUDGING = 'JUDGING',
  RESULTS = 'RESULTS'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface RoomConfig {
  id: string;
  name: string;
  password?: string;
  maxPlayers: number;
  maxRounds: number;
  currentRound: number;
  isPrivate: boolean;
  hostId: string;
  currentPlayers: number;
  isDailyChallenge?: boolean;
}

export interface Category {
  id: string;
  name: string;
  isAiSuggested?: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isBot: boolean;
  isHost: boolean;
  isReady: boolean;
  answers: Record<string, string>;
  roundScore: number;
  totalScore: number;
  status: 'waiting' | 'typing' | 'done';
  difficulty?: Difficulty;
  progress?: number; // 0 to categories.length
}

export interface ValidationResult {
  playerName: string;
  categoryName: string;
  answer: string;
  isValid: boolean;
  score: number;
  reason: string;
  isGeniusChoice?: boolean;
  emoji?: string;
}
