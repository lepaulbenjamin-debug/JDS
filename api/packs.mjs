// Fonction Vercel : /api/packs
//
// Tout le travail est dans `lib/packs.js`, partagé avec le serveur Node
// autonome. Attention au déploiement : les fichiers de `packs/` doivent être
// inclus dans le paquet de la fonction, et surtout **jamais** copiés sous
// `web/`, qui est servi en statique par le CDN.

import { handlePackRequest } from '../lib/packs.js';
import { enTetesCors, estPreflight } from '../lib/cors.js';

export default async function handler(request, response) {
  const cors = enTetesCors(request.headers?.origin);
  if (cors) for (const [nom, valeur] of Object.entries(cors)) response.setHeader(nom, valeur);
  if (estPreflight(request.method)) return response.status(204).end();

  const url = new URL(request.url, 'http://localhost');
  const { status, body } = await handlePackRequest({
    method: request.method,
    query: Object.fromEntries(url.searchParams),
    body: request.body,
  });
  // Le catalogue dépend de la licence : jamais de cache partagé.
  response.setHeader('cache-control', 'private, no-store');
  return response.status(status).json(body);
}
