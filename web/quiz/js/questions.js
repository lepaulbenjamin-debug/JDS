// Banque de questions, embarquée dans la PWA.
//
// Elle est en dur, et c'est un choix : une soirée ne doit pas dépendre du Wi-Fi
// de la maison, et surtout une mauvaise réponse annoncée par l'animateur gâche
// la partie sans appel. Les questions générées par un modèle passent donc par
// `scripts/generate-questions.mjs`, qui écrit un brouillon à relire avant de
// l'ajouter ici — jamais directement dans le jeu.
//
// Toute entrée porte un thème, un énoncé, et la petite phrase que l'animateur
// lit à la révélation. Cette dernière n'est pas décorative : c'est ce qui
// transforme « tu as faux » en « ah oui, tiens », et c'est elle qui fait durer
// une soirée.
//
// Le reste dépend du `type` de manche — quatre réponses et un index pour un
// QCM, une valeur pour une estimation, quatre éléments pour un classement,
// cinq affirmations pour une rafale. Sans `type`, c'est un QCM : les soixante
// premières entrées ont été écrites avant que les autres formes existent, et
// il n'y avait aucune raison de toutes les réécrire.

import { TYPES, typeDeManche } from './manches/index.js';

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

  /* --- Estimations ------------------------------------------------------- */

  {
    id: 'est-01', theme: 'culture', type: 'estimation',
    texte: 'Combien de marches faut-il monter pour atteindre le sommet de la tour Eiffel ?',
    valeur: 1665, unite: 'marches',
    note: 'Mille six cent soixante-cinq. L’ascenseur existe, et c’est une bonne nouvelle.',
  },
  {
    id: 'est-02', theme: 'insolite', type: 'estimation',
    texte: 'Combien d’os compte le squelette d’un adulte ?',
    valeur: 206, unite: 'os',
    note: 'Deux cent six. Un bébé en a près de trois cents : certains fusionnent en grandissant.',
  },
  {
    id: 'est-03', theme: 'culture', type: 'estimation',
    texte: 'Combien de pays sont membres de l’ONU ?',
    valeur: 193, unite: 'pays',
    note: 'Cent quatre-vingt-treize. Le Soudan du Sud est le dernier arrivé, en 2011.',
  },
  {
    id: 'est-04', theme: 'insolite', type: 'estimation',
    texte: 'Quelle profondeur atteint la fosse des Mariannes, en mètres ?',
    valeur: 10994, unite: 'mètres',
    note: 'Près de onze kilomètres. L’Everest y tiendrait tout entier, avec deux kilomètres d’eau au-dessus.',
  },
  {
    id: 'est-05', theme: 'insolite', type: 'estimation',
    texte: 'Combien de secondes met la lumière du Soleil pour nous parvenir ?',
    valeur: 500, unite: 'secondes',
    note: 'Environ cinq cents, soit huit minutes vingt. Le Soleil que vous voyez date d’il y a huit minutes.',
  },
  {
    id: 'est-06', theme: 'culture', type: 'estimation',
    texte: 'Combien de kilomètres fait le tour de la Terre à l’équateur ?',
    valeur: 40075, unite: 'km',
    note: 'Quarante mille et des poussières. Le mètre a d’ailleurs été défini pour que ce soit un chiffre rond.',
  },
  {
    id: 'est-07', theme: 'culture', type: 'estimation',
    texte: 'Combien de cartes compte un jeu de tarot ?',
    valeur: 78, unite: 'cartes',
    note: 'Soixante-dix-huit : cinquante-six cartes classiques, vingt et un atouts, et l’excuse.',
  },
  {
    id: 'est-08', theme: 'bouffe', type: 'estimation',
    texte: 'Combien de litres de sang circulent dans un corps adulte ?',
    valeur: 5, unite: 'litres',
    note: 'Environ cinq. Une prise de sang classique en prélève à peine un centième.',
  },

  /* --- Dans l'ordre ------------------------------------------------------- */

  {
    id: 'ord-01', theme: 'culture', type: 'ordre',
    texte: 'Du plus ancien au plus récent',
    elements: [
      'La Révolution française',
      'La Première Guerre mondiale',
      'Le premier pas sur la Lune',
      'La chute du mur de Berlin',
    ],
    note: '1789, 1914, 1969, 1989. Deux siècles exactement entre le premier et le dernier.',
  },
  {
    id: 'ord-02', theme: 'insolite', type: 'ordre',
    texte: 'De la plus petite à la plus grande',
    elements: ['Mercure', 'Mars', 'La Terre', 'Jupiter'],
    note: 'Jupiter est si grande que toutes les autres planètes tiendraient à l’intérieur.',
  },
  {
    id: 'ord-03', theme: 'culture', type: 'ordre',
    texte: 'De l’invention la plus ancienne à la plus récente',
    elements: ['L’imprimerie', 'La machine à vapeur', 'Le téléphone', 'La télévision'],
    note: 'Vers 1450, 1712, 1876, puis les années 1920. Quatre siècles pour les deux premières, cinquante ans pour les deux dernières.',
  },
  {
    id: 'ord-04', theme: 'cinema', type: 'ordre',
    texte: 'Du film le plus ancien au plus récent',
    elements: ['Le Parrain', 'Star Wars', 'Titanic', 'Avatar'],
    note: '1972, 1977, 1997, 2009. Les deux derniers sont du même réalisateur.',
  },
  {
    id: 'ord-05', theme: 'culture', type: 'ordre',
    texte: 'Du continent le moins peuplé au plus peuplé',
    elements: ['L’Océanie', 'L’Amérique du Sud', 'L’Europe', 'L’Asie'],
    note: 'L’Asie à elle seule rassemble plus de la moitié de l’humanité.',
  },

  /* --- Rafales ------------------------------------------------------------ */

  {
    id: 'raf-01', theme: 'insolite', type: 'rafale',
    texte: 'Le corps humain',
    affirmations: [
      { texte: 'Un adulte a trente-deux dents.', vrai: true },
      { texte: 'Nous n’utilisons que 10 % de notre cerveau.', vrai: false },
      { texte: 'Les ongles continuent de pousser après la mort.', vrai: false },
      { texte: 'L’estomac produit de l’acide chlorhydrique.', vrai: true },
      { texte: 'Le cœur se trouve légèrement à gauche de la poitrine.', vrai: true },
    ],
    note: 'Les ongles ne poussent pas : c’est la peau qui se rétracte et donne cette impression.',
  },
  {
    id: 'raf-02', theme: 'insolite', type: 'rafale',
    texte: 'Les animaux',
    affirmations: [
      { texte: 'Le koala est un marsupial.', vrai: true },
      { texte: 'Les chauves-souris sont aveugles.', vrai: false },
      { texte: 'Un poisson rouge a trois secondes de mémoire.', vrai: false },
      { texte: 'Un escargot peut dormir trois ans d’affilée.', vrai: true },
      { texte: 'Les dauphins dorment un hémisphère du cerveau à la fois.', vrai: true },
    ],
    note: 'Un poisson rouge retient des choses pendant des mois. La légende des trois secondes n’a aucun fondement.',
  },
  {
    id: 'raf-03', theme: 'culture', type: 'rafale',
    texte: 'La France',
    affirmations: [
      { texte: 'La Marseillaise a été écrite à Strasbourg.', vrai: true },
      { texte: 'La France a une frontière commune avec le Brésil.', vrai: true },
      { texte: 'Le mont Blanc est le plus haut sommet d’Europe occidentale.', vrai: true },
      { texte: 'Paris est la capitale de la France sans interruption depuis Clovis.', vrai: false },
      { texte: 'Les trois bandes du drapeau ont toujours été de largeur égale.', vrai: false },
    ],
    note: 'La frontière avec le Brésil passe par la Guyane — c’est même la plus longue frontière terrestre française.',
  },
  {
    id: 'raf-04', theme: 'insolite', type: 'rafale',
    texte: 'L’espace',
    affirmations: [
      { texte: 'La Lune s’éloigne un peu de la Terre chaque année.', vrai: true },
      { texte: 'Vénus tourne sur elle-même à l’envers des autres planètes.', vrai: true },
      { texte: 'Sur Vénus, un jour dure plus longtemps qu’une année.', vrai: true },
      { texte: 'Il n’y a pas de gravité dans l’espace.', vrai: false },
      { texte: 'Saturne est la seule planète à posséder des anneaux.', vrai: false },
    ],
    note: 'En orbite, on ne flotte pas faute de gravité : on tombe en permanence, et on rate la Terre.',
  },
  {
    id: 'raf-05', theme: 'bouffe', type: 'rafale',
    texte: 'À table',
    affirmations: [
      { texte: 'La tomate est un fruit.', vrai: true },
      { texte: 'Le miel ne se périme jamais.', vrai: true },
      { texte: 'Le wasabi des restaurants est rarement du vrai wasabi.', vrai: true },
      { texte: 'Les carottes ont toujours été orange.', vrai: false },
      { texte: 'Le chocolat blanc ne contient pas de beurre de cacao.', vrai: false },
    ],
    note: 'Les carottes étaient blanches ou violettes ; l’orange est une sélection néerlandaise du XVIIᵉ siècle.',
  },

  /* --- Les questions du fil rouge ----------------------------------------- */
  //
  // Elles se jouent comme n'importe quelle autre. Leur particularité tient
  // ailleurs : leurs bonnes réponses partagent toutes un même mot, et c'est ce
  // mot que les joueurs cherchent en parallèle de la partie.

  {
    id: 'rou-01', theme: 'culture', fil: 'rouge',
    texte: 'Quelle mer sépare l’Afrique de la péninsule Arabique ?',
    reponses: ['La mer Rouge', 'La mer Noire', 'La mer Morte', 'La mer Égée'],
    bonne: 0,
    note: 'Son nom viendrait des algues qui la teintent parfois, ou simplement d’une convention où le rouge désignait le sud.',
  },
  {
    id: 'rou-02', theme: 'culture', fil: 'rouge',
    texte: 'Quelle organisation humanitaire Henry Dunant a-t-il fondée ?',
    reponses: ['La Croix-Rouge', 'Médecins sans frontières', 'L’UNICEF', 'Le Secours populaire'],
    bonne: 0,
    note: 'Après avoir vu le champ de bataille de Solférino en 1859. Il en reçut le premier prix Nobel de la paix.',
  },
  {
    id: 'rou-03', theme: 'insolite', fil: 'rouge',
    texte: 'Comment surnomme-t-on la planète Mars ?',
    reponses: ['La planète rouge', 'La planète bleue', 'L’étoile du berger', 'La géante'],
    bonne: 0,
    note: 'Sa couleur vient de l’oxyde de fer : Mars est littéralement rouillée.',
  },
  {
    id: 'rou-04', theme: 'culture', fil: 'rouge',
    texte: 'Quel conte met en scène une fillette, sa grand-mère et un loup ?',
    reponses: ['Le Petit Chaperon rouge', 'Hansel et Gretel', 'Boucle d’or', 'Pierre et le Loup'],
    bonne: 0,
    note: 'Chez Perrault, en 1697, le loup gagne : il n’y a pas de chasseur, et l’histoire s’arrête là.',
  },
];

