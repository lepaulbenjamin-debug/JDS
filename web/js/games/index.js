// Registre des jeux. Ajouter un jeu = ajouter un module ici.
import papayoo from './papayoo.js';
import skyjo from './skyjo.js';
import sixQuiPrend from './six-qui-prend.js';
import tarot from './tarot.js';
import belote from './belote.js';
import skullKing from './skull-king.js';
import barbu from './barbu.js';

export const GAMES = [papayoo, skyjo, sixQuiPrend, tarot, belote, skullKing, barbu];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}
