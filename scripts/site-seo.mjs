// Ce que le site publie pour être trouvé : une page par thème, le sitemap, et
// les chiffres de la page d'accueil.
//
// Tout est tiré de la banque de questions au moment du build, et c'est le
// point. La page d'accueil annonçait « 409 questions, 19 thèmes » trois mois
// après que la banque en comptait 448 sur 20 : un chiffre écrit à la main est
// faux dès la mise à jour suivante, et personne ne pense à le corriger.
//
// Les pages de thème répondent à ce que les gens cherchent vraiment — « quiz
// Harry Potter », « quiz Disney », « quiz télé-réalité » — et qu'une page
// d'accueil unique ne peut pas viser toute seule. Chacune montre trois vraies
// questions, réponse cachée sous un clic : assez pour donner envie et pour que
// la page ait un contenu propre, pas assez pour éventer le thème.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { QUESTIONS, THEMES } from '../web/quiz/js/questions.js';
import { entierEnLettres } from './nombres.mjs';

export const SITE_URL = 'https://www.quizentreamis.fr';

/**
 * Le visage de chaque thème dans les recherches : son adresse, le nom sous
 * lequel on le cherche, et deux phrases pour le présenter.
 *
 * L'adresse suit la recherche, pas l'identifiant interne : on tape « quiz
 * cuisine », pas « quiz bouffe ». Une fois publiée, une adresse ne change plus
 * — Google aurait à tout réapprendre.
 */
export const PAGES_DE_THEMES = {
  culture: {
    adresse: 'quiz-culture-generale', titre: 'culture générale',
    intro: 'Le thème fourre-tout, et le plus disputé de la soirée : un peu de tout, juste assez difficile pour que chacun ait sa chance.',
  },
  musique: {
    adresse: 'quiz-musique', titre: 'musique',
    intro: 'Des tubes, des artistes, des anecdotes de studio. De quoi départager ceux qui chantent tout et ceux qui ne retiennent que les refrains.',
  },
  cinema: {
    adresse: 'quiz-cinema-series', titre: 'cinéma et séries',
    intro: 'Répliques cultes, acteurs, coulisses de tournage et séries qu’on a toutes vues d’une traite.',
  },
  annees2000: {
    adresse: 'quiz-annees-2000', titre: 'années 2000',
    intro: 'Téléphones à clapet, émissions cultes et tubes de l’été : un retour dans la décennie qui a vu naître tout ce qu’on utilise aujourd’hui.',
  },
  bouffe: {
    adresse: 'quiz-cuisine', titre: 'cuisine et gastronomie',
    intro: 'Plats régionaux, origines des recettes et produits du quotidien. Le thème qui donne faim et qui fait débattre.',
  },
  insolite: {
    adresse: 'quiz-insolite', titre: 'insolite',
    intro: 'Des faits vrais qui ont l’air faux. On y apprend les choses qu’on raconte ensuite pendant des semaines.',
  },
  sport: {
    adresse: 'quiz-sport', titre: 'sport',
    intro: 'Records, grandes compétitions et règles qu’on croit connaître. Pour les sportifs et pour ceux qui regardent depuis le canapé.',
  },
  monde: {
    adresse: 'quiz-geographie', titre: 'géographie',
    intro: 'Capitales, frontières, fleuves et curiosités du globe : un tour du monde sans quitter la table.',
  },
  marques: {
    adresse: 'quiz-marques-pubs', titre: 'marques et pubs',
    intro: 'Slogans, logos et histoires de marques qu’on connaît sans le savoir. Toutes ces années de publicité vont enfin servir.',
  },
  mots: {
    adresse: 'quiz-expressions-francaises', titre: 'mots et expressions',
    intro: 'D’où viennent nos expressions, que veulent vraiment dire certains mots : un quiz pour les amoureux de la langue française.',
  },
  disney: {
    adresse: 'quiz-disney', titre: 'Disney et Pixar',
    intro: 'Les personnages, les objets et les détails des dessins animés qu’on a vus cent fois. Les fans d’enfance comme les parents s’y retrouvent.',
  },
  regions: {
    adresse: 'quiz-regions-de-france', titre: 'régions de France',
    intro: 'Spécialités, villes, patrimoine et accents : la France région par région, avec son lot de chauvinisme assumé.',
  },
  nature: {
    adresse: 'quiz-nature', titre: 'nature et animaux',
    intro: 'Animaux étonnants, plantes et phénomènes naturels. Le thème où l’on découvre que la réalité dépasse souvent la fiction.',
  },
  histoire: {
    adresse: 'quiz-histoire', titre: 'histoire',
    intro: 'Grands événements, personnages et dates qui ont compté. Un quiz d’histoire qui se joue comme une soirée, pas comme un contrôle.',
  },
  fake: {
    adresse: 'quiz-vrai-ou-faux', titre: 'vrai ou faux',
    intro: 'Fake news ou pas ? Des affirmations surprenantes, à démêler avant les autres. Plus difficile qu’il n’y paraît.',
  },
  potter: {
    adresse: 'quiz-harry-potter', titre: 'Harry Potter',
    intro: 'Sortilèges, personnages, Poudlard et ses secrets : un quiz pour les sorciers, et une épreuve pour les Moldus.',
  },
  pokemon: {
    adresse: 'quiz-pokemon', titre: 'Pokémon',
    intro: 'Types, évolutions, jeux et dessin animé : de quoi départager les dresseurs de la première génération et ceux d’aujourd’hui.',
  },
  crimes: {
    adresse: 'quiz-serial-killers', titre: 'serial killers et affaires criminelles',
    intro: 'Les grandes affaires criminelles qui ont marqué l’histoire et les documentaires. Pour les amateurs de true crime.',
  },
  geopolitique: {
    adresse: 'quiz-geopolitique', titre: 'géopolitique',
    intro: 'Pays, institutions, alliances et conflits : un quiz pour ceux qui lisent les pages internationales.',
  },
  telerealite: {
    adresse: 'quiz-tele-realite', titre: 'télé-réalité',
    intro: 'Les émissions, les candidats et les moments cultes de la télé-réalité. Personne ne regarde, et pourtant tout le monde sait.',
  },
};

