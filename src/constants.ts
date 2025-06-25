import { WheelSettings } from './types';

// New color palette inspired by wheelofnames.com for "Elegant Fahim's Star Giveway"
export const WHEEL_OF_NAMES_INSPIRED_COLORS: string[] = [
  '#303F9F', 
  '#7B1FA2', 
  '#1976D2', 
  '#D32F2F', 
  '#FBC02D', 
  '#388E3C', 
  '#00796B', 
  '#F57C00', 
  '#455A64', 
  '#616161', 
  '#E64A19', 
  '#5D4037', 
];


export const DEFAULT_WHEEL_SETTINGS: WheelSettings = {
  segmentColors: [...WHEEL_OF_NAMES_INSPIRED_COLORS],
  textColor: '#FFFFFF', 
  spinDurationSeconds: 8,
  // Using external sound URLs as previously; ensure these are accessible or replace with local paths like /audio/sample-tick.mp3
  tickSoundUrl: 'https://wheelofnames.com/sounds/ding.mp3', 
  winnerSoundUrl: 'https://wheelofnames.com/sounds/SMALL_CROWD_APPLAUSE-Yannick_Lemieux-1268806408-soft.mp3', 
};

export const MIN_NAMES_TO_SPIN = 1; // Allow spinning with one name (it will always win)
export const MAX_NAMES_DISPLAYED_ON_WHEEL = 100;

export const APP_TITLE = "Elegant Fahim's Star Giveaway";

// Pointer will be simpler, colors hardcoded in WheelCanvas
