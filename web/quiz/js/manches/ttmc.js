// « Tu te mets combien ? » : chacun choisit sa difficulté avant de voir sa
// question.
//
// Une carte porte dix questions sur un même thème, de la plus facile à la plus
// coriace. Avant l'ouverture, chacun annonce son niveau — c'est la fenêtre qui
// sert déjà aux jokers — puis chaque téléphone affiche LA question du niveau
// que son porteur a choisi. Dix joueurs peuvent donc répondre à dix questions
// différentes dans la même manche.
//
// C'est le seul type où le barème dépend de ce que le joueur a annoncé et non
// de ce qu'il a fait : se mettre à 10 et trouver rapporte dix fois se mettre à
// 1 et trouver. Tout le jeu est là — se connaître, et oser.
//
// Deux conséquences dont il faut avoir conscience :
//
//   - l'animateur ne peut pas lire la question à voix haute, puisqu'il y en a
//     dix en cours en même temps. Il annonce le thème, se tait pendant la
//     manche, et commente à la révélation. Les énoncés restent sur les écrans ;
//   - le chrono est commun alors que les questions ne le sont pas. Celui qui
//     s'est mis à 10 a le même temps que celui qui s'est mis à 1, pour une
//     question bien plus dure. C'est une part du risque, pas un oubli.

export const NIVEAU_MIN = 1;
export const NIVEAU_MAX = 10;

// Qui n'annonce rien pendant la fenêtre joue le niveau le plus facile. Le
// laisser sur la touche pour une hésitation serait la pire des punitions dans
// un jeu où personne n'est censé rester spectateur.
export const NIVEAU_DEFAUT = 1;

export const borner = (niveau) => Math.min(
  NIVEAU_MAX,
  Math.max(NIVEAU_MIN, Math.round(Number(niveau) || NIVEAU_DEFAUT)),
);

export default {
  id: 'ttmc',
  nom: 'Tu te mets combien ?',
  emoji: '🎯',
  consigne: 'Annonce ton niveau, puis réponds à TA question.',
  // Une carte mélange du très facile et du très pointu : il faut le temps de
  // lire un énoncé qu'on n'a pas choisi de trouver simple.
  facteurDuree: 1.3,
  // La rapidité compte, mais peu : c'est le pari qui doit décider de la manche.
  // À plein poids, se mettre à 1 et dégainer battrait se mettre à 8 et réfléchir,
  // et plus personne ne prendrait le moindre risque.
  poidsVitesse: 0.3,

  // La fenêtre d'avant-question, plus longue ici que partout ailleurs.
  //
  // Six secondes suffisent à sortir un joker : la décision est binaire et les
  // boutons sont gros. Sur cette manche il faut en plus lire « tu te mets
  // combien ? », arbitrer, et viser un cran sur dix. La plupart des gens
  // n'avaient pas fini d'y penser que l'énoncé s'affichait, et repartaient au
  // niveau 1 par défaut — c'est-à-dire au pari le plus prudent, sur le seul
  // type de manche qui existe pour qu'on ose.
  avantQuestionMs: 12000,

  // Déclare au moteur que ce type se joue avec une annonce préalable. C'est ce
  // qui ouvre le canal « niveau » côté régie, sans que le moteur ait à
  // connaître ce type en particulier.
  paris: { min: NIVEAU_MIN, max: NIVEAU_MAX, defaut: NIVEAU_DEFAUT },

  preparer(entree, melanger) {
    return {
      id: entree.id,
      type: 'ttmc',
      theme: entree.theme,
      texte: entree.texte,
      note: entree.note,
      niveaux: entree.niveaux.map((n) => {
        const ordre = melanger(n.reponses.map((_, i) => i));
        return {
          texte: n.texte,
          note: n.note,
          reponses: ordre.map((i) => n.reponses[i]),
          bonne: ordre.indexOf(n.bonne),
        };
      }),
    };
  },

  publier(manche, revele) {
    // Les dix énoncés partent dès l'ouverture : un pupitre qui n'a pas le pack
    // d'où vient la carte ne pourrait pas afficher sa question autrement. Les
    // solutions, elles, attendent la révélation.
    return {
      niveaux: manche.niveaux.map((n) => ({
        texte: n.texte,
        reponses: n.reponses,
        ...(revele ? { bonne: n.bonne, note: n.note } : {}),
      })),
    };
  },

  lire(brut) {
    return Number.isInteger(brut) && brut >= 0 && brut < 4 ? brut : null;
  },

  noter(manche, reponses) {
    const notes = {};
    for (const [id, r] of Object.entries(reponses)) {
      const niveau = borner(r.niveau ?? NIVEAU_DEFAUT);
      const correct = r.valeur === manche.niveaux[niveau - 1].bonne;
      notes[id] = {
        correct,
        // Le cœur du jeu : on marque ce qu'on a annoncé, et rien si on rate.
        fraction: correct ? niveau / NIVEAU_MAX : 0,
        niveau,
      };
    }
    return notes;
  },

  /**
   * Dix questions, dix solutions : « la bonne réponse était » ne veut rien dire
   * ici. L'animateur commente le tableau, chaque écran montre sa propre
   * correction.
   */
  cleCommentaire(notes) {
    if (!notes.some((n) => n.correct)) return 'ttmcPersonne';
    // Quelqu'un a-t-il tenté le haut du panier et réussi ? Ça mérite sa phrase.
    return notes.some((n) => n.correct && n.niveau >= 8) ? 'ttmcGrosPari' : 'ttmcTrouve';
  },

  /**
   * Celui que la réplique nomme : le plus haut pari tenu.
   *
   * Sans ça, l'animateur félicitait pour un « gros pari » le premier joueur
   * correct de la liste — souvent celui qui s'était mis à 2.
   */
  heros(entrees) {
    const tenus = entrees.filter(([, r]) => r.correct);
    if (!tenus.length) return null;
    return tenus.sort((a, b) => (b[1].niveau ?? 0) - (a[1].niveau ?? 0))[0][0];
  },

  solutionTexte() {
    // Rien à énoncer : la correction est propre à chaque pupitre.
    return '';
  },
};
