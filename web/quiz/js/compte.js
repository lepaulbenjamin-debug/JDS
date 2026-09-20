// Le compte, côté pupitre.
//
// Facultatif, et il faut que ça se voie : rien ici n'est appelé avant qu'on ne
// le demande, et l'appli fonctionne exactement pareil sans. Le compte sert à ce
// qui, sinon, meurt avec le stockage du navigateur — l'historique, les
// statistiques, les packs achetés.
//
// Le jeton de session vit dans `localStorage`. Il ne part que vers le relais,
// dans un en-tête `Authorization`, et jamais dans une URL : une adresse se
// retrouve dans un historique, dans un journal de serveur, dans un lien
// partagé.

import { relayBase } from './net.js';
import { licence as licenceDeLAppareil, adopterLaLicence } from './packs.js';

const JETON_KEY = 'quizroom.jeton';

let jeton = lireLeJeton();
let profil = null;          // le compte tel que le relais le décrit
let derniereVue = null;     // stats, parties, amis : ce que l'écran affiche

function lireLeJeton() {
  try {
    return localStorage.getItem(JETON_KEY) ?? '';
  } catch {
    return '';              // navigation privée : pas de compte, pas de drame
  }
}

function retenirLeJeton(valeur) {
  jeton = valeur ?? '';
  try {
    if (jeton) localStorage.setItem(JETON_KEY, jeton);
    else localStorage.removeItem(JETON_KEY);
  } catch { /* on jouera cette session sans mémoire */ }
}

/** Y a-t-il un compte ouvert sur cet appareil ? */
export const connecte = () => Boolean(jeton);
export const monProfil = () => profil;

async function appel(action, corps = null, methode = 'POST') {
  const url = `${relayBase()}/api/compte?action=${encodeURIComponent(action)}`;
  const reponse = await fetch(url, {
    method: methode,
    headers: {
      ...(corps ? { 'content-type': 'application/json' } : {}),
      ...(jeton ? { authorization: `Bearer ${jeton}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });

  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    // Une session périmée n'est pas une erreur à afficher : on oublie le jeton
    // et l'appli redevient ce qu'elle est sans compte.
    if (reponse.status === 401) oublier();
    throw Object.assign(new Error(donnees.error ?? 'Le compte n’a pas répondu.'), {
      status: reponse.status,
    });
  }
  return donnees;
}

function oublier() {
  retenirLeJeton('');
  profil = null;
  derniereVue = null;
  // On repasse sur la licence de l'appareil : ce qu'il avait acheté avant y est
  // toujours, et ce qui a été acheté sous le compte se retrouvera en se
  // reconnectant.
  adopterLaLicence('');
}

/**
 * Les achats de cet appareil rejoignent le compte, et la licence devient celle
 * du compte. Appelé à chaque connexion, quel que soit le chemin emprunté.
 */
async function rattacherLesAchats() {
  try {
    const { licence } = await appel('licence', { licence: licenceDeLAppareil() });
    adopterLaLicence(licence);
  } catch { /* les packs restent lisibles avec la licence de l'appareil */ }
}

/* --- Se connecter --------------------------------------------------------- */

export const demanderUnCode = (email) => appel('code', { email });

export async function ouvrirParCode(email, code) {
  const { jeton: neuf, compte } = await appel('email', { email, code });
  retenirLeJeton(neuf);
  profil = compte;
  await rattacherLesAchats();
  return compte;
}

/**
 * Les connexions tierces.
 *
 * L'application native obtient un jeton signé par Apple ou par Google et nous
 * le passe ; le relais vérifie la signature. Sur le web, ces ponts n'existent
 * pas — d'où les deux fonctions ci-dessous, que l'écran interroge avant
 * d'afficher quoi que ce soit : un bouton qui ne fait rien vaut moins que pas
 * de bouton du tout.
 */
export const pontApple = () => globalThis.Capacitor?.Plugins?.CompteApple ?? null;
export const pontGoogle = () => globalThis.Capacitor?.Plugins?.CompteGoogle ?? null;

export async function ouvrirParApple() {
  const pont = pontApple();
  if (!pont) throw new Error('La connexion Apple n’est pas disponible ici.');
  const { identityToken, nom, nonce } = await pont.signIn();
  const { jeton: neuf, compte } = await appel('apple', { jetonApple: identityToken, nom, nonce });
  retenirLeJeton(neuf);
  profil = compte;
  await rattacherLesAchats();
  return compte;
}

export async function ouvrirParGoogle() {
  const pont = pontGoogle();
  if (!pont) throw new Error('La connexion Google n’est pas disponible ici.');
  const { idToken, nonce } = await pont.signIn();
  const { jeton: neuf, compte } = await appel('google', { jetonGoogle: idToken, nonce });
  retenirLeJeton(neuf);
  profil = compte;
  await rattacherLesAchats();
  return compte;
}

export async function seDeconnecter() {
  try {
    await appel('deconnexion');
  } catch { /* le jeton part d'ici de toute façon */ }
  oublier();
}

/** Partir pour de bon. Le relais efface tout, y compris ce qui rouvrirait. */
export async function supprimerLeCompte() {
  await appel('supprimer');
  oublier();
}

export async function renommer(nom) {
  const { compte } = await appel('nom', { nom });
  profil = compte;
  return compte;
}

/* --- Ce que le compte porte ------------------------------------------------ */

/** Tout ce qu'affiche l'écran du compte, en un appel. */
export async function rafraichir() {
  if (!jeton) return null;
  const vue = await appel('', null, 'GET');
  profil = vue.compte;
  derniereVue = vue;
  return vue;
}

export const derniereLecture = () => derniereVue;

export const amis = () => appel('amis', null, 'GET').then((v) => v.amis ?? []);

/**
 * L'historique, fusionné avec celui du relais.
 *
 * On envoie ce que l'appareil sait, on reçoit l'union : c'est ce qui fait que
 * le téléphone et la tablette ne reposent pas les mêmes questions. Sans compte,
 * cette fonction n'est jamais appelée et l'historique reste local.
 */
export async function synchroniserLesVues(locales) {
  if (!jeton) return null;
  const { vues } = await appel('vues', { vues: locales });
  return vues;
}

/** Une partie terminée, telle que CET appareil l'a vécue. */
export async function declarerLaPartie(partie) {
  if (!jeton) return null;
  const { stats } = await appel('partie', { partie });
  if (derniereVue) derniereVue = { ...derniereVue, stats };
  return stats;
}
