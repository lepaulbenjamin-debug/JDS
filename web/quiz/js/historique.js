// Ce que la table a déjà vu.
//
// Le tirage était sans mémoire : deux parties d'affilée sur « Bouffe », et la
// moitié des questions revenait. Ce n'est pas une question de justice — on
// rejoue volontiers une question un mois plus tard — c'est une question de
// soirée : une question qu'on vient d'entendre ne surprend plus personne, et
// c'est la surprise qu'on achète en lançant une partie.
//
// L'historique vit sur l'appareil qui crée les parties, et nulle part ailleurs.
// C'est lui qui tire, c'est donc lui qui doit se souvenir. Rien ne part sur le
// relais : un compte de questions vues est exactement le genre de donnée dont
// personne n'a besoin sur un serveur, et une famille qui joue toujours depuis
// le même téléphone n'y perd rien.
//
// On retient le NUMÉRO DE PARTIE et non la date. C'est ce que le tirage veut
// savoir : pas « quand » mais « il y a combien de parties », de façon à servir
// d'abord les questions jamais vues, puis les plus anciennes. Une date
// obligerait en plus à décider ce qu'est « trop vieux », question à laquelle
// personne n'a de bonne réponse.

import { toutesLesQuestions } from './questions.js';

const CLE = 'quizroom.vues';

// Au-delà, on oublie les plus anciennes. La banque plus tous les packs tient
// largement dessous : le plafond n'est là que pour qu'un stockage local ne
// grossisse pas sans fin sur un appareil qui sert dix ans.
const PLAFOND = 5000;

/** Un stockage qui ne casse rien, même en navigation privée. */
function stockageSur(brut) {
  try {
    if (!brut) return null;
    // Safari en navigation privée accepte l'objet et refuse l'écriture : la
    // seule façon de le savoir est d'essayer.
    brut.setItem(`${CLE}.essai`, '1');
    brut.removeItem(`${CLE}.essai`);
    return brut;
  } catch {
    return null;
  }
}

/**
 * L'historique des questions jouées.
 *
 * `stockage` est injecté pour que les tests n'aient pas besoin d'un navigateur :
 * n'importe quel objet avec `getItem` et `setItem` fait l'affaire.
 */
export function creerHistorique(stockage = stockageSur(globalThis.localStorage)) {
  let etat = lire();

  function lire() {
    try {
      const brut = JSON.parse(stockage?.getItem(CLE) ?? 'null');
      if (brut && typeof brut.vues === 'object') {
        return { partie: Number(brut.partie) || 0, vues: { ...brut.vues } };
      }
    } catch {
      // Contenu illisible — on repart à vide plutôt que de casser le lancement
      // d'une partie pour une ligne de stockage corrompue.
    }
    return { partie: 0, vues: {} };
  }

  function ecrire() {
    // On ne garde que les plus récentes quand ça déborde : oublier une question
    // vue il y a cinquante parties n'a aucune conséquence, puisque le tirage la
    // servirait de toute façon avant les autres.
    const ids = Object.keys(etat.vues);
    if (ids.length > PLAFOND) {
      const gardes = ids
        .sort((a, b) => etat.vues[b] - etat.vues[a])
        .slice(0, PLAFOND);
      etat.vues = Object.fromEntries(gardes.map((id) => [id, etat.vues[id]]));
    }
    try {
      stockage?.setItem(CLE, JSON.stringify(etat));
    } catch {
      // Stockage plein ou refusé : la partie se joue quand même, sans mémoire.
    }
  }

  /** Les questions d'un thème, hors fil rouge — comme le pool du tirage. */
  const duTheme = (themeId) => toutesLesQuestions()
    .filter((q) => !q.fil && (!themeId || q.theme === themeId));

  return {
    /** La carte identifiant → numéro de partie, telle que le tirage l'attend. */
    vues() {
      return etat.vues;
    },

    /**
     * Une partie commence. Le compteur avance, et tout ce qui sera marqué
     * ensuite portera ce numéro : c'est ce qui permet de distinguer « vu à la
     * partie précédente » de « vu il y a dix parties ».
     */
    nouvellePartie() {
      etat.partie += 1;
      ecrire();
      return etat.partie;
    },

    /**
     * Une question vient d'être jouée.
     *
     * Marquée à la RÉVÉLATION et non au tirage : une partie qu'on lance pour
     * montrer l'appli et qu'on abandonne à la deuxième manche ne doit pas brûler
     * douze questions que personne n'a vues.
     */
    marquer(id) {
      if (!id || etat.vues[id] === etat.partie) return false;
      etat.vues[id] = etat.partie || 1;
      ecrire();
      return true;
    },

    /** Où l'on en est sur un thème — ou sur toute la banque sans argument. */
    bilan(themeId = null) {
      const questions = duTheme(themeId);
      const vues = questions.filter((q) => etat.vues[q.id] != null).length;
      return {
        vues,
        total: questions.length,
        // Arrondi à l'entier : c'est une jauge de soirée, pas un tableau de bord.
        pourcent: questions.length ? Math.round((vues / questions.length) * 100) : 0,
      };
    },

    /**
     * Ce que le compte sait, ramené ici.
     *
     * Le relais rend l'union des appareils ; on la recopie telle quelle, sans
     * rien perdre de ce qui était local — c'est lui qui a fusionné, et il a vu
     * les deux côtés.
     */
    adopter(vues) {
      if (!vues || typeof vues !== 'object') return etat.vues;
      for (const [id, quand] of Object.entries(vues)) {
        const numero = Number(quand);
        if (Number.isFinite(numero)) etat.vues[id] = Math.max(etat.vues[id] ?? 0, numero);
      }
      // Le compteur de parties doit rester devant l'historique adopté, sinon
      // les questions vues ailleurs passeraient pour plus récentes que celles
      // d'ici et le tirage les repousserait indéfiniment.
      etat.partie = Math.max(etat.partie, ...Object.values(etat.vues), 0);
      ecrire();
      return etat.vues;
    },

    /** Tout oublier. Demandé explicitement : on ne l'appelle jamais tout seul. */
    oublier() {
      etat = { partie: etat.partie, vues: {} };
      ecrire();
    },
  };
}

/** L'historique de cet appareil. Un seul, partagé par l'appli. */
export const historique = creerHistorique();