const echapper = (texte) => String(texte ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const majuscule = (texte) => texte[0].toUpperCase() + texte.slice(1);

/** Les questions du jeu de base — jamais celles des packs, qui sont payantes. */
const questionsDeBase = () => QUESTIONS.filter((q) => !q.pack);

/** Le nombre de questions du jeu de base, et celui de ses thèmes. */
export function chiffres() {
  const base = questionsDeBase();
  const themes = THEMES.filter((t) => base.some((q) => q.theme === t.id));
  return { questions: base.length, themes: themes.length };
}

/**
 * Les trois questions montrées sur la page d'un thème. Toujours les mêmes d'un
 * build à l'autre — une page qui change de contenu à chaque déploiement se fait
 * mal indexer — et prises parmi les plus accessibles : une vitrine doit donner
 * envie, pas décourager.
 */
export function exemplesDuTheme(theme, combien = 3) {
  return questionsDeBase()
    .filter((q) => q.theme === theme && (q.type ?? 'qcm') === 'qcm' && Array.isArray(q.reponses))
    .sort((a, b) => (a.niveau ?? 2) - (b.niveau ?? 2) || a.id.localeCompare(b.id))
    .slice(0, combien);
}

/* --- Le gabarit ------------------------------------------------------------ */

const ENTETE = `<header class="entete">
  <div class="enveloppe">
    <a class="marque" href="/">
      <img src="/jouer/icons/icon-192.png" alt="" width="34" height="34">
      <span>Quiz entre amis</span>
    </a>
    <nav>
      <a class="lien-menu" href="/#comment">Comment ça marche</a>
      <a class="lien-menu" href="/#themes">Les thèmes</a>
      <a class="lien-menu" href="/blind-test/">Blind test</a>
      <a class="bouton bouton-primaire bouton-petit" href="/jouer/">Jouer</a>
    </nav>
  </div>
</header>`;

const PIED = `<footer>
  <div class="enveloppe">
    <span>© Quiz entre amis</span>
    <a href="/jouer/">Jouer</a>
    <a href="/blind-test/">Blind test</a>
    <a href="/assistance">Assistance</a>
    <a href="/confidentialite">Confidentialité</a>
    <a href="/contact">Nous écrire</a>
    <span class="droite">Fait en France, pour les soirées qui s’éternisent.</span>
  </div>
</footer>`;

function pageDuTheme(theme, page, autres) {
  const nombre = questionsDeBase().filter((q) => q.theme === theme.id).length;
  const url = `${SITE_URL}/${page.adresse}/`;
  const titreCourt = `Quiz ${page.titre}`;
  const titre = `${majuscule(titreCourt)} : ${nombre} questions à jouer entre amis`;
  const description = `${page.intro} ${nombre} questions à jouer à plusieurs sur vos téléphones, gratuitement et sans inscription.`;

  const exemples = exemplesDuTheme(theme.id).map((q, rang) => `
      <details class="question">
        <summary>${rang + 1}. ${echapper(q.texte)}</summary>
        <ul class="reponses-exemple">
          ${q.reponses.map((r) => `<li>${echapper(r)}</li>`).join('\n          ')}
        </ul>
        <p><b>Réponse : ${echapper(q.reponses[q.bonne])}.</b> ${echapper(q.note ?? '')}</p>
      </details>`).join('');

  const liens = autres
    .map(([t, p]) => `<li><a href="/${p.adresse}/">${t.emoji} ${echapper(majuscule(p.titre))}</a></li>`)
    .join('\n        ');

  const donnees = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Quiz entre amis', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: majuscule(titreCourt), item: url },
    ],
  };

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0f1116">

