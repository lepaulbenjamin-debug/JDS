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
  { id: 'sport', nom: 'Sport', emoji: '⚽' },
  { id: 'monde', nom: 'Le monde', emoji: '🌍' },
  { id: 'marques', nom: 'Marques & pubs', emoji: '🏷️' },
  { id: 'mots', nom: 'Mots & expressions', emoji: '💬' },
  { id: 'disney', nom: 'Disney & Pixar', emoji: '🏰' },
  { id: 'regions', nom: 'Les régions de France', emoji: '🗺️' },
  { id: 'nature', nom: 'Nature', emoji: '🌿' },
  { id: 'histoire', nom: 'Histoire', emoji: '🏛️' },
  { id: 'fake', nom: 'Fake news ou pas ?', emoji: '📰' },
];

export const QUESTIONS = [
  /* --- Culture générale -------------------------------------------------- */
  {
    id: 'cul-01', theme: 'culture',
    niveau: 2,
    texte: 'Quelle est la capitale de l’Australie ?',
    reponses: ['Canberra', 'Sydney', 'Melbourne', 'Perth'],
    bonne: 0,
    note: 'Sydney et Melbourne se disputaient le titre : Canberra a été bâtie entre les deux pour les départager.',
  },
  {
    id: 'cul-02', theme: 'culture',
    niveau: 1,
    texte: 'Quel élément chimique porte le symbole « Fe » ?',
    reponses: ['Le fer', 'Le fluor', 'Le francium', 'Le phosphore'],
    bonne: 0,
    note: 'Du latin ferrum. Le fluor, lui, c’est F tout court.',
  },
  {
    id: 'cul-03', theme: 'culture',
    niveau: 1,
    texte: 'Qui a peint « La Nuit étoilée » ?',
    reponses: ['Van Gogh', 'Monet', 'Cézanne', 'Gauguin'],
    bonne: 0,
    note: 'Peinte en 1889, depuis la fenêtre de sa chambre à l’asile de Saint-Rémy-de-Provence.',
  },
  {
    id: 'cul-04', theme: 'culture',
    niveau: 2,
    texte: 'Combien de joueurs une équipe de volley aligne-t-elle sur le terrain ?',
    reponses: ['6', '5', '7', '11'],
    bonne: 0,
    note: 'Six, dont le libéro, ce joueur en maillot différent qui n’a pas le droit d’attaquer.',
  },
  {
    id: 'cul-05', theme: 'culture',
    niveau: 1,
    texte: 'Quelle planète est la plus proche du Soleil ?',
    reponses: ['Mercure', 'Vénus', 'Mars', 'La Terre'],
    bonne: 0,
    note: 'Mercure. Ce n’est pourtant pas la plus chaude : Vénus lui vole la place grâce à son effet de serre.',
  },
  {
    id: 'cul-06', theme: 'culture',
    niveau: 1,
    texte: 'En quelle année le mur de Berlin est-il tombé ?',
    reponses: ['1989', '1987', '1991', '1985'],
    bonne: 0,
    note: 'Dans la nuit du 9 novembre 1989, après une conférence de presse mal préparée.',
  },
  {
    id: 'cul-07', theme: 'culture',
    niveau: 3,
    texte: 'Quel pays compte le plus de fuseaux horaires ?',
    reponses: ['La France', 'La Russie', 'Les États-Unis', 'La Chine'],
    bonne: 0,
    note: 'La France, avec douze fuseaux — grâce aux territoires d’outre-mer. La Russie n’en a que onze.',
  },
  {
    id: 'cul-08', theme: 'culture',
    niveau: 1,
    texte: 'Quel est le plus long fleuve de France ?',
    reponses: ['La Loire', 'La Seine', 'Le Rhône', 'La Garonne'],
    bonne: 0,
    note: 'La Loire, un peu plus de mille kilomètres, du Massif central à l’Atlantique.',
  },
  {
    id: 'cul-09', theme: 'culture',
    niveau: 3,
    texte: 'D’où vient le nom « Bluetooth » ?',
    reponses: ['Du surnom d’un roi danois', 'D’un ingénieur suédois', 'D’une marque de dentifrice', 'D’un code militaire'],
    bonne: 0,
    note: 'Harald « à la dent bleue », qui avait unifié le Danemark — comme la norme devait unifier les appareils.',
  },
  {
    id: 'cul-10', theme: 'culture',
    niveau: 3,
    texte: 'Combien de touches compte un piano standard ?',
    reponses: ['88', '76', '61', '96'],
    bonne: 0,
    note: 'Quatre-vingt-huit : cinquante-deux blanches et trente-six noires.',
  },
  {
    id: 'cul-11', theme: 'culture',
    niveau: 2,
    texte: 'Quel est le plus petit os du corps humain ?',
    reponses: ['L’étrier', 'La rotule', 'Le coccyx', 'L’os nasal'],
    bonne: 0,
    note: 'Trois millimètres, dans l’oreille moyenne. Il transmet les vibrations du tympan à l’oreille interne, avec le marteau et l’enclume.',
  },
  {
    id: 'cul-12', theme: 'culture',
    niveau: 1,
    texte: 'En quelle année un homme a-t-il marché sur la Lune pour la première fois ?',
    reponses: ['1969', '1961', '1972', '1957'],
    bonne: 0,
    note: 'Le 21 juillet 1969. Six cents millions de personnes devant leur télévision, sur une planète qui en comptait trois milliards et demi.',
  },
  {
    id: 'cul-13', theme: 'culture',
    niveau: 1,
    texte: 'Quel physicien a formulé la théorie de la relativité ?',
    reponses: ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Galilée'],
    bonne: 0,
    note: 'Einstein, en 1905 pour la restreinte et 1915 pour la générale. Il travaillait alors comme employé au bureau des brevets de Berne.',
  },
  {
    id: 'cul-14', theme: 'culture',
    niveau: 2,
    texte: 'Combien de côtés compte un dodécagone ?',
    reponses: ['Douze', 'Dix', 'Vingt', 'Huit'],
    bonne: 0,
    note: 'Douze, du grec « dôdeka ». La pièce de deux euros, elle, n’en a aucun — mais la livre britannique en a eu douze de 2017 à 2024.',
  },

  /* --- Musique ----------------------------------------------------------- */
  {
    id: 'mus-01', theme: 'musique',
    niveau: 2,
    texte: 'Quel groupe a sorti l’album « The Dark Side of the Moon » ?',
    reponses: ['Pink Floyd', 'Led Zeppelin', 'The Doors', 'Genesis'],
    bonne: 0,
    note: '1973. Il est resté au classement américain pendant plus de quinze ans.',
  },
  {
    id: 'mus-02', theme: 'musique',
    niveau: 3,
    texte: 'Quel est le vrai prénom de Stromae ?',
    reponses: ['Paul', 'Pierre', 'Luc', 'Marc'],
    bonne: 0,
    note: 'Paul Van Haver. « Stromae », c’est « maestro » en verlan.',
  },
  {
    id: 'mus-03', theme: 'musique',
    niveau: 1,
    texte: 'Qui a écrit et chanté « Ne me quitte pas » ?',
    reponses: ['Jacques Brel', 'Charles Aznavour', 'Léo Ferré', 'Serge Gainsbourg'],
    bonne: 0,
    note: 'Brel, en 1959. Il disait lui-même que ce n’était pas une chanson d’amour mais « un hymne à la lâcheté ».',
  },
  {
    id: 'mus-04', theme: 'musique',
    niveau: 1,
    texte: 'Quel groupe suédois a remporté l’Eurovision 1974 avec « Waterloo » ?',
    reponses: ['ABBA', 'Roxette', 'Europe', 'Ace of Base'],
    bonne: 0,
    note: 'ABBA. Quatre Suédois qui chantent une défaite française en anglais, et gagnent.',
  },
  {
    id: 'mus-05', theme: 'musique',
    niveau: 3,
    texte: 'Comment s’intitule le premier album d’Angèle ?',
    reponses: ['Brol', 'Nonante-Cinq', 'Balance ton quoi', 'Bruxelles je t’aime'],
    bonne: 0,
    note: '« Brol », mot belge pour désigner le bazar, le bordel ambiant.',
  },
  {
    id: 'mus-06', theme: 'musique',
    niveau: 1,
    texte: 'Quel groupe a enregistré « Bohemian Rhapsody » ?',
    reponses: ['Queen', 'The Who', 'Deep Purple', 'The Kinks'],
    bonne: 0,
    note: 'Queen, 1975. Six minutes, aucun refrain, et la maison de disques qui suppliait de couper.',
  },
  {
    id: 'mus-07', theme: 'musique',
    niveau: 3,
    texte: 'Quel album Daft Punk a-t-il sorti en 2013 ?',
    reponses: ['Random Access Memories', 'Discovery', 'Homework', 'Human After All'],
    bonne: 0,
    note: 'Celui de « Get Lucky ». Enregistré avec de vrais musiciens de studio, à contre-courant de tout le reste.',
  },
  {
    id: 'mus-08', theme: 'musique',
    niveau: 1,
    texte: 'Qui interprète « Formidable » ?',
    reponses: ['Stromae', 'Christine and the Queens', 'Vianney', 'Julien Doré'],
    bonne: 0,
    note: '2013. Le clip a été tourné en caméra cachée à Bruxelles : les passants le croyaient vraiment ivre.',
  },
  {
    id: 'mus-09', theme: 'musique',
    niveau: 1,
    texte: 'Combien de cordes compte un violon ?',
    reponses: ['4', '5', '6', '3'],
    bonne: 0,
    note: 'Quatre : sol, ré, la, mi, de la plus grave à la plus aiguë. Le violoncelle porte les mêmes noms, beaucoup plus bas.',
  },
  {
    id: 'mus-10', theme: 'musique',
    niveau: 2,
    texte: 'Qui a composé « La Marche turque » ?',
    reponses: ['Mozart', 'Beethoven', 'Bach', 'Haydn'],
    bonne: 0,
    note: 'Le dernier mouvement de sa onzième sonate pour piano. « Turque » parce qu’elle imite les fanfares militaires ottomanes, très à la mode à Vienne.',
  },
  {
    id: 'mus-11', theme: 'musique',
    niveau: 2,
    texte: 'Quel chanteur français était surnommé « le Taulier » ?',
    reponses: ['Johnny Hallyday', 'Eddy Mitchell', 'Michel Sardou', 'Jacques Dutronc'],
    bonne: 0,
    note: 'Johnny, le patron de la maison. Eddy Mitchell, son vieux complice, répondait au surnom de « Schmoll ».',
  },
  {
    id: 'mus-12', theme: 'musique',
    niveau: 2,
    texte: 'Quel groupe britannique a sorti « Wonderwall » ?',
    reponses: ['Oasis', 'Blur', 'Pulp', 'Suede'],
    bonne: 0,
    note: '1995, en pleine guerre de la britpop contre Blur. Noel Gallagher a passé les années suivantes à répéter qu’il ne la supportait plus.',
  },
  {
    id: 'mus-13', theme: 'musique',
    niveau: 2,
    texte: 'Quel instrument Miles Davis a-t-il rendu célèbre ?',
    reponses: ['La trompette', 'Le saxophone', 'La contrebasse', 'Le piano'],
    bonne: 0,
    note: 'Une trompette souvent jouée en sourdine, tout en retenue. « Ce sont les notes qu’on ne joue pas qui comptent », disait-il.',
  },
  {
    id: 'mus-14', theme: 'musique',
    niveau: 1,
    texte: 'Quel groupe de rock britannique a pour emblème une langue tirée ?',
    reponses: ['Les Rolling Stones', 'Les Who', 'Led Zeppelin', 'Deep Purple'],
    bonne: 0,
    note: 'Dessiné en 1970 par un étudiant en art payé cinquante livres. Il s’inspirait de Kali, la déesse hindoue, autant que de la bouche de Mick Jagger.',
  },
  {
    id: 'mus-15', theme: 'musique',
    niveau: 2,
    texte: 'Quel instrument compte quarante-sept cordes et sept pédales ?',
    reponses: ['La harpe', 'Le piano', 'La contrebasse', 'Le clavecin'],
    bonne: 0,
    note: 'Chaque pédale a trois positions et retend toutes les cordes d’une même note à la fois : c’est ce qui permet de changer de tonalité en jouant.',
  },
  {
    id: 'mus-16', theme: 'musique',
    niveau: 2,
    texte: 'Combien de touches noires compte une octave au piano ?',
    reponses: ['Cinq', 'Sept', 'Quatre', 'Six'],
    bonne: 0,
    note: 'Cinq noires pour sept blanches. Le groupement par deux et par trois n’est pas décoratif : c’est ce qui permet de se repérer sans regarder.',
  },
  {
    id: 'mus-17', theme: 'musique',
    niveau: 3,
    texte: 'Quel festival de musique se tient chaque été à Carhaix, en Bretagne ?',
    reponses: ['Les Vieilles Charrues', 'Les Eurockéennes', 'Rock en Seine', 'Les Francofolies'],
    bonne: 0,
    note: 'Né en 1992 comme une fête entre amis, devenu le plus grand festival de France avec près de trois cent mille festivaliers sur quatre jours.',
  },

  /* --- Cinéma & séries --------------------------------------------------- */
  {
    id: 'cin-01', theme: 'cinema',
    niveau: 1,
    texte: 'Qui a réalisé « Pulp Fiction » ?',
    reponses: ['Quentin Tarantino', 'Martin Scorsese', 'Guy Ritchie', 'David Fincher'],
    bonne: 0,
    note: '1994. Palme d’or à Cannes, à la surprise générale et sous les sifflets d’une partie de la salle.',
  },
  {
    id: 'cin-02', theme: 'cinema',
    niveau: 1,
    texte: 'Dans « Le Roi Lion », comment s’appelle le frère de Mufasa ?',
    reponses: ['Scar', 'Simba', 'Rafiki', 'Zazu'],
    bonne: 0,
    note: 'Scar — « la cicatrice ». Personne dans ce film ne s’est demandé pourquoi son frère s’appelait comme ça.',
  },
  {
    id: 'cin-03', theme: 'cinema',
    niveau: 2,
    texte: 'Sur quel continent imaginaire se déroule « Game of Thrones » ?',
    reponses: ['Westeros', 'Essos', 'Valyria', 'Dorne'],
    bonne: 0,
    note: 'Westeros. Essos est le continent d’en face, Dorne une région du sud de Westeros.',
  },
  {
    id: 'cin-04', theme: 'cinema',
    niveau: 1,
    texte: 'Quel acteur incarne Jack dans « Titanic » ?',
    reponses: ['Leonardo DiCaprio', 'Brad Pitt', 'Matt Damon', 'Johnny Depp'],
    bonne: 0,
    note: '1997. Il a fallu attendre 2016 pour qu’il décroche enfin son Oscar, et pas pour ce film.',
  },
  {
    id: 'cin-05', theme: 'cinema',
    niveau: 2,
    texte: 'Quel film français a fait le plus d’entrées en France ?',
    reponses: ['Bienvenue chez les Ch’tis', 'Intouchables', 'Astérix : Mission Cléopâtre', 'La Grande Vadrouille'],
    bonne: 0,
    note: 'Plus de vingt millions d’entrées en 2008. « La Grande Vadrouille » a tenu le record pendant quarante ans.',
  },
  {
    id: 'cin-06', theme: 'cinema',
    niveau: 1,
    texte: 'Qui joue Amélie Poulain ?',
    reponses: ['Audrey Tautou', 'Marion Cotillard', 'Ludivine Sagnier', 'Virginie Ledoyen'],
    bonne: 0,
    note: 'Le rôle avait d’abord été écrit pour Emily Watson, qui a refusé — et qui ne parlait pas français.',
  },
  {
    id: 'cin-07', theme: 'cinema',
    niveau: 2,
    texte: 'Dans « Breaking Bad », quel pseudonyme se donne Walter White ?',
    reponses: ['Heisenberg', 'Schrödinger', 'Bohr', 'Faraday'],
    bonne: 0,
    note: 'Heisenberg, du physicien du principe d’incertitude. Le chapeau fait le reste.',
  },
  {
    id: 'cin-08', theme: 'cinema',
    niveau: 2,
    texte: 'Quel studio a produit « Le Voyage de Chihiro » ?',
    reponses: ['Ghibli', 'Toei Animation', 'Madhouse', 'Pierrot'],
    bonne: 0,
    note: 'Ghibli. Premier film non anglophone à décrocher l’Oscar du meilleur film d’animation.',
  },
  {
    id: 'cin-09', theme: 'cinema',
    niveau: 2,
    texte: 'Combien de saisons compte la série « Friends » ?',
    reponses: ['10', '8', '12', '9'],
    bonne: 0,
    note: 'Dix saisons, de 1994 à 2004. Et un canapé jamais libre au Central Perk.',
  },
  {
    id: 'cin-10', theme: 'cinema',
    niveau: 1,
    texte: 'Qui incarne Hubert Bonisseur de La Bath dans « OSS 117 » ?',
    reponses: ['Jean Dujardin', 'Gad Elmaleh', 'Kad Merad', 'Guillaume Canet'],
    bonne: 0,
    note: 'Jean Dujardin, sous la direction de Michel Hazanavicius — le même duo que pour « The Artist ».',
  },
  {
    id: 'cin-11', theme: 'cinema',
    niveau: 3,
    texte: 'Quel film a remporté le tout premier Oscar du meilleur film d’animation ?',
    reponses: ['Shrek', 'Toy Story', 'Le Roi Lion', 'Monstres et Cie'],
    bonne: 0,
    note: 'En 2002, pour la création de la catégorie. Monstres et Cie était son concurrent direct, et a perdu.',
  },
  {
    id: 'cin-12', theme: 'cinema',
    niveau: 2,
    texte: 'Dans « Retour vers le futur », quelle vitesse la DeLorean doit-elle atteindre ?',
    reponses: ['88 miles à l’heure', '100 miles à l’heure', '66 miles à l’heure', '120 miles à l’heure'],
    bonne: 0,
    note: 'Quatre-vingt-huit miles à l’heure, soit un peu plus de 140 km/h — et 1,21 gigawatt, prononcé « jigowatt » dans le film.',
  },
  {
    id: 'cin-13', theme: 'cinema',
    niveau: 2,
    texte: 'Quelle série met en scène la famille Soprano ?',
    reponses: ['Les Soprano', 'Boardwalk Empire', 'Gomorra', 'Peaky Blinders'],
    bonne: 0,
    note: 'Un parrain du New Jersey qui va chez la psy. C’est la série qui a lancé la mode des héros qu’on n’a aucune raison d’aimer.',
  },
  {
    id: 'cin-14', theme: 'cinema',
    niveau: 3,
    texte: 'Quel film de Jacques Tati suit un homme à pipe, en imperméable, qui ne dit presque rien ?',
    reponses: ['Les Vacances de Monsieur Hulot', 'Le Corniaud', 'La Grande Vadrouille', 'Le Gendarme de Saint-Tropez'],
    bonne: 0,
    note: 'Tati travaillait le son plus que le dialogue : la porte du restaurant qui claque est presque un personnage.',
  },
  {
    id: 'cin-15', theme: 'cinema',
    niveau: 2,
    texte: 'Quel film a remporté l’Oscar du meilleur film en 2020, une première pour un film non anglophone ?',
    reponses: ['Parasite', 'Roma', 'Le Labyrinthe de Pan', 'Amour'],
    bonne: 0,
    note: 'Parasite, de Bong Joon-ho. Quatre Oscars la même nuit, dont celui du meilleur film international — le premier film à remporter les deux.',
  },
  {
    id: 'cin-16', theme: 'cinema',
    niveau: 1,
    texte: 'Dans « Star Wars », qui est le père de Luke Skywalker ?',
    reponses: ['Dark Vador', 'Obi-Wan Kenobi', 'L’empereur Palpatine', 'Han Solo'],
    bonne: 0,
    note: 'La réplique exacte n’est pas « Luke, je suis ton père » mais « Non, je suis ton père » — l’une des citations les plus mal retenues du cinéma.',
  },
  {
    id: 'cin-17', theme: 'cinema',
    niveau: 2,
    texte: 'Quelle actrice française a reçu un Oscar pour « La Môme » ?',
    reponses: ['Marion Cotillard', 'Juliette Binoche', 'Isabelle Huppert', 'Léa Seydoux'],
    bonne: 0,
    note: 'En 2008, pour son rôle d’Édith Piaf. C’est le premier Oscar d’interprétation décerné pour un rôle joué en français.',
  },
  {
    id: 'cin-18', theme: 'cinema',
    niveau: 2,
    texte: 'Quel réalisateur apparaissait furtivement dans presque tous ses films ?',
    reponses: ['Alfred Hitchcock', 'Stanley Kubrick', 'Orson Welles', 'Billy Wilder'],
    bonne: 0,
    note: 'Une quarantaine d’apparitions. Il les plaçait très tôt dans le film, pour que le public cesse de les guetter et regarde enfin l’histoire.',
  },
  {
    id: 'cin-19', theme: 'cinema',
    niveau: 1,
    texte: 'Quel acteur joue Driss dans « Intouchables » ?',
    reponses: ['Omar Sy', 'Jamel Debbouze', 'Fabrice Éboué', 'Thomas Ngijol'],
    bonne: 0,
    note: 'Le rôle lui a valu le César du meilleur acteur en 2012, face à Jean Dujardin la même année que « The Artist ».',
  },
  {
    id: 'cin-20', theme: 'cinema',
    niveau: 1,
    texte: 'Quelle série espagnole met en scène le braquage de la Maison royale de la Monnaie ?',
    reponses: ['La Casa de Papel', 'Élite', 'Narcos', 'Vis a vis'],
    bonne: 0,
    note: 'Un échec à sa diffusion espagnole, sauvée par un rachat international qui en a fait la série non anglophone la plus vue de son époque.',
  },

  /* --- Années 2000 ------------------------------------------------------- */
  {
    id: 'an2-01', theme: 'annees2000',
    niveau: 2,
    texte: 'En quelle année Facebook a-t-il été lancé ?',
    reponses: ['2004', '2002', '2006', '2008'],
    bonne: 0,
    note: 'Février 2004, réservé au départ aux étudiants de Harvard.',
  },
  {
    id: 'an2-02', theme: 'annees2000',
    niveau: 2,
    texte: 'En quelle année le premier iPhone est-il sorti ?',
    reponses: ['2007', '2005', '2009', '2010'],
    bonne: 0,
    note: '2007. Il ne savait ni copier-coller, ni filmer, ni installer d’applications.',
  },
  {
    id: 'an2-03', theme: 'annees2000',
    niveau: 2,
    texte: 'En quelle année « Loft Story » a-t-il été diffusé en France ?',
    reponses: ['2001', '2003', '1999', '2005'],
    bonne: 0,
    note: '2001. La télé-réalité française commence là, avec une piscine et un poulailler.',
  },
  {
    id: 'an2-04', theme: 'annees2000',
    niveau: 2,
    texte: 'Quelle console portable Nintendo est sortie en 2004 ?',
    reponses: ['La DS', 'La Game Boy Advance', 'La 3DS', 'La Switch'],
    bonne: 0,
    note: 'La DS, pour « double screen ». Personne n’y croyait face à la PSP.',
  },
  {
    id: 'an2-05', theme: 'annees2000',
    niveau: 1,
    texte: 'Qui a gagné la première Star Academy en France ?',
    reponses: ['Jenifer', 'Nolwenn Leroy', 'Élodie Frégé', 'Magalie Vaé'],
    bonne: 0,
    note: 'Jenifer, en janvier 2002. Nolwenn Leroy gagne la saison suivante.',
  },
  {
    id: 'an2-06', theme: 'annees2000',
    niveau: 2,
    texte: 'Quel groupe chantait « Dragostea din tei » ?',
    reponses: ['O-Zone', 'Las Ketchup', 'Crazy Frog', 'Eiffel 65'],
    bonne: 0,
    note: 'Un trio moldave, en 2004. Tout le monde l’a chantée, personne n’en connaît les paroles.',
  },
  {
    id: 'an2-07', theme: 'annees2000',
    niveau: 2,
    texte: 'Sur MSN Messenger, comment faisait-on trembler la fenêtre d’un contact ?',
    reponses: ['Un wizz', 'Un poke', 'Un buzz-off', 'Un shake'],
    bonne: 0,
    note: 'Le wizz. Trois d’affilée, et l’amitié était terminée.',
  },
  {
    id: 'an2-08', theme: 'annees2000',
    niveau: 2,
    texte: 'Quelle console Sony est sortie en 2000 ?',
    reponses: ['La PlayStation 2', 'La PlayStation 3', 'La PSP', 'La PlayStation'],
    bonne: 0,
    note: 'La PS2, console la plus vendue de l’histoire — et lecteur DVD d’entrée de gamme pour beaucoup de foyers.',
  },
  {
    id: 'an2-09', theme: 'annees2000',
    niveau: 1,
    texte: 'En quelle année les pièces et billets en euros sont-ils arrivés en France ?',
    reponses: ['2002', '1999', '2000', '2004'],
    bonne: 0,
    note: 'Le 1ᵉʳ janvier 2002. L’euro existait déjà depuis 1999, mais seulement sur les comptes.',
  },
  {
    id: 'an2-10', theme: 'annees2000',
    niveau: 1,
    texte: 'Quel film de 2009 a battu le record du box-office mondial ?',
    reponses: ['Avatar', 'Titanic', 'Le Seigneur des anneaux', 'Harry Potter'],
    bonne: 0,
    note: 'Avatar, du même réalisateur que « Titanic », qu’il détrônait ainsi lui-même.',
  },
  {
    id: 'an2-11', theme: 'annees2000',
    niveau: 3,
    texte: 'Sous quel nom Twitter a-t-il été lancé en 2006 ?',
    reponses: ['Twttr', 'Chirp', 'Status', 'Jabber'],
    bonne: 0,
    note: 'Sans voyelles, comme Flickr et Tumblr à la même époque : les noms de domaine courts valaient déjà une fortune.',
  },
  {
    id: 'an2-12', theme: 'annees2000',
    niveau: 1,
    texte: 'Quel appareil Apple a été lancé en 2001 avec « mille chansons dans votre poche » ?',
    reponses: ['L’iPod', 'L’iPhone', 'L’iMac', 'L’iPad'],
    bonne: 0,
    note: 'Cinq gigaoctets et une molette. La presse a trouvé l’objet cher et sans intérêt : il a sauvé l’entreprise.',
  },
  {
    id: 'an2-13', theme: 'annees2000',
    niveau: 1,
    texte: 'Quelle série médicale lancée en 2005 suit une interne nommée Meredith ?',
    reponses: ['Grey’s Anatomy', 'Dr House', 'Urgences', 'Scrubs'],
    bonne: 0,
    note: 'Grey’s Anatomy, du nom d’un manuel d’anatomie de 1858 — et du nom de l’héroïne, les deux à la fois.',
  },
  {
    id: 'an2-14', theme: 'annees2000',
    niveau: 1,
    texte: 'Quel disque le baladeur MP3 a-t-il chassé de nos poches ?',
    reponses: ['Le CD', 'Le vinyle', 'La disquette', 'Le DVD'],
    bonne: 0,
    note: 'Le disque compact, et son défaut rédhibitoire en marchant : il sautait au moindre pas, malgré les « anti-choc » de dix secondes.',
  },
  {
    id: 'an2-15', theme: 'annees2000',
    niveau: 2,
    texte: 'Quelle plateforme française de blogs a dominé les années 2000 avant Facebook ?',
    reponses: ['Skyblog', 'MySpace', 'Caramail', 'Copains d’avant'],
    bonne: 0,
    note: 'Lancée par une radio en 2002, elle a hébergé plus de trente millions de blogs avant de fermer ses pages en 2023.',
  },
  {
    id: 'an2-16', theme: 'annees2000',
    niveau: 1,
    texte: 'Quelle chanteuse américaine chantait « Toxic » en 2003 ?',
    reponses: ['Britney Spears', 'Christina Aguilera', 'Beyoncé', 'Pink'],
    bonne: 0,
    note: 'Le riff vient d’un film indien de 1981 : les producteurs ont échantillonné une chanson de Bollywood, ce qui n’a été remarqué que des années plus tard.',
  },
  {
    id: 'an2-17', theme: 'annees2000',
    niveau: 2,
    texte: 'Quel jeu vidéo de 2004 se déroule dans l’État imaginaire de San Andreas ?',
    reponses: ['GTA San Andreas', 'Driver 3', 'Mafia', 'Saints Row'],
    bonne: 0,
    note: 'Trois villes, une campagne entière et un avion : à sa sortie, c’était le plus vaste monde ouvert jamais proposé sur une console.',
  },
  {
    id: 'an2-18', theme: 'annees2000',
    niveau: 2,
    texte: 'Quelle boisson énergisante a bâti sa publicité sur des ailes, dans les années 2000 ?',
    reponses: ['Red Bull', 'Monster', 'Burn', 'Dark Dog'],
    bonne: 0,
    note: 'La recette vient de Thaïlande, où elle était vendue aux chauffeurs routiers. L’Autrichien qui l’a goûtée en voyage en a fait une marque mondiale.',
  },
  {
    id: 'an2-19', theme: 'annees2000',
    niveau: 3,
    texte: 'Quel groupe américain chantait « Mr. Brightside » en 2004 ?',
    reponses: ['The Killers', 'Franz Ferdinand', 'The Strokes', 'Kaiser Chiefs'],
    bonne: 0,
    note: 'Le morceau est resté classé au Royaume-Uni pendant plus de dix ans sans interruption — un record qu’aucune chanson n’a approché.',
  },
  {
    id: 'an2-20', theme: 'annees2000',
    niveau: 3,
    texte: 'Quel site de vidéos a été racheté par Google en 2006 ?',
    reponses: ['YouTube', 'Dailymotion', 'Vimeo', 'Metacafe'],
    bonne: 0,
    note: 'Un milliard six cent cinquante millions de dollars, pour un site né un an et demi plus tôt au-dessus d’une pizzeria californienne.',
  },

  /* --- Bouffe ------------------------------------------------------------ */
  {
    id: 'bof-01', theme: 'bouffe',
    niveau: 2,
    texte: 'Quelle épice donne sa couleur au risotto milanais ?',
    reponses: ['Le safran', 'Le curcuma', 'Le paprika', 'Le carvi'],
    bonne: 0,
    note: 'Le safran — l’épice la plus chère du monde, parce qu’il faut des milliers de fleurs pour un seul kilo.',
  },
  {
    id: 'bof-02', theme: 'bouffe',
    niveau: 2,
    texte: 'Que veut dire « tiramisu » en italien ?',
    reponses: ['Tire-moi vers le haut', 'Petit gâteau', 'Café du soir', 'Doux réconfort'],
    bonne: 0,
    note: 'Littéralement « tire-moi vers le haut » : le café et le sucre étaient censés remonter le moral.',
  },
  {
    id: 'bof-03', theme: 'bouffe',
    niveau: 1,
    texte: 'Quel fromage entre dans une vraie tartiflette ?',
    reponses: ['Le reblochon', 'Le comté', 'Le beaufort', 'Le morbier'],
    bonne: 0,
    note: 'Le reblochon. Le plat a d’ailleurs été inventé dans les années 1980 pour en écouler davantage.',
  },
  {
    id: 'bof-04', theme: 'bouffe',
    niveau: 1,
    texte: 'Quels sont les trois ingrédients d’une béchamel ?',
    reponses: ['Beurre, farine, lait', 'Beurre, œuf, lait', 'Crème, farine, lait', 'Huile, farine, eau'],
    bonne: 0,
    note: 'Un roux — beurre et farine — puis le lait versé petit à petit. Tout le reste n’est que patience.',
  },
  {
    id: 'bof-05', theme: 'bouffe',
    niveau: 1,
    texte: 'Quel fruit est la base du guacamole ?',
    reponses: ['L’avocat', 'La courgette', 'Le concombre', 'Le poivron vert'],
    bonne: 0,
    note: 'L’avocat, qui est bien un fruit — et même une baie, techniquement.',
  },
  {
    id: 'bof-06', theme: 'bouffe',
    niveau: 3,
    texte: 'Combien de variétés de fromages de Gaulle citait-il pour décrire la France ?',
    reponses: ['246', '365', '112', '1000'],
    bonne: 0,
    note: '« Comment voulez-vous gouverner un pays où il existe 246 variétés de fromage ? »',
  },
  {
    id: 'bof-07', theme: 'bouffe',
    niveau: 1,
    texte: 'Quel alcool entre dans un mojito ?',
    reponses: ['Le rhum', 'La vodka', 'La tequila', 'Le gin'],
    bonne: 0,
    note: 'Rhum, citron vert, menthe, sucre, eau gazeuse. Avec de la vodka, ça devient autre chose.',
  },
  {
    id: 'bof-08', theme: 'bouffe',
    niveau: 2,
    texte: 'De quelle partie du canard vient le magret ?',
    reponses: ['Le filet de la poitrine', 'La cuisse', 'L’aile', 'Le cou'],
    bonne: 0,
    note: 'Le filet de poitrine, et seulement s’il vient d’un canard engraissé — sinon c’est un simple filet.',
  },
  {
    id: 'bof-09', theme: 'bouffe',
    niveau: 2,
    texte: 'De quel animal vient le lait de la mozzarella traditionnelle ?',
    reponses: ['La bufflonne', 'La vache', 'La brebis', 'La chèvre'],
    bonne: 0,
    note: 'La mozzarella di bufala campana. Celle au lait de vache existe aussi, mais elle porte un autre nom : fior di latte.',
  },
  {
    id: 'bof-10', theme: 'bouffe',
    niveau: 3,
    texte: 'Quelle molécule donne son piquant au piment ?',
    reponses: ['La capsaïcine', 'La pipérine', 'L’allicine', 'Le menthol'],
    bonne: 0,
    note: 'La capsaïcine ne brûle rien : elle trompe les capteurs de chaleur. C’est la pipérine qui pique dans le poivre, et ce n’est pas le même feu.',
  },
  {
    id: 'bof-11', theme: 'bouffe',
    niveau: 3,
    texte: 'D’où vient l’idée que Marco Polo aurait rapporté les pâtes de Chine ?',
    reponses: ['D’une revue professionnelle américaine', 'D’un récit de voyage', 'D’un manuscrit vénitien', 'D’un roman du XIXᵉ siècle'],
    bonne: 0,
    note: 'Un article des années 1920, écrit pour vendre des pâtes aux États-Unis. On en mangeait en Italie bien avant le voyage de Marco Polo.',
  },
  {
    id: 'bof-12', theme: 'bouffe',
    niveau: 3,
    texte: 'Comment obtient-on le plus souvent un champagne rosé ?',
    reponses: ['En mélangeant du vin blanc et du vin rouge', 'En pressant très vite du raisin noir', 'En laissant le raisin sécher au soleil', 'En ajoutant un colorant naturel'],
    bonne: 0,
    note: 'La Champagne est la seule région française autorisée à faire son rosé en mélangeant du blanc et du rouge. Partout ailleurs, c’est interdit.',
  },
  {
    id: 'bof-13', theme: 'bouffe',
    niveau: 1,
    texte: 'Quelle céréale sert à faire le risotto ?',
    reponses: ['Le riz', 'Le blé', 'L’orge', 'L’épeautre'],
    bonne: 0,
    note: 'Un riz rond et riche en amidon — arborio ou carnaroli. C’est cet amidon, libéré en remuant, qui fait la crème, et non la crème.',
  },
  {
    id: 'bof-14', theme: 'bouffe',
    niveau: 1,
    texte: 'De quelle région d’Espagne la paella est-elle originaire ?',
    reponses: ['Valence', 'L’Andalousie', 'La Catalogne', 'Le Pays basque'],
    bonne: 0,
    note: 'À Valence, la vraie se fait au lapin et au poulet, parfois aux escargots. Les fruits de mer sont une version côtière, et le chorizo une hérésie locale.',
  },
  {
    id: 'bof-15', theme: 'bouffe',
    niveau: 1,
    texte: 'Quelle pâtisserie française est faite de deux coques et d’une garniture ?',
    reponses: ['Le macaron', 'Le canelé', 'Le financier', 'La madeleine'],
    bonne: 0,
    note: 'La coque tient à la meringue et à la poudre d’amande. La version à deux coques, elle, n’a qu’un siècle : elle est née chez un pâtissier parisien.',
  },
  {
    id: 'bof-16', theme: 'bouffe',
    niveau: 1,
    texte: 'Quel fromage italien entre dans un tiramisu ?',
    reponses: ['Le mascarpone', 'La ricotta', 'Le gorgonzola', 'La burrata'],
    bonne: 0,
    note: 'Un fromage à la crème, pas un fromage à pâte : on le fabrique en faisant cailler de la crème, sans presque aucun égouttage.',
  },
  {
    id: 'bof-17', theme: 'bouffe',
    niveau: 2,
    texte: 'De quel légume tire-t-on le sucre produit en France ?',
    reponses: ['La betterave', 'La canne', 'Le maïs', 'La pomme de terre'],
    bonne: 0,
    note: 'La betterave sucrière, cultivée dans le Nord et en Picardie. C’est le blocus napoléonien, privant la France de canne, qui a lancé la filière.',
  },
  {
    id: 'bof-18', theme: 'bouffe',
    niveau: 3,
    texte: 'Combien de temps une pâte à crêpes doit-elle reposer, selon la tradition ?',
    reponses: ['Une heure', 'Cinq minutes', 'Une nuit entière', 'Trois heures'],
    bonne: 0,
    note: 'Une heure suffit : le temps que l’amidon absorbe le liquide et que le gluten se détende. Au-delà, on ne gagne plus grand-chose.',
  },

  /* --- Insolite ---------------------------------------------------------- */
  {
    id: 'ins-01', theme: 'insolite',
    niveau: 2,
    texte: 'Combien de cœurs a une pieuvre ?',
    reponses: ['3', '1', '2', '5'],
    bonne: 0,
    note: 'Trois : deux pour les branchies, un pour le reste du corps — qui s’arrête quand elle nage.',
  },
  {
    id: 'ins-02', theme: 'insolite',
    niveau: 2,
    texte: 'De quelle couleur est le sang d’une pieuvre ?',
    reponses: ['Bleu', 'Rouge', 'Vert', 'Transparent'],
    bonne: 0,
    note: 'Bleu : il transporte l’oxygène avec du cuivre, là où le nôtre utilise du fer.',
  },
  {
    id: 'ins-03', theme: 'insolite',
    niveau: 1,
    texte: 'Quel animal est incapable de sauter ?',
    reponses: ['L’éléphant', 'Le rhinocéros', 'L’hippopotame', 'La girafe'],
    bonne: 0,
    note: 'L’éléphant : il a toujours au moins un pied au sol. Trop lourd pour se réceptionner.',
  },
  {
    id: 'ins-04', theme: 'insolite',
    niveau: 2,
    texte: 'Combien d’os y a-t-il dans le squelette d’un requin ?',
    reponses: ['Aucun', '68', '112', '206'],
    bonne: 0,
    note: 'Aucun : son squelette est entièrement en cartilage, plus léger que l’os.',
  },
  {
    id: 'ins-05', theme: 'insolite',
    niveau: 2,
    texte: 'Au bout de combien de temps le miel devient-il impropre à la consommation ?',
    reponses: ['Jamais', 'Deux ans', 'Dix ans', 'Cinquante ans'],
    bonne: 0,
    note: 'Jamais, s’il reste fermé : on a retrouvé du miel comestible dans des tombes égyptiennes.',
  },
  {
    id: 'ins-06', theme: 'insolite',
    niveau: 3,
    texte: 'Combien de dents un escargot possède-t-il, environ ?',
    reponses: ['Plus de 10 000', 'Aucune', '32', '200'],
    bonne: 0,
    note: 'Des milliers de minuscules dents alignées sur sa langue râpeuse, la radula.',
  },
  {
    id: 'ins-07', theme: 'insolite',
    niveau: 3,
    texte: 'Quelle partie du corps humain ne contient aucun vaisseau sanguin ?',
    reponses: ['La cornée', 'Le lobe de l’oreille', 'L’ongle', 'Le tympan'],
    bonne: 0,
    note: 'La cornée : elle prend son oxygène directement dans l’air. C’est aussi pourquoi une greffe y est si bien tolérée.',
  },
  {
    id: 'ins-08', theme: 'insolite',
    niveau: 3,
    texte: 'Pourquoi les bananes sont-elles très légèrement radioactives ?',
    reponses: ['À cause du potassium', 'À cause des pesticides', 'À cause du transport', 'Elles ne le sont pas'],
    bonne: 0,
    note: 'Le potassium naturel est un peu radioactif. Il en faudrait des millions d’un coup pour que ça compte.',
  },
  {
    id: 'ins-09', theme: 'insolite',
    niveau: 3,
    texte: 'Pourquoi une pomme flotte-t-elle dans l’eau ?',
    reponses: ['Elle contient un quart d’air', 'Sa peau est cirée', 'Elle est plus légère que l’eau douce', 'Elle contient du sucre'],
    bonne: 0,
    note: 'Environ un quart de son volume est de l’air. D’où la pêche aux pommes des fêtes foraines.',
  },
  {
    id: 'ins-10', theme: 'insolite',
    niveau: 1,
    texte: 'Quel est l’animal terrestre le plus rapide ?',
    reponses: ['Le guépard', 'L’antilope', 'Le lévrier', 'Le cheval'],
    bonne: 0,
    note: 'Le guépard, autour de cent kilomètres-heure — mais seulement sur quelques centaines de mètres.',
  },
  {
    id: 'ins-11', theme: 'insolite',
    niveau: 1,
    texte: 'Quel animal peut regarder dans deux directions à la fois ?',
    reponses: ['Le caméléon', 'Le hibou', 'Le crapaud', 'Le lézard'],
    bonne: 0,
    note: 'Ses yeux bougent indépendamment l’un de l’autre — mais pour viser une proie, il les ramène ensemble : la vision en relief lui sert à juger la distance.',
  },
  {
    id: 'ins-12', theme: 'insolite',
    niveau: 2,
    texte: 'Quelle partie du corps humain ne se répare jamais toute seule ?',
    reponses: ['Les dents', 'Les os', 'La peau', 'Le foie'],
    bonne: 0,
    note: 'L’émail dentaire est le seul tissu du corps sans cellules vivantes : une fois entamé, rien ne le reconstruit. Le foie, lui, repousse.',
  },
  {
    id: 'ins-13', theme: 'insolite',
    niveau: 2,
    texte: 'Combien de temps la lumière du Soleil met-elle à nous parvenir ?',
    reponses: ['Huit minutes', 'Une seconde', 'Une heure', 'Un jour'],
    bonne: 0,
    note: 'Huit minutes et vingt secondes. Le Soleil qu’on regarde est toujours celui d’il y a huit minutes.',
  },

  /* --- Sport -------------------------------------------------------------- */
  {
    id: 'spo-01', theme: 'sport',
    niveau: 1,
    texte: 'En quelle année la France a-t-elle remporté sa première Coupe du monde de football ?',
    reponses: ['1998', '1994', '2002', '1986'],
    bonne: 0,
    note: 'À domicile, contre le Brésil, trois buts à zéro. Zidane en marque deux de la tête, lui qui n’en marquait presque jamais.',
  },
  {
    id: 'spo-02', theme: 'sport',
    niveau: 1,
    texte: 'De quelle couleur est le maillot du leader du Tour de France ?',
    reponses: ['Jaune', 'Vert', 'Blanc à pois rouges', 'Arc-en-ciel'],
    bonne: 0,
    note: 'Jaune comme le papier de L’Auto, le journal qui organisait la course : le leader devait se repérer de loin dans le peloton.',
  },
  {
    id: 'spo-03', theme: 'sport',
    niveau: 1,
    texte: 'Sur quelle surface se joue le tournoi de Wimbledon ?',
    reponses: ['Le gazon', 'La terre battue', 'Le dur', 'La moquette'],
    bonne: 0,
    note: 'Le dernier tournoi du Grand Chelem sur herbe. La balle y rebondit bas et vite, ce qui avantage les gros serveurs.',
  },
  {
    id: 'spo-04', theme: 'sport',
    niveau: 2,
    texte: 'Combien de points vaut un essai au rugby à XV ?',
    reponses: ['5', '3', '4', '7'],
    bonne: 0,
    note: 'Cinq depuis 1992 — il n’en valait que trois dans les années 1970. La transformation ajoute deux points de plus.',
  },
  {
    id: 'spo-05', theme: 'sport',
    niveau: 1,
    texte: 'Quel pays a remporté le plus de Coupes du monde de football ?',
    reponses: ['Le Brésil', 'L’Allemagne', 'L’Italie', 'L’Argentine'],
    bonne: 0,
    note: 'Cinq titres — et le seul pays à avoir disputé toutes les éditions depuis 1930.',
  },
  {
    id: 'spo-06', theme: 'sport',
    niveau: 2,
    texte: 'Quel basketteur est surnommé « His Airness » ?',
    reponses: ['Michael Jordan', 'LeBron James', 'Kobe Bryant', 'Magic Johnson'],
    bonne: 0,
    note: 'Six finales NBA, six titres, six fois meilleur joueur de ces finales. Il n’a jamais perdu une finale.',
  },
  {
    id: 'spo-07', theme: 'sport',
    niveau: 2,
    texte: 'Quel sport a été pratiqué sur la Lune ?',
    reponses: ['Le golf', 'Le lancer de poids', 'Le saut en hauteur', 'La course'],
    bonne: 0,
    note: 'Alan Shepard avait caché une tête de club dans ses bagages. Deux balles frappées à une main, en 1971, pendant Apollo 14.',
  },
  {
    id: 'spo-08', theme: 'sport',
    niveau: 3,
    texte: 'Combien de temps dure un match de basket en NBA ?',
    reponses: ['48 minutes', '40 minutes', '60 minutes', '45 minutes'],
    bonne: 0,
    note: 'Quatre quart-temps de douze minutes. En Europe, c’est quarante minutes, en quatre fois dix.',
  },
  {
    id: 'spo-09', theme: 'sport',
    niveau: 3,
    texte: 'Que signifie le mot « judo » ?',
    reponses: ['La voie de la souplesse', 'La main vide', 'La voie du guerrier', 'Le poing fermé'],
    bonne: 0,
    note: 'Jū, la souplesse, et dō, la voie. « Karaté », lui, veut dire « la main vide ».',
  },
  {
    id: 'spo-10', theme: 'sport',
    niveau: 1,
    texte: 'Que représentent les cinq anneaux olympiques ?',
    reponses: ['Les cinq continents', 'Les cinq disciplines d’origine', 'Les cinq premiers pays inscrits', 'Les cinq vertus du sportif'],
    bonne: 0,
    note: 'Cinq continents entrelacés. Les six couleurs, fond blanc compris, permettaient de composer le drapeau de n’importe quel pays de l’époque.',
  },
  {
    id: 'spo-11', theme: 'sport',
    niveau: 1,
    texte: 'Qui détient le record du monde du 100 mètres ?',
    reponses: ['Usain Bolt', 'Carl Lewis', 'Yohan Blake', 'Tyson Gay'],
    bonne: 0,
    note: 'Neuf secondes cinquante-huit, à Berlin en 2009. Personne ne s’en est approché depuis.',
  },
  {
    id: 'spo-12', theme: 'sport',
    niveau: 1,
    texte: 'Dans quel sport frappe-t-on un volant ?',
    reponses: ['Le badminton', 'Le squash', 'Le tennis de table', 'Le padel'],
    bonne: 0,
    note: 'Le volant est l’objet le plus rapide de tous les sports de raquette au moment de la frappe — et le plus lent quand il retombe.',
  },
  {
    id: 'spo-13', theme: 'sport',
    niveau: 2,
    texte: 'Combien de joueurs une équipe de handball aligne-t-elle sur le terrain ?',
    reponses: ['Sept', 'Six', 'Cinq', 'Onze'],
    bonne: 0,
    note: 'Six joueurs de champ et un gardien. La France est la seule nation à avoir été championne olympique, du monde et d’Europe en même temps.',
  },
  {
    id: 'spo-14', theme: 'sport',
    niveau: 2,
    texte: 'Dans quelle ville se sont tenus les premiers Jeux olympiques modernes ?',
    reponses: ['Athènes', 'Paris', 'Londres', 'Rome'],
    bonne: 0,
    note: 'En 1896, à l’initiative de Pierre de Coubertin. Quatorze nations, deux cent quarante et un athlètes, et aucune femme.',
  },
  {
    id: 'spo-15', theme: 'sport',
    niveau: 1,
    texte: 'Quel tournoi du Grand Chelem se joue sur terre battue ?',
    reponses: ['Roland-Garros', 'Wimbledon', 'L’US Open', 'L’Open d’Australie'],
    bonne: 0,
    note: 'La terre battue n’est pas de la terre : c’est de la brique pilée, étalée en une couche de deux millimètres sur du calcaire.',
  },
  {
    id: 'spo-16', theme: 'sport',
    niveau: 1,
    texte: 'Quelle distance parcourt-on dans un marathon ?',
    reponses: ['42,195 km', '40 km', '45 km', '38,5 km'],
    bonne: 0,
    note: 'Les cent quatre-vingt-quinze mètres en trop viennent de Londres en 1908 : il fallait que l’arrivée tombe devant la loge royale.',
  },
  {
    id: 'spo-17', theme: 'sport',
    niveau: 2,
    texte: 'Quel club a remporté le plus de Ligues des champions ?',
    reponses: ['Le Real Madrid', 'Le Milan AC', 'Le Bayern Munich', 'Liverpool'],
    bonne: 0,
    note: 'Plus du double de son premier poursuivant. Le club a gagné les cinq premières éditions de la compétition, de 1956 à 1960.',
  },
  {
    id: 'spo-18', theme: 'sport',
    niveau: 3,
    texte: 'Dans quel sport réalise-t-on un « strike » ?',
    reponses: ['Le bowling', 'Le base-ball', 'Le curling', 'Le tir à l’arc'],
    bonne: 0,
    note: 'Au bowling, c’est abattre les dix quilles du premier lancer. Au base-ball, le mot désigne exactement l’inverse : une balle manquée.',
  },

  /* --- Le monde ----------------------------------------------------------- */
  {
    id: 'mon-01', theme: 'monde',
    niveau: 3,
    texte: 'Quel est le plus grand désert du monde ?',
    reponses: ['L’Antarctique', 'Le Sahara', 'Le Gobi', 'Le Kalahari'],
    bonne: 0,
    note: 'Un désert se définit par ce qui lui tombe dessus, pas par sa température : il neige moins sur l’Antarctique qu’il ne pleut sur le Sahara.',
  },
  {
    id: 'mon-02', theme: 'monde',
    niveau: 2,
    texte: 'Quel pays possède le plus long littoral du monde ?',
    reponses: ['Le Canada', 'La Russie', 'L’Indonésie', 'L’Australie'],
    bonne: 0,
    note: 'Plus de 200 000 kilomètres avec les îles de l’Arctique — de quoi faire cinq fois le tour de la Terre.',
  },
  {
    id: 'mon-03', theme: 'monde',
    niveau: 2,
    texte: 'Quelle est la capitale du Canada ?',
    reponses: ['Ottawa', 'Toronto', 'Montréal', 'Vancouver'],
    bonne: 0,
    note: 'Choisie en 1857 précisément parce qu’elle ne faisait d’ombre à personne : Toronto et Montréal se disputaient le titre.',
  },
  {
    id: 'mon-04', theme: 'monde',
    niveau: 1,
    texte: 'Quel détroit sépare l’Europe de l’Afrique ?',
    reponses: ['Le détroit de Gibraltar', 'Le Bosphore', 'Les Dardanelles', 'Le canal de Suez'],
    bonne: 0,
    note: 'Quatorze kilomètres au plus étroit. Le Bosphore, lui, sépare l’Europe de l’Asie.',
  },
  {
    id: 'mon-05', theme: 'monde',
    niveau: 3,
    texte: 'Quel pays est entièrement entouré par l’Afrique du Sud ?',
    reponses: ['Le Lesotho', 'L’Eswatini', 'Le Botswana', 'Le Zimbabwe'],
    bonne: 0,
    note: 'L’un des trois seuls pays au monde enclavés dans un seul autre — avec Saint-Marin et le Vatican, tous deux dans l’Italie.',
  },
  {
    id: 'mon-06', theme: 'monde',
    niveau: 1,
    texte: 'Quelle grande ville est traversée par le Bosphore ?',
    reponses: ['Istanbul', 'Athènes', 'Le Caire', 'Bucarest'],
    bonne: 0,
    note: 'La seule grande ville posée sur deux continents. On y traverse d’Europe en Asie en vingt minutes de ferry.',
  },
  {
    id: 'mon-07', theme: 'monde',
    niveau: 1,
    texte: 'Quel est le plus petit État du monde ?',
    reponses: ['Le Vatican', 'Monaco', 'Nauru', 'Saint-Marin'],
    bonne: 0,
    note: 'Quarante-quatre hectares. On en fait le tour à pied en une demi-heure, passeport en poche.',
  },
  {
    id: 'mon-08', theme: 'monde',
    niveau: 2,
    texte: 'Dans quel pays se trouve la ville de Tombouctou ?',
    reponses: ['Le Mali', 'Le Niger', 'Le Tchad', 'La Mauritanie'],
    bonne: 0,
    note: 'Au bord du Niger. Elle a longtemps servi de synonyme du bout du monde en français, faute de voyageurs qui en revenaient.',
  },
  {
    id: 'mon-09', theme: 'monde',
    niveau: 2,
    texte: 'Quelle est la capitale de la Nouvelle-Zélande ?',
    reponses: ['Wellington', 'Auckland', 'Christchurch', 'Dunedin'],
    bonne: 0,
    note: 'Wellington, et non Auckland, pourtant bien plus peuplée. Le cas se répète souvent : Canberra, Ottawa, Washington.',
  },
  {
    id: 'mon-10', theme: 'monde',
    niveau: 2,
    texte: 'Sur quel continent se trouve le Suriname ?',
    reponses: ['L’Amérique du Sud', 'L’Afrique', 'L’Asie', 'L’Océanie'],
    bonne: 0,
    note: 'Coincé entre le Guyana et la Guyane française. C’est le seul pays d’Amérique du Sud où l’on parle néerlandais.',
  },
  {
    id: 'mon-11', theme: 'monde',
    niveau: 1,
    texte: 'Laquelle de ces étendues d’eau est la plus salée ?',
    reponses: ['La mer Morte', 'La Méditerranée', 'La mer Baltique', 'Le golfe Persique'],
    bonne: 0,
    note: 'Près de dix fois plus salée que l’océan — on y flotte sans effort. Et techniquement, c’est un lac.',
  },
  {
    id: 'mon-12', theme: 'monde',
    niveau: 2,
    texte: 'Quelle chaîne de montagnes marque la frontière entre l’Europe et l’Asie ?',
    reponses: ['L’Oural', 'Le Caucase', 'Les Carpates', 'L’Altaï'],
    bonne: 0,
    note: 'Deux mille kilomètres du nord au sud. La frontière reste une convention : géologiquement, rien ne sépare les deux.',
  },
  {
    id: 'mon-13', theme: 'monde',
    niveau: 2,
    texte: 'Quel pays compte aujourd’hui le plus d’habitants ?',
    reponses: ['L’Inde', 'La Chine', 'Les États-Unis', 'L’Indonésie'],
    bonne: 0,
    note: 'L’Inde est passée devant la Chine en 2023. Les deux pays réunis pèsent plus du tiers de l’humanité.',
  },
  {
    id: 'mon-14', theme: 'monde',
    niveau: 1,
    texte: 'Quelle est la plus haute montagne du monde ?',
    reponses: ['L’Everest', 'Le K2', 'Le mont Blanc', 'Le Kilimandjaro'],
    bonne: 0,
    note: 'Huit mille huit cent quarante-neuf mètres, et quelques millimètres de plus chaque année : la plaque indienne continue de pousser.',
  },
  {
    id: 'mon-15', theme: 'monde',
    niveau: 1,
    texte: 'Quel fleuve traverse Le Caire ?',
    reponses: ['Le Nil', 'L’Euphrate', 'Le Jourdain', 'Le Niger'],
    bonne: 0,
    note: 'Le Nil, qui coule du sud vers le nord — ce qui déroute toujours ceux qui lisent une carte en pensant que l’eau descend vers le bas.',
  },
  {
    id: 'mon-16', theme: 'monde',
    niveau: 1,
    texte: 'Combien d’États composent les États-Unis ?',
    reponses: ['Cinquante', 'Cinquante-deux', 'Quarante-huit', 'Cinquante et un'],
    bonne: 0,
    note: 'Cinquante depuis 1959, année où Alaska et Hawaï ont rejoint l’Union. Les cinquante étoiles du drapeau sont là pour le rappeler.',
  },
  {
    id: 'mon-17', theme: 'monde',
    niveau: 1,
    texte: 'Quelle est la langue officielle du Brésil ?',
    reponses: ['Le portugais', 'L’espagnol', 'Le brésilien', 'Le portugais et l’espagnol'],
    bonne: 0,
    note: 'Héritage du traité de Tordesillas, qui en 1494 partageait le monde connu entre l’Espagne et le Portugal le long d’un méridien.',
  },
  {
    id: 'mon-18', theme: 'monde',
    niveau: 2,
    texte: 'Quel canal relie la Méditerranée à la mer Rouge ?',
    reponses: ['Le canal de Suez', 'Le canal de Panama', 'Le Bosphore', 'Le canal de Corinthe'],
    bonne: 0,
    note: 'Cent quatre-vingt-treize kilomètres sans une seule écluse : les deux mers sont au même niveau, ce qui a dispensé de tout ouvrage.',
  },

  /* --- Marques & pubs ----------------------------------------------------- */
  {
    id: 'mar-01', theme: 'marques',
    niveau: 1,
    texte: 'Quelle marque a pour slogan « Just Do It » ?',
    reponses: ['Nike', 'Adidas', 'Reebok', 'Puma'],
    bonne: 0,
    note: 'Trouvé en 1988. Le publicitaire a raconté s’être inspiré des derniers mots d’un condamné à mort américain.',
  },
  {
    id: 'mar-02', theme: 'marques',
    niveau: 2,
    texte: 'Quelles marques deux frères allemands brouillés à mort ont-ils fondées, chacun de son côté ?',
    reponses: ['Adidas et Puma', 'Nike et Reebok', 'Lacoste et Le Coq Sportif', 'Fila et Kappa'],
    bonne: 0,
    note: 'Adolf et Rudolf Dassler, deux usines de part et d’autre de la rivière d’Herzogenaurach. La ville en est restée coupée en deux pendant des décennies.',
  },
  {
    id: 'mar-03', theme: 'marques',
    niveau: 1,
    texte: 'Quel animal figure sur les polos Lacoste ?',
    reponses: ['Un crocodile', 'Un caïman', 'Un lézard', 'Un iguane'],
    bonne: 0,
    note: 'René Lacoste était surnommé « le Crocodile » sur les courts de tennis, pour la façon dont il ne lâchait jamais un point.',
  },
  {
    id: 'mar-04', theme: 'marques',
    niveau: 1,
    texte: 'De quel pays vient la marque IKEA ?',
    reponses: ['La Suède', 'La Norvège', 'Le Danemark', 'La Finlande'],
    bonne: 0,
    note: 'IKEA, ce sont les initiales du fondateur, Ingvar Kamprad, puis celles de la ferme et du village où il a grandi.',
  },
  {
    id: 'mar-05', theme: 'marques',
    niveau: 1,
    texte: 'Quelle marque automobile a pour emblème un cheval cabré sur fond jaune ?',
    reponses: ['Ferrari', 'Porsche', 'Lamborghini', 'Maserati'],
    bonne: 0,
    note: 'Le cheval venait d’un as de l’aviation italienne de la Grande Guerre ; le jaune, c’est la couleur de Modène, la ville d’Enzo Ferrari.',
  },
  {
    id: 'mar-06', theme: 'marques',
    niveau: 3,
    texte: 'Que veut dire le nom « Nike » ?',
    reponses: ['La victoire', 'La vitesse', 'L’envol', 'Le courage'],
    bonne: 0,
    note: 'Nikê, la déesse grecque de la Victoire. Le logo est censé dessiner son aile.',
  },
  {
    id: 'mar-07', theme: 'marques',
    niveau: 2,
    texte: 'Quelle boisson a d’abord été vendue en pharmacie comme remède ?',
    reponses: ['Le Coca-Cola', 'Le Perrier', 'L’Orangina', 'Le Schweppes'],
    bonne: 0,
    note: 'En 1886, à cinq cents le verre, contre les maux de tête et l’épuisement. Il a fallu attendre des années pour qu’on le boive par plaisir.',
  },
  {
    id: 'mar-08', theme: 'marques',
    niveau: 2,
    texte: 'Quelle maison de luxe a commencé par fabriquer des malles de voyage ?',
    reponses: ['Louis Vuitton', 'Chanel', 'Hermès', 'Dior'],
    bonne: 0,
    note: 'Sa malle à fond plat, empilable, a remplacé les coffres bombés du XIXᵉ siècle. Hermès, lui, est parti des harnais et des selles.',
  },
  {
    id: 'mar-09', theme: 'marques',
    niveau: 1,
    texte: '« Parce que je le vaux bien » est le slogan de quelle marque ?',
    reponses: ['L’Oréal', 'Nivea', 'Dove', 'Yves Rocher'],
    bonne: 0,
    note: 'Écrit en 1971 par une rédactrice d’à peine plus de vingt ans, qui voulait une phrase où la femme achète pour elle et non pour plaire.',
  },
  {
    id: 'mar-10', theme: 'marques',
    niveau: 1,
    texte: 'Quel type de produit Amazon a-t-il vendu en premier ?',
    reponses: ['Des livres', 'Des disques', 'Des jouets', 'De l’électroménager'],
    bonne: 0,
    note: 'Un livre d’informatique, en 1995. Le site ne vendait que ça pendant ses premières années.',
  },
  {
    id: 'mar-11', theme: 'marques',
    niveau: 2,
    texte: 'D’où vient le nom « Google » ?',
    reponses: ['D’un nombre gigantesque', 'D’une paire de lunettes', 'D’un mot inventé sans aucun sens', 'D’une ville de Californie'],
    bonne: 0,
    note: 'Du « gogol » : un 1 suivi de cent zéros. La faute d’orthographe faite en déposant le nom n’a jamais été corrigée.',
  },
  {
    id: 'mar-12', theme: 'marques',
    niveau: 3,
    texte: 'Quel constructeur automobile a été fondé par un fabricant de métiers à tisser ?',
    reponses: ['Toyota', 'Honda', 'Nissan', 'Subaru'],
    bonne: 0,
    note: 'Les métiers à tisser Toyoda, avant que le fils du fondateur ne se lance dans l’automobile. Le nom a changé d’une lettre : « Toyota » s’écrit en huit traits en japonais, un chiffre porte-bonheur.',
  },
  {
    id: 'mar-13', theme: 'marques',
    niveau: 1,
    texte: 'Quelle marque a pour logo une pomme croquée ?',
    reponses: ['Apple', 'Orange', 'Blackberry', 'Sony'],
    bonne: 0,
    note: 'La morsure servait d’abord à l’échelle : sans elle, à petite taille, la pomme se confondait avec une cerise.',
  },
  {
    id: 'mar-14', theme: 'marques',
    niveau: 1,
    texte: 'Quelle marque automobile a pour emblème quatre anneaux entrelacés ?',
    reponses: ['Audi', 'Volvo', 'Opel', 'Mazda'],
    bonne: 0,
    note: 'Quatre anneaux pour quatre constructeurs fusionnés en 1932. Le nom, lui, est la traduction latine du patronyme du fondateur, Horch — « écoute ».',
  },
  {
    id: 'mar-15', theme: 'marques',
    niveau: 1,
    texte: 'Quelle maison de couture a été fondée par une modiste surnommée Coco ?',
    reponses: ['Chanel', 'Dior', 'Givenchy', 'Balmain'],
    bonne: 0,
    note: 'Elle a commencé par des chapeaux, puis a libéré les femmes du corset en leur mettant du jersey, un tissu réservé jusque-là aux sous-vêtements masculins.',
  },
  {
    id: 'mar-16', theme: 'marques',
    niveau: 2,
    texte: 'Quel fabricant de jouets danois tire son nom de « joue bien » ?',
    reponses: ['Lego', 'Playmobil', 'Brio', 'Meccano'],
    bonne: 0,
    note: '« Leg godt » en danois. Heureuse coïncidence : en latin, « lego » veut dire « j’assemble ».',
  },
  {
    id: 'mar-17', theme: 'marques',
    niveau: 2,
    texte: 'Quel constructeur automobile a produit la Coccinelle ?',
    reponses: ['Volkswagen', 'Fiat', 'Citroën', 'Renault'],
    bonne: 0,
    note: 'Vingt et un millions d’exemplaires en soixante-cinq ans de production, sans changer de silhouette — un record qu’aucune voiture n’a repris.',
  },
  {
    id: 'mar-18', theme: 'marques',
    niveau: 3,
    texte: 'Quelle boisson gazeuse a été inventée par un pharmacien de Caroline du Nord ?',
    reponses: ['Le Pepsi', 'Le Dr Pepper', 'Le Schweppes', 'Le Canada Dry'],
    bonne: 0,
    note: 'Vendue d’abord comme remède digestif sous le nom de « Brad’s Drink », rebaptisée en 1898 d’après la dyspepsie qu’elle prétendait soigner.',
  },

  /* --- Mots & expressions -------------------------------------------------- */
  {
    id: 'mot-01', theme: 'mots',
    niveau: 2,
    texte: 'De quoi le mot « salaire » tire-t-il son origine ?',
    reponses: ['Du sel', 'D’une pièce romaine', 'Du mot « salut »', 'D’un magistrat'],
    bonne: 0,
    note: 'Du salarium romain : les soldats recevaient une ration de sel, ou de quoi l’acheter. Le sel valait cher, il conservait tout.',
  },
  {
    id: 'mot-02', theme: 'mots',
    niveau: 2,
    texte: 'De quelle langue le français a-t-il repris le mot « alcool » ?',
    reponses: ['L’arabe', 'Le latin', 'Le grec', 'L’espagnol'],
    bonne: 0,
    note: 'D’al-kuhl, une poudre obtenue par sublimation. De là l’idée de quintessence, puis d’esprit-de-vin, puis de ce qu’on met dans les verres.',
  },
  {
    id: 'mot-03', theme: 'mots',
    niveau: 1,
    texte: 'Comment appelle-t-on un mot qui se lit pareil dans les deux sens ?',
    reponses: ['Un palindrome', 'Une anagramme', 'Un homonyme', 'Un acronyme'],
    bonne: 0,
    note: '« Kayak », « ressasser », et la phrase que tout le monde ressort : « Ésope reste ici et se repose ».',
  },
  {
    id: 'mot-04', theme: 'mots',
    niveau: 3,
    texte: 'D’où vient le mot « bougie » ?',
    reponses: ['D’une ville d’Algérie', 'Du nom d’un fabricant', 'D’un mot latin', 'D’une plante à cire'],
    bonne: 0,
    note: 'De Béjaïa, appelée Bougie en français : c’est elle qui exportait la cire vers l’Europe médiévale.',
  },
  {
    id: 'mot-05', theme: 'mots',
    niveau: 3,
    texte: 'Que signifie l’acronyme « laser » ?',
    reponses: ['Une amplification de la lumière', 'Une lentille à haute énergie', 'Un rayon de chaleur dirigé', 'Rien : c’est un nom de marque'],
    bonne: 0,
    note: 'Light Amplification by Stimulated Emission of Radiation. Le maser, son grand frère, faisait la même chose avec des micro-ondes.',
  },
  {
    id: 'mot-06', theme: 'mots',
    niveau: 1,
    texte: 'Quelle langue compte le plus de locuteurs pour qui elle est la langue maternelle ?',
    reponses: ['Le mandarin', 'L’anglais', 'L’espagnol', 'L’hindi'],
    bonne: 0,
    note: 'Le mandarin, très largement. L’anglais ne repasse devant que si l’on compte tous ceux qui l’ont appris ensuite.',
  },
  {
    id: 'mot-07', theme: 'mots',
    niveau: 3,
    texte: 'De quelle langue le mot « ketchup » vient-il à l’origine ?',
    reponses: ['D’un dialecte chinois', 'De l’anglais', 'De l’espagnol', 'Du hindi'],
    bonne: 0,
    note: 'D’un mot du sud de la Chine qui désignait une saumure de poisson. La tomate n’est entrée dans la recette que bien plus tard.',
  },
  {
    id: 'mot-08', theme: 'mots',
    niveau: 2,
    texte: 'Que veut dire le « bis » d’une adresse, comme au 12 bis ?',
    reponses: ['Deux fois', 'Le suivant', 'Le petit', 'L’annexe'],
    bonne: 0,
    note: 'Du latin bis, « deux fois ». Après bis vient ter, puis quater — et là, le facteur commence à souffrir.',
  },
  {
    id: 'mot-09', theme: 'mots',
    niveau: 3,
    texte: 'Comment appelle-t-on une phrase qui contient toutes les lettres de l’alphabet ?',
    reponses: ['Un pangramme', 'Un lipogramme', 'Un idiome', 'Un calligramme'],
    bonne: 0,
    note: 'Les imprimeurs s’en servaient pour montrer une police entière. Un lipogramme, c’est l’inverse : un texte qui s’interdit une lettre.',
  },
  {
    id: 'mot-10', theme: 'mots',
    niveau: 1,
    texte: 'Que désigne un « sobriquet » ?',
    reponses: ['Un surnom', 'Une injure', 'Un compliment forcé', 'Un titre honorifique'],
    bonne: 0,
    note: 'Un surnom, souvent moqueur. Le mot est vieux de sept siècles et n’a jamais été très gentil.',
  },
  {
    id: 'mot-11', theme: 'mots',
    niveau: 1,
    texte: 'Que signifie l’expression latine « carpe diem » ?',
    reponses: ['Cueille le jour', 'Le jour se lève', 'Chaque jour compte', 'Prends garde au jour'],
    bonne: 0,
    note: 'Une image de jardinage chez Horace : on cueille la journée comme un fruit mûr, parce qu’elle ne se garde pas.',
  },
  {
    id: 'mot-12', theme: 'mots',
    niveau: 2,
    texte: 'Que veut dire « éponyme » ?',
    reponses: ['Qui donne son nom à autre chose', 'Qui porte le même nom qu’un autre', 'Qui est resté célèbre', 'Qui se répète à l’identique'],
    bonne: 0,
    note: 'Le héros éponyme d’un roman, c’est celui qui lui donne son titre — et jamais l’inverse, contrairement à ce qu’on entend partout.',
  },
  {
    id: 'mot-13', theme: 'mots',
    niveau: 1,
    texte: 'Comment appelle-t-on un mot formé des initiales d’autres mots et qui se prononce ?',
    reponses: ['Un acronyme', 'Un anagramme', 'Un synonyme', 'Un homonyme'],
    bonne: 0,
    note: 'OVNI et radar sont des acronymes ; SNCF n’en est pas un, puisqu’on l’épelle. Celui-là, c’est un sigle.',
  },
  {
    id: 'mot-14', theme: 'mots',
    niveau: 1,
    texte: 'Que veut dire « procrastiner » ?',
    reponses: ['Remettre au lendemain', 'Travailler trop', 'Changer d’avis', 'Parler pour ne rien dire'],
    bonne: 0,
    note: 'Du latin « cras », demain. Le mot existe en français depuis le XVIe siècle : la chose, elle, est sans doute plus ancienne.',
  },
  {
    id: 'mot-15', theme: 'mots',
    niveau: 2,
    texte: 'Quel est le mot le plus long du dictionnaire français courant ?',
    reponses: ['Anticonstitutionnellement', 'Intergouvernemental', 'Désobligeamment', 'Hippopotomonstrueux'],
    bonne: 0,
    note: 'Vingt-cinq lettres. Les chimistes font beaucoup plus long, mais leurs mots ne sont pas dans le dictionnaire.',
  },
  {
    id: 'mot-16', theme: 'mots',
    niveau: 2,
    texte: 'Comment appelle-t-on la peur du vide ?',
    reponses: ['L’acrophobie', 'L’agoraphobie', 'La claustrophobie', 'La kénophobie'],
    bonne: 0,
    note: 'L’agoraphobie, souvent confondue avec elle, est la peur des espaces ouverts et des foules — pas celle de tomber.',
  },
  {
    id: 'mot-17', theme: 'mots',
    niveau: 3,
    texte: 'De quelle langue le mot « bistrot » viendrait-il, selon la légende la plus répandue ?',
    reponses: ['Du russe', 'De l’italien', 'Du néerlandais', 'Du breton'],
    bonne: 0,
    note: '« Bystro », vite, qu’auraient lancé les soldats russes occupant Paris en 1814. Les linguistes n’y croient pas : le mot n’apparaît qu’en 1884.',
  },
  {
    id: 'mot-18', theme: 'mots',
    niveau: 3,
    texte: 'Comment appelle-t-on une phrase qui garde un sens en changeant la place des mots ?',
    reponses: ['Une anastrophe', 'Une périphrase', 'Un pléonasme', 'Une litote'],
    bonne: 0,
    note: 'L’anastrophe inverse l’ordre attendu : « de ce monde, il n’est plus ». Yoda en a fait une carrière.',
  },

  /* --- Disney & Pixar ------------------------------------------------------ */
  //
  // Des questions SUR des films : des dates, des noms, des faits de production.
  // Rien de tout cela n'appartient à personne. Ce qui appartient au studio, ce
  // sont les images, les logos, la typographie et les paroles — on n'en emploie
  // aucun, et le nom du thème décrit le sujet sans prétendre à un partenariat.
  {
    id: 'dis-01', theme: 'disney',
    niveau: 1,
    texte: 'Quel est le premier long métrage d’animation des studios Disney ?',
    reponses: ['Blanche-Neige et les Sept Nains', 'Pinocchio', 'Fantasia', 'Dumbo'],
    bonne: 0,
    note: 'Sorti en 1937. La profession l’appelait « la folie de Disney » : personne ne croyait qu’un public tiendrait plus d’une heure devant un dessin animé.',
  },
  {
    id: 'dis-02', theme: 'disney',
    niveau: 1,
    texte: 'Quel est le premier long métrage entièrement réalisé en images de synthèse ?',
    reponses: ['Toy Story', 'Shrek', 'Fourmiz', 'Le Géant de fer'],
    bonne: 0,
    note: 'Toy Story, en 1995. Les jouets ont été choisis parce que le plastique était ce que la technique de l’époque savait le mieux imiter.',
  },
  {
    id: 'dis-03', theme: 'disney',
    niveau: 2,
    texte: 'Dans quelle ville imaginaire se déroule « Aladdin » ?',
    reponses: ['Agrabah', 'Askaban', 'Zamunda', 'Gondor'],
    bonne: 0,
    note: 'Agrabah, dont le nom ne renvoie à aucune ville réelle.',
  },
  {
    id: 'dis-04', theme: 'disney',
    niveau: 1,
    texte: 'Comment s’appelle le père de Nemo ?',
    reponses: ['Marlin', 'Dory', 'Gill', 'Bloat'],
    bonne: 0,
    note: 'Marlin — du nom du poisson, le marlin, alors que lui est un poisson-clown.',
  },
  {
    id: 'dis-05', theme: 'disney',
    niveau: 1,
    texte: 'Dans « Le Livre de la jungle », comment s’appelle l’ours ?',
    reponses: ['Baloo', 'Bagheera', 'Shere Khan', 'Kaa'],
    bonne: 0,
    note: 'Baloo signifie simplement « ours » en hindi. Kipling n’a pas cherché plus loin.',
  },
  {
    id: 'dis-06', theme: 'disney',
    niveau: 1,
    texte: 'Comment s’appelle le rat cuisinier de « Ratatouille » ?',
    reponses: ['Rémy', 'Émile', 'Django', 'Linguini'],
    bonne: 0,
    note: 'Rémy. Émile est son frère, Django leur père, et Linguini le jeune homme qu’il pilote par les cheveux.',
  },
  {
    id: 'dis-07', theme: 'disney',
    niveau: 2,
    texte: 'Quel studio Disney a-t-il racheté en 2006 ?',
    reponses: ['Pixar', 'DreamWorks', 'Ghibli', 'Aardman'],
    bonne: 0,
    note: 'Sept milliards et demi de dollars. Steve Jobs, principal actionnaire de Pixar, est devenu du même coup le premier actionnaire individuel de Disney.',
  },
  {
    id: 'dis-08', theme: 'disney',
    niveau: 2,
    texte: 'Quel personnage apparaît pour la première fois dans « Steamboat Willie », en 1928 ?',
    reponses: ['Mickey Mouse', 'Donald Duck', 'Dingo', 'Pluto'],
    bonne: 0,
    note: 'Ce n’est pas son tout premier dessin animé, mais c’est le premier distribué — et l’un des premiers avec un son synchronisé.',
  },
  {
    id: 'dis-09', theme: 'disney',
    niveau: 1,
    texte: 'Dans « Là-haut », qu’est-ce qui fait décoller la maison ?',
    reponses: ['Des milliers de ballons', 'Une montgolfière', 'Une tornade', 'Des hélices'],
    bonne: 0,
    note: 'Dans la réalité il en faudrait des millions : la maison pèse infiniment plus que ce que quelques milliers de ballons peuvent soulever.',
  },
  {
    id: 'dis-10', theme: 'disney',
    niveau: 2,
    texte: 'Quel était le prénom complet de Walt Disney ?',
    reponses: ['Walter', 'Walton', 'Wallace', 'Walden'],
    bonne: 0,
    note: 'Walter Elias Disney. « Walt » est le diminutif qu’il a fait entrer dans le nom du studio.',
  },
  {
    id: 'dis-11', theme: 'disney',
    niveau: 1,
    texte: 'Dans « La Reine des neiges », comment s’appelle la sœur d’Elsa ?',
    reponses: ['Anna', 'Ariel', 'Aurore', 'Astrid'],
    bonne: 0,
    note: 'Anna. Les deux prénoms viennent du conte d’Andersen dont le film s’éloigne beaucoup.',
  },
  {
    id: 'dis-12', theme: 'disney',
    niveau: 1,
    texte: 'Quel film Pixar se déroule presque entièrement dans la tête d’une fillette ?',
    reponses: ['Vice-versa', 'Coco', 'Soul', 'En avant'],
    bonne: 0,
    note: 'Vice-versa. Les scénaristes ont consulté des chercheurs en psychologie des émotions pendant toute l’écriture.',
  },
  {
    id: 'dis-13', theme: 'disney',
    niveau: 2,
    texte: 'Dans « Toy Story », comment s’appelle le petit garçon à qui appartiennent les jouets ?',
    reponses: ['Andy', 'Sid', 'Woody', 'Al'],
    bonne: 0,
    note: 'Andy. Sid est le voisin qui démonte les siens.',
  },
  {
    id: 'dis-14', theme: 'disney',
    niveau: 2,
    texte: 'De quelle pièce de Shakespeare « Le Roi Lion » reprend-il la trame ?',
    reponses: ['Hamlet', 'Macbeth', 'Le Roi Lear', 'Othello'],
    bonne: 0,
    note: 'Un oncle tue le roi, prend le trône, et le fils exilé revient. C’est Hamlet, avec une fin heureuse.',
  },
  {
    id: 'dis-15', theme: 'disney',
    niveau: 3,
    texte: 'Quel compositeur signe la musique de « La Petite Sirène », « La Belle et la Bête » et « Aladdin » ?',
    reponses: ['Alan Menken', 'Hans Zimmer', 'Randy Newman', 'Michael Giacchino'],
    bonne: 0,
    note: 'Alan Menken, l’homme du renouveau des années 90. Zimmer, lui, a signé « Le Roi Lion ».',
  },
  {
    id: 'dis-16', theme: 'disney',
    niveau: 1,
    texte: 'Quel film Pixar met en scène des monstres qui récoltent les cris des enfants ?',
    reponses: ['Monstres & Cie', 'Cars', 'WALL-E', 'Les Indestructibles'],
    bonne: 0,
    note: 'Monstres & Cie. Toute l’intrigue tient à une découverte industrielle : le rire produit bien plus d’énergie que la peur.',
  },
  {
    id: 'dis-17', theme: 'disney',
    niveau: 3,
    texte: 'Quel film a valu à Pixar son premier Oscar du meilleur film d’animation ?',
    reponses: ['Le Monde de Nemo', 'Toy Story 2', 'Monstres & Cie', 'Les Indestructibles'],
    bonne: 0,
    note: 'En 2004. La catégorie n’existait que depuis trois ans, et Pixar l’a ensuite remportée onze fois.',
  },
  {
    id: 'dis-18', theme: 'disney',
    niveau: 1,
    texte: 'Dans « Cendrillon », que perd l’héroïne en quittant le bal ?',
    reponses: ['Une pantoufle de verre', 'Un collier', 'Un gant', 'Un ruban'],
    bonne: 0,
    note: 'Le verre vient peut-être d’une erreur de copiste — « vair », la fourrure d’écureuil, se prononce pareil. Perrault, lui, a bien écrit « verre ».',
  },
  {
    id: 'dis-19', theme: 'disney',
    niveau: 2,
    texte: 'Quel personnage Disney a pour conscience un criquet nommé Jiminy ?',
    reponses: ['Pinocchio', 'Peter Pan', 'Bambi', 'Dumbo'],
    bonne: 0,
    note: 'C’est lui qui chante « Quand on prie la bonne étoile », devenu l’hymne du studio et le générique de tous ses films.',
  },
  {
    id: 'dis-20', theme: 'disney',
    niveau: 1,
    texte: 'Combien de dalmatiens compte le film de 1961 ?',
    reponses: ['Cent un', 'Quatre-vingt-dix-neuf', 'Cent', 'Cent deux'],
    bonne: 0,
    note: 'Quatre-vingt-dix-neuf chiots plus Pongo et Perdita. Le film a été le premier du studio à utiliser la photocopie pour reporter les dessins.',
  },

  /* --- Les régions de France ----------------------------------------------- */
  //
  // Un thème, treize régions, et au moins une question pour chacune : une table
  // où personne ne vient du même endroit doit y trouver la sienne. Les questions
  // portent sur ce qui se sait — préfectures, frontières, superficies — et non
  // sur des tours de force administratifs.
  {
    id: 'reg-01', theme: 'regions',
    niveau: 1,
    texte: 'Quelle est la préfecture de la région Bretagne ?',
    reponses: ['Rennes', 'Brest', 'Quimper', 'Vannes'],
    bonne: 0,
    note: 'Rennes. Brest est plus connue à l’étranger, mais c’est Rennes qui administre.',
  },
  {
    id: 'reg-02', theme: 'regions',
    niveau: 1,
    texte: 'De quelle région Lyon est-elle la préfecture ?',
    reponses: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Provence-Alpes-Côte d’Azur', 'Occitanie'],
    bonne: 0,
    note: 'Auvergne-Rhône-Alpes, née en 2016 de la fusion de l’Auvergne et de Rhône-Alpes.',
  },
  {
    id: 'reg-03', theme: 'regions',
    niveau: 2,
    texte: 'Combien de départements compte la Corse ?',
    reponses: ['Deux', 'Un', 'Trois', 'Quatre'],
    bonne: 0,
    note: 'La Haute-Corse et la Corse-du-Sud. L’île n’en formait qu’un seul jusqu’en 1976.',
  },
  {
    id: 'reg-04', theme: 'regions',
    niveau: 2,
    texte: 'Quelle est la plus vaste région de France métropolitaine ?',
    reponses: ['Nouvelle-Aquitaine', 'Occitanie', 'Grand Est', 'Auvergne-Rhône-Alpes'],
    bonne: 0,
    note: 'Quatre-vingt-quatre mille kilomètres carrés : plus grande que l’Autriche.',
  },
  {
    id: 'reg-05', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle région se trouve le Mont-Saint-Michel ?',
    reponses: ['Normandie', 'Bretagne', 'Pays de la Loire', 'Centre-Val de Loire'],
    bonne: 0,
    note: 'En Normandie, dans la Manche — et c’est une querelle vieille de plusieurs siècles avec la Bretagne, que le fleuve Couesnon a tranchée en changeant de lit.',
  },
  {
    id: 'reg-06', theme: 'regions',
    niveau: 1,
    texte: 'Quelle région est née en 2016 de la fusion de l’Alsace, de la Lorraine et de la Champagne-Ardenne ?',
    reponses: ['Le Grand Est', 'Les Hauts-de-France', 'La Bourgogne-Franche-Comté', 'Le Centre-Val de Loire'],
    bonne: 0,
    note: 'Le Grand Est. Le nom, provisoire au départ, est resté faute de mieux.',
  },
  {
    id: 'reg-07', theme: 'regions',
    niveau: 1,
    texte: 'Quelle est la préfecture des Hauts-de-France ?',
    reponses: ['Lille', 'Amiens', 'Arras', 'Calais'],
    bonne: 0,
    note: 'Lille. Amiens était la préfecture de l’ancienne Picardie, absorbée dans la fusion.',
  },
  {
    id: 'reg-08', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle région produit-on le chablis ?',
    reponses: ['Bourgogne-Franche-Comté', 'Grand Est', 'Centre-Val de Loire', 'Nouvelle-Aquitaine'],
    bonne: 0,
    note: 'Dans l’Yonne, à la pointe nord de la Bourgogne — plus près de Paris que de Beaune.',
  },
  {
    id: 'reg-09', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle région se trouvent les châteaux de Chambord et de Chenonceau ?',
    reponses: ['Centre-Val de Loire', 'Pays de la Loire', 'Nouvelle-Aquitaine', 'Bourgogne-Franche-Comté'],
    bonne: 0,
    note: 'Centre-Val de Loire. Les châteaux dits « de la Loire » sont pour la plupart sur ses affluents, pas sur le fleuve.',
  },
  {
    id: 'reg-10', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle région randonne-t-on sur le GR 20 ?',
    reponses: ['Corse', 'Provence-Alpes-Côte d’Azur', 'Occitanie', 'Auvergne-Rhône-Alpes'],
    bonne: 0,
    note: 'En Corse : cent quatre-vingts kilomètres du nord au sud de l’île, souvent présentés comme le sentier de grande randonnée le plus difficile d’Europe.',
  },
  {
    id: 'reg-11', theme: 'regions',
    niveau: 1,
    texte: 'Quelle région française compte le plus d’habitants ?',
    reponses: ['L’Île-de-France', 'L’Auvergne-Rhône-Alpes', 'La Nouvelle-Aquitaine', 'L’Occitanie'],
    bonne: 0,
    note: 'Environ douze millions, soit près d’un Français sur cinq sur deux pour cent du territoire.',
  },
  {
    id: 'reg-12', theme: 'regions',
    niveau: 1,
    texte: 'Quelle est la préfecture de l’Occitanie ?',
    reponses: ['Toulouse', 'Montpellier', 'Nîmes', 'Perpignan'],
    bonne: 0,
    note: 'Toulouse. Montpellier, préfecture de l’ancien Languedoc-Roussillon, garde le conseil régional en partage.',
  },
  {
    id: 'reg-13', theme: 'regions',
    niveau: 1,
    texte: 'De quelle région Nantes est-elle la préfecture ?',
    reponses: ['Pays de la Loire', 'Bretagne', 'Centre-Val de Loire', 'Nouvelle-Aquitaine'],
    bonne: 0,
    note: 'Pays de la Loire — ce qui alimente depuis 1955 une discussion sans fin sur son appartenance à la Bretagne historique.',
  },
  {
    id: 'reg-14', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle région se trouvent les gorges du Verdon ?',
    reponses: ['Provence-Alpes-Côte d’Azur', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Corse'],
    bonne: 0,
    note: 'Sept cents mètres de profondeur : le plus grand canyon d’Europe.',
  },
  {
    id: 'reg-15', theme: 'regions',
    niveau: 2,
    texte: 'Quelle région borde à la fois la mer Méditerranée et les Pyrénées ?',
    reponses: ['L’Occitanie', 'La Nouvelle-Aquitaine', 'La Provence-Alpes-Côte d’Azur', 'La Corse'],
    bonne: 0,
    note: 'L’Occitanie, de Cerbère à la frontière espagnole jusqu’à la Camargue : la seule région à toucher les Pyrénées et la Méditerranée.',
  },
  {
    id: 'reg-16', theme: 'regions',
    niveau: 1,
    texte: 'De quelle région le kouign-amann est-il originaire ?',
    reponses: ['La Bretagne', 'La Normandie', 'Les Hauts-de-France', 'Les Pays de la Loire'],
    bonne: 0,
    note: 'De Douarnenez, vers 1860. Le nom signifie « gâteau au beurre » en breton, ce qui est un euphémisme.',
  },
  {
    id: 'reg-17', theme: 'regions',
    niveau: 2,
    texte: 'Quelle est la préfecture de la Bourgogne-Franche-Comté ?',
    reponses: ['Dijon', 'Besançon', 'Auxerre', 'Belfort'],
    bonne: 0,
    note: 'Dijon, alors que Besançon garde le rectorat et la cour d’appel : la fusion de 2016 a partagé les institutions entre les deux villes.',
  },
  {
    id: 'reg-18', theme: 'regions',
    niveau: 2,
    texte: 'Dans quelle ville se trouve la Cité du Vin ?',
    reponses: ['Bordeaux', 'Beaune', 'Reims', 'Montpellier'],
    bonne: 0,
    note: 'Ouverte en 2016 sur les quais de la Garonne. Sa forme est censée évoquer le vin qui tourne dans un verre.',
  },
  {
    id: 'reg-19', theme: 'regions',
    niveau: 2,
    texte: 'Quel massif de volcans endormis domine Clermont-Ferrand ?',
    reponses: ['La chaîne des Puys', 'Le Vercors', 'Le Morvan', 'Les Maures'],
    bonne: 0,
    note: 'Quatre-vingts volcans alignés sur trente kilomètres, inscrits à l’UNESCO en 2018. Le dernier s’est réveillé il y a sept mille ans.',
  },
  {
    id: 'reg-20', theme: 'regions',
    niveau: 3,
    texte: 'Quel département français compte le plus d’habitants ?',
    reponses: ['Le Nord', 'Les Bouches-du-Rhône', 'Paris', 'Le Rhône'],
    bonne: 0,
    note: 'Deux millions six cent mille habitants, devant Paris. C’est aussi le département qui compte le plus de communes après l’Aisne.',
  },

  /* --- Nature --------------------------------------------------------------- */

  {
    id: 'nat-01', theme: 'nature',
    niveau: 1,
    texte: 'Quel arbre produit les glands ?',
    reponses: ['Le chêne', 'Le hêtre', 'Le châtaignier', 'Le frêne'],
    bonne: 0,
    note: 'Le chêne. Le hêtre produit des faînes, et le châtaignier des châtaignes dans une bogue piquante.',
  },
  {
    id: 'nat-02', theme: 'nature',
    niveau: 1,
    texte: 'De quoi se nourrit presque exclusivement le panda géant ?',
    reponses: ['De bambou', 'D’eucalyptus', 'De fougères', 'De roseaux'],
    bonne: 0,
    note: 'Du bambou, une douzaine de kilos par jour. Son tube digestif est resté celui d’un carnivore : il digère si mal qu’il doit manger sans arrêt.',
  },
  {
    id: 'nat-03', theme: 'nature',
    niveau: 3,
    texte: 'Quel oiseau atteint la plus grande vitesse en piqué ?',
    reponses: ['Le faucon pèlerin', 'L’aigle royal', 'Le martinet noir', 'Le condor des Andes'],
    bonne: 0,
    note: 'Plus de trois cents kilomètres-heure en piqué. C’est l’animal le plus rapide de la planète, toutes catégories confondues.',
  },
  {
    id: 'nat-04', theme: 'nature',
    niveau: 2,
    texte: 'De quelle couleur est le sang d’un poulpe ?',
    reponses: ['Bleu', 'Rouge', 'Vert', 'Transparent'],
    bonne: 0,
    note: 'Bleu : son sang transporte l’oxygène avec du cuivre, pas du fer. Pratique dans une eau froide et pauvre en oxygène.',
  },
  {
    id: 'nat-05', theme: 'nature',
    niveau: 2,
    texte: 'Quel est le plus grand félin sauvage ?',
    reponses: ['Le tigre', 'Le lion', 'Le jaguar', 'Le léopard des neiges'],
    bonne: 0,
    note: 'Le tigre, et notamment celui de Sibérie : trois mètres du museau au bout de la queue, plus de trois cents kilos.',
  },
  {
    id: 'nat-06', theme: 'nature',
    niveau: 3,
    texte: 'Quel arbre détient le record de hauteur ?',
    reponses: ['Le séquoia', 'L’eucalyptus', 'Le baobab', 'Le douglas'],
    bonne: 0,
    note: 'Le séquoia à feuilles d’if : le plus haut connu culmine à cent seize mètres, soit un immeuble de trente-cinq étages.',
  },
  {
    id: 'nat-07', theme: 'nature',
    niveau: 3,
    texte: 'Quel oiseau fait chaque année l’aller-retour entre l’Arctique et l’Antarctique ?',
    reponses: ['La sterne arctique', 'L’albatros hurleur', 'La cigogne blanche', 'L’oie des neiges'],
    bonne: 0,
    note: 'La sterne arctique, soixante-dix mille kilomètres par an. Sur une vie, cela fait trois allers-retours jusqu’à la Lune.',
  },
  {
    id: 'nat-08', theme: 'nature',
    niveau: 1,
    texte: 'Où se trouve la Grande Barrière de corail ?',
    reponses: ['Au large de l’Australie', 'Au large du Brésil', 'Aux Maldives', 'Au large du Mexique'],
    bonne: 0,
    note: 'Deux mille trois cents kilomètres le long du Queensland. C’est la plus grande structure jamais bâtie par des êtres vivants.',
  },
  {
    id: 'nat-09', theme: 'nature',
    niveau: 1,
    texte: 'Quel animal produit la soie dont on fait les tissus ?',
    reponses: ['Le ver à soie', 'L’araignée tisseuse', 'La chenille processionnaire', 'Le criquet'],
    bonne: 0,
    note: 'La chenille du bombyx du mûrier. Un seul cocon donne un fil continu de près d’un kilomètre.',
  },
  {
    id: 'nat-10', theme: 'nature',
    niveau: 2,
    texte: 'Quel pigment donne leur couleur verte aux feuilles ?',
    reponses: ['La chlorophylle', 'La mélanine', 'Le carotène', 'L’anthocyane'],
    bonne: 0,
    note: 'La chlorophylle. À l’automne elle se dégrade, et les pigments jaunes et orangés qui étaient là depuis le début se voient enfin.',
  },
  {
    id: 'nat-11', theme: 'nature',
    niveau: 1,
    texte: 'Comment appelle-t-on un animal qui ne se nourrit que de plantes ?',
    reponses: ['Un herbivore', 'Un carnivore', 'Un omnivore', 'Un insectivore'],
    bonne: 0,
    note: 'Un herbivore. Le panda, lui, est un carnivore par la plaque et un herbivore par le menu : c’est tout son problème digestif.',
  },
  {
    id: 'nat-12', theme: 'nature',
    niveau: 2,
    texte: 'Quel mammifère pond des œufs ?',
    reponses: ['L’ornithorynque', 'Le pangolin', 'Le tatou', 'La taupe'],
    bonne: 0,
    note: 'L’ornithorynque, avec l’échidné : les deux seuls mammifères à pondre. Les premiers spécimens envoyés en Europe ont été pris pour des faux.',
  },

  /* --- Histoire ------------------------------------------------------------- */

  {
    id: 'his-01', theme: 'histoire',
    niveau: 1,
    texte: 'En quelle année la Bastille a-t-elle été prise ?',
    reponses: ['1789', '1792', '1776', '1804'],
    bonne: 0,
    note: 'Le 14 juillet 1789. Il n’y avait que sept prisonniers à l’intérieur : c’est la poudre stockée là qui intéressait les assaillants.',
  },
  {
    id: 'his-02', theme: 'histoire',
    niveau: 1,
    texte: 'Qui a été le premier empereur des Français ?',
    reponses: ['Napoléon Bonaparte', 'Charlemagne', 'Louis-Philippe', 'Napoléon III'],
    bonne: 0,
    note: 'Sacré en 1804 à Notre-Dame. Le pape était venu, mais c’est Napoléon qui s’est couronné lui-même.',
  },
  {
    id: 'his-03', theme: 'histoire',
    niveau: 2,
    texte: 'Quel roi a fait de Versailles le siège du pouvoir ?',
    reponses: ['Louis XIV', 'Louis XIII', 'François Iᵉʳ', 'Henri IV'],
    bonne: 0,
    note: 'En 1682. L’idée était d’avoir la noblesse à l’œil : à Versailles, un courtisan absent perdait sa place.',
  },
  {
    id: 'his-04', theme: 'histoire',
    niveau: 2,
    texte: 'Quelle civilisation a bâti la cité du Machu Picchu ?',
    reponses: ['Les Incas', 'Les Mayas', 'Les Aztèques', 'Les Olmèques'],
    bonne: 0,
    note: 'Les Incas, vers 1450. Les conquistadors ne l’ont jamais trouvée : elle est restée oubliée jusqu’en 1911.',
  },
  {
    id: 'his-05', theme: 'histoire',
    niveau: 2,
    texte: 'Quel roi d’Angleterre a eu six épouses ?',
    reponses: ['Henri VIII', 'Richard III', 'Charles Iᵉʳ', 'Jacques Iᵉʳ'],
    bonne: 0,
    note: 'Deux répudiées, deux décapitées, une morte en couches, une qui lui a survécu. C’est pour divorcer de la première qu’il a rompu avec Rome.',
  },
  {
    id: 'his-06', theme: 'histoire',
    niveau: 3,
    texte: 'Combien de temps a duré la guerre de Cent Ans ?',
    reponses: ['116 ans', '100 ans', '87 ans', '132 ans'],
    bonne: 0,
    note: 'De 1337 à 1453, soit cent seize ans — et avec de longues trêves au milieu. Le nom a été donné bien après, par des historiens du XIXᵉ siècle.',
  },
  {
    id: 'his-07', theme: 'histoire',
    niveau: 2,
    texte: 'Qui a été la première femme à recevoir un prix Nobel ?',
    reponses: ['Marie Curie', 'Bertha von Suttner', 'Selma Lagerlöf', 'Irène Joliot-Curie'],
    bonne: 0,
    note: 'En 1903, en physique. Elle en a reçu un second en chimie en 1911 : personne d’autre n’a été primé dans deux sciences différentes.',
  },
  {
    id: 'his-08', theme: 'histoire',
    niveau: 3,
    texte: 'Quel empereur romain a fait de Byzance sa capitale ?',
    reponses: ['Constantin', 'Auguste', 'Dioclétien', 'Justinien'],
    bonne: 0,
    note: 'En 330, et la ville a pris son nom : Constantinople. Elle est devenue Istanbul seize siècles plus tard.',
  },
  {
    id: 'his-09', theme: 'histoire',
    niveau: 2,
    texte: 'Quel tombeau Howard Carter a-t-il ouvert en 1922 ?',
    reponses: ['Celui de Toutânkhamon', 'Celui de Ramsès II', 'Celui de Khéops', 'Celui de Néfertiti'],
    bonne: 0,
    note: 'Un pharaon mineur, mort vers dix-huit ans — mais le seul retrouvé intact, avec cinq mille objets et un masque de onze kilos d’or.',
  },
  {
    id: 'his-10', theme: 'histoire',
    niveau: 3,
    texte: 'Quel traité met fin à la Première Guerre mondiale entre les Alliés et l’Allemagne ?',
    reponses: ['Le traité de Versailles', 'Le traité de Sèvres', 'Le traité de Trianon', 'Le pacte de Locarno'],
    bonne: 0,
    note: 'Signé le 28 juin 1919, dans la galerie des Glaces. L’armistice de 1918 n’avait été qu’un arrêt des combats.',
  },
  {
    id: 'his-11', theme: 'histoire',
    niveau: 1,
    texte: 'Qui a prononcé l’appel du 18 juin 1940 ?',
    reponses: ['Charles de Gaulle', 'Philippe Pétain', 'Paul Reynaud', 'Jean Moulin'],
    bonne: 0,
    note: 'Depuis un studio de la BBC, à Londres. Presque personne ne l’a entendu en direct : c’est le texte affiché et republié qui a fait sa fortune.',
  },
  {
    id: 'his-12', theme: 'histoire',
    niveau: 3,
    texte: 'Quelle bataille de 1815 met fin à l’aventure napoléonienne ?',
    reponses: ['Waterloo', 'Austerlitz', 'Leipzig', 'Wagram'],
    bonne: 0,
    note: 'En Belgique, face à Wellington et Blücher. Quatre jours plus tard, Napoléon abdiquait pour la seconde fois.',
  },

  /* --- Fake news ou pas ? --------------------------------------------------- */
  //
  // Le thème se joue surtout en rafales : cinq affirmations, vrai ou faux, et
  // des points partiels. C'est la forme qui colle le mieux au sujet — on ne
  // demande pas de connaître la réponse, on demande de flairer l'intox. Les
  // quelques QCM portent sur des canulars entrés dans l'histoire, pour couper
  // le rythme.

  {
    id: 'fak-01', theme: 'fake',
    niveau: 2,
    texte: 'Quelle émission d’Orson Welles a fait croire en 1938 à une invasion martienne ?',
    reponses: [
      '« La Guerre des mondes »',
      '« La Quatrième Dimension »',
      '« Le Choc des mondes »',
      '« L’Homme invisible »',
    ],
    bonne: 0,
    note: 'Un faux bulletin d’information, à la radio, un soir de Halloween. La panique nationale, elle, a surtout été inventée par les journaux du lendemain, ravis de nuire à la radio.',
  },
  {
    id: 'fak-02', theme: 'fake',
    niveau: 2,
    texte: 'Que montrait en réalité la célèbre photo du monstre du Loch Ness de 1934 ?',
    reponses: [
      'Un sous-marin jouet coiffé d’une tête sculptée',
      'Un tronc d’arbre à la dérive',
      'Une loutre photographiée de loin',
      'Une retouche à la peinture',
    ],
    bonne: 0,
    note: 'Le canular a été avoué en 1994 par le beau-fils de l’un des auteurs : un sous-marin d’enfant et de la pâte à bois. Soixante ans de légende pour deux heures de bricolage.',
  },
  {
    id: 'fak-03', theme: 'fake',
    niveau: 2,
    texte: 'Quelle chaîne a annoncé en 1957 une récolte de spaghettis poussant sur les arbres ?',
    reponses: ['La BBC', 'La RAI', 'CBS', 'La RTF'],
    bonne: 0,
    note: 'Un reportage d’un poisson d’avril, dans une émission sérieuse. Des centaines de téléspectateurs ont appelé pour demander où acheter un arbre à spaghettis.',
  },
  {
    id: 'fak-04', theme: 'fake',
    niveau: 3,
    texte: 'Quel journal a décrit en 1835 les habitants de la Lune, sur six articles ?',
    reponses: ['Le New York Sun', 'Le Times de Londres', 'Le Figaro', 'Le Boston Globe'],
    bonne: 0,
    note: 'Le « Great Moon Hoax » : des hommes-chauves-souris vivant près de lacs lunaires, attribués à un astronome bien réel. Le tirage a explosé, et le journal n’a jamais vraiment démenti.',
  },
  {
    id: 'fak-05', theme: 'fake',
    niveau: 1,
    texte: 'Comment appelle-t-on le travail de vérification d’une information avant publication ?',
    reponses: ['Le fact-checking', 'Le publireportage', 'L’éditorial', 'La revue de presse'],
    bonne: 0,
    note: 'La vérification des faits. Des rédactions y consacrent des équipes entières — et la première question qu’elles posent est toujours : qui le dit, et comment le sait-il ?',
  },
  {
    id: 'fak-06', theme: 'fake',
    niveau: 1,
    texte: 'Comment appelle-t-on une vidéo truquée où le visage d’une personne est remplacé par une IA ?',
    reponses: ['Un deepfake', 'Un reboot', 'Un morphing', 'Un teasing'],
    bonne: 0,
    note: 'Le mot mélange « deep learning » et « fake ». Le plus sûr indice reste le contexte : une déclaration énorme qu’aucun média sérieux ne reprend n’a probablement jamais été prononcée.',
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
  {
    id: 'est-09', theme: 'sport', type: 'estimation',
    texte: 'Quelle distance parcourt-on sur un marathon, en mètres ?',
    valeur: 42195, unite: 'mètres',
    note: 'Les 195 mètres en trop viennent des Jeux de Londres 1908 : il fallait que l’arrivée tombe devant la loge royale.',
  },
  {
    id: 'est-10', theme: 'monde', type: 'estimation',
    texte: 'Combien de pays compte le continent africain ?',
    valeur: 54, unite: 'pays',
    note: 'Cinquante-quatre, soit plus du quart des membres de l’ONU. Le Soudan du Sud est le dernier né, en 2011.',
  },
  {
    id: 'est-11', theme: 'mots', type: 'estimation',
    texte: 'Combien de mots compte un dictionnaire de français courant, comme le Petit Robert ?',
    valeur: 60000, unite: 'mots',
    note: 'Autour de soixante mille. Un adulte en utilise couramment quelques milliers, et en comprend trois à cinq fois plus.',
  },
  {
    id: 'est-12', theme: 'cinema', type: 'estimation',
    texte: 'Combien de minutes dure le film « Titanic » ?',
    valeur: 194, unite: 'minutes',
    note: 'Trois heures quatorze. Le studio suppliait de couper : le film est devenu le plus rentable de son époque.',
  },
  {
    id: 'est-13', theme: 'monde', type: 'estimation',
    texte: 'Quelle est l’altitude du sommet de l’Everest, en mètres ?',
    valeur: 8849, unite: 'mètres',
    note: 'Huit mille huit cent quarante-neuf, d’après le dernier relevé conjoint du Népal et de la Chine. Il gagne quelques millimètres par an.',
  },

  {
    id: 'est-14', theme: 'disney', type: 'estimation',
    texte: 'Combien d’Oscars Walt Disney a-t-il remportés à titre personnel ?',
    valeur: 22,
    unite: 'Oscars',
    note: 'Vingt-deux, plus quatre honorifiques. C’est le record absolu, et personne ne s’en est approché depuis.',
  },
  {
    id: 'est-15', theme: 'regions', type: 'estimation',
    texte: 'Combien de départements compte la France, outre-mer compris ?',
    valeur: 101,
    unite: 'départements',
    note: 'Cent un. Mayotte est le plus récent : elle est devenue le 101ᵉ en 2011.',
  },
  {
    id: 'est-16', theme: 'nature', type: 'estimation',
    texte: 'Combien d’espèces d’oiseaux sont décrites dans le monde ?',
    valeur: 11000,
    unite: 'espèces',
    note: 'Environ onze mille. Une dizaine disparaissent chaque siècle, et quelques dizaines sont encore décrites chaque année.',
  },
  {
    id: 'est-17', theme: 'nature', type: 'estimation',
    texte: 'Combien de litres d’eau un éléphant d’Afrique boit-il par jour ?',
    valeur: 150,
    unite: 'litres',
    note: 'Environ cent cinquante, l’équivalent d’une baignoire. Sa trompe en aspire huit d’un coup, mais il ne boit pas par le nez : il la vide dans sa bouche.',
  },
  {
    id: 'est-18', theme: 'histoire', type: 'estimation',
    texte: 'Combien d’années a duré la construction de Notre-Dame de Paris ?',
    valeur: 182,
    unite: 'ans',
    note: 'De 1163 à 1345 : cent quatre-vingt-deux ans, soit six générations de tailleurs de pierre qui n’ont jamais vu le chantier fini.',
  },
  /* --- Dans l'ordre ------------------------------------------------------- */

  {
    id: 'ord-01', theme: 'culture', type: 'ordre',
    texte: 'Du plus ancien au plus récent : ces événements',
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
    texte: 'De la plus petite à la plus grande : ces planètes',
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
  {
    id: 'ord-06', theme: 'sport', type: 'ordre',
    texte: 'De la plus petite surface de jeu à la plus grande',
    elements: ['Un court de tennis', 'Un terrain de basket', 'Une patinoire de hockey', 'Un terrain de football'],
    note: 'Environ 260 m², 420 m², 1 600 m², puis 7 000 m². Un terrain de foot avalerait vingt-cinq courts de tennis.',
  },
  {
    id: 'ord-07', theme: 'monde', type: 'ordre',
    texte: 'Du plus petit pays au plus grand',
    elements: ['Le Vatican', 'Monaco', 'La Belgique', 'La France'],
    note: '0,44 km², 2 km², 30 000 km², 550 000 km². Il faudrait plus d’un million de Vatican pour couvrir la France.',
  },
  {
    id: 'ord-08', theme: 'marques', type: 'ordre',
    texte: 'De la marque la plus ancienne à la plus récente',
    elements: ['Levi’s', 'Coca-Cola', 'Adidas', 'Nike'],
    note: '1853, 1886, 1949, 1964 — et Nike s’appelait encore Blue Ribbon Sports, revendeur de chaussures japonaises.',
  },
  {
    id: 'ord-09', theme: 'musique', type: 'ordre',
    texte: 'Du plus grave au plus aigu',
    elements: ['La contrebasse', 'Le violoncelle', 'L’alto', 'Le violon'],
    note: 'Quatre instruments, quatre tailles, la même forme. Plus la caisse est grande, plus le son descend.',
  },
  {
    id: 'ord-10', theme: 'annees2000', type: 'ordre',
    texte: 'Du plus ancien au plus récent : ces sites web',
    elements: ['Wikipédia', 'Facebook', 'YouTube', 'Twitter'],
    note: '2001, 2004, 2005, 2006. Cinq ans à peine, et tout ce qui fait aujourd’hui nos journées était déjà en place.',
  },

  {
    id: 'ord-11', theme: 'disney', type: 'ordre',
    texte: 'Du plus ancien au plus récent : ces films',
    elements: [
      'Blanche-Neige et les Sept Nains',
      'Le Livre de la jungle',
      'Le Roi Lion',
      'La Reine des neiges',
    ],
    note: '1937, 1967, 1994, 2013. Trente ans entre les deux premiers, trente entre les deux suivants.',
  },
  {
    id: 'ord-12', theme: 'regions', type: 'ordre',
    texte: 'De la plus peuplée à la moins peuplée : ces régions',
    elements: [
      'Île-de-France',
      'Auvergne-Rhône-Alpes',
      'Nouvelle-Aquitaine',
      'Corse',
    ],
    note: 'Environ douze millions, huit millions, six millions — et trois cent cinquante mille pour la Corse, moins que la ville de Nice.',
  },
  {
    id: 'ord-13', theme: 'nature', type: 'ordre',
    texte: 'Du plus petit au plus grand : ces animaux',
    elements: ['La musaraigne', 'Le lièvre', 'Le sanglier', 'L’élan'],
    note: 'Quelques grammes, quatre kilos, cent kilos, et jusqu’à six cents pour l’élan — le plus grand cervidé du monde.',
  },
  {
    id: 'ord-14', theme: 'nature', type: 'ordre',
    texte: 'Du plus léger au plus lourd : ces oiseaux',
    elements: ['Le colibri', 'Le merle', 'Le cygne', 'L’autruche'],
    note: 'Deux grammes, cent grammes, dix kilos, cent kilos. Du plus léger au plus lourd, le rapport est de un à cinquante mille.',
  },
  {
    id: 'ord-15', theme: 'histoire', type: 'ordre',
    texte: 'Du plus ancien au plus récent : ces personnages',
    elements: ['Jules César', 'Charlemagne', 'Jeanne d’Arc', 'Louis XIV'],
    note: 'Premier siècle avant notre ère, an 800, 1431, puis le XVIIᵉ siècle. Entre César et Charlemagne, il y a autant de temps qu’entre Charlemagne et nous.',
  },
  {
    id: 'ord-16', theme: 'histoire', type: 'ordre',
    texte: 'De la plus ancienne à la plus récente : ces constructions',
    elements: [
      'Les pyramides de Gizeh',
      'Le Colisée',
      'Le Mont-Saint-Michel',
      'La tour Eiffel',
    ],
    note: 'Vers 2560 avant notre ère, l’an 80, le VIIIᵉ siècle, et 1889. La pyramide de Khéops était déjà une antiquité pour les Romains.',
  },
  {
    id: 'ord-17', theme: 'fake', type: 'ordre',
    texte: 'Du plus ancien au plus récent : ces canulars célèbres',
    elements: [
      'Les habitants de la Lune du New York Sun',
      'La photo du monstre du Loch Ness',
      'L’invasion martienne d’Orson Welles',
      'La récolte de spaghettis de la BBC',
    ],
    note: '1835, 1934, 1938 et 1957. Un siècle de canulars avant même que le mot « fake news » existe : ce n’est pas Internet qui a inventé l’intox.',
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
  {
    id: 'raf-06', theme: 'sport', type: 'rafale',
    texte: 'Le sport',
    affirmations: [
      { texte: 'Le marathon fait plus de quarante-deux kilomètres.', vrai: true },
      { texte: 'Le Tour de France est parfois parti de l’étranger.', vrai: true },
      { texte: 'Un match de tennis peut durer plus de dix heures.', vrai: true },
      { texte: 'Aux Jeux olympiques, la médaille d’or est en or massif.', vrai: false },
      { texte: 'Le ballon de football a toujours été blanc et noir.', vrai: false },
    ],
    note: 'La médaille d’or est en argent recouvert de six grammes d’or : la dernière en or massif date de 1912.',
  },
  {
    id: 'raf-07', theme: 'monde', type: 'rafale',
    texte: 'La planète',
    affirmations: [
      { texte: 'L’Australie est à la fois un pays et un continent.', vrai: true },
      { texte: 'Le Groenland relève du royaume du Danemark.', vrai: true },
      { texte: 'Aucun pays ne commence par la lettre X.', vrai: true },
      { texte: 'L’Everest est le point le plus éloigné du centre de la Terre.', vrai: false },
      { texte: 'Le Nil traverse un seul pays.', vrai: false },
    ],
    note: 'Mesuré depuis le centre de la Terre, c’est le Chimborazo, en Équateur, qui gagne : le renflement de l’équateur lui donne deux kilomètres d’avance.',
  },
  {
    id: 'raf-08', theme: 'marques', type: 'rafale',
    texte: 'Les marques',
    affirmations: [
      { texte: 'Le nom « Google » vient d’une faute d’orthographe.', vrai: true },
      { texte: 'Le logo d’Amazon dessine une flèche qui va du A au Z.', vrai: true },
      { texte: 'Le bonhomme Michelin s’appelle Bibendum.', vrai: true },
      { texte: 'Le père Noël en rouge a été inventé par Coca-Cola.', vrai: false },
      { texte: 'Häagen-Dazs est une marque danoise.', vrai: false },
    ],
    note: 'Le père Noël était déjà rouge dans les illustrations américaines des années 1860, bien avant les affiches Coca-Cola. Häagen-Dazs, elle, est née dans le Bronx : le nom scandinave est inventé.',
  },
  {
    id: 'raf-09', theme: 'mots', type: 'rafale',
    texte: 'La langue française',
    affirmations: [
      { texte: '« Aujourd’hui » dit deux fois la même chose.', vrai: true },
      { texte: 'Le français est langue officielle dans plus de vingt pays.', vrai: true },
      { texte: '« Nénuphar » s’est longtemps écrit avec un f.', vrai: true },
      { texte: 'Le mot le plus long des dictionnaires courants dépasse cinquante lettres.', vrai: false },
      { texte: 'L’Académie française peut interdire un mot.', vrai: false },
    ],
    note: '« Aujourd’hui » vient de « au jour de hui », et « hui » voulait déjà dire ce jour. Quant au mot le plus long, « anticonstitutionnellement » tient le titre avec vingt-cinq lettres.',
  },
  {
    id: 'raf-10', theme: 'musique', type: 'rafale',
    texte: 'Les musiciens',
    affirmations: [
      { texte: 'Beethoven a composé alors qu’il était devenu sourd.', vrai: true },
      { texte: 'Le saxophone a été inventé par un Belge.', vrai: true },
      { texte: 'Mozart est mort avant quarante ans.', vrai: true },
      { texte: 'Un piano compte plus de touches noires que de blanches.', vrai: false },
      { texte: '« La Marseillaise » a été écrite pour un couronnement.', vrai: false },
    ],
    note: 'Adolphe Sax était né à Dinant. Il a passé sa vie en procès contre les fabricants qui copiaient son invention, et il est mort ruiné.',
  },

  {
    id: 'raf-11', theme: 'disney', type: 'rafale',
    texte: 'Disney et Pixar',
    affirmations: [
      { texte: 'Walt Disney a longtemps prêté sa propre voix à Mickey.', vrai: true },
      { texte: 'Disneyland Paris a ouvert en 1992.', vrai: true },
      { texte: '« Le Roi Lion » est adapté d’un roman.', vrai: false },
      { texte: 'Steve Jobs a été le principal actionnaire de Pixar.', vrai: true },
      { texte: '« Toy Story » a été le premier film d’animation à recevoir l’Oscar du meilleur film.', vrai: false },
    ],
    note: 'Aucun film d’animation n’a jamais reçu l’Oscar du meilleur film. Une catégorie à part a été créée en 2001, et « Shrek » l’a remportée le premier.',
  },
  {
    id: 'raf-12', theme: 'regions', type: 'rafale',
    texte: 'Les régions françaises',
    affirmations: [
      { texte: 'La Loire-Atlantique fait partie de la région Bretagne.', vrai: false },
      { texte: 'Le Grand Est borde quatre pays étrangers.', vrai: true },
      { texte: 'La Corse est la plus petite région de France métropolitaine.', vrai: true },
      { texte: 'L’Occitanie a une frontière avec l’Espagne.', vrai: true },
      { texte: 'La France métropolitaine compte dix-huit régions.', vrai: false },
    ],
    note: 'La Loire-Atlantique est en Pays de la Loire depuis 1955, et le sujet fâche encore. Le Grand Est touche la Belgique, le Luxembourg, l’Allemagne et la Suisse. Et la métropole compte treize régions depuis 2016 — dix-huit en comptant l’outre-mer.',
  },
  {
    id: 'raf-13', theme: 'nature', type: 'rafale',
    texte: 'Les oiseaux',
    affirmations: [
      { texte: 'L’autruche est le seul oiseau incapable de voler.', vrai: false },
      { texte: 'Le manchot est un oiseau.', vrai: true },
      { texte: 'Le colibri peut voler en marche arrière.', vrai: true },
      { texte: 'L’hirondelle construit son nid avec de la boue.', vrai: true },
      { texte: 'Un oisillon touché par une main humaine est rejeté par ses parents.', vrai: false },
    ],
    note: 'Une soixantaine d’espèces ne volent pas : manchots, kiwis, cassowaries. Et si un oisillon tombe du nid, on peut le remettre : ses parents ne sentiront rien.',
  },
  {
    id: 'raf-14', theme: 'nature', type: 'rafale',
    texte: 'Les arbres et les fleurs',
    affirmations: [
      { texte: 'Le tournesol suit le Soleil toute sa vie.', vrai: false },
      { texte: 'Le bambou est une herbe, pas un arbre.', vrai: true },
      { texte: 'Un arbre peut vivre plus de quatre mille ans.', vrai: true },
      { texte: 'Les champignons appartiennent au règne végétal.', vrai: false },
      { texte: 'Le gui pousse aux dépens de l’arbre qui le porte.', vrai: true },
    ],
    note: 'Seul le bouton du tournesol suit le Soleil ; la fleur ouverte reste tournée vers l’est. Les champignons ont leur propre règne, plus proche de nous que des plantes. Et le plus vieux pin connu dépasse les quatre mille huit cents ans.',
  },
  {
    id: 'raf-15', theme: 'histoire', type: 'rafale',
    texte: 'L’Histoire de France',
    affirmations: [
      { texte: 'Clovis a été baptisé à Reims.', vrai: true },
      { texte: 'Jeanne d’Arc a été brûlée à Rouen.', vrai: true },
      { texte: 'Louis XVI a été guillotiné sur l’actuelle place de la Concorde.', vrai: true },
      { texte: 'Napoléon est mort à l’île d’Elbe.', vrai: false },
      { texte: 'La Cinquième République a été proclamée en 1945.', vrai: false },
    ],
    note: 'Napoléon est mort à Sainte-Hélène, en plein Atlantique : l’île d’Elbe, c’était le premier exil, celui dont il s’est échappé. Et la Cinquième République date de 1958.',
  },
  {
    id: 'raf-16', theme: 'histoire', type: 'rafale',
    texte: 'L’Antiquité',
    affirmations: [
      { texte: 'La légende attribue la fondation de Rome à Romulus et Rémus.', vrai: true },
      { texte: 'Les Jeux olympiques antiques se tenaient à Athènes.', vrai: false },
      { texte: 'La pierre de Rosette a permis de déchiffrer les hiéroglyphes.', vrai: true },
      { texte: 'Jules César a porté le titre d’empereur romain.', vrai: false },
      { texte: 'Le Colisée pouvait accueillir plus de cinquante mille spectateurs.', vrai: true },
    ],
    note: 'Les Jeux se tenaient à Olympie, dans le Péloponnèse. Et César est mort dictateur : le premier empereur, c’est son fils adoptif Auguste.',
  },
  {
    id: 'raf-17', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : le corps humain',
    affirmations: [
      { texte: 'On avale en moyenne huit araignées par an en dormant.', vrai: false },
      { texte: 'La langue a une zone distincte pour chaque saveur.', vrai: false },
      { texte: 'Se raser fait repousser les poils plus drus.', vrai: false },
      { texte: 'Le corps abrite autant de bactéries que de cellules humaines.', vrai: true },
      { texte: 'On perd normalement entre cinquante et cent cheveux par jour.', vrai: true },
    ],
    note: 'La statistique des araignées a été inventée de toutes pièces pour montrer qu’une fausse information voyage toute seule — et elle voyage encore. La carte des saveurs sur la langue, elle, vient d’un schéma mal recopié en 1901.',
  },
  {
    id: 'raf-18', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : les animaux',
    affirmations: [
      { texte: 'Les lemmings se jettent des falaises en masse.', vrai: false },
      { texte: 'Le caméléon change de couleur pour se fondre dans le décor.', vrai: false },
      { texte: 'Un poulpe possède trois cœurs.', vrai: true },
      { texte: 'Le taureau voit le rouge et s’en énerve.', vrai: false },
      { texte: 'Une abeille domestique meurt après avoir piqué un humain.', vrai: true },
    ],
    note: 'Le suicide des lemmings vient d’un documentaire de 1958 où les animaux ont été poussés devant la caméra. Le caméléon change surtout d’humeur et de température. Et le taureau ne distingue pas le rouge : c’est le mouvement de la cape qui le fait charger.',
  },
  {
    id: 'raf-19', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : l’espace',
    affirmations: [
      { texte: 'La Grande Muraille de Chine se voit à l’œil nu depuis l’espace.', vrai: false },
      { texte: 'Il n’y a pas de gravité à bord de la Station spatiale internationale.', vrai: false },
      { texte: 'Le drapeau planté sur la Lune était tenu par une tige.', vrai: true },
      { texte: 'Un corps humain exploserait dans le vide spatial.', vrai: false },
      { texte: 'La face cachée de la Lune ne reçoit jamais la lumière du Soleil.', vrai: false },
    ],
    note: 'La Muraille est large de quelques mètres : invisible de l’orbite. La Station, elle, subit presque toute la gravité terrestre — elle tombe simplement en permanence, et ses occupants avec elle. Quant à la face cachée, elle connaît le jour et la nuit comme l’autre : elle est cachée de nous, pas du Soleil.',
  },
  {
    id: 'raf-20', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : la science',
    affirmations: [
      { texte: 'Einstein était mauvais élève en mathématiques.', vrai: false },
      { texte: 'La foudre ne tombe jamais deux fois au même endroit.', vrai: false },
      { texte: 'La Terre est plus proche du Soleil en janvier qu’en juillet.', vrai: true },
      { texte: 'Le verre des vitraux anciens est plus épais en bas parce qu’il a coulé.', vrai: false },
      { texte: 'Le son se propage plus vite dans l’eau que dans l’air.', vrai: true },
    ],
    note: 'Einstein avait les meilleures notes de sa classe en maths. La tour Eiffel est frappée plusieurs fois par an. Les saisons ne viennent pas de la distance au Soleil mais de l’inclinaison de l’axe terrestre. Et les vitraux étaient soufflés d’épaisseur inégale : on posait le côté lourd en bas.',
  },
  {
    id: 'raf-21', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : dans l’assiette',
    affirmations: [
      { texte: 'Un pot de miel fermé peut se conserver des siècles.', vrai: true },
      { texte: 'La banane est botaniquement une baie.', vrai: true },
      { texte: 'L’épinard est exceptionnellement riche en fer.', vrai: false },
      { texte: 'Le chocolat est toxique pour le chien.', vrai: true },
      { texte: 'Le vin rouge se sert à vingt-cinq degrés.', vrai: false },
    ],
    note: 'On a retrouvé du miel comestible dans des tombes égyptiennes. L’épinard en contient autant qu’un autre légume vert : la légende vient d’une virgule mal placée, reprise ensuite par Popeye. Et un rouge se sert entre seize et dix-huit degrés — « chambré » ne veut pas dire tiède.',
  },
  {
    id: 'raf-22', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : l’Histoire',
    affirmations: [
      { texte: 'Napoléon était petit pour son époque.', vrai: false },
      { texte: 'Les Vikings portaient des casques à cornes.', vrai: false },
      { texte: 'Marie-Antoinette a dit « qu’ils mangent de la brioche ».', vrai: false },
      { texte: 'Cléopâtre a vécu plus près de nous que de la construction de la grande pyramide.', vrai: true },
      { texte: 'Un combat de gladiateurs ne se terminait pas forcément par une mort.', vrai: true },
    ],
    note: 'Napoléon mesurait un mètre soixante-huit, la moyenne de son temps : le reste est de la propagande anglaise. Les cornes des Vikings viennent d’un costume d’opéra de 1876. Et la phrase de Marie-Antoinette circulait avant sa naissance.',
  },
  {
    id: 'raf-23', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : la technologie',
    affirmations: [
      { texte: 'Le premier ordinateur pesait plusieurs dizaines de tonnes.', vrai: true },
      { texte: 'Fermer les applications en arrière-plan économise la batterie.', vrai: false },
      { texte: 'Un téléphone allumé peut faire tomber un avion.', vrai: false },
      { texte: 'Le micro-ondes cuit les aliments de l’intérieur vers l’extérieur.', vrai: false },
      { texte: 'Le premier message envoyé sur l’ancêtre d’Internet s’est arrêté au bout de deux lettres.', vrai: true },
    ],
    note: 'L’ENIAC pesait vingt-sept tonnes. Rouvrir une application coûte plus de batterie que la laisser en veille. Et en 1969, on voulait taper « LOGIN » : la machine a planté après le « LO ».',
  },
  {
    id: 'raf-24', theme: 'fake', type: 'rafale',
    texte: 'Info ou intox : les légendes urbaines',
    affirmations: [
      { texte: 'Un crocodile a réellement été retrouvé dans les égouts de Paris.', vrai: true },
      { texte: 'Un chewing-gum avalé reste sept ans dans l’estomac.', vrai: false },
      { texte: 'Walt Disney a été cryogénisé à sa mort.', vrai: false },
      { texte: 'Les pièces jetées dans la fontaine de Trevi sont reversées à une association.', vrai: true },
      { texte: 'Coca-Cola a inventé le costume rouge du Père Noël.', vrai: false },
    ],
    note: 'Le crocodile est vrai : capturé sous le pont Neuf en 1984, il a fini ses jours dans un aquarium breton. Disney, lui, a été incinéré. Et le Père Noël était déjà rouge au XIXᵉ siècle, bien avant les publicités de 1931.',
  },
  /* --- Tu te mets combien ? ------------------------------------------------ */
  //
  // Une carte = un thème et dix questions, de la plus facile à la plus coriace.
  // L'ordre EST le barème : `niveaux[0]` doit se répondre à la table du café du
  // commerce, `niveaux[9]` doit faire douter celui qui s'y connaît. Une carte
  // mal graduée casse le jeu — se mettre à 8 doit faire peur.
  //
  // Aucun test ne peut vérifier ça : la difficulté d'une question ne se mesure
  // pas depuis un fichier. C'est donc une relecture, et elle se fait avec une
  // question simple, posée niveau par niveau — « celle-ci est-elle vraiment
  // plus dure que la précédente ? ». Les six cartes y sont passées, et vingt-
  // huit niveaux ont bougé. Les fautes étaient toujours les mêmes :
  //
  //   - une notoriété prise pour une culture. « Le prénom du docteur House »
  //     était en 6 et « Nevermind » en 6 : ce sont des questions de niveau 4,
  //     tout le monde les a vues passer. Ce qui compte n'est pas si la réponse
  //     est savante, c'est combien de gens la savent ;
  //   - un piège pris pour une difficulté. « La capitale de la Turquie » était
  //     en 6 parce qu'on répond Istanbul. Mais celui qui hésite connaît la
  //     réponse — le piège coûte une seconde, pas un point ;
  //   - un classique pris pour un savoir de spécialiste. « Les trois armes de
  //     l'escrime » était en 7, « Les Quatre Saisons » en 5 : ce sont des
  //     réponses de table, pas de connaisseur.
  //
  // La règle qui en sort, et qui vaut pour la carte suivante : demandez-vous
  // combien de personnes autour d'une table de six auraient la réponse. Six,
  // c'est un niveau 1. Une seule, et pas toujours, c'est un niveau 10.

  {
    id: 'ttm-01', theme: 'cinema', type: 'ttmc',
    texte: 'Cinéma & séries — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'Dans « Le Roi Lion », comment s’appelle le père de Simba ?',
        reponses: ['Mufasa', 'Scar', 'Rafiki', 'Zazu'], bonne: 0,
        note: 'Mufasa. Son nom vient du swahili, comme la plupart des noms du film.',
      },
      {
        texte: 'Dans quel film Leonardo DiCaprio crie-t-il « Je suis le roi du monde » ?',
        reponses: ['Titanic', 'Gatsby le Magnifique', 'Inception', 'Le Loup de Wall Street'], bonne: 0,
        note: 'La réplique a été improvisée sur le tournage, et le réalisateur a failli la couper au montage.',
      },
      {
        texte: 'Quelle série met en scène un professeur de chimie devenu fabricant de drogue ?',
        reponses: ['Breaking Bad', 'Dexter', 'The Wire', 'Ozark'], bonne: 0,
        note: 'Le créateur a résumé son idée en une phrase : transformer Monsieur Tout-le-Monde en Scarface.',
      },
      {
        texte: 'Quel est le prénom du docteur House ?',
        reponses: ['Gregory', 'James', 'Robert', 'Eric'], bonne: 0,
        note: 'Gregory House. Le personnage est calqué sur Sherlock Holmes : même adresse au 221B, même addiction, même ami médecin.',
      },
      {
        texte: 'Qui incarne Vito Corleone dans le premier « Parrain » ?',
        reponses: ['Marlon Brando', 'Al Pacino', 'Robert De Niro', 'James Caan'], bonne: 0,
        note: 'Brando. De Niro joue le même personnage jeune, mais dans le deuxième film — et décroche l’Oscar pour ça.',
      },
      {
        texte: 'Quel film sud-coréen a remporté l’Oscar du meilleur film en 2020 ?',
        reponses: ['Parasite', 'Old Boy', 'Memories of Murder', 'Burning'], bonne: 0,
        note: 'Le premier film non anglophone à décrocher la statuette suprême, quatre-vingt-douze ans après la création des Oscars.',
      },
      {
        texte: 'Quel film de Stanley Kubrick est sorti après sa mort ?',
        reponses: ['Eyes Wide Shut', 'Shining', 'Full Metal Jacket', 'Barry Lyndon'], bonne: 0,
        note: 'Il est mort quelques jours après avoir montré le montage final au studio, en 1999.',
      },
      {
        texte: 'Quelle actrice détient le record d’Oscars d’interprétation ?',
        reponses: ['Katharine Hepburn', 'Meryl Streep', 'Ingrid Bergman', 'Bette Davis'], bonne: 0,
        note: 'Quatre statuettes, et elle n’est venue en chercher aucune. Meryl Streep, avec bien plus de nominations, en compte trois.',
      },
      {
        texte: 'Dans quel film de Godard, sorti en 1960, Jean-Paul Belmondo tient-il le premier rôle ?',
        reponses: ['À bout de souffle', 'Pierrot le fou', 'Le Mépris', 'Alphaville'], bonne: 0,
        note: 'Tourné en quatre semaines, caméra à l’épaule, sans autorisation — et le montage sec en a fait le manifeste de la Nouvelle Vague.',
      },
      {
        texte: 'Quel film a reçu la toute première Palme d’or, en 1955 ?',
        reponses: ['Marty', 'Le Salaire de la peur', 'Le Troisième Homme', 'Orfeu Negro'], bonne: 0,
        note: 'Avant 1955, Cannes remettait un Grand Prix. La Palme est née cette année-là, et elle est allée à une petite histoire d’amour entre un boucher et une institutrice.',
      },
    ],
  },
  {
    id: 'ttm-02', theme: 'monde', type: 'ttmc',
    texte: 'Le monde — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'Quelle est la capitale de l’Italie ?',
        reponses: ['Rome', 'Milan', 'Naples', 'Turin'], bonne: 0,
        note: 'Rome. Milan est pourtant le moteur économique du pays, et Turin en fut la première capitale.',
      },
      {
        texte: 'Quel océan sépare l’Europe de l’Amérique ?',
        reponses: ['L’Atlantique', 'Le Pacifique', 'L’océan Indien', 'L’océan Arctique'], bonne: 0,
        note: 'L’Atlantique, du nom du mont Atlas — les Grecs pensaient que l’océan commençait juste derrière.',
      },
      {
        texte: 'Dans quel pays se trouve le Machu Picchu ?',
        reponses: ['Le Pérou', 'La Bolivie', 'L’Équateur', 'Le Mexique'], bonne: 0,
        note: 'À 2 400 mètres d’altitude. Le site n’a jamais été trouvé par les conquistadors, ce qui explique son état.',
      },
      {
        texte: 'Quelle est la capitale de la Turquie ?',
        reponses: ['Ankara', 'Istanbul', 'Izmir', 'Antalya'], bonne: 0,
        note: 'Ankara, choisie par Atatürk en 1923 précisément pour tourner la page d’Istanbul et de l’Empire ottoman.',
      },
      {
        texte: 'Quel détroit sépare l’Alaska de la Russie ?',
        reponses: ['Le détroit de Béring', 'Le détroit de Magellan', 'Le détroit de Torres', 'Le détroit de Davis'], bonne: 0,
        note: 'Quatre-vingts kilomètres d’eau, et deux îles au milieu : l’une américaine, l’autre russe, séparées de quatre kilomètres et d’une journée entière de décalage horaire.',
      },
      {
        texte: 'Quelle mer borde la Croatie ?',
        reponses: ['L’Adriatique', 'La mer Égée', 'La mer Noire', 'La mer Ionienne'], bonne: 0,
        note: 'L’Adriatique, et plus de mille îles côté croate — dont une cinquantaine seulement sont habitées.',
      },
      {
        texte: 'Quel fleuve traverse Vienne, Budapest et Belgrade ?',
        reponses: ['Le Danube', 'Le Rhin', 'L’Elbe', 'La Vistule'], bonne: 0,
        note: 'Le Danube arrose quatre capitales, plus que n’importe quel autre fleuve au monde — Bratislava est la quatrième.',
      },
      {
        texte: 'Quelle capitale se trouve à la plus haute altitude ?',
        reponses: ['La Paz', 'Quito', 'Bogota', 'Katmandou'], bonne: 0,
        note: 'Plus de 3 600 mètres — même si, constitutionnellement, la capitale de la Bolivie est Sucre : La Paz n’en est que le siège du gouvernement.',
      },
      {
        texte: 'Quel pays a pour capitale Astana ?',
        reponses: ['Le Kazakhstan', 'L’Ouzbékistan', 'La Mongolie', 'Le Kirghizistan'], bonne: 0,
        note: 'La ville a changé de nom plusieurs fois en trente ans, au gré des présidents — elle s’est même appelée Noursoultan.',
      },
      {
        texte: 'Quel est le pays le plus densément peuplé du monde ?',
        reponses: ['Monaco', 'Singapour', 'Malte', 'Le Bangladesh'], bonne: 0,
        note: 'Monaco : deux kilomètres carrés, et près de vingt mille habitants au kilomètre carré. Singapour, bien plus vaste, arrive derrière.',
      },
    ],
  },
  {
    id: 'ttm-03', theme: 'musique', type: 'ttmc',
    texte: 'Musique — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'Combien de Beatles y avait-il ?',
        reponses: ['4', '3', '5', '6'], bonne: 0,
        note: 'Quatre à partir de 1962, quand Ringo remplace Pete Best juste avant le premier disque.',
      },
      {
        texte: 'Qui chante « Like a Rolling Stone » ?',
        reponses: ['Bob Dylan', 'Bruce Springsteen', 'Neil Young', 'Lou Reed'], bonne: 0,
        note: 'Six minutes en 1965, quand les radios refusaient tout ce qui dépassait trois. Elle est passée quand même.',
      },
      {
        texte: 'De quel pays vient le groupe AC/DC ?',
        reponses: ['L’Australie', 'Le Royaume-Uni', 'Les États-Unis', 'L’Irlande'], bonne: 0,
        note: 'Fondé à Sydney par deux frères nés en Écosse. Le nom vient d’une plaque au dos d’une machine à coudre.',
      },
      {
        texte: 'Qui a composé « Les Quatre Saisons » ?',
        reponses: ['Vivaldi', 'Bach', 'Haendel', 'Corelli'], bonne: 0,
        note: 'Vivaldi, prêtre roux et professeur dans un orphelinat de filles à Venise, pour qui il écrivait la plupart de ses concertos.',
      },
      {
        texte: 'Quel groupe a enregistré l’album « Nevermind » ?',
        reponses: ['Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains'], bonne: 0,
        note: '1991. Le bébé de la pochette a été payé deux cents dollars, et a passé sa vie d’adulte à s’en expliquer.',
      },
      {
        texte: 'Quel instrument Django Reinhardt jouait-il ?',
        reponses: ['La guitare', 'Le violon', 'L’accordéon', 'Le piano'], bonne: 0,
        note: 'Avec deux doigts brûlés et paralysés par un incendie de roulotte : il a refait toute sa technique autour de ce handicap.',
      },
      {
        texte: 'Quel chanteur français a écrit « Les Copains d’abord » ?',
        reponses: ['Georges Brassens', 'Jacques Brel', 'Léo Ferré', 'Charles Trenet'], bonne: 0,
        note: 'Écrite pour un film, sur commande, et devenue malgré lui l’hymne de toutes les tablées de France.',
      },
      {
        texte: 'De quel style musical le « bebop » est-il une révolution, dans les années 1940 ?',
        reponses: ['Le jazz', 'Le blues', 'La country', 'Le gospel'], bonne: 0,
        note: 'Contre le jazz de danse : des tempos impossibles et des harmonies tordues, pour que les amateurs ne puissent plus suivre sur scène.',
      },
      {
        texte: 'Quel producteur a inventé le « mur du son » ?',
        reponses: ['Phil Spector', 'Quincy Jones', 'George Martin', 'Brian Eno'], bonne: 0,
        note: 'Empiler les instruments jusqu’à ce qu’on ne les distingue plus : une trentaine de musiciens dans un studio, pour un seul mono compact.',
      },
      {
        texte: 'Quel compositeur a écrit l’opéra « Le Vaisseau fantôme » ?',
        reponses: ['Richard Wagner', 'Giuseppe Verdi', 'Giacomo Puccini', 'Richard Strauss'], bonne: 0,
        note: 'Wagner en 1843, inspiré d’une traversée où son bateau a manqué sombrer. La légende du navire condamné à errer, il l’a vécue de près.',
      },
    ],
  },

  {
    id: 'ttm-04', theme: 'bouffe', type: 'ttmc',
    texte: 'Bouffe — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'De quel animal vient le jambon de Parme ?',
        reponses: ['Le porc', 'Le bœuf', 'Le mouton', 'Le veau'], bonne: 0,
        note: 'Du porc, et de deux ingrédients seulement : la viande et le sel. Tout le reste est une affaire de temps et d’air.',
      },
      {
        texte: 'Quel légume donne sa couleur au gaspacho ?',
        reponses: ['La tomate', 'Le concombre', 'Le poivron', 'L’oignon'], bonne: 0,
        note: 'La tomate — qui n’y était pourtant pas à l’origine : le gaspacho andalou était une soupe de pain, d’ail et d’huile, avant que l’Amérique n’envoie ses tomates.',
      },
      {
        texte: 'Que veut dire « al dente » ?',
        reponses: ['À la dent', 'Bien cuit', 'Sans sel', 'Au four'], bonne: 0,
        note: 'Littéralement « à la dent » : la pâte doit résister sous la dent. Une bonne minute de cuisson sépare l’Italie de la France sur ce point.',
      },
      {
        texte: 'Quel est l’ingrédient principal du houmous ?',
        reponses: ['Le pois chiche', 'La fève', 'La lentille', 'Le haricot blanc'], bonne: 0,
        note: 'Pois chiche, tahini, citron, ail. « Houmous » veut d’ailleurs dire « pois chiche » en arabe.',
      },
      {
        texte: 'Quel champignon est le plus cher du monde ?',
        reponses: ['La truffe blanche d’Alba', 'La truffe noire du Périgord', 'Le matsutake', 'La morille'], bonne: 0,
        note: 'La truffe blanche du Piémont. On ne sait toujours pas la cultiver : il faut la trouver, et c’est tout le problème.',
      },
      {
        texte: 'Qu’est-ce qui distingue un sorbet d’une glace ?',
        reponses: [
          'Le sorbet ne contient aucun produit laitier',
          'Le sorbet contient plus de sucre',
          'Le sorbet est servi plus froid',
          'Le sorbet est fouetté plus longtemps',
        ], bonne: 0,
        note: 'Un sorbet, c’est de l’eau, du sucre et des fruits. Dès qu’il y a du lait ou de la crème, c’est une glace.',
      },
      {
        texte: 'Quel pays a fait inscrire la culture du bortsch au patrimoine de l’UNESCO ?',
        reponses: ['L’Ukraine', 'La Russie', 'La Pologne', 'La Roumanie'], bonne: 0,
        note: 'En 2022, en procédure d’urgence. La paternité du plat reste un sujet brûlant dans toute la région.',
      },
      {
        texte: 'Quelle réaction chimique fait brunir une viande à la poêle ?',
        reponses: ['La réaction de Maillard', 'La caramélisation', 'L’oxydation', 'La fermentation'], bonne: 0,
        note: 'Décrite par un médecin français en 1912. C’est elle qui donne l’odeur du pain grillé, du café torréfié et de la croûte d’un rôti.',
      },
      {
        texte: 'D’où vient le mot « restaurant » ?',
        reponses: [
          'D’un bouillon censé restaurer les forces',
          'D’un lieu de repos pour les voyageurs',
          'Du nom d’un cuisinier parisien',
          'D’un mot venu de l’italien',
        ], bonne: 0,
        note: 'Au XVIIIᵉ siècle, un « restaurant » était un bouillon de viande qu’on prenait pour se remettre d’aplomb. Les maisons qui en servaient ont fini par porter le nom du plat.',
      },
      {
        texte: 'Que mesure le degré Brix, en œnologie ?',
        reponses: ['Le taux de sucre', 'Le taux d’alcool', 'L’acidité', 'La teneur en tanins'], bonne: 0,
        note: 'Le sucre d’un moût — donc le degré d’alcool que le vin atteindra. C’est ce chiffre qui décide de la date des vendanges.',
      },
    ],
  },
  {
    id: 'ttm-05', theme: 'sport', type: 'ttmc',
    texte: 'Sport — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?',
        reponses: ['11', '10', '12', '9'], bonne: 0,
        note: 'Onze, gardien compris, depuis les règles anglaises de 1863 — qui interdisaient encore de jouer à la main.',
      },
      {
        texte: 'Sur quelle surface se pratique le judo ?',
        reponses: ['Un tatami', 'Un ring', 'Une piste', 'Un praticable'], bonne: 0,
        note: 'Le tatami, natte de paille de riz à l’origine, partagé avec l’aïkido et le karaté.',
      },
      {
        texte: 'Tous les combien de temps les Jeux olympiques d’été ont-ils lieu ?',
        reponses: ['Tous les 4 ans', 'Tous les 2 ans', 'Tous les 3 ans', 'Tous les 5 ans'], bonne: 0,
        note: 'Quatre ans : c’est l’olympiade, l’unité de temps des Grecs anciens. Les Jeux d’hiver s’intercalent au milieu depuis 1994.',
      },
      {
        texte: 'Dans quel sport fait-on tomber toutes les quilles d’un seul lancer ?',
        reponses: ['Le bowling', 'La pétanque', 'Le curling', 'Le mölkky'], bonne: 0,
        note: 'C’est le strike. Douze d’affilée font une partie parfaite, à trois cents points.',
      },
      {
        texte: 'Quelles sont les trois armes de l’escrime ?',
        reponses: [
          'Fleuret, épée, sabre',
          'Fleuret, épée, rapière',
          'Épée, sabre, rapière',
          'Fleuret, sabre, dague',
        ], bonne: 0,
        note: 'Trois armes, trois règles : la surface valable et la priorité changent de l’une à l’autre, ce qui en fait presque trois sports.',
      },
      {
        texte: 'Combien de points vaut un drop au rugby à XV ?',
        reponses: ['3', '2', '5', '1'], bonne: 0,
        note: 'Trois, comme une pénalité. Il faut que le ballon touche le sol avant d’être frappé, ce qui explique qu’on en voie si peu.',
      },
      {
        texte: 'En quelle année ont eu lieu les premiers Jeux olympiques modernes ?',
        reponses: ['1896', '1900', '1888', '1912'], bonne: 0,
        note: 'Athènes, 1896, à l’initiative de Pierre de Coubertin. Quatorze pays, deux cent quarante athlètes, et pas une seule femme.',
      },
      {
        texte: 'Combien de joueurs une équipe de water-polo aligne-t-elle dans l’eau ?',
        reponses: ['7', '6', '8', '5'], bonne: 0,
        note: 'Sept, gardien compris. Ils n’ont pas le droit de toucher le fond — et le bassin fait au moins deux mètres de profondeur pour les en empêcher.',
      },
      {
        texte: 'Quel trophée est remis au champion de NBA ?',
        reponses: [
          'Le Larry O’Brien Trophy',
          'Le Vince Lombardi Trophy',
          'La Coupe Stanley',
          'Le Commissioner’s Trophy',
        ], bonne: 0,
        note: 'Chaque ligue nord-américaine a le sien : la Coupe Stanley au hockey, le Vince Lombardi au football américain, le Commissioner’s au baseball.',
      },
      {
        texte: 'Qui a remporté le tout premier Tour de France ?',
        reponses: ['Maurice Garin', 'Lucien Petit-Breton', 'Octave Lapize', 'Henri Desgrange'], bonne: 0,
        note: 'Maurice Garin, en 1903. Henri Desgrange, lui, n’a jamais couru : c’est le patron du journal qui avait inventé la course pour vendre du papier.',
      },
    ],
  },
  {
    id: 'ttm-06', theme: 'insolite', type: 'ttmc',
    texte: 'Le vivant — tu te mets combien ?',
    note: 'Chacun a répondu à sa propre question : la correction est sur votre écran.',
    niveaux: [
      {
        texte: 'Combien de pattes a une araignée ?',
        reponses: ['8', '6', '10', '4'], bonne: 0,
        note: 'Huit — c’est justement ce qui la distingue des insectes, qui en ont six. Une araignée n’est pas un insecte.',
      },
      {
        texte: 'Quel est le plus grand animal de la planète ?',
        reponses: ['La baleine bleue', 'L’éléphant d’Afrique', 'Le cachalot', 'Le requin-baleine'], bonne: 0,
        note: 'Jusqu’à trente mètres. Sa langue pèse à elle seule le poids d’un éléphant.',
      },
      {
        texte: 'Quel gaz les plantes absorbent-elles pour fabriquer leur matière ?',
        reponses: ['Le dioxyde de carbone', 'L’oxygène', 'L’azote', 'L’hydrogène'], bonne: 0,
        note: 'Un arbre est fait d’air, pour l’essentiel : le carbone de son bois vient du CO₂, pas du sol.',
      },
      {
        texte: 'Que mesure l’échelle de Scoville ?',
        reponses: ['La force des piments', 'La dureté des minéraux', 'L’acidité d’un sol', 'La puissance d’un séisme'], bonne: 0,
        note: 'À l’origine, on diluait le piment dans de l’eau sucrée jusqu’à ce qu’un jury ne sente plus rien. Le nombre de dilutions donnait la note.',
      },
      {
        texte: 'Combien de temps dure la gestation d’une éléphante ?',
        reponses: ['Environ 22 mois', 'Environ 12 mois', 'Environ 9 mois', 'Environ 6 mois'], bonne: 0,
        note: 'Près de deux ans, la plus longue de tous les mammifères. Le petit naît debout en quelques minutes, et pèse déjà cent kilos.',
      },
      {
        texte: 'Quel est l’organe le plus lourd du corps humain ?',
        reponses: ['La peau', 'Le foie', 'Le cerveau', 'Les poumons'], bonne: 0,
        note: 'La peau, entre trois et cinq kilos. Le foie n’est que le plus lourd des organes internes.',
      },
      {
        texte: 'Quel animal possède le plus gros cerveau ?',
        reponses: ['Le cachalot', 'L’éléphant', 'La baleine bleue', 'L’homme'], bonne: 0,
        note: 'Près de huit kilos, cinq fois le nôtre. Rapporté au poids du corps, le classement s’inverse complètement.',
      },
      {
        texte: 'Combien de cavités compte le cœur d’un poisson ?',
        reponses: ['2', '4', '3', '1'], bonne: 0,
        note: 'Une oreillette, un ventricule. Le sang fait un seul circuit, là où le nôtre en fait deux — d’où nos quatre cavités.',
      },
      {
        texte: 'Quel est le plus grand organisme vivant connu ?',
        reponses: ['Un champignon', 'Un séquoia', 'Une baleine bleue', 'Un récif de corail'], bonne: 0,
        note: 'Une armillaire de l’Oregon : son mycélium s’étend sous près de dix kilomètres carrés de forêt, et il aurait plus de deux mille ans.',
      },
      {
        texte: 'Quel animal est capable de revenir à un stade juvénile pour recommencer sa vie ?',
        reponses: ['Une méduse', 'Une étoile de mer', 'Un axolotl', 'Un homard'], bonne: 0,
        note: 'Turritopsis dohrnii, dite « méduse immortelle » : en cas de blessure ou de faim, elle repasse au stade polype et repart de zéro.',
      },
    ],
  },

  /* --- Le mix ------------------------------------------------------------- */
  //
  // Une carte = un thème et la liste de ce que l'appli accepte. Ces listes ne
  // seront jamais complètes — c'est la limite du type, assumée — donc mieux
  // vaut un thème étroit et bien couvert qu'un thème vaste et frustrant.

  {
    id: 'mix-01', theme: 'musique', type: 'mix',
    texte: 'Une chanson avec un animal dans le titre',
    acceptees: [
      { titre: 'Le Lion est mort ce soir', artiste: 'Henri Salvador' },
      { titre: 'L’Aigle noir', artiste: 'Barbara' },
      { titre: 'Le Gorille', artiste: 'Georges Brassens' },
      { titre: 'La Cane de Jeanne', artiste: 'Georges Brassens' },
      { titre: 'La Chasse aux papillons', artiste: 'Georges Brassens' },
      { titre: 'Le Petit Cheval', artiste: 'Georges Brassens' },
      { titre: 'Les Oiseaux de passage', artiste: 'Georges Brassens' },
      { titre: 'Les Loups sont entrés dans Paris', artiste: 'Serge Reggiani' },
      { titre: 'Le Serpent qui danse', artiste: 'Serge Gainsbourg' },
      { titre: 'Le Chat', artiste: 'Pow Wow' },
      { titre: 'Les Lionnes', artiste: 'Yannick Noah' },
      { titre: 'Une souris verte', artiste: 'comptine' },
      { titre: 'Alouette', artiste: 'comptine' },
      { titre: 'Ah les crocodiles', artiste: 'comptine' },
      { titre: 'Les petits poissons dans l’eau', artiste: 'comptine' },
      { titre: 'À la pêche aux moules', artiste: 'comptine' },
      { titre: 'Le Coq est mort', artiste: 'canon traditionnel' },
      { titre: 'Eye of the Tiger', artiste: 'Survivor' },
      { titre: 'Blackbird', artiste: 'The Beatles' },
      { titre: 'Hound Dog', artiste: 'Elvis Presley' },
      { titre: 'Crocodile Rock', artiste: 'Elton John' },
      { titre: 'Karma Chameleon', artiste: 'Culture Club' },
      { titre: 'Rock Lobster', artiste: 'The B-52’s' },
      { titre: 'Butterfly', artiste: 'Crazy Town' },
      { titre: 'When Doves Cry', artiste: 'Prince' },
      { titre: 'I Am the Walrus', artiste: 'The Beatles' },
      { titre: 'Octopus’s Garden', artiste: 'The Beatles' },
      { titre: 'Hungry Like the Wolf', artiste: 'Duran Duran' },
      { titre: 'Barracuda', artiste: 'Heart' },
      { titre: 'Fox on the Run', artiste: 'Sweet' },
      { titre: 'Buffalo Soldier', artiste: 'Bob Marley' },
      { titre: 'Three Little Birds', artiste: 'Bob Marley' },
      { titre: 'Wild Horses', artiste: 'The Rolling Stones' },
      { titre: 'Little Red Rooster', artiste: 'The Rolling Stones' },
      { titre: 'Bird on the Wire', artiste: 'Leonard Cohen' },
      { titre: 'Black Horse and the Cherry Tree', artiste: 'KT Tunstall' },
      { titre: 'Bat Out of Hell', artiste: 'Meat Loaf' },
      { titre: 'Blackbird Song', artiste: 'Lee DeWyze' },
    ],
    note: 'Le Lion est mort ce soir vient d’un chant zoulou des années 1930 — repris, retraduit, et devenu une comptine française sans que son auteur en touche un centime de son vivant.',
  },
  {
    id: 'mix-02', theme: 'musique', type: 'mix',
    texte: 'Une chanson avec une couleur dans le titre',
    acceptees: [
      { titre: 'La Vie en rose', artiste: 'Édith Piaf' },
      { titre: 'L’Aigle noir', artiste: 'Barbara' },
      { titre: 'Noir c’est noir', artiste: 'Johnny Hallyday' },
      { titre: 'Rouge', artiste: 'Michel Sardou' },
      { titre: 'Noël blanc', artiste: 'Tino Rossi' },
      { titre: 'Les Yeux noirs', artiste: 'traditionnel' },
      { titre: 'L’Homme en noir', artiste: 'Johnny Hallyday' },
      { titre: 'Une souris verte', artiste: 'comptine' },
      { titre: 'Le Petit Chaperon rouge', artiste: 'comptine' },
      { titre: 'La Ballade des gens heureux', artiste: 'Gérard Lenorman' },
      { titre: 'Blanche-Neige', artiste: 'comptine' },
      { titre: 'Yellow Submarine', artiste: 'The Beatles' },
      { titre: 'Yellow', artiste: 'Coldplay' },
      { titre: 'Purple Rain', artiste: 'Prince' },
      { titre: 'Little Red Corvette', artiste: 'Prince' },
      { titre: 'Back to Black', artiste: 'Amy Winehouse' },
      { titre: 'Paint It Black', artiste: 'The Rolling Stones' },
      { titre: 'Blue Monday', artiste: 'New Order' },
      { titre: 'Black or White', artiste: 'Michael Jackson' },
      { titre: 'Brown Eyed Girl', artiste: 'Van Morrison' },
      { titre: 'Fade to Black', artiste: 'Metallica' },
      { titre: 'Golden Brown', artiste: 'The Stranglers' },
      { titre: 'A Whiter Shade of Pale', artiste: 'Procol Harum' },
      { titre: 'White Christmas', artiste: 'Bing Crosby' },
      { titre: 'Blue Suede Shoes', artiste: 'Elvis Presley' },
      { titre: 'Lady in Red', artiste: 'Chris de Burgh' },
      { titre: 'Black Hole Sun', artiste: 'Soundgarden' },
      { titre: 'Mellow Yellow', artiste: 'Donovan' },
      { titre: 'Red Red Wine', artiste: 'UB40' },
      { titre: 'Green Onions', artiste: 'Booker T. & the M.G.’s' },
      { titre: 'Black Betty', artiste: 'Ram Jam' },
      { titre: 'Blue (Da Ba Dee)', artiste: 'Eiffel 65' },
    ],
    note: 'Yellow Submarine a été écrite pour que Ringo ait quelque chose à chanter : il ne tenait qu’une note ou deux, il fallait une mélodie qui tienne dedans.',
  },
  {
    id: 'mix-03', theme: 'musique', type: 'mix',
    texte: 'Une chanson dont le titre est un prénom',
    acceptees: [
      { titre: 'Aline', artiste: 'Christophe' },
      { titre: 'Mélissa', artiste: 'Julien Clerc' },
      { titre: 'Marcia Baila', artiste: 'Les Rita Mitsouko' },
      { titre: 'Cécile ma fille', artiste: 'Claude Nougaro' },
      { titre: 'Nathalie', artiste: 'Gilbert Bécaud' },
      { titre: 'Michèle', artiste: 'Gérard Lenorman' },
      { titre: 'Laura', artiste: 'Johnny Hallyday' },
      { titre: 'Marilou sous la neige', artiste: 'Serge Gainsbourg' },
      { titre: 'Dans les yeux d’Émilie', artiste: 'Joe Dassin' },
      { titre: 'Sarah', artiste: 'Georges Moustaki' },
      { titre: 'Sylvie', artiste: 'Téléphone' },
      { titre: 'Lucie', artiste: 'Pascal Obispo' },
      { titre: 'Marjolaine', artiste: 'Francis Lemarque' },
      { titre: 'Ma préférence', artiste: 'Julien Clerc' },
      { titre: 'Mistral gagnant', artiste: 'Renaud' },
      { titre: 'Lily', artiste: 'Pierre Perret' },
      { titre: 'Manon', artiste: 'Serge Gainsbourg' },
      { titre: 'Elsa', artiste: 'Serge Gainsbourg' },
      { titre: 'Hey Jude', artiste: 'The Beatles' },
      { titre: 'Michelle', artiste: 'The Beatles' },
      { titre: 'Lucy in the Sky with Diamonds', artiste: 'The Beatles' },
      { titre: 'Eleanor Rigby', artiste: 'The Beatles' },
      { titre: 'Billie Jean', artiste: 'Michael Jackson' },
      { titre: 'Roxanne', artiste: 'The Police' },
      { titre: 'Jolene', artiste: 'Dolly Parton' },
      { titre: 'Layla', artiste: 'Derek and the Dominos' },
      { titre: 'Maria', artiste: 'Blondie' },
      { titre: 'Rosanna', artiste: 'Toto' },
      { titre: 'Sara', artiste: 'Fleetwood Mac' },
      { titre: 'Rhiannon', artiste: 'Fleetwood Mac' },
      { titre: 'Angie', artiste: 'The Rolling Stones' },
      { titre: 'Barbara Ann', artiste: 'The Beach Boys' },
      { titre: 'Johnny B. Goode', artiste: 'Chuck Berry' },
      { titre: 'Mrs. Robinson', artiste: 'Simon & Garfunkel' },
      { titre: 'Sweet Caroline', artiste: 'Neil Diamond' },
      { titre: 'Valerie', artiste: 'Mark Ronson et Amy Winehouse' },
      { titre: 'Alison', artiste: 'Elvis Costello' },
      { titre: 'Delilah', artiste: 'Tom Jones' },
    ],
    note: 'Jolene est une supplique adressée à une rivale, pas à un amant. Dolly Parton dit l’avoir écrite en pensant à une employée de banque qui tournait autour de son mari.',
  },
  {
    id: 'mix-04', theme: 'musique', type: 'mix',
    texte: 'Une chanson avec un lieu dans le titre — ville, pays ou région',
    acceptees: [
      { titre: 'Aux Champs-Élysées', artiste: 'Joe Dassin' },
      { titre: 'Sous le ciel de Paris', artiste: 'Édith Piaf' },
      { titre: 'Il est cinq heures, Paris s’éveille', artiste: 'Jacques Dutronc' },
      { titre: 'Belle-Île-en-Mer, Marie-Galante', artiste: 'Laurent Voulzy' },
      { titre: 'Les Lacs du Connemara', artiste: 'Michel Sardou' },
      { titre: 'Toulouse', artiste: 'Claude Nougaro' },
      { titre: 'Amsterdam', artiste: 'Jacques Brel' },
      { titre: 'Le Plat Pays', artiste: 'Jacques Brel' },
      { titre: 'Vesoul', artiste: 'Jacques Brel' },
      { titre: 'Bruxelles', artiste: 'Jacques Brel' },
      { titre: 'Göttingen', artiste: 'Barbara' },
      { titre: 'Nantes', artiste: 'Barbara' },
      { titre: 'La Montagne', artiste: 'Jean Ferrat' },
      { titre: 'Le Sud', artiste: 'Nino Ferrer' },
      { titre: 'Mexico', artiste: 'Luis Mariano' },
      { titre: 'New York avec toi', artiste: 'Téléphone' },
      { titre: 'Les Champs-Élysées', artiste: 'Joe Dassin' },
      { titre: 'Étienne', artiste: 'Guesch Patti' },
      { titre: 'Hotel California', artiste: 'Eagles' },
      { titre: 'Viva Las Vegas', artiste: 'Elvis Presley' },
      { titre: 'Waterloo', artiste: 'ABBA' },
      { titre: 'Africa', artiste: 'Toto' },
      { titre: 'California Dreamin’', artiste: 'The Mamas & the Papas' },
      { titre: 'Sweet Home Alabama', artiste: 'Lynyrd Skynyrd' },
      { titre: 'Empire State of Mind', artiste: 'Jay-Z et Alicia Keys' },
      { titre: 'London Calling', artiste: 'The Clash' },
      { titre: 'Kingston Town', artiste: 'UB40' },
      { titre: 'Havana', artiste: 'Camila Cabello' },
      { titre: 'Barcelona', artiste: 'Freddie Mercury et Montserrat Caballé' },
      { titre: 'Rio', artiste: 'Duran Duran' },
      { titre: 'Walking in Memphis', artiste: 'Marc Cohn' },
      { titre: 'Galway Girl', artiste: 'Ed Sheeran' },
      { titre: 'Vienna', artiste: 'Ultravox' },
    ],
    note: 'Göttingen a été écrite par Barbara après un concert dans cette ville allemande, vingt ans après la guerre. Elle a longtemps refusé d’y aller, puis en a rapporté une chanson de réconciliation.',
  },
  {
    id: 'mix-05', theme: 'musique', type: 'mix',
    texte: 'Une chanson de Johnny Hallyday',
    acceptees: [
      { titre: 'Allumer le feu', artiste: 'Johnny Hallyday' },
      { titre: 'Que je t’aime', artiste: 'Johnny Hallyday' },
      { titre: 'L’Envie', artiste: 'Johnny Hallyday' },
      { titre: 'Quelque chose de Tennessee', artiste: 'Johnny Hallyday' },
      { titre: 'Gabrielle', artiste: 'Johnny Hallyday' },
      { titre: 'Le Pénitencier', artiste: 'Johnny Hallyday' },
      { titre: 'Noir c’est noir', artiste: 'Johnny Hallyday' },
      { titre: 'Requiem pour un fou', artiste: 'Johnny Hallyday' },
      { titre: 'Diego libre dans sa tête', artiste: 'Johnny Hallyday' },
      { titre: 'Ma gueule', artiste: 'Johnny Hallyday' },
      { titre: 'Laura', artiste: 'Johnny Hallyday' },
      { titre: 'Je te promets', artiste: 'Johnny Hallyday' },
      { titre: 'Vivre pour le meilleur', artiste: 'Johnny Hallyday' },
      { titre: 'Sang pour sang', artiste: 'Johnny Hallyday' },
      { titre: 'Cheveux longs et idées courtes', artiste: 'Johnny Hallyday' },
      { titre: 'Toute la musique que j’aime', artiste: 'Johnny Hallyday' },
      { titre: 'Da dou ron ron', artiste: 'Johnny Hallyday' },
      { titre: 'Oh ! Ma jolie Sarah', artiste: 'Johnny Hallyday' },
      { titre: 'Je suis né dans la rue', artiste: 'Johnny Hallyday' },
      { titre: 'Rester vivant', artiste: 'Johnny Hallyday' },
      { titre: 'Le Bon Temps du rock and roll', artiste: 'Johnny Hallyday' },
      { titre: 'Retiens la nuit', artiste: 'Johnny Hallyday' },
      { titre: 'Pour moi la vie va commencer', artiste: 'Johnny Hallyday' },
      { titre: 'J’ai oublié de vivre', artiste: 'Johnny Hallyday' },
      { titre: 'Derrière l’amour', artiste: 'Johnny Hallyday' },
      { titre: 'Marie', artiste: 'Johnny Hallyday' },
      { titre: 'Tous ensemble', artiste: 'Johnny Hallyday' },
      { titre: 'Mon plus beau Noël', artiste: 'Johnny Hallyday' },
      { titre: 'Un jour viendra', artiste: 'Johnny Hallyday' },
      { titre: 'Ce que je sais', artiste: 'Johnny Hallyday' },
    ],
    note: 'Mille cent chansons enregistrées, une cinquantaine d’albums, cinquante-sept ans de scène. '
      + 'Aucune liste ne les tient toutes — c’est là que la table tranche.',
  },

  {
    id: 'mix-06', theme: 'disney', type: 'mix',
    texte: 'Une chanson d’un film Disney ou Pixar',
    acceptees: [
      { titre: 'Libérée, délivrée', artiste: 'La Reine des neiges' },
      { titre: 'Le Renouveau', artiste: 'La Reine des neiges' },
      { titre: 'Je voudrais un bonhomme de neige', artiste: 'La Reine des neiges' },
      { titre: 'Hakuna Matata', artiste: 'Le Roi Lion' },
      { titre: 'Le Cercle de la vie', artiste: 'Le Roi Lion' },
      { titre: 'Je voudrais déjà être roi', artiste: 'Le Roi Lion' },
      { titre: 'Ce rêve bleu', artiste: 'Aladdin' },
      { titre: 'Un ami comme moi', artiste: 'Aladdin' },
      { titre: 'Sous l’océan', artiste: 'La Petite Sirène' },
      { titre: 'Partir là-bas', artiste: 'La Petite Sirène' },
      { titre: 'Les Poissons', artiste: 'La Petite Sirène' },
      { titre: 'Embrasse-la', artiste: 'La Petite Sirène' },
      { titre: 'Histoire éternelle', artiste: 'La Belle et la Bête' },
      { titre: 'C’est la fête', artiste: 'La Belle et la Bête' },
      { titre: 'Belle', artiste: 'La Belle et la Bête' },
      { titre: 'Il en faut peu pour être heureux', artiste: 'Le Livre de la jungle' },
      { titre: 'L’Air du vent', artiste: 'Pocahontas' },
      { titre: 'Un jour mon prince viendra', artiste: 'Blanche-Neige et les Sept Nains' },
      { titre: 'Siffler en travaillant', artiste: 'Blanche-Neige et les Sept Nains' },
      { titre: 'Heigh-ho', artiste: 'Blanche-Neige et les Sept Nains' },
      { titre: 'Je suis ton ami', artiste: 'Toy Story' },
      { titre: 'Le Bleu lumière', artiste: 'Vaiana' },
      { titre: 'De rien', artiste: 'Vaiana' },
      { titre: 'Un homme, un vrai', artiste: 'Mulan' },
      { titre: 'Réflexion', artiste: 'Mulan' },
      { titre: 'Ne m’oublie pas', artiste: 'Coco' },
      { titre: 'Un poco loco', artiste: 'Coco' },
      { titre: 'Presque là', artiste: 'La Princesse et la Grenouille' },
      { titre: 'Au bout du rêve', artiste: 'La Princesse et la Grenouille' },
      { titre: 'Je veux y croire', artiste: 'Raiponce' },
      { titre: 'Bibbidi-Bobbidi-Bou', artiste: 'Cendrillon' },
      { titre: 'Quand on prie la bonne étoile', artiste: 'Pinocchio' },
      { titre: 'Tout le monde veut devenir un cat', artiste: 'Les Aristochats' },
      { titre: 'Cruella d’Enfer', artiste: 'Les 101 Dalmatiens' },
      { titre: 'Les Cloches de Notre-Dame', artiste: 'Le Bossu de Notre-Dame' },
      { titre: 'Supercalifragilisticexpialidocious', artiste: 'Mary Poppins' },
      { titre: 'Un morceau de sucre', artiste: 'Mary Poppins' },
      { titre: 'Chim Chim Cheree', artiste: 'Mary Poppins' },
    ],
    note: 'Quatorze titres acceptés, et la liste pourrait tenir sur trois écrans.',
  },
  {
    id: 'mix-07', theme: 'regions', type: 'mix',
    texte: 'Une chanson française qui porte un lieu de France dans son titre ou son refrain',
    acceptees: [
      { titre: 'Aux Champs-Élysées', artiste: 'Joe Dassin' },
      { titre: 'Sous le ciel de Paris', artiste: 'Édith Piaf' },
      { titre: 'Nantes', artiste: 'Barbara' },
      { titre: 'Toulouse', artiste: 'Claude Nougaro' },
      { titre: 'Vesoul', artiste: 'Jacques Brel' },
      { titre: 'Les Corons', artiste: 'Pierre Bachelet' },
      { titre: 'La Montagne', artiste: 'Jean Ferrat' },
      { titre: 'Douce France', artiste: 'Charles Trenet' },
      { titre: 'Il est cinq heures, Paris s’éveille', artiste: 'Jacques Dutronc' },
      { titre: 'Le Sud', artiste: 'Nino Ferrer' },
      { titre: 'Ma Normandie', artiste: 'Frédéric Bérat' },
      { titre: 'Mon amant de Saint-Jean', artiste: 'Lucienne Delyle' },
      { titre: 'Belle-Île-en-Mer, Marie-Galante', artiste: 'Laurent Voulzy' },
      { titre: 'Chanson pour l’Auvergnat', artiste: 'Georges Brassens' },
      { titre: 'Le Poinçonneur des Lilas', artiste: 'Serge Gainsbourg' },
      { titre: 'Place des Grands Hommes', artiste: 'Patrick Bruel' },
      { titre: 'À Paris', artiste: 'Francis Lemarque' },
      { titre: 'Paname', artiste: 'Léo Ferré' },
      { titre: 'Pigalle', artiste: 'Georges Ulmer' },
      { titre: 'Sur le pont d’Avignon', artiste: 'comptine' },
      { titre: 'Sous les ponts de Paris', artiste: 'traditionnel' },
      { titre: 'La Seine', artiste: 'Vanessa Paradis et M' },
      { titre: 'J’aime Paris au mois de mai', artiste: 'Charles Aznavour' },
      { titre: 'La Butte rouge', artiste: 'traditionnel' },
      { titre: 'Une belle histoire', artiste: 'Michel Fugain' },
      { titre: 'Le Métèque', artiste: 'Georges Moustaki' },
    ],
    note: 'Douze titres acceptés, et la chanson française en compterait cent.',
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

  {
    id: 'cha-01', theme: 'culture', fil: 'chat',
    texte: 'Chez Lewis Carroll, quel personnage s’efface en ne laissant que son sourire ?',
    reponses: ['Le Chat du Cheshire', 'Le Lièvre de Mars', 'Le Loir', 'La Chenille'],
    bonne: 0,
    note: 'Alice le résume mieux que personne : elle a souvent vu un félin sans sourire, jamais un sourire sans félin.',
  },
  {
    id: 'cha-02', theme: 'culture', fil: 'chat',
    texte: 'Quelle expérience de pensée enferme un animal dans une boîte avec une fiole de poison ?',
    reponses: ['Le chat de Schrödinger', 'Le démon de Maxwell', 'Le paradoxe des jumeaux', 'Le singe de Borel'],
    bonne: 0,
    note: 'Schrödinger l’a imaginée en 1935 pour se moquer de l’interprétation qu’on donnait alors à la physique quantique — pas pour l’illustrer.',
  },
  {
    id: 'cha-03', theme: 'culture', fil: 'chat',
    texte: 'Dans quel conte de Perrault un animal rusé fait-il la fortune de son maître ?',
    reponses: ['Le Chat botté', 'Peau d’âne', 'Riquet à la houppe', 'Le Petit Poucet'],
    bonne: 0,
    note: 'Le marquis de Carabas n’existe pas : c’est un titre inventé de toutes pièces, en chemin, par un animal en bottes.',
  },
  {
    id: 'cha-04', theme: 'insolite', fil: 'chat',
    texte: 'Quel fouet servait à punir les marins de la marine britannique ?',
    reponses: ['Le chat à neuf queues', 'Le martinet', 'La schlague', 'La corde à nœuds'],
    bonne: 0,
    note: 'Neuf lanières nouées : les marques laissées sur le dos évoquaient des griffures, et le nom est resté.',
  },

  {
    id: 'roi-01', theme: 'culture', fil: 'roi',
    texte: 'Où Toutânkhamon et Ramsès II ont-ils été enterrés ?',
    reponses: ['La Vallée des Rois', 'La pyramide de Khéops', 'Le temple d’Abou Simbel', 'La nécropole de Gizeh'],
    bonne: 0,
    note: 'Soixante et quelques tombes creusées dans la falaise, en face de Louxor. Celle de Toutânkhamon est la seule retrouvée presque intacte.',
  },
  {
    id: 'roi-02', theme: 'culture', fil: 'roi',
    texte: 'Comment surnommait-on Louis XIV ?',
    reponses: ['Le Roi-Soleil', 'Le Bien-Aimé', 'Le Grand Dauphin', 'Le Sage'],
    bonne: 0,
    note: 'Le surnom vient d’un ballet de cour où il dansait, adolescent, le rôle du Soleil levant. « Le Bien-Aimé », c’était Louis XV.',
  },
  {
    id: 'roi-03', theme: 'bouffe', fil: 'roi',
    texte: 'Quel gâteau se partage traditionnellement le 6 janvier ?',
    reponses: ['La galette des rois', 'Le kouglof', 'La bûche', 'Le pain d’épices'],
    bonne: 0,
    note: 'Pour l’Épiphanie. La fève était une vraie fève, remplacée par de la porcelaine à la fin du XIXᵉ siècle.',
  },
  {
    id: 'roi-04', theme: 'culture', fil: 'roi',
    texte: 'Quelle pièce d’échecs n’est jamais capturée ?',
    reponses: ['Le roi', 'La dame', 'Le fou', 'Le cavalier'],
    bonne: 0,
    note: 'La partie s’arrête avant : l’échec et mat, c’est le moment où il ne lui reste plus une seule case où fuir.',
  },

  {
    id: 'pom-01', theme: 'culture', fil: 'pomme',
    texte: 'Comment surnomme-t-on la ville de New York ?',
    reponses: ['La Grosse Pomme', 'La Cité des anges', 'La Ville Lumière', 'La Cité du Vent'],
    bonne: 0,
    note: 'Le surnom vient des champs de courses des années 1920 : le gros lot que tous les jockeys visaient.',
  },
  {
    id: 'pom-02', theme: 'insolite', fil: 'pomme',
    texte: 'Comment appelle-t-on la saillie du cartilage du larynx, bien visible chez l’homme ?',
    reponses: ['La pomme d’Adam', 'La luette', 'La glotte', 'L’épiglotte'],
    bonne: 0,
    note: 'C’est le cartilage thyroïde. Le nom vient de la légende du fruit resté coincé dans la gorge d’Adam.',
  },
  {
    id: 'pom-03', theme: 'bouffe', fil: 'pomme',
    texte: 'Quel aliment Parmentier a-t-il fait adopter aux Français ?',
    reponses: ['La pomme de terre', 'La tomate', 'Le maïs', 'Le topinambour'],
    bonne: 0,
    note: 'Il aurait fait garder ses champs le jour et laissé les voleurs se servir la nuit, le temps de rendre le tubercule désirable.',
  },
  {
    id: 'pom-04', theme: 'culture', fil: 'pomme',
    texte: 'Dans la mythologie grecque, quel objet gravé « à la plus belle » déclenche la guerre de Troie ?',
    reponses: ['Une pomme d’or', 'Un miroir', 'Une couronne', 'Une flèche'],
    bonne: 0,
    note: 'Jetée par Éris au milieu d’un mariage. Pâris l’attribue à Aphrodite, qui lui promet Hélène en échange — et la guerre commence.',
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
// L'indice est volontairement le même pour tous : il dit qu'il y a quelque
// chose à chercher, jamais quoi. Un indice propre à chaque fil finirait par
// désigner la famille de réponses, et le fil ne tiendrait plus une manche.
const INDICE = 'Un même mot se cache derrière plusieurs bonnes réponses de cette partie.';

export const FILS_ROUGES = [
  {
    id: 'rouge',
    solution: 'le rouge',
    // On accepte large : en soirée, personne ne tape « le rouge » proprement.
    motsCles: ['rouge', 'rouges'],
    indice: INDICE,
    revelation: 'La mer Rouge, la Croix-Rouge, la planète rouge, le Petit Chaperon rouge : c’était le rouge.',
  },
  {
    id: 'chat',
    solution: 'le chat',
    motsCles: ['chat', 'chats'],
    indice: INDICE,
    revelation: 'Le Chat du Cheshire, le chat de Schrödinger, le Chat botté, le chat à neuf queues : c’était le chat.',
  },
  {
    id: 'roi',
    solution: 'le roi',
    motsCles: ['roi', 'rois', 'royal', 'royale'],
    indice: INDICE,
    revelation: 'La Vallée des Rois, le Roi-Soleil, la galette des rois, la pièce qu’on ne prend jamais aux échecs : c’était le roi.',
  },
  {
    id: 'pomme',
    solution: 'la pomme',
    motsCles: ['pomme', 'pommes'],
    indice: INDICE,
    revelation: 'La Grosse Pomme, la pomme d’Adam, la pomme de terre, la pomme de discorde : c’était la pomme.',
  },
];

export const filRougeDe = (id) => FILS_ROUGES.find((f) => f.id === id) ?? null;

/**
 * Une réponse au fil rouge est-elle bonne ?
 *
 * Comparaison très tolérante sur la forme : on retire les accents, la casse et
 * la ponctuation. « Le Rouge ! », « rouge » et « la couleur rouge » doivent
 * tous passer — on joue avec un téléphone dans une main.
 *
 * Mais on compare mot à mot, pas en sous-chaîne. Avec un seul fil « rouge » la
 * différence ne se voyait pas ; avec « chat » dans la liste, chercher le mot
 * n'importe où offrait la prime à qui proposait « le château ». On accepte donc
 * aussi la proposition collée en un seul mot — « lerouge » — parce que ça, ça
 * arrive vraiment.
 */
export function filRougeTrouve(fil, propose) {
  const normaliser = (texte) => String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const brut = String(propose ?? '');
  const propre = normaliser(brut);
  if (!propre) return false;

  const mots = brut.split(/[^\p{L}\p{N}]+/u).map(normaliser).filter(Boolean);
  const articles = ['le', 'la', 'les', 'l', 'un', 'une', 'du', 'de', 'des'];
  return fil.motsCles.some((cle) => {
    const mot = normaliser(cle);
    return mots.includes(mot) || articles.some((article) => propre === article + mot);
  });
}

/**
 * Les questions venues des packs achetés.
 *
 * Le jeu de base reste embarqué — il doit fonctionner sans réseau dès la
 * première ouverture — et les packs viennent s'y ajouter à chaud, une fois
 * téléchargés. Tout le reste du module ne voit qu'une seule banque.
 */
let supplement = [];

export function ajouterQuestions(liste) {
  const connus = new Set([...QUESTIONS, ...supplement].map((q) => q.id));
  supplement = [...supplement, ...(liste ?? []).filter((q) => q?.id && !connus.has(q.id))];
  return supplement.length;
}

export function oublierLesPacks() {
  supplement = [];
}

/** La banque complète : le jeu de base plus ce qui a été installé. */
export const toutesLesQuestions = () => [...QUESTIONS, ...supplement];

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

/**
 * Les niveaux de difficulté acceptés par un réglage de partie.
 *
 * Trois cotes sur les QCM : 1 se sait, 2 se cherche, 3 se devine à peine. Les
 * bandes se chevauchent volontairement — « facile » garde les questions
 * normales, « corsé » aussi — parce que des bandes étanches videraient les
 * thèmes les plus petits et rendraient des parties plus courtes que promis.
 */
export const NIVEAUX = [
  { id: 'facile', nom: 'Accessible', cotes: [1, 2], note: 'De quoi jouer avec ceux qui ne jouent jamais.' },
  { id: 'tout', nom: 'Tout', cotes: [1, 2, 3], note: 'La banque entière, de l’évidence au coup de chapeau.' },
  { id: 'corse', nom: 'Corsé', cotes: [2, 3], note: 'Pour une table qui trouve tout trop facile.' },
];

export const cotesDuNiveau = (id) => (NIVEAUX.find((n) => n.id === id) ?? NIVEAUX[1]).cotes;

const poolDe = (themes, types, niveau) => {
  const cotes = niveau ? cotesDuNiveau(niveau) : null;
  return toutesLesQuestions().filter((q) => {
    if (themes?.length && !themes.includes(q.theme)) return false;
    if (types?.length && !types.includes(q.type ?? 'qcm')) return false;
    // Les questions du fil rouge ne se filtrent jamais : elles portent les
    // indices de l'énigme, et en écarter la moitié laisserait une table
    // chercher un mot dont elle n'aurait plus vu les traces.
    if (q.fil) return true;
    // Une estimation, un classement, une rafale ou un mix se jouent à points
    // partiels : on y marque quelque chose même sans savoir. Ils valent 2, donc
    // ils restent partout.
    if (cotes && !cotes.includes(q.niveau ?? 2)) return false;
    return true;
  });
};

/**
 * Les questions, des plus neuves aux plus revues.
 *
 * Jamais vue passe devant tout le monde ; ensuite viennent les plus anciennes.
 * On ne les ÉCARTE pas : un thème de vingt questions joué en parties de douze
 * serait vide au deuxième tour, et refuser de jouer parce qu'on a déjà joué
 * serait la pire des réponses. On les repousse, c'est tout — et une question
 * revient quand il n'y a plus rien de neuf à servir.
 */
function parFraicheur(liste, vues) {
  if (!vues) return liste;
  const quand = (q) => vues[q.id] ?? -1;      // jamais vue : avant la partie 0
  return liste.slice().sort((a, b) => quand(a) - quand(b));
}

/**
 * Le tirage d'une partie.
 *
 * Chaque entrée passe par son type de manche, qui sait la préparer — mélanger
 * les réponses d'un QCM, brouiller l'ordre d'un classement, et ainsi de suite.
 *
 * Quand un fil rouge est demandé, ses questions sont réparties dans la partie
 * plutôt que tirées au hasard : groupées, elles se verraient tout de suite ; en
 * fin de partie seulement, plus personne n'aurait le temps de chercher.
 *
 * `vues` est la mémoire de l'appareil : identifiant → numéro de partie où la
 * question est passée. Voir `fraicheur` juste en dessous.
 */
export function tirerQuestions({
  themes, types, nombre, aleatoire = Math.random, fil = null, niveau = null, vues = null,
}) {
  const melange = melangeur(aleatoire);
  const preparer = (entree) => typeDeManche(entree.type).preparer(entree, melange);

  const duFil = fil ? toutesLesQuestions().filter((q) => q.fil === fil) : [];
  // Mélangé d'abord, trié par fraîcheur ensuite — le tri est stable, donc deux
  // questions aussi neuves l'une que l'autre restent dans l'ordre du hasard.
  // Puis remélangé après la sélection : sans ça, l'ordre des manches raconterait
  // l'historique, les jamais-vues en premier et les revenantes à la fin.
  const candidates = parFraicheur(melange(poolDe(themes, types, niveau).filter((q) => !q.fil)), vues);
  const reste = melange(candidates.slice(0, Math.max(0, nombre - duFil.length)));

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
export function tailleDuPool(themes, types, niveau) {
  return poolDe(themes, types, niveau).filter((q) => !q.fil).length;
}

/** Les types réellement représentés dans les thèmes choisis. */
export function typesDisponibles(themes) {
  const presents = new Set(poolDe(themes).map((q) => q.type ?? 'qcm'));
  return TYPES.filter((t) => presents.has(t.id));
}

export const nomDuTheme = (id) => THEMES.find((t) => t.id === id)?.nom ?? id;
