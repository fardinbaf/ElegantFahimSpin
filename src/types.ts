export interface WheelSettings {
  segmentColors: string[];
  textColor: string;
  spinDurationSeconds: number;
  tickSoundUrl: string;
  winnerSoundUrl: string;
}

export type ActiveTab = 'entries' | 'results';

export interface TextEntry {
  id: string;
  type: 'text';
  name: string;
}

export interface ImageEntry {
  id: string;
  type: 'image';
  dataUrl: string;
  originalName: string;
}

export type WheelEntry = TextEntry | ImageEntry;

export type WheelBackgroundImage = string | null;
export type WheelCenterImage = string | null;