<title>${echapper(titre)} | Quiz entre amis</title>
<meta name="description" content="${echapper(description)}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Quiz entre amis">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="/jouer/icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/jouer/icons/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">

<script type="application/ld+json">
${JSON.stringify(donnees, null, 2)}
</script>
</head>

<body>

${ENTETE}

<main>
  <div class="enveloppe">
    <div class="hero">
      <p class="hero-emoji" aria-hidden="true">${theme.emoji}</p>
      <h1>${echapper(majuscule(titreCourt))}</h1>
      <p class="hero-sous">${echapper(page.intro)} ${nombre} questions, à jouer à plusieurs : chaque téléphone devient un pupitre, et l’appli pose les questions à voix haute.</p>
      <div class="hero-actions">
        <a class="bouton bouton-primaire" href="/jouer/?theme=${theme.id}">Jouer ce thème</a>
        <a class="bouton" href="/#comment">Comment ça marche</a>
      </div>
      <p class="hero-note">Gratuit, sans inscription et sans publicité.</p>
    </div>
  </div>

  <section>
    <div class="enveloppe">
      <h2>Trois questions pour s’échauffer</h2>
      <p class="chapo">Un avant-goût du thème. Touchez une question pour voir les propositions, la réponse et son explication.</p>
${exemples}
    </div>
  </section>

  <section>
    <div class="enveloppe">
      <h2>Un ${echapper(`quiz ${page.titre}`)} qui se joue en soirée</h2>
      <div class="grille">
        <article class="carte">
          <span class="emoji" aria-hidden="true">📱</span>
          <h3>Chacun sur son téléphone</h3>
          <p>Une personne crée la partie, les autres tapent un code à quatre lettres. Jusqu’à seize joueurs, sans rien installer.</p>
        </article>
        <article class="carte">
          <span class="emoji" aria-hidden="true">🔊</span>
          <h3>L’appli anime</h3>
          <p>Elle lit les questions à voix haute, compte les points à la seconde près et explique chaque réponse.</p>
        </article>
        <article class="carte">
          <span class="emoji" aria-hidden="true">🎲</span>
          <h3>Des manches qui changent</h3>
          <p>QCM, estimations, classements, rafales de vrai ou faux et jokers pour renverser la partie.</p>
        </article>
      </div>
    </div>
  </section>

  <section>
    <div class="enveloppe">
      <h2>Les autres thèmes</h2>
      <p class="chapo">Mélangez-les dans la même partie, ou consacrez une soirée entière à un seul.</p>
      <ul class="themes">
        ${liens}
      </ul>
    </div>
  </section>

  <div class="enveloppe">
    <div class="rappel">
      <h2>On joue&nbsp;?</h2>
      <p style="color:var(--muted);max-width:46ch;margin:0 auto 22px">La partie s’ouvre réglée sur ce thème. Il ne reste qu’à faire tourner le code autour de la table.</p>
      <a class="bouton bouton-primaire" href="/jouer/?theme=${theme.id}">Lancer un ${echapper(`quiz ${page.titre}`)}</a>
    </div>
  </div>
