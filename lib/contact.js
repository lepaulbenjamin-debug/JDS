// Le formulaire de contact.
//
// Pourquoi un formulaire plutôt qu'une adresse écrite sur la page : une adresse
// publiée est une adresse récoltée, et celle-ci n'est pas une boîte de
// remplacement — c'est celle de quelqu'un. Le formulaire sert d'écran, garde la
// même identité visuelle que le reste, et fonctionne depuis l'application, où
// un lien `mailto:` n'ouvre pas toujours quoi que ce soit.
//
// Il fonctionne SANS JavaScript, et c'est délibéré : un `<form method="post">`
// tout bête, une réponse en 303 vers une page de remerciement, et une page
// d'erreur rendue ici. Une personne qui a un problème avec le jeu est la
// dernière à qui l'on doit demander d'activer quelque chose pour nous le dire.
//
// L'adresse de destination n'apparaît jamais côté navigateur.

import { coffre } from './comptes.js';

// Là où arrivent les messages. Dans l'environnement pour qu'elle puisse changer
// sans redéployer le code, avec une valeur par défaut pour que le formulaire
// marche dès le premier déploiement.
const destinataire = () => process.env.QUIZROOM_CONTACT_A || 'benjamin@creawebconseil.fr';

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
const PAR_HEURE = 5;           // par adresse IP : un formulaire public s'arrose

const erreur = (status, message) => Object.assign(new Error(message), { status });

const propre = (valeur, max) => String(valeur ?? '').trim().slice(0, max);

/**
 * Une valeur qui finira dans un en-tête de courriel ne doit jamais contenir de
 * retour à la ligne : c'est par là qu'on ajoute des destinataires cachés. On
 * nettoie ici, à l'entrée, et non au moment de fabriquer l'en-tête — sinon la
 * protection dépend de chaque endroit qui s'en sert, et il suffit d'un oubli.
 */
const uneLigne = (valeur, max) => propre(valeur, max).replace(/[\r\n]+/g, ' ');

/** L'adresse de celui qui écrit : sans elle, on ne peut pas répondre. */
function adresseValable(brut) {
  const adresse = propre(brut, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(adresse)) {
    throw erreur(400, 'Cette adresse ne ressemble pas à une adresse — sans elle, impossible de te répondre.');
  }
  return adresse;
}

export async function envoyerUnMessage(champs, { ip = '', envoi = null } = {}) {
  // Le pot de miel : un champ que personne ne voit et qu'aucun humain ne
  // remplit. S'il est rempli, on répond « merci » et on jette — un robot à qui
  // l'on dit non recommence, un robot à qui l'on dit oui s'en va.
  if (propre(champs?.site, 10)) return { ok: true, ignore: true };

  const email = adresseValable(champs?.email);
  const nom = uneLigne(champs?.nom, 60) || 'Quelqu’un';
  const message = propre(champs?.message, MESSAGE_MAX);
  if (message.length < MESSAGE_MIN) {
    throw erreur(400, 'Le message est un peu court : dis-nous ce qui se passe.');
  }

  if (ip) {
    const cle = `quizroom:contact:${ip}`;
    const envoyes = (await coffre().get(cle)) ?? 0;
    if (envoyes >= PAR_HEURE) {
      throw erreur(429, 'Trop de messages d’affilée. Réessaie dans une heure.');
    }
    await coffre().set(cle, envoyes + 1, 3600);
  }

  const cle = process.env.QUIZROOM_MAIL_CLE;
  const expediteur = process.env.QUIZROOM_MAIL_DE;
  if (envoi) return envoi({ email, nom, message, a: destinataire() });
  if (!cle || !expediteur) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw erreur(503, 'Le formulaire n’est pas configuré. Réessaie plus tard.');
    }
    console.log(`[contact] de ${nom} <${email}> :\n${message}`);
    return { ok: true, console: true };
  }

  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: expediteur,
      to: [destinataire()],
      // Répondre au message doit répondre à la personne, pas au robot d'envoi.
      reply_to: email,
      subject: `Quiz entre amis — message de ${nom}`,
      text: `De : ${nom} <${email}>\n\n${message}\n`,
    }),
  });
  // Ce que Resend répond, gardé dans les deux cas. Un envoi réussi ne laissait
  // aucune trace : quand le message n'arrivait pas à destination, il n'y avait
  // plus rien à regarder d'ici, et « Resend l'a accepté » ne se distinguait plus
  // de « le message est perdu ».
  const dit = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    console.error('[contact] Resend a refusé', reponse.status, JSON.stringify(dit));
    throw erreur(502, 'Le message n’est pas parti. Réessaie dans un instant.');
  }
  console.log('[contact] remis à Resend', dit.id ?? '(sans identifiant)');
  return { ok: true, envoye: true, id: dit.id ?? null };
}

/* --- La route ------------------------------------------------------------- */

/**
 * Un corps de formulaire, ou du JSON.
 *
 * Le navigateur envoie `application/x-www-form-urlencoded` quand on ne lui
 * demande rien de spécial — et c'est précisément ce qu'on veut : aucune ligne
 * de JavaScript entre la personne et son message.
 */
function lireLesChamps(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  return Object.fromEntries(new URLSearchParams(String(body)));
}

/** La page d'erreur, rendue ici : sans JavaScript, personne ne peut l'afficher. */
const pageDErreur = (message) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Message non envoyé — Quiz entre amis</title>
<link rel="stylesheet" href="/style.css"></head>
<body><main class="texte"><div class="enveloppe">
<h1>Le message n’est pas parti</h1>
<div class="resume"><p>${message}</p></div>
<p><a class="bouton bouton-primaire" href="/contact">Revenir au formulaire</a></p>
</div></main></body></html>`;

export async function handleContactRequest({ method, body, headers }) {
  if (method !== 'POST') return { status: 405, body: { error: 'Méthode non permise.' } };

  // L'adresse du visiteur telle que l'hébergeur la voit. Elle ne sert qu'au
  // compteur horaire, n'est jamais écrite dans le message, et disparaît avec
  // la clé au bout d'une heure.
  const ip = String(headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
  const veutDuJson = String(headers?.['content-type'] ?? '').includes('json');

  try {
    const envoi = await envoyerUnMessage(lireLesChamps(body), { ip });
    // L'identifiant Resend n'est rendu qu'à l'appel en JSON, qui n'est pas
    // celui du formulaire : il sert à retrouver le message dans le tableau de
    // bord quand quelqu'un dit « je n'ai rien reçu ».
    return veutDuJson
      ? { status: 200, body: { ok: true, id: envoi?.id ?? null } }
      : { status: 303, redirection: '/merci' };
  } catch (e) {
    const status = e?.status ?? 500;
    if (status >= 500) console.error('[contact]', e);
    const message = status >= 500 ? 'Quelque chose a cassé de notre côté.' : e.message;
    return veutDuJson
      ? { status, body: { error: message } }
      : { status, html: pageDErreur(message) };
  }
}
