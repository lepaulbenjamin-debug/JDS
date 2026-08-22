// Registre des jeux. Ajouter un jeu = ajouter un module ici.
import papayoo from './papayoo.js';
import skyjo from './skyjo.js';
import sixQuiPrend from './six-qui-prend.js';
import tarot from './tarot.js';

export const GAMES = [papayoo, skyjo, sixQuiPrend, tarot];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}
