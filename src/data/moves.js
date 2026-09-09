import movesData from './moves.json';

export const MOVE_TRANSLATIONS = movesData;

export function translateMove(moveId) {
  if (!moveId) return '';
  return MOVE_TRANSLATIONS[moveId] || moveId;
}
