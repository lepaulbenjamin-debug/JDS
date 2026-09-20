// Fonction Vercel : /api/compte
//
// Tout le travail est dans `lib/comptes.js`, partagé avec le serveur Node
// autonome. Rien de ce qui passe ici n'est cachable : ce sont des sessions et
// des données personnelles.

import { handleCompteRequest } from '../lib/comptes.js';
import { enTetesCors, estPreflight } from '../lib/cors.js';

export default async function handler(request, response) {
  const cors = enTetesCors(request.headers?.origin);
  if (cors) for (const [nom, valeur] of Object.entries(cors)) response.setHeader(nom, valeur);
  if (estPreflight(request.method)) return response.status(204).end();

  const url = new URL(request.url, 'http://localhost');
  const { status, body } = await handleCompteRequest({
    method: request.method,
    query: Object.fromEntries(url.searchParams),
    body: request.body,
    headers: request.headers,
  });
  response.setHeader('cache-control', 'private, no-store');
  return response.status(status).json(body);
}
