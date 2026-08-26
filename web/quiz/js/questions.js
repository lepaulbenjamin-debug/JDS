// Banque de questions, embarquée dans la PWA.
//
// Elle est en dur, et c'est un choix : une soirée ne doit pas dépendre du Wi-Fi
// de la maison, et surtout une mauvaise réponse annoncée par l'animateur gâche
// la partie sans appel. Les questions générées par un modèle passent donc par
// `scripts/generate-questions.mjs`, qui écrit un brouillon à relire avant de
// l'ajouter ici — jamais directement dans le jeu.
//
// Une question tient en cinq champs : le thème, l'énoncé, quatre réponses, la
// bonne, et la petite phrase que l'animateur lit à la révélation. Cette
// dernière n'est pas décorative : c'est ce qui transforme « tu as faux » en
// « ah oui, tiens », et c'est elle qui fait durer une soirée.

export const THEMES = [
  { id: 'culture', nom: 'Culture générale', emoji: '🧠' },
  { id: 'musique', nom: 'Musique', emoji: '🎧' },
  { id: 'cinema', nom: 'Cinéma & séries', emoji: '🍿' },
  { id: 'annees2000', nom: 'Années 2000', emoji: '📼' },
  { id: 'bouffe', nom: 'Bouffe', emoji: '🍽️' },
  { id: 'insolite', nom: 'Insolite', emoji: '🤯' },
];

