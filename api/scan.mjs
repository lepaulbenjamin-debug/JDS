// Fonction Vercel : POST /api/scan.
//
// Vercel analyse lui-même le corps JSON (`request.body`) et impose 4,5 Mo au
// maximum ; tout le reste du travail est dans `lib/scan.js`, partagé avec le
// serveur Node autonome.

import { runScan } from '../lib/scan.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Méthode non autorisée.' });
  }

  let input;
  try {
    input = request.body;
  } catch {
    return response.status(400).json({ error: 'Corps de requête illisible.' });
  }
  if (!input) return response.status(400).json({ error: 'Corps de requête vide.' });

  const { status, body } = await runScan(input);
  return response.status(status).json(body);
}