</main>

${PIED}

</body>
</html>
`;
}

/* --- Ce que le build appelle ------------------------------------------------ */

/** Les thèmes qui ont une page, dans l'ordre du jeu. */
export function themesPublies() {
  const base = questionsDeBase();
  return THEMES
    .filter((t) => PAGES_DE_THEMES[t.id] && base.some((q) => q.theme === t.id))
    .map((t) => [t, PAGES_DE_THEMES[t.id]]);
}

/** Les adresses du site, pour le sitemap. */
export function adressesDuSite() {
  return [
    '/', '/jouer/', '/blind-test/',
    ...themesPublies().map(([, p]) => `/${p.adresse}/`),
    '/assistance', '/contact', '/confidentialite',
  ];
}

export async function publierLeReferencement(sortie) {
  const publies = themesPublies();

  for (const [theme, page] of publies) {
    const autres = publies.filter(([t]) => t.id !== theme.id);
    await mkdir(join(sortie, page.adresse), { recursive: true });
    await writeFile(join(sortie, page.adresse, 'index.html'), pageDuTheme(theme, page, autres), 'utf8');
  }

  // La page d'accueil : ses chiffres, et la liste des thèmes devenue des liens.
  // Les valeurs écrites dans le fichier source ne servent qu'en développement.
  const { questions, themes } = chiffres();
  const valeurs = {
    questions: String(questions),
    'questions-lettres': entierEnLettres(questions),
    themes: String(themes),
    'themes-lettres': entierEnLettres(themes),
  };
  const remplir = (html) => html
    .replace(/(<([a-z]+)[^>]*\bdata-compte="([a-z-]+)"[^>]*>)[^<]*(<\/\2>)/g,
      (tout, ouverture, _balise, cle, fermeture) => (cle in valeurs ? `${ouverture}${valeurs[cle]}${fermeture}` : tout))
    // Les textes des données structurées et des balises meta ne peuvent pas
    // porter de balise : on y remplace des jetons simples.
    .replaceAll('{{questions}}', valeurs.questions).replaceAll('{{themes}}', valeurs.themes);

  // Les autres pages qui citent les chiffres.
  for (const fichier of ['assistance.html', join('blind-test', 'index.html')]) {
    const chemin = join(sortie, fichier);
    await writeFile(chemin, remplir(await readFile(chemin, 'utf8')), 'utf8');
  }

  const accueil = join(sortie, 'index.html');
  let html = remplir(await readFile(accueil, 'utf8'));
  html = html.replace(/(<ul class="themes" data-liste="themes">)[\s\S]*?(<\/ul>)/,
    (_, ouverture, fermeture) => `${ouverture}\n        ${publies
      .map(([t, p]) => `<li><a href="/${p.adresse}/">${t.emoji} ${echapper(t.nom)}</a></li>`)
      .join('\n        ')}\n      ${fermeture}`);
  await writeFile(accueil, html, 'utf8');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adressesDuSite().map((a) => `  <url><loc>${SITE_URL}${a}</loc></url>`).join('\n')}
</urlset>
`;
  await writeFile(join(sortie, 'sitemap.xml'), sitemap, 'utf8');

  return { pages: publies.length, questions, themes };
}