export const QUESTIONS = [
  /* --- Culture générale -------------------------------------------------- */
  {
    id: 'cul-01', theme: 'culture',
    texte: 'Quelle est la capitale de l’Australie ?',
    reponses: ['Canberra', 'Sydney', 'Melbourne', 'Perth'],
    bonne: 0,
    note: 'Sydney et Melbourne se disputaient le titre : Canberra a été bâtie entre les deux pour les départager.',
  },
  {
    id: 'cul-02', theme: 'culture',
    texte: 'Quel élément chimique porte le symbole « Fe » ?',
    reponses: ['Le fer', 'Le fluor', 'Le francium', 'Le phosphore'],
    bonne: 0,
    note: 'Du latin ferrum. Le fluor, lui, c’est F tout court.',
  },
  {
    id: 'cul-03', theme: 'culture',
    texte: 'Qui a peint « La Nuit étoilée » ?',
    reponses: ['Van Gogh', 'Monet', 'Cézanne', 'Gauguin'],
    bonne: 0,
    note: 'Peinte en 1889, depuis la fenêtre de sa chambre à l’asile de Saint-Rémy-de-Provence.',
  },
  {
    id: 'cul-04', theme: 'culture',
    texte: 'Combien de joueurs une équipe de volley aligne-t-elle sur le terrain ?',
    reponses: ['6', '5', '7', '11'],
    bonne: 0,
    note: 'Six, dont le libéro, ce joueur en maillot différent qui n’a pas le droit d’attaquer.',
  },
  {
    id: 'cul-05', theme: 'culture',
    texte: 'Quelle planète est la plus proche du Soleil ?',
    reponses: ['Mercure', 'Vénus', 'Mars', 'La Terre'],
    bonne: 0,
    note: 'Mercure. Ce n’est pourtant pas la plus chaude : Vénus lui vole la place grâce à son effet de serre.',
  },
  {
    id: 'cul-06', theme: 'culture',
    texte: 'En quelle année le mur de Berlin est-il tombé ?',
    reponses: ['1989', '1987', '1991', '1985'],
    bonne: 0,
    note: 'Dans la nuit du 9 novembre 1989, après une conférence de presse mal préparée.',
  },
  {
    id: 'cul-07', theme: 'culture',
    texte: 'Quel pays compte le plus de fuseaux horaires ?',
    reponses: ['La France', 'La Russie', 'Les États-Unis', 'La Chine'],
    bonne: 0,
    note: 'La France, avec douze fuseaux — grâce aux territoires d’outre-mer. La Russie n’en a que onze.',
  },
  {
    id: 'cul-08', theme: 'culture',
    texte: 'Quel est le plus long fleuve de France ?',
    reponses: ['La Loire', 'La Seine', 'Le Rhône', 'La Garonne'],
    bonne: 0,
    note: 'La Loire, un peu plus de mille kilomètres, du Massif central à l’Atlantique.',
  },
  {
    id: 'cul-09', theme: 'culture',
    texte: 'D’où vient le nom « Bluetooth » ?',
    reponses: ['Du surnom d’un roi danois', 'D’un ingénieur suédois', 'D’une marque de dentifrice', 'D’un code militaire'],
    bonne: 0,
    note: 'Harald « à la dent bleue », qui avait unifié le Danemark — comme la norme devait unifier les appareils.',
  },
  {
    id: 'cul-10', theme: 'culture',
    texte: 'Combien de touches compte un piano standard ?',
    reponses: ['88', '76', '61', '96'],
    bonne: 0,
    note: 'Quatre-vingt-huit : cinquante-deux blanches et trente-six noires.',
  },

  /* --- Musique ----------------------------------------------------------- */
  {
    id: 'mus-01', theme: 'musique',
    texte: 'Quel groupe a sorti l’album « The Dark Side of the Moon » ?',
    reponses: ['Pink Floyd', 'Led Zeppelin', 'The Doors', 'Genesis'],
    bonne: 0,
    note: '1973. Il est resté au classement américain pendant plus de quinze ans.',
  },
  {
    id: 'mus-02', theme: 'musique',
    texte: 'Quel est le vrai prénom de Stromae ?',
    reponses: ['Paul', 'Pierre', 'Luc', 'Marc'],
    bonne: 0,
    note: 'Paul Van Haver. « Stromae », c’est « maestro » en verlan.',
  },
  {
    id: 'mus-03', theme: 'musique',
    texte: 'Qui a écrit et chanté « Ne me quitte pas » ?',
    reponses: ['Jacques Brel', 'Charles Aznavour', 'Léo Ferré', 'Serge Gainsbourg'],
    bonne: 0,
    note: 'Brel, en 1959. Il disait lui-même que ce n’était pas une chanson d’amour mais « un hymne à la lâcheté ».',
  },
  {
    id: 'mus-04', theme: 'musique',
    texte: 'Quel groupe suédois a remporté l’Eurovision 1974 avec « Waterloo » ?',
    reponses: ['ABBA', 'Roxette', 'Europe', 'Ace of Base'],
    bonne: 0,
    note: 'ABBA. Quatre Suédois qui chantent une défaite française en anglais, et gagnent.',
  },
  {
    id: 'mus-05', theme: 'musique',
    texte: 'Comment s’intitule le premier album d’Angèle ?',
    reponses: ['Brol', 'Nonante-Cinq', 'Balance ton quoi', 'Bruxelles je t’aime'],
    bonne: 0,
    note: '« Brol », mot belge pour désigner le bazar, le bordel ambiant.',
  },
  {
    id: 'mus-06', theme: 'musique',
    texte: 'Quel groupe a enregistré « Bohemian Rhapsody » ?',
    reponses: ['Queen', 'The Who', 'Deep Purple', 'The Kinks'],
    bonne: 0,
    note: 'Queen, 1975. Six minutes, aucun refrain, et la maison de disques qui suppliait de couper.',
  },
  {
    id: 'mus-07', theme: 'musique',
    texte: 'Quel album Daft Punk a-t-il sorti en 2013 ?',
    reponses: ['Random Access Memories', 'Discovery', 'Homework', 'Human After All'],
    bonne: 0,
    note: 'Celui de « Get Lucky ». Enregistré avec de vrais musiciens de studio, à contre-courant de tout le reste.',
  },
  {
    id: 'mus-08', theme: 'musique',
    texte: 'Qui interprète « Formidable » ?',
    reponses: ['Stromae', 'Christine and the Queens', 'Vianney', 'Julien Doré'],
    bonne: 0,
    note: '2013. Le clip a été tourné en caméra cachée à Bruxelles : les passants le croyaient vraiment ivre.',
  },

  /* --- Cinéma & séries --------------------------------------------------- */
  {
    id: 'cin-01', theme: 'cinema',
    texte: 'Qui a réalisé « Pulp Fiction » ?',
    reponses: ['Quentin Tarantino', 'Martin Scorsese', 'Guy Ritchie', 'David Fincher'],
    bonne: 0,
    note: '1994. Palme d’or à Cannes, à la surprise générale et sous les sifflets d’une partie de la salle.',
  },
  {
    id: 'cin-02', theme: 'cinema',
    texte: 'Dans « Le Roi Lion », comment s’appelle le frère de Mufasa ?',
    reponses: ['Scar', 'Simba', 'Rafiki', 'Zazu'],
    bonne: 0,
    note: 'Scar — « la cicatrice ». Personne dans ce film ne s’est demandé pourquoi son frère s’appelait comme ça.',
  },
  {
    id: 'cin-03', theme: 'cinema',
    texte: 'Sur quel continent imaginaire se déroule « Game of Thrones » ?',
    reponses: ['Westeros', 'Essos', 'Valyria', 'Dorne'],
    bonne: 0,
    note: 'Westeros. Essos est le continent d’en face, Dorne une région du sud de Westeros.',
  },
  {
    id: 'cin-04', theme: 'cinema',
    texte: 'Quel acteur incarne Jack dans « Titanic » ?',
    reponses: ['Leonardo DiCaprio', 'Brad Pitt', 'Matt Damon', 'Johnny Depp'],
    bonne: 0,
    note: '1997. Il a fallu attendre 2016 pour qu’il décroche enfin son Oscar, et pas pour ce film.',
  },
  {
    id: 'cin-05', theme: 'cinema',
    texte: 'Quel film français a fait le plus d’entrées en France ?',
    reponses: ['Bienvenue chez les Ch’tis', 'Intouchables', 'Astérix : Mission Cléopâtre', 'La Grande Vadrouille'],
    bonne: 0,
    note: 'Plus de vingt millions d’entrées en 2008. « La Grande Vadrouille » a tenu le record pendant quarante ans.',
  },
  {
    id: 'cin-06', theme: 'cinema',
    texte: 'Qui joue Amélie Poulain ?',
    reponses: ['Audrey Tautou', 'Marion Cotillard', 'Ludivine Sagnier', 'Virginie Ledoyen'],
    bonne: 0,
    note: 'Le rôle avait d’abord été écrit pour Emily Watson, qui a refusé — et qui ne parlait pas français.',
  },
  {
    id: 'cin-07', theme: 'cinema',
    texte: 'Dans « Breaking Bad », quel pseudonyme se donne Walter White ?',
    reponses: ['Heisenberg', 'Schrödinger', 'Bohr', 'Faraday'],
    bonne: 0,
    note: 'Heisenberg, du physicien du principe d’incertitude. Le chapeau fait le reste.',
  },
  {
    id: 'cin-08', theme: 'cinema',
    texte: 'Quel studio a produit « Le Voyage de Chihiro » ?',
    reponses: ['Ghibli', 'Toei Animation', 'Madhouse', 'Pierrot'],
    bonne: 0,
    note: 'Ghibli. Premier film non anglophone à décrocher l’Oscar du meilleur film d’animation.',
  },
  {
    id: 'cin-09', theme: 'cinema',
    texte: 'Combien de saisons compte la série « Friends » ?',
    reponses: ['10', '8', '12', '9'],
    bonne: 0,
    note: 'Dix saisons, de 1994 à 2004. Et un canapé jamais libre au Central Perk.',
  },
  {
    id: 'cin-10', theme: 'cinema',
    texte: 'Qui incarne Hubert Bonisseur de La Bath dans « OSS 117 » ?',
    reponses: ['Jean Dujardin', 'Gad Elmaleh', 'Kad Merad', 'Guillaume Canet'],
    bonne: 0,
    note: 'Jean Dujardin, sous la direction de Michel Hazanavicius — le même duo que pour « The Artist ».',
  },

  /* --- Années 2000 ------------------------------------------------------- */
  {
    id: 'an2-01', theme: 'annees2000',
    texte: 'En quelle année Facebook a-t-il été lancé ?',
    reponses: ['2004', '2002', '2006', '2008'],
    bonne: 0,
    note: 'Février 2004, réservé au départ aux étudiants de Harvard.',
  },
  {
    id: 'an2-02', theme: 'annees2000',
    texte: 'En quelle année le premier iPhone est-il sorti ?',
    reponses: ['2007', '2005', '2009', '2010'],
    bonne: 0,
    note: '2007. Il ne savait ni copier-coller, ni filmer, ni installer d’applications.',
  },
  {
    id: 'an2-03', theme: 'annees2000',
    texte: 'En quelle année « Loft Story » a-t-il été diffusé en France ?',
    reponses: ['2001', '2003', '1999', '2005'],
    bonne: 0,
    note: '2001. La télé-réalité française commence là, avec une piscine et un poulailler.',
  },
  {
    id: 'an2-04', theme: 'annees2000',
    texte: 'Quelle console portable Nintendo est sortie en 2004 ?',
    reponses: ['La DS', 'La Game Boy Advance', 'La 3DS', 'La Switch'],
    bonne: 0,
    note: 'La DS, pour « double screen ». Personne n’y croyait face à la PSP.',
  },
  {
    id: 'an2-05', theme: 'annees2000',
    texte: 'Qui a gagné la première Star Academy en France ?',
    reponses: ['Jenifer', 'Nolwenn Leroy', 'Élodie Frégé', 'Magalie Vaé'],
    bonne: 0,
    note: 'Jenifer, en janvier 2002. Nolwenn Leroy gagne la saison suivante.',
  },
  {
    id: 'an2-06', theme: 'annees2000',
    texte: 'Quel groupe chantait « Dragostea din tei » ?',
    reponses: ['O-Zone', 'Las Ketchup', 'Crazy Frog', 'Eiffel 65'],
    bonne: 0,
    note: 'Un trio moldave, en 2004. Tout le monde l’a chantée, personne n’en connaît les paroles.',
  },
  {
    id: 'an2-07', theme: 'annees2000',
    texte: 'Sur MSN Messenger, comment faisait-on trembler la fenêtre d’un contact ?',
    reponses: ['Un wizz', 'Un poke', 'Un buzz-off', 'Un shake'],
    bonne: 0,
    note: 'Le wizz. Trois d’affilée, et l’amitié était terminée.',
  },
  {
    id: 'an2-08', theme: 'annees2000',
    texte: 'Quelle console Sony est sortie en 2000 ?',
    reponses: ['La PlayStation 2', 'La PlayStation 3', 'La PSP', 'La PlayStation'],
    bonne: 0,
    note: 'La PS2, console la plus vendue de l’histoire — et lecteur DVD d’entrée de gamme pour beaucoup de foyers.',
  },
  {
    id: 'an2-09', theme: 'annees2000',
    texte: 'En quelle année les pièces et billets en euros sont-ils arrivés en France ?',
    reponses: ['2002', '1999', '2000', '2004'],
    bonne: 0,
    note: 'Le 1ᵉʳ janvier 2002. L’euro existait déjà depuis 1999, mais seulement sur les comptes.',
  },
  {
    id: 'an2-10', theme: 'annees2000',
    texte: 'Quel film de 2009 a battu le record du box-office mondial ?',
    reponses: ['Avatar', 'Titanic', 'Le Seigneur des anneaux', 'Harry Potter'],
    bonne: 0,
    note: 'Avatar, du même réalisateur que « Titanic », qu’il détrônait ainsi lui-même.',
  },

  /* --- Bouffe ------------------------------------------------------------ */
  {
    id: 'bof-01', theme: 'bouffe',
    texte: 'Quelle épice donne sa couleur au risotto milanais ?',
    reponses: ['Le safran', 'Le curcuma', 'Le paprika', 'Le carvi'],
    bonne: 0,
    note: 'Le safran — l’épice la plus chère du monde, parce qu’il faut des milliers de fleurs pour un seul kilo.',
  },
  {
    id: 'bof-02', theme: 'bouffe',
    texte: 'Que veut dire « tiramisu » en italien ?',
    reponses: ['Tire-moi vers le haut', 'Petit gâteau', 'Café du soir', 'Doux réconfort'],
    bonne: 0,
    note: 'Littéralement « tire-moi vers le haut » : le café et le sucre étaient censés remonter le moral.',
  },
  {
    id: 'bof-03', theme: 'bouffe',
    texte: 'Quel fromage entre dans une vraie tartiflette ?',
    reponses: ['Le reblochon', 'Le comté', 'Le beaufort', 'Le morbier'],
    bonne: 0,
    note: 'Le reblochon. Le plat a d’ailleurs été inventé dans les années 1980 pour en écouler davantage.',
  },
  {
    id: 'bof-04', theme: 'bouffe',
    texte: 'Quels sont les trois ingrédients d’une béchamel ?',
    reponses: ['Beurre, farine, lait', 'Beurre, œuf, lait', 'Crème, farine, lait', 'Huile, farine, eau'],
    bonne: 0,
    note: 'Un roux — beurre et farine — puis le lait versé petit à petit. Tout le reste n’est que patience.',
  },
  {
    id: 'bof-05', theme: 'bouffe',
    texte: 'Quel fruit est la base du guacamole ?',
    reponses: ['L’avocat', 'La courgette', 'Le concombre', 'Le poivron vert'],
    bonne: 0,
    note: 'L’avocat, qui est bien un fruit — et même une baie, techniquement.',
  },
  {
    id: 'bof-06', theme: 'bouffe',
    texte: 'Combien de variétés de fromages de Gaulle citait-il pour décrire la France ?',
    reponses: ['246', '365', '112', '1000'],
    bonne: 0,
    note: '« Comment voulez-vous gouverner un pays où il existe 246 variétés de fromage ? »',
  },
  {
    id: 'bof-07', theme: 'bouffe',
    texte: 'Quel alcool entre dans un mojito ?',
    reponses: ['Le rhum', 'La vodka', 'La tequila', 'Le gin'],
    bonne: 0,
    note: 'Rhum, citron vert, menthe, sucre, eau gazeuse. Avec de la vodka, ça devient autre chose.',
  },
  {
    id: 'bof-08', theme: 'bouffe',
    texte: 'De quelle partie du canard vient le magret ?',
    reponses: ['Le filet de la poitrine', 'La cuisse', 'L’aile', 'Le cou'],
    bonne: 0,
    note: 'Le filet de poitrine, et seulement s’il vient d’un canard engraissé — sinon c’est un simple filet.',
  },

  /* --- Insolite ---------------------------------------------------------- */
  {
    id: 'ins-01', theme: 'insolite',
    texte: 'Combien de cœurs a une pieuvre ?',
    reponses: ['3', '1', '2', '5'],
    bonne: 0,
    note: 'Trois : deux pour les branchies, un pour le reste du corps — qui s’arrête quand elle nage.',
  },
  {
    id: 'ins-02', theme: 'insolite',
    texte: 'De quelle couleur est le sang d’une pieuvre ?',
    reponses: ['Bleu', 'Rouge', 'Vert', 'Transparent'],
    bonne: 0,
    note: 'Bleu : il transporte l’oxygène avec du cuivre, là où le nôtre utilise du fer.',
  },
  {
    id: 'ins-03', theme: 'insolite',
    texte: 'Quel animal est incapable de sauter ?',
    reponses: ['L’éléphant', 'Le rhinocéros', 'L’hippopotame', 'La girafe'],
    bonne: 0,
    note: 'L’éléphant : il a toujours au moins un pied au sol. Trop lourd pour se réceptionner.',
  },
  {
    id: 'ins-04', theme: 'insolite',
    texte: 'Combien d’os y a-t-il dans le squelette d’un requin ?',
    reponses: ['Aucun', '68', '112', '206'],
    bonne: 0,
    note: 'Aucun : son squelette est entièrement en cartilage, plus léger que l’os.',
  },
  {
    id: 'ins-05', theme: 'insolite',
    texte: 'Au bout de combien de temps le miel devient-il impropre à la consommation ?',
    reponses: ['Jamais', 'Deux ans', 'Dix ans', 'Cinquante ans'],
    bonne: 0,
    note: 'Jamais, s’il reste fermé : on a retrouvé du miel comestible dans des tombes égyptiennes.',
  },
  {
    id: 'ins-06', theme: 'insolite',
    texte: 'Combien de dents un escargot possède-t-il, environ ?',
    reponses: ['Plus de 10 000', 'Aucune', '32', '200'],
    bonne: 0,
    note: 'Des milliers de minuscules dents alignées sur sa langue râpeuse, la radula.',
  },
  {
    id: 'ins-07', theme: 'insolite',
    texte: 'Quelle partie du corps humain ne contient aucun vaisseau sanguin ?',
    reponses: ['La cornée', 'Le lobe de l’oreille', 'L’ongle', 'Le tympan'],
    bonne: 0,
    note: 'La cornée : elle prend son oxygène directement dans l’air. C’est aussi pourquoi une greffe y est si bien tolérée.',
  },
  {
    id: 'ins-08', theme: 'insolite',
    texte: 'Pourquoi les bananes sont-elles très légèrement radioactives ?',
    reponses: ['À cause du potassium', 'À cause des pesticides', 'À cause du transport', 'Elles ne le sont pas'],
    bonne: 0,
    note: 'Le potassium naturel est un peu radioactif. Il en faudrait des millions d’un coup pour que ça compte.',
  },
  {
    id: 'ins-09', theme: 'insolite',
    texte: 'Pourquoi une pomme flotte-t-elle dans l’eau ?',
    reponses: ['Elle contient un quart d’air', 'Sa peau est cirée', 'Elle est plus légère que l’eau douce', 'Elle contient du sucre'],
    bonne: 0,
    note: 'Environ un quart de son volume est de l’air. D’où la pêche aux pommes des fêtes foraines.',
  },
  {
    id: 'ins-10', theme: 'insolite',
    texte: 'Quel est l’animal terrestre le plus rapide ?',
    reponses: ['Le guépard', 'L’antilope', 'Le lévrier', 'Le cheval'],
    bonne: 0,
    note: 'Le guépard, autour de cent kilomètres-heure — mais seulement sur quelques centaines de mètres.',
  },
];

