// Fonction Vercel : /api/room?code=..&action=..
//
// Tout le travail est dans `lib/rooms.js`, partagé avec le serveur Node
// autonome. Attention au déploiement : sans `UPSTASH_REDIS_REST_URL` et
// `UPSTASH_REDIS_REST_TOKEN`, le relais retombe sur un stockage en mémoire —
// or deux requêtes successives peuvent atterrir sur deux instances
// différentes, et le salon paraîtra introuvable une fois sur deux. En
// hébergement serverless, ces deux variables ne sont pas une option.

import { handleRoomRequest } from '../lib/rooms.js';

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const { status, body } = await handleRoomRequest({
    method: request.method,
    query: Object.fromEntries(url.searchParams),
    body: request.body,
  });
  // Les pupitres sondent souvent : rien de tout ceci ne doit être mis en cache.
  response.setHeader('cache-control', 'no-store');
  return response.status(status).json(body);
}
