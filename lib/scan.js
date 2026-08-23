// Logique de la lecture photo, partagée par les deux hébergements possibles :
// le petit serveur Node de `server/` et la fonction Vercel de `api/`.
//
// Rien ici ne dépend d'un framework HTTP : on reçoit un objet, on renvoie un
// statut et un corps. Les deux enveloppes n'ont plus qu'à traduire.

import Anthropic from '@anthropic-ai/sdk';
import { buildPayload, parseResponse, BETA_REPLI } from '../web/js/vision-prompt.js';
import { GAMES } from '../web/js/games/index.js';

/**
 * Plafond du corps de requête.
 * Vercel refuse au-delà de 4,5 Mo avec une erreur peu parlante : on s'arrête
 * avant, pour pouvoir expliquer. Une photo redimensionnée à 1568 px pèse
 * moins de 1 Mo en base64, la marge est confortable.
 */
export const MAX_BODY = 4 * 1024 * 1024;

const FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

let client;
function getClient() {
  // Créé à la première requête : sans clé, le reste de l'appli doit continuer
  // de fonctionner (le comptage est entièrement local).
  client ??= new Anthropic();
  return client;
}

/**
 * Y a-t-il une clé côté serveur ?
 * Sans ce contrôle, l'absence de clé remonte comme une erreur générique et
 * l'utilisateur cherche du côté de sa photo. C'est pourtant le cas le plus
 * fréquent : une variable d'environnement ajoutée après le déploiement n'est
 * prise en compte qu'au déploiement suivant.
 */
function cleAbsente() {
  return !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN;
}

/** @returns {string[]} la liste des reproches, vide si tout va bien */
export function validateScanInput(input) {
  const errors = [];
  if (typeof input?.imageBase64 !== 'string' || input.imageBase64.length < 32) errors.push('image manquante');
  if (!FORMATS.includes(input?.mediaType)) errors.push('format d’image non supporté');
  if (!['scoresheet', 'cards'].includes(input?.mode)) errors.push('mode inconnu');
  if (!Array.isArray(input?.players)) errors.push('liste de joueurs invalide');
  // Le jeu est résolu ici, à partir d'un identifiant connu : le client ne peut
  // pas injecter de texte dans le prompt système.
  if (!GAMES.some((g) => g.id === input?.gameId)) errors.push('jeu inconnu');
  return errors;
}

/**
 * Lit une photo et renvoie ce qu'il faut répondre en HTTP.
 * @returns {Promise<{status:number, body:object}>}
 */
export async function runScan(input) {
  const errors = validateScanInput(input);
  if (errors.length) return { status: 400, body: { error: `Requête invalide : ${errors.join(', ')}.` } };

  if (cleAbsente()) {
    console.error('ANTHROPIC_API_KEY absente de l’environnement du serveur.');
    return {
      status: 503,
      body: {
        error: 'Le serveur n’a pas de clé API configurée. Si vous venez de l’ajouter, '
          + 'il faut redéployer pour qu’elle soit prise en compte.',
      },
    };
  }

  try {
    const message = await getClient().beta.messages.create({
      betas: [BETA_REPLI],
      ...buildPayload({
        mode: input.mode,
        game: GAMES.find((g) => g.id === input.gameId),
        players: input.players.map(String).slice(0, 12),
        imageBase64: input.imageBase64,
        mediaType: input.mediaType,
      }),
    });
    return { status: 200, body: parseResponse(message) };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('Clé API refusée par Anthropic.');
      return { status: 502, body: { error: 'La clé API du serveur est invalide.' } };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      console.error('Clé sans accès au modèle.');
      return { status: 502, body: { error: 'La clé API n’a pas accès à ce modèle.' } };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: 429, body: { error: 'Trop de requêtes, réessayez dans un instant.' } };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Erreur API ${error.status} :`, error.message);
      return { status: 502, body: { error: `L’API a répondu ${error.status}.` } };
    }
    console.error(error);
    return { status: 500, body: { error: 'Échec de l’analyse de l’image.' } };
  }
}