/**
 * Un tirage pour une partie. La bonne réponse est toujours en première position
 * dans la banque, parce qu'une liste relue à l'œil est plus facile à vérifier
 * qu'une liste où il faut compter les index : c'est ici qu'on mélange, une fois
 * par partie et par question.
 */
export function tirerQuestions({ themes, nombre, aleatoire = Math.random }) {
  const choisis = themes?.length ? new Set(themes) : null;
  const pool = QUESTIONS.filter((q) => !choisis || choisis.has(q.theme));

  const melange = (liste) => {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(aleatoire() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  };

  return melange(pool)
    .slice(0, nombre)
    .map((q) => {
      const ordre = melange(q.reponses.map((_, i) => i));
      return {
        id: q.id,
        theme: q.theme,
        texte: q.texte,
        reponses: ordre.map((i) => q.reponses[i]),
        bonne: ordre.indexOf(q.bonne),
        note: q.note,
      };
    });
}

/** Combien de questions un thème peut fournir : sert à borner les réglages. */
export function tailleDuPool(themes) {
  const choisis = themes?.length ? new Set(themes) : null;
  return QUESTIONS.filter((q) => !choisis || choisis.has(q.theme)).length;
}

export const nomDuTheme = (id) => THEMES.find((t) => t.id === id)?.nom ?? id;
