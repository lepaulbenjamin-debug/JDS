// L'écran de saisie, une vue par type de manche.
//
// Séparé de `manches/`, qui reste pur : ces modules-là sont importés par le
// moteur et tournent dans les tests sans navigateur. Ici on touche au DOM, et
// seulement au DOM.
//
// Chaque vue expose deux fonctions :
//
//   construire(manche, ctx)   fabrique les éléments, une fois par manche
//   peindre(vue, etat)        remet à jour les états — choisi, verrouillé,
//                             révélé — sans reconstruire quoi que ce soit,
//                             parce qu'un bouton reconstruit sous le doigt
//                             rate le tap
//
// `ctx.repondre(valeur)` envoie la réponse. `etat` porte `{ ouvert, revele,
// monChoix, manche }`.

import { el, clear } from '../../js/ui.js';

/* --- QCM ------------------------------------------------------------------ */

const qcm = {
  construire(manche, ctx) {
    const boutons = manche.reponses.map((texte, index) => el('button', {
      class: 'reponse',
      type: 'button',
      onclick: () => ctx.repondre(index),
    }, [
      el('span', { class: 'reponse-lettre', text: 'ABCD'[index] }),
      el('span', { class: 'reponse-texte', text: texte }),
      el('span', { class: 'reponse-marque' }),
    ]));
    return { racine: el('div', { class: 'reponses' }, boutons), boutons };
  },

  peindre(vue, { manche, monChoix, ouvert, revele, masque = [] }) {
    vue.boutons.forEach((bouton, index) => {
      const retiree = masque.includes(index);
      bouton.disabled = !ouvert || retiree;
      bouton.classList.toggle('est-retiree', retiree);
      bouton.classList.toggle('est-choisi', monChoix === index);
      const juste = revele && index === manche.bonne;
      const faux = revele && monChoix === index && index !== manche.bonne;
      bouton.classList.toggle('est-juste', juste);
      bouton.classList.toggle('est-faux', faux);
      bouton.querySelector('.reponse-marque').textContent = juste ? '✔' : faux ? '✘' : '';
    });
  },
};

/* --- Estimation ----------------------------------------------------------- */

const estimation = {
  construire(manche, ctx) {
    const champ = el('input', {
      class: 'estimation-champ',
      type: 'text',
      // `numeric` plutôt que `number` : le pavé numérique s'ouvre, mais sans
      // les petites flèches ni le défilement accidentel à la molette.
      inputmode: 'numeric',
      autocomplete: 'off',
      placeholder: '?',
      enterkeyhint: 'send',
      'aria-label': 'Ton estimation',
    });
    const valider = el('button', {
      class: 'btn btn-primary btn-block',
      type: 'button',
      onclick: () => {
        const valeur = Number(champ.value.replace(/[^\d.,-]/g, '').replace(',', '.'));
        if (Number.isFinite(valeur)) ctx.repondre(valeur);
      },
    }, 'Valider');

    champ.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') valider.click();
    });

    const resultat = el('div', { class: 'estimation-resultat' });
    return {
      racine: el('div', { class: 'estimation' }, [
        el('div', { class: 'estimation-ligne' }, [
          champ,
          manche.unite ? el('span', { class: 'estimation-unite', text: manche.unite }) : null,
        ]),
        valider,
        resultat,
      ]),
      champ,
      valider,
      resultat,
    };
  },

  peindre(vue, { manche, monChoix, ouvert, revele }) {
    vue.champ.disabled = !ouvert;
    vue.valider.disabled = !ouvert;
    vue.valider.hidden = revele;
    if (monChoix != null) vue.champ.value = String(monChoix);

    clear(vue.resultat);
    if (!revele) return;
    vue.resultat.append(el('p', { class: 'estimation-solution' }, [
      el('span', { class: 'muted small', text: 'La réponse exacte' }),
      el('strong', { text: `${manche.valeur}${manche.unite ? ` ${manche.unite}` : ''}` }),
    ]));
    if (monChoix != null) {
      const ecart = monChoix - manche.valeur;
      vue.resultat.append(el('p', {
        class: 'muted small',
        text: ecart === 0
          ? 'Pile dessus.'
          : `Tu étais à ${Math.abs(ecart)} ${ecart > 0 ? 'au-dessus' : 'en dessous'}.`,
      }));
    }
  },
};