/**
 * Les fils rouges.
 *
 * Un fil rouge est un mot que les bonnes réponses de plusieurs manches ont en
 * commun, sans que rien ne l'annonce. Pendant que la partie se joue, chacun
 * peut à tout moment tenter de le nommer : le premier à trouver rafle une
 * grosse prime, et plus il trouve tôt, plus elle est grosse.
 *
 * C'est le seul élément du jeu qui traverse les manches, et il ne demande
 * aucun secret par joueur — donc rien à filtrer côté relais. Tout tient dans
 * le tirage et dans une poignée de mots-clés.
 */
export const FILS_ROUGES = [
  {
    id: 'rouge',
    solution: 'le rouge',
    // On accepte large : en soirée, personne ne tape « le rouge » proprement.
    motsCles: ['rouge', 'rouges', 'lerouge'],
    indice: 'Un même mot se cache derrière plusieurs bonnes réponses de cette partie.',
    revelation: 'La mer Rouge, la Croix-Rouge, la planète rouge, le Petit Chaperon rouge : c’était le rouge.',
  },
];

export const filRougeDe = (id) => FILS_ROUGES.find((f) => f.id === id) ?? null;

/**
 * Une réponse au fil rouge est-elle bonne ?
 *
 * Comparaison très tolérante : on retire les accents, la ponctuation, les
 * espaces et les articles. « Le Rouge ! », « rouge » et « la couleur rouge »
 * doivent tous passer — on joue avec un téléphone dans une main.
 */
