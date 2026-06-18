import { SubState, type SubStateType } from '@/types/game';

export const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
export const PENTATONIC_HIGH = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1567.98, 1760.0];

export const PIN_DIGITS = [8, 2, 5] as const;
export const PIN_WORDS = ['Eight', 'Two', 'Five'] as const;

export const PASTEL = [
  '#ff9aa2','#ffb7b2','#ffdac1','#e2f0cb','#b5ead7',
  '#c7ceea','#f8c8d4','#ffd6e0','#c9e4de','#b8d8d8',
  '#a8d8ea','#f9f7f7',
];

export const WINDDOWN_DURATION = 60;
export const SUB_MIN = 180;
export const SUB_MAX = 240;
export const SESSION_DEFAULT = 600;
export const INTERACTION_MILESTONE = 5;
export const SURPRISE_POP_MIN = 5;
export const SURPRISE_POP_MAX = 9;

export interface ValueCardData {
  he: string;
  en: string;
}

export const VALUE_CARDS: Record<SubStateType, ValueCardData> = {
  [SubState.POPPING]: { he: 'סקרנות', en: 'Curiosity' },
  [SubState.PEEKABOO]: { he: 'ביטחון', en: 'Trust' },
  [SubState.PAINTING]: { he: 'יצירתיות', en: 'Creativity' },
};