/* --- Dans l'ordre --------------------------------------------------------- */

const ordre = {
  construire(manche, ctx) {
    let choix = [];

    const boutons = manche.elements.map((texte, index) => el('button', {
      class: 'element',
      type: 'button',
      onclick: () => {
        if (choix.includes(index)) return;
        choix = [...choix, index];
        rafraichir();
        // Quatre taps et c'est parti : demander une validation en plus alors
        // que le classement est complet ne ferait que coûter une seconde.
        if (choix.length === manche.elements.length) ctx.repondre(choix);
      },
    }, [
      el('span', { class: 'element-rang' }),
      el('span', { class: 'element-texte', text: texte }),
    ]));

    const recommencer = el('button', {
      class: 'btn btn-ghost btn-block',
      type: 'button',
      onclick: () => { choix = []; rafraichir(); },
    }, '↺ Recommencer');

    function rafraichir() {
      boutons.forEach((bouton, index) => {
        const rang = choix.indexOf(index);
        bouton.classList.toggle('est-place', rang >= 0);
        bouton.querySelector('.element-rang').textContent = rang >= 0 ? String(rang + 1) : '';
      });
      recommencer.hidden = choix.length === 0 || choix.length === manche.elements.length;
    }
    rafraichir();

    return {
      racine: el('div', { class: 'ordre' }, [
        el('div', { class: 'elements' }, boutons),
        recommencer,
      ]),
      boutons,
      recommencer,
      lireChoix: () => choix,
    };
  },

  peindre(vue, { manche, ouvert, revele }) {
    for (const bouton of vue.boutons) bouton.disabled = !ouvert;
    if (!revele) return;

    vue.recommencer.hidden = true;
    const mien = vue.lireChoix();
    vue.boutons.forEach((bouton, index) => {
      const attendu = manche.solution.indexOf(index);      // sa vraie position
      const donne = mien.indexOf(index);
      bouton.classList.toggle('est-juste', donne === attendu);
      bouton.classList.toggle('est-faux', donne >= 0 && donne !== attendu);
      bouton.querySelector('.element-rang').textContent = String(attendu + 1);
    });
  },
};

/* --- Rafale --------------------------------------------------------------- */

const rafale = {
  construire(manche, ctx) {
    const choix = new Array(manche.affirmations.length).fill(null);

    const lignes = manche.affirmations.map((texte, index) => {
      const poser = (valeur) => {
        choix[index] = valeur;
        rafraichir();
        if (choix.every((v) => v !== null)) ctx.repondre(choix.slice());
      };
      const vrai = el('button', { class: 'vf vf-vrai', type: 'button', onclick: () => poser(true) }, 'Vrai');
      const faux = el('button', { class: 'vf vf-faux', type: 'button', onclick: () => poser(false) }, 'Faux');
      return {
        vrai,
        faux,
        racine: el('div', { class: 'affirmation' }, [
          el('p', { class: 'affirmation-texte', text: texte }),
          el('div', { class: 'vf-row' }, [vrai, faux]),
        ]),
      };
    });

    function rafraichir() {
      lignes.forEach((ligne, index) => {
        ligne.vrai.classList.toggle('est-choisi', choix[index] === true);
        ligne.faux.classList.toggle('est-choisi', choix[index] === false);
      });
    }

    return {
      racine: el('div', { class: 'rafale' }, lignes.map((l) => l.racine)),
      lignes,
      lireChoix: () => choix.slice(),
      // Le chrono peut expirer sur un classement incomplet : plutôt que de tout
      // perdre, on envoie ce qui a été coché.
      envoyerPartiel: () => ctx.repondre(choix.slice()),
    };
  },

  peindre(vue, { manche, ouvert, revele }) {
    for (const ligne of vue.lignes) {
      ligne.vrai.disabled = !ouvert;
      ligne.faux.disabled = !ouvert;
    }
    if (!revele) return;

    const mien = vue.lireChoix();
    vue.lignes.forEach((ligne, index) => {
      const attendu = manche.solution[index];
      const bouton = attendu ? ligne.vrai : ligne.faux;
      bouton.classList.add('est-juste');
      if (mien[index] != null && mien[index] !== attendu) {
        (mien[index] ? ligne.vrai : ligne.faux).classList.add('est-faux');
      }
    });
  },
};

