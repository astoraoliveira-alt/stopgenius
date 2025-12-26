
export enum GameState {
  START = 'START',
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
  isPrivate: boolean;
  hostId: string;
}

export interface Category {
  id: string;
  name: string;
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
  difficulty?: Difficulty; // Dificuldade individual para bots
}

export interface ValidationResult {
  playerName: string;
  categoryName: string;
  answer: string;
  isValid: boolean;
  score: number;
  reason: string;
  isGeniusChoice?: boolean;
}
