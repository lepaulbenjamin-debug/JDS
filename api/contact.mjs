// Fonction Vercel : POST /api/contact
//
// Le formulaire du site. Il répond en HTML et non en JSON : personne ne doit
// avoir besoin de JavaScript pour signaler un problème.

import { handleContactRequest } from '../lib/contact.js';

export default async function handler(request, response) {
  const { status, body, html, redirection } = await handleContactRequest({
    method: request.method,
    body: request.body,
    headers: request.headers,
  });

  response.setHeader('cache-control', 'no-store');
  if (redirection) return response.redirect(status, redirection);
  if (html) {
    response.setHeader('content-type', 'text/html; charset=utf-8');
    return response.status(status).send(html);
  }
  return response.status(status).json(body);
}