export function filRougeTrouve(fil, propose) {
  const normaliser = (texte) => String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const propre = normaliser(propose);
  if (!propre) return false;
  return fil.motsCles.some((mot) => propre.includes(normaliser(mot)));
}

function melangeur(aleatoire) {
  return (liste) => {
    const copie = liste.slice();
    for (let i = copie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(aleatoire() * (i + 1));
      [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
  };
}

const poolDe = (themes, types) => QUESTIONS.filter((q) => {
  if (themes?.length && !themes.includes(q.theme)) return false;
  if (types?.length && !types.includes(q.type ?? 'qcm')) return false;
  return true;
});

/**
 * Le tirage d'une partie.
 *
 * Chaque entrée passe par son type de manche, qui sait la préparer — mélanger
 * les réponses d'un QCM, brouiller l'ordre d'un classement, et ainsi de suite.
 *
 * Quand un fil rouge est demandé, ses questions sont réparties dans la partie
 * plutôt que tirées au hasard : groupées, elles se verraient tout de suite ; en
 * fin de partie seulement, plus personne n'aurait le temps de chercher.
 */
export function tirerQuestions({
  themes, types, nombre, aleatoire = Math.random, fil = null,
}) {
  const melange = melangeur(aleatoire);
  const preparer = (entree) => typeDeManche(entree.type).preparer(entree, melange);

  const duFil = fil ? QUESTIONS.filter((q) => q.fil === fil) : [];
  const reste = melange(poolDe(themes, types).filter((q) => !q.fil))
    .slice(0, Math.max(0, nombre - duFil.length));

  if (!duFil.length) return reste.map(preparer);

  // Fusion à cadence régulière. Un simple `splice` à intervalle fixe suffit
  // tant que le fil ne pèse pas lourd, mais sur une partie de huit manches dont
  // quatre appartiennent au fil, il les collait les unes aux autres — et un fil
  // rouge qui se voit n'est plus un fil rouge.
  const aPlacer = melange(duFil);
  const longueur = reste.length + aPlacer.length;
  const tirage = [];
  let poses = 0;
  let suivante = 0;

  for (let position = 0; position < longueur; position += 1) {
    const attendus = Math.floor(((position + 1) * aPlacer.length) / longueur);
    // Jamais en première manche : celle-là sert à comprendre comment on joue,
    // pas à chercher un fil dont personne ne soupçonne encore l'existence.
    const auTour = position > 0 && poses < attendus && poses < aPlacer.length;
    if (auTour || suivante >= reste.length) tirage.push(aPlacer[poses++]);
    else tirage.push(reste[suivante++]);
  }

  return tirage.slice(0, nombre).map(preparer);
}

/** Combien de questions un tirage peut fournir : sert à borner les réglages. */
export function tailleDuPool(themes, types) {
  return poolDe(themes, types).filter((q) => !q.fil).length;
}

/** Les types réellement représentés dans les thèmes choisis. */
export function typesDisponibles(themes) {
  const presents = new Set(poolDe(themes).map((q) => q.type ?? 'qcm'));
  return TYPES.filter((t) => presents.has(t.id));
}

export const nomDuTheme = (id) => THEMES.find((t) => t.id === id)?.nom ?? id;
