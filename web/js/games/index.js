// Registre des jeux. Ajouter un jeu = ajouter un module ici.
import papayoo from './papayoo.js';
import skyjo from './skyjo.js';

export const GAMES = [papayoo, skyjo];

export function getGame(id) {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}