/* --- Le mix --------------------------------------------------------------- */

const mix = {
  construire(manche, ctx) {
    const champ = el('input', {
      class: 'mix-champ',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'none',
      spellcheck: 'false',
      placeholder: 'Un titre…',
      enterkeyhint: 'send',
      'aria-label': 'Ta proposition',
    });
    const valider = el('button', {
      class: 'btn btn-primary btn-block',
      type: 'button',
      onclick: () => {
        const propose = champ.value.trim();
        if (propose) ctx.repondre(propose);
      },
    }, 'Proposer');

    champ.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') valider.click();
    });

    const resultat = el('div', { class: 'mix-resultat' });
    return {
      racine: el('div', { class: 'mix' }, [champ, valider, resultat]),
      champ,
      valider,
      resultat,
    };
  },

  peindre(vue, { manche, monChoix, ouvert, revele }) {
    vue.champ.disabled = !ouvert;
    vue.valider.disabled = !ouvert;
    vue.valider.hidden = revele;
    if (monChoix != null) vue.champ.value = String(monChoix);

    clear(vue.resultat);
    if (!revele) return;

    // Le palmarès : ce que l'appli acceptait. C'est là que la table découvre
    // les quinze titres auxquels personne n'a pensé — et le seul endroit où
    // l'on voit que sa proposition n'était pas si bête.
    vue.resultat.append(el('p', { class: 'muted small', text: `Les titres acceptés (${manche.acceptees.length})` }));
    vue.resultat.append(el('ul', { class: 'mix-liste' }, manche.acceptees.map((t) => el('li', {}, [
      el('span', { class: 'mix-titre', text: t.titre }),
      t.artiste ? el('span', { class: 'mix-artiste', text: ` — ${t.artiste}` }) : null,
    ]))));
  },
};


/* --- Tu te mets combien ? -------------------------------------------------- */

const ttmc = {
  // Les boutons ne peuvent pas être fabriqués ici : on ne sait pas encore à
  // quel niveau le joueur va se mettre. On prépare la coquille, et la première
  // peinture qui connaît le niveau la remplit — une seule fois, puisque le
  // niveau est verrouillé dès que la question s'ouvre.
  construire(manche, ctx) {
    const enonce = el('h3', { class: 'ttmc-enonce' });
    const boutons = el('div', { class: 'reponses' });
    const correction = el('div', { class: 'ttmc-correction' });
    return {
      racine: el('div', { class: 'ttmc' }, [enonce, boutons, correction]),
      enonce,
      boutons,
      correction,
      ctx,
      rendus: [],
      niveauRendu: null,
    };
  },

  peindre(vue, { manche, monChoix, ouvert, revele, niveau }) {
    const ligne = manche.niveaux?.[niveau - 1];
    if (!ligne) return;

    if (vue.niveauRendu !== niveau) {
      vue.niveauRendu = niveau;
      vue.enonce.textContent = ligne.texte;
      clear(vue.boutons);
      vue.rendus = ligne.reponses.map((texte, index) => el('button', {
        class: 'reponse',
        type: 'button',
        onclick: () => vue.ctx.repondre(index),
      }, [
        el('span', { class: 'reponse-lettre', text: 'ABCD'[index] }),
        el('span', { class: 'reponse-texte', text: texte }),
        el('span', { class: 'reponse-marque' }),
      ]));
      for (const bouton of vue.rendus) vue.boutons.append(bouton);
    }

    vue.rendus.forEach((bouton, index) => {
      bouton.disabled = !ouvert;
      bouton.classList.toggle('est-choisi', monChoix === index);
      bouton.classList.toggle('est-juste', revele && ligne.bonne === index);
      bouton.classList.toggle(
        'est-faux',
        revele && monChoix === index && ligne.bonne !== index,
      );
    });

    clear(vue.correction);
    // L'explication est propre à la question qu'on a tirée : l'animateur ne
    // peut pas la lire, dix corrections différentes tournent en même temps.
    if (revele && ligne.note) {
      vue.correction.append(el('p', { class: 'note', text: ligne.note }));
    }
  },
};

const VUES = { qcm, estimation, ordre, rafale, mix, ttmc };

export function vueDe(type) {
  return VUES[type] ?? qcm;
}
