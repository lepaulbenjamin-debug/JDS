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
  {
    id: 'mus-09', theme: 'musique',
    texte: 'Combien de cordes compte un violon ?',
    reponses: ['4', '5', '6', '3'],
    bonne: 0,
    note: 'Quatre : sol, ré, la, mi, de la plus grave à la plus aiguë. Le violoncelle porte les mêmes noms, beaucoup plus bas.',
  },
  {
    id: 'mus-10', theme: 'musique',
    texte: 'Qui a composé « La Marche turque » ?',
    reponses: ['Mozart', 'Beethoven', 'Bach', 'Haydn'],
    bonne: 0,
    note: 'Le dernier mouvement de sa onzième sonate pour piano. « Turque » parce qu’elle imite les fanfares militaires ottomanes, très à la mode à Vienne.',
  },
  {
    id: 'mus-11', theme: 'musique',
    texte: 'Quel chanteur français était surnommé « le Taulier » ?',
    reponses: ['Johnny Hallyday', 'Eddy Mitchell', 'Michel Sardou', 'Jacques Dutronc'],
    bonne: 0,
    note: 'Johnny, le patron de la maison. Eddy Mitchell, son vieux complice, répondait au surnom de « Schmoll ».',
  },
  {
    id: 'mus-12', theme: 'musique',
    texte: 'Quel groupe britannique a sorti « Wonderwall » ?',
    reponses: ['Oasis', 'Blur', 'Pulp', 'Suede'],
    bonne: 0,
    note: '1995, en pleine guerre de la britpop contre Blur. Noel Gallagher a passé les années suivantes à répéter qu’il ne la supportait plus.',
  },
  {
    id: 'mus-13', theme: 'musique',
    texte: 'Quel instrument Miles Davis a-t-il rendu célèbre ?',
    reponses: ['La trompette', 'Le saxophone', 'La contrebasse', 'Le piano'],
    bonne: 0,
    note: 'Une trompette souvent jouée en sourdine, tout en retenue. « Ce sont les notes qu’on ne joue pas qui comptent », disait-il.',
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
  {
    id: 'cin-11', theme: 'cinema',
    texte: 'Quel film a remporté le tout premier Oscar du meilleur film d’animation ?',
    reponses: ['Shrek', 'Toy Story', 'Le Roi Lion', 'Monstres et Cie'],
    bonne: 0,
    note: 'En 2002, pour la création de la catégorie. Monstres et Cie était son concurrent direct, et a perdu.',
  },
  {
    id: 'cin-12', theme: 'cinema',
    texte: 'Dans « Retour vers le futur », quelle vitesse la DeLorean doit-elle atteindre ?',
    reponses: ['88 miles à l’heure', '100 miles à l’heure', '66 miles à l’heure', '120 miles à l’heure'],
    bonne: 0,
    note: 'Quatre-vingt-huit miles à l’heure, soit un peu plus de 140 km/h — et 1,21 gigawatt, prononcé « jigowatt » dans le film.',
  },
  {
    id: 'cin-13', theme: 'cinema',
    texte: 'Quelle série met en scène la famille Soprano ?',
    reponses: ['Les Soprano', 'Boardwalk Empire', 'Gomorra', 'Peaky Blinders'],
    bonne: 0,
    note: 'Un parrain du New Jersey qui va chez la psy. C’est la série qui a lancé la mode des héros qu’on n’a aucune raison d’aimer.',
  },
  {
    id: 'cin-14', theme: 'cinema',
    texte: 'Quel film de Jacques Tati suit un homme à pipe, en imperméable, qui ne dit presque rien ?',
    reponses: ['Les Vacances de Monsieur Hulot', 'Le Corniaud', 'La Grande Vadrouille', 'Le Gendarme de Saint-Tropez'],
    bonne: 0,
    note: 'Tati travaillait le son plus que le dialogue : la porte du restaurant qui claque est presque un personnage.',
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
  {
    id: 'an2-11', theme: 'annees2000',
    texte: 'Sous quel nom Twitter a-t-il été lancé en 2006 ?',
    reponses: ['Twttr', 'Chirp', 'Status', 'Jabber'],
    bonne: 0,
    note: 'Sans voyelles, comme Flickr et Tumblr à la même époque : les noms de domaine courts valaient déjà une fortune.',
  },
  {
    id: 'an2-12', theme: 'annees2000',
    texte: 'Quel appareil Apple a été lancé en 2001 avec « mille chansons dans votre poche » ?',
    reponses: ['L’iPod', 'L’iPhone', 'L’iMac', 'L’iPad'],
    bonne: 0,
    note: 'Cinq gigaoctets et une molette. La presse a trouvé l’objet cher et sans intérêt : il a sauvé l’entreprise.',
  },
  {
    id: 'an2-13', theme: 'annees2000',
    texte: 'Quelle série médicale lancée en 2005 suit une interne nommée Meredith ?',
    reponses: ['Grey’s Anatomy', 'Dr House', 'Urgences', 'Scrubs'],
    bonne: 0,
    note: 'Grey’s Anatomy, du nom d’un manuel d’anatomie de 1858 — et du nom de l’héroïne, les deux à la fois.',
  },
  {
    id: 'an2-14', theme: 'annees2000',
    texte: 'Quel disque le baladeur MP3 a-t-il chassé de nos poches ?',
    reponses: ['Le CD', 'Le vinyle', 'La disquette', 'Le DVD'],
    bonne: 0,
    note: 'Le disque compact, et son défaut rédhibitoire en marchant : il sautait au moindre pas, malgré les « anti-choc » de dix secondes.',
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
  {
    id: 'bof-09', theme: 'bouffe',
    texte: 'De quel animal vient le lait de la mozzarella traditionnelle ?',
    reponses: ['La bufflonne', 'La vache', 'La brebis', 'La chèvre'],
    bonne: 0,
    note: 'La mozzarella di bufala campana. Celle au lait de vache existe aussi, mais elle porte un autre nom : fior di latte.',
  },
  {
    id: 'bof-10', theme: 'bouffe',
    texte: 'Quelle molécule donne son piquant au piment ?',
    reponses: ['La capsaïcine', 'La pipérine', 'L’allicine', 'Le menthol'],
    bonne: 0,
    note: 'La capsaïcine ne brûle rien : elle trompe les capteurs de chaleur. C’est la pipérine qui pique dans le poivre, et ce n’est pas le même feu.',
  },
  {
    id: 'bof-11', theme: 'bouffe',
    texte: 'D’où vient l’idée que Marco Polo aurait rapporté les pâtes de Chine ?',
    reponses: ['D’une revue professionnelle américaine', 'D’un récit de voyage', 'D’un manuscrit vénitien', 'D’un roman du XIXᵉ siècle'],
    bonne: 0,
    note: 'Un article des années 1920, écrit pour vendre des pâtes aux États-Unis. On en mangeait en Italie bien avant le voyage de Marco Polo.',
  },
  {
    id: 'bof-12', theme: 'bouffe',
    texte: 'Comment obtient-on le plus souvent un champagne rosé ?',
    reponses: ['En mélangeant du vin blanc et du vin rouge', 'En pressant très vite du raisin noir', 'En laissant le raisin sécher au soleil', 'En ajoutant un colorant naturel'],
    bonne: 0,
    note: 'La Champagne est la seule région française autorisée à faire son rosé en mélangeant du blanc et du rouge. Partout ailleurs, c’est interdit.',
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

  /* --- Sport -------------------------------------------------------------- */
  {
    id: 'spo-01', theme: 'sport',
    texte: 'En quelle année la France a-t-elle remporté sa première Coupe du monde de football ?',
    reponses: ['1998', '1994', '2002', '1986'],
    bonne: 0,
    note: 'À domicile, contre le Brésil, trois buts à zéro. Zidane en marque deux de la tête, lui qui n’en marquait presque jamais.',
  },
  {
    id: 'spo-02', theme: 'sport',
    texte: 'De quelle couleur est le maillot du leader du Tour de France ?',
    reponses: ['Jaune', 'Vert', 'Blanc à pois rouges', 'Arc-en-ciel'],
    bonne: 0,
    note: 'Jaune comme le papier de L’Auto, le journal qui organisait la course : le leader devait se repérer de loin dans le peloton.',
  },
  {
    id: 'spo-03', theme: 'sport',
    texte: 'Sur quelle surface se joue le tournoi de Wimbledon ?',
    reponses: ['Le gazon', 'La terre battue', 'Le dur', 'La moquette'],
    bonne: 0,
    note: 'Le dernier tournoi du Grand Chelem sur herbe. La balle y rebondit bas et vite, ce qui avantage les gros serveurs.',
  },
  {
    id: 'spo-04', theme: 'sport',
    texte: 'Combien de points vaut un essai au rugby à XV ?',
    reponses: ['5', '3', '4', '7'],
    bonne: 0,
    note: 'Cinq depuis 1992 — il n’en valait que trois dans les années 1970. La transformation ajoute deux points de plus.',
  },
  {
    id: 'spo-05', theme: 'sport',
    texte: 'Quel pays a remporté le plus de Coupes du monde de football ?',
    reponses: ['Le Brésil', 'L’Allemagne', 'L’Italie', 'L’Argentine'],
    bonne: 0,
    note: 'Cinq titres — et le seul pays à avoir disputé toutes les éditions depuis 1930.',
  },
  {
    id: 'spo-06', theme: 'sport',
    texte: 'Quel basketteur est surnommé « His Airness » ?',
    reponses: ['Michael Jordan', 'LeBron James', 'Kobe Bryant', 'Magic Johnson'],
    bonne: 0,
    note: 'Six finales NBA, six titres, six fois meilleur joueur de ces finales. Il n’a jamais perdu une finale.',
  },
  {
    id: 'spo-07', theme: 'sport',
    texte: 'Quel sport a été pratiqué sur la Lune ?',
    reponses: ['Le golf', 'Le lancer de poids', 'Le saut en hauteur', 'La course'],
    bonne: 0,
    note: 'Alan Shepard avait caché une tête de club dans ses bagages. Deux balles frappées à une main, en 1971, pendant Apollo 14.',
  },
  {
    id: 'spo-08', theme: 'sport',
    texte: 'Combien de temps dure un match de basket en NBA ?',
    reponses: ['48 minutes', '40 minutes', '60 minutes', '45 minutes'],
    bonne: 0,
    note: 'Quatre quart-temps de douze minutes. En Europe, c’est quarante minutes, en quatre fois dix.',
  },
  {
    id: 'spo-09', theme: 'sport',
    texte: 'Que signifie le mot « judo » ?',
    reponses: ['La voie de la souplesse', 'La main vide', 'La voie du guerrier', 'Le poing fermé'],
    bonne: 0,
    note: 'Jū, la souplesse, et dō, la voie. « Karaté », lui, veut dire « la main vide ».',
  },
  {
    id: 'spo-10', theme: 'sport',
    texte: 'Que représentent les cinq anneaux olympiques ?',
    reponses: ['Les cinq continents', 'Les cinq disciplines d’origine', 'Les cinq premiers pays inscrits', 'Les cinq vertus du sportif'],
    bonne: 0,
    note: 'Cinq continents entrelacés. Les six couleurs, fond blanc compris, permettaient de composer le drapeau de n’importe quel pays de l’époque.',
  },
  {
    id: 'spo-11', theme: 'sport',
    texte: 'Qui détient le record du monde du 100 mètres ?',
    reponses: ['Usain Bolt', 'Carl Lewis', 'Yohan Blake', 'Tyson Gay'],
    bonne: 0,
    note: 'Neuf secondes cinquante-huit, à Berlin en 2009. Personne ne s’en est approché depuis.',
  },
  {
    id: 'spo-12', theme: 'sport',
    texte: 'Dans quel sport frappe-t-on un volant ?',
    reponses: ['Le badminton', 'Le squash', 'Le tennis de table', 'Le padel'],
    bonne: 0,
    note: 'Le volant est l’objet le plus rapide de tous les sports de raquette au moment de la frappe — et le plus lent quand il retombe.',
  },

  /* --- Le monde ----------------------------------------------------------- */
  {
    id: 'mon-01', theme: 'monde',
    texte: 'Quel est le plus grand désert du monde ?',
    reponses: ['L’Antarctique', 'Le Sahara', 'Le Gobi', 'Le Kalahari'],
    bonne: 0,
    note: 'Un désert se définit par ce qui lui tombe dessus, pas par sa température : il neige moins sur l’Antarctique qu’il ne pleut sur le Sahara.',
  },
  {
    id: 'mon-02', theme: 'monde',
    texte: 'Quel pays possède le plus long littoral du monde ?',
    reponses: ['Le Canada', 'La Russie', 'L’Indonésie', 'L’Australie'],
    bonne: 0,
    note: 'Plus de 200 000 kilomètres avec les îles de l’Arctique — de quoi faire cinq fois le tour de la Terre.',
  },
  {
    id: 'mon-03', theme: 'monde',
    texte: 'Quelle est la capitale du Canada ?',
    reponses: ['Ottawa', 'Toronto', 'Montréal', 'Vancouver'],
    bonne: 0,
    note: 'Choisie en 1857 précisément parce qu’elle ne faisait d’ombre à personne : Toronto et Montréal se disputaient le titre.',
  },
  {
    id: 'mon-04', theme: 'monde',
    texte: 'Quel détroit sépare l’Europe de l’Afrique ?',
    reponses: ['Le détroit de Gibraltar', 'Le Bosphore', 'Les Dardanelles', 'Le canal de Suez'],
    bonne: 0,
    note: 'Quatorze kilomètres au plus étroit. Le Bosphore, lui, sépare l’Europe de l’Asie.',
  },
  {
    id: 'mon-05', theme: 'monde',
    texte: 'Quel pays est entièrement entouré par l’Afrique du Sud ?',
    reponses: ['Le Lesotho', 'L’Eswatini', 'Le Botswana', 'Le Zimbabwe'],
    bonne: 0,
    note: 'L’un des trois seuls pays au monde enclavés dans un seul autre — avec Saint-Marin et le Vatican, tous deux dans l’Italie.',
  },
  {
    id: 'mon-06', theme: 'monde',
    texte: 'Quelle grande ville est traversée par le Bosphore ?',
    reponses: ['Istanbul', 'Athènes', 'Le Caire', 'Bucarest'],
    bonne: 0,
    note: 'La seule grande ville posée sur deux continents. On y traverse d’Europe en Asie en vingt minutes de ferry.',
  },
  {
    id: 'mon-07', theme: 'monde',
    texte: 'Quel est le plus petit État du monde ?',
    reponses: ['Le Vatican', 'Monaco', 'Nauru', 'Saint-Marin'],
    bonne: 0,
    note: 'Quarante-quatre hectares. On en fait le tour à pied en une demi-heure, passeport en poche.',
  },
  {
    id: 'mon-08', theme: 'monde',
    texte: 'Dans quel pays se trouve la ville de Tombouctou ?',
    reponses: ['Le Mali', 'Le Niger', 'Le Tchad', 'La Mauritanie'],
    bonne: 0,
    note: 'Au bord du Niger. Elle a longtemps servi de synonyme du bout du monde en français, faute de voyageurs qui en revenaient.',
  },
  {
    id: 'mon-09', theme: 'monde',
    texte: 'Quelle est la capitale de la Nouvelle-Zélande ?',
    reponses: ['Wellington', 'Auckland', 'Christchurch', 'Dunedin'],
    bonne: 0,
    note: 'Wellington, et non Auckland, pourtant bien plus peuplée. Le cas se répète souvent : Canberra, Ottawa, Washington.',
  },
  {
    id: 'mon-10', theme: 'monde',
    texte: 'Sur quel continent se trouve le Suriname ?',
    reponses: ['L’Amérique du Sud', 'L’Afrique', 'L’Asie', 'L’Océanie'],
    bonne: 0,
    note: 'Coincé entre le Guyana et la Guyane française. C’est le seul pays d’Amérique du Sud où l’on parle néerlandais.',
  },
  {
    id: 'mon-11', theme: 'monde',
    texte: 'Laquelle de ces étendues d’eau est la plus salée ?',
    reponses: ['La mer Morte', 'La Méditerranée', 'La mer Baltique', 'Le golfe Persique'],
    bonne: 0,
    note: 'Près de dix fois plus salée que l’océan — on y flotte sans effort. Et techniquement, c’est un lac.',
  },
  {
    id: 'mon-12', theme: 'monde',
    texte: 'Quelle chaîne de montagnes marque la frontière entre l’Europe et l’Asie ?',
    reponses: ['L’Oural', 'Le Caucase', 'Les Carpates', 'L’Altaï'],
    bonne: 0,
    note: 'Deux mille kilomètres du nord au sud. La frontière reste une convention : géologiquement, rien ne sépare les deux.',
  },

  /* --- Marques & pubs ----------------------------------------------------- */
  {
    id: 'mar-01', theme: 'marques',
    texte: 'Quelle marque a pour slogan « Just Do It » ?',
    reponses: ['Nike', 'Adidas', 'Reebok', 'Puma'],
    bonne: 0,
    note: 'Trouvé en 1988. Le publicitaire a raconté s’être inspiré des derniers mots d’un condamné à mort américain.',
  },
  {
    id: 'mar-02', theme: 'marques',
    texte: 'Quelles marques deux frères allemands brouillés à mort ont-ils fondées, chacun de son côté ?',
    reponses: ['Adidas et Puma', 'Nike et Reebok', 'Lacoste et Le Coq Sportif', 'Fila et Kappa'],
    bonne: 0,
    note: 'Adolf et Rudolf Dassler, deux usines de part et d’autre de la rivière d’Herzogenaurach. La ville en est restée coupée en deux pendant des décennies.',
  },
  {
    id: 'mar-03', theme: 'marques',
    texte: 'Quel animal figure sur les polos Lacoste ?',
    reponses: ['Un crocodile', 'Un caïman', 'Un lézard', 'Un iguane'],
    bonne: 0,
    note: 'René Lacoste était surnommé « le Crocodile » sur les courts de tennis, pour la façon dont il ne lâchait jamais un point.',
  },
  {
    id: 'mar-04', theme: 'marques',
    texte: 'De quel pays vient la marque IKEA ?',
    reponses: ['La Suède', 'La Norvège', 'Le Danemark', 'La Finlande'],
    bonne: 0,
    note: 'IKEA, ce sont les initiales du fondateur, Ingvar Kamprad, puis celles de la ferme et du village où il a grandi.',
  },
  {
    id: 'mar-05', theme: 'marques',
    texte: 'Quelle marque automobile a pour emblème un cheval cabré sur fond jaune ?',
    reponses: ['Ferrari', 'Porsche', 'Lamborghini', 'Maserati'],
    bonne: 0,
    note: 'Le cheval venait d’un as de l’aviation italienne de la Grande Guerre ; le jaune, c’est la couleur de Modène, la ville d’Enzo Ferrari.',
  },
  {
    id: 'mar-06', theme: 'marques',
    texte: 'Que veut dire le nom « Nike » ?',
    reponses: ['La victoire', 'La vitesse', 'L’envol', 'Le courage'],
    bonne: 0,
    note: 'Nikê, la déesse grecque de la Victoire. Le logo est censé dessiner son aile.',
  },
  {
    id: 'mar-07', theme: 'marques',
    texte: 'Quelle boisson a d’abord été vendue en pharmacie comme remède ?',
    reponses: ['Le Coca-Cola', 'Le Perrier', 'L’Orangina', 'Le Schweppes'],
    bonne: 0,
    note: 'En 1886, à cinq cents le verre, contre les maux de tête et l’épuisement. Il a fallu attendre des années pour qu’on le boive par plaisir.',
  },
  {
    id: 'mar-08', theme: 'marques',
    texte: 'Quelle maison de luxe a commencé par fabriquer des malles de voyage ?',
    reponses: ['Louis Vuitton', 'Chanel', 'Hermès', 'Dior'],
    bonne: 0,
    note: 'Sa malle à fond plat, empilable, a remplacé les coffres bombés du XIXᵉ siècle. Hermès, lui, est parti des harnais et des selles.',
  },
  {
    id: 'mar-09', theme: 'marques',
    texte: '« Parce que je le vaux bien » est le slogan de quelle marque ?',
    reponses: ['L’Oréal', 'Nivea', 'Dove', 'Yves Rocher'],
    bonne: 0,
    note: 'Écrit en 1971 par une rédactrice d’à peine plus de vingt ans, qui voulait une phrase où la femme achète pour elle et non pour plaire.',
  },
  {
    id: 'mar-10', theme: 'marques',
    texte: 'Quel type de produit Amazon a-t-il vendu en premier ?',
    reponses: ['Des livres', 'Des disques', 'Des jouets', 'De l’électroménager'],
    bonne: 0,
    note: 'Un livre d’informatique, en 1995. Le site ne vendait que ça pendant ses premières années.',
  },
  {
    id: 'mar-11', theme: 'marques',
    texte: 'D’où vient le nom « Google » ?',
    reponses: ['D’un nombre gigantesque', 'D’une paire de lunettes', 'D’un mot inventé sans aucun sens', 'D’une ville de Californie'],
    bonne: 0,
    note: 'Du « gogol » : un 1 suivi de cent zéros. La faute d’orthographe faite en déposant le nom n’a jamais été corrigée.',
  },
  {
    id: 'mar-12', theme: 'marques',
    texte: 'Quel constructeur automobile a été fondé par un fabricant de métiers à tisser ?',
    reponses: ['Toyota', 'Honda', 'Nissan', 'Subaru'],
    bonne: 0,
    note: 'Les métiers à tisser Toyoda, avant que le fils du fondateur ne se lance dans l’automobile. Le nom a changé d’une lettre : « Toyota » s’écrit en huit traits en japonais, un chiffre porte-bonheur.',
  },

  /* --- Mots & expressions -------------------------------------------------- */
  {
    id: 'mot-01', theme: 'mots',
    texte: 'De quoi le mot « salaire » tire-t-il son origine ?',
    reponses: ['Du sel', 'D’une pièce romaine', 'Du mot « salut »', 'D’un magistrat'],
    bonne: 0,
    note: 'Du salarium romain : les soldats recevaient une ration de sel, ou de quoi l’acheter. Le sel valait cher, il conservait tout.',
  },
  {
    id: 'mot-02', theme: 'mots',
    texte: 'De quelle langue le français a-t-il repris le mot « alcool » ?',
    reponses: ['L’arabe', 'Le latin', 'Le grec', 'L’espagnol'],
    bonne: 0,
    note: 'D’al-kuhl, une poudre obtenue par sublimation. De là l’idée de quintessence, puis d’esprit-de-vin, puis de ce qu’on met dans les verres.',
  },
  {
    id: 'mot-03', theme: 'mots',
    texte: 'Comment appelle-t-on un mot qui se lit pareil dans les deux sens ?',
    reponses: ['Un palindrome', 'Une anagramme', 'Un homonyme', 'Un acronyme'],
    bonne: 0,
    note: '« Kayak », « ressasser », et la phrase que tout le monde ressort : « Ésope reste ici et se repose ».',
  },
  {
    id: 'mot-04', theme: 'mots',
    texte: 'D’où vient le mot « bougie » ?',
    reponses: ['D’une ville d’Algérie', 'Du nom d’un fabricant', 'D’un mot latin', 'D’une plante à cire'],
    bonne: 0,
    note: 'De Béjaïa, appelée Bougie en français : c’est elle qui exportait la cire vers l’Europe médiévale.',
  },
  {
    id: 'mot-05', theme: 'mots',
    texte: 'Que signifie l’acronyme « laser » ?',
    reponses: ['Une amplification de la lumière', 'Une lentille à haute énergie', 'Un rayon de chaleur dirigé', 'Rien : c’est un nom de marque'],
    bonne: 0,
    note: 'Light Amplification by Stimulated Emission of Radiation. Le maser, son grand frère, faisait la même chose avec des micro-ondes.',
  },
  {
    id: 'mot-06', theme: 'mots',
    texte: 'Quelle langue compte le plus de locuteurs pour qui elle est la langue maternelle ?',
    reponses: ['Le mandarin', 'L’anglais', 'L’espagnol', 'L’hindi'],
    bonne: 0,
    note: 'Le mandarin, très largement. L’anglais ne repasse devant que si l’on compte tous ceux qui l’ont appris ensuite.',
  },
  {
    id: 'mot-07', theme: 'mots',
    texte: 'De quelle langue le mot « ketchup » vient-il à l’origine ?',
    reponses: ['D’un dialecte chinois', 'De l’anglais', 'De l’espagnol', 'Du hindi'],
    bonne: 0,
    note: 'D’un mot du sud de la Chine qui désignait une saumure de poisson. La tomate n’est entrée dans la recette que bien plus tard.',
  },
  {
    id: 'mot-08', theme: 'mots',
    texte: 'Que veut dire le « bis » d’une adresse, comme au 12 bis ?',
    reponses: ['Deux fois', 'Le suivant', 'Le petit', 'L’annexe'],
    bonne: 0,
    note: 'Du latin bis, « deux fois ». Après bis vient ter, puis quater — et là, le facteur commence à souffrir.',
  },
  {
    id: 'mot-09', theme: 'mots',
    texte: 'Comment appelle-t-on une phrase qui contient toutes les lettres de l’alphabet ?',
    reponses: ['Un pangramme', 'Un lipogramme', 'Un idiome', 'Un calligramme'],
    bonne: 0,
    note: 'Les imprimeurs s’en servaient pour montrer une police entière. Un lipogramme, c’est l’inverse : un texte qui s’interdit une lettre.',
  },
  {
    id: 'mot-10', theme: 'mots',
    texte: 'Que désigne un « sobriquet » ?',
    reponses: ['Un surnom', 'Une injure', 'Un compliment forcé', 'Un titre honorifique'],
    bonne: 0,
    note: 'Un surnom, souvent moqueur. Le mot est vieux de sept siècles et n’a jamais été très gentil.',
  },
  {
    id: 'mot-11', theme: 'mots',
    texte: 'Que signifie l’expression latine « carpe diem » ?',
    reponses: ['Cueille le jour', 'Le jour se lève', 'Chaque jour compte', 'Prends garde au jour'],
    bonne: 0,
    note: 'Une image de jardinage chez Horace : on cueille la journée comme un fruit mûr, parce qu’elle ne se garde pas.',
  },
  {
    id: 'mot-12', theme: 'mots',
    texte: 'Que veut dire « éponyme » ?',
    reponses: ['Qui donne son nom à autre chose', 'Qui porte le même nom qu’un autre', 'Qui est resté célèbre', 'Qui se répète à l’identique'],
    bonne: 0,
    note: 'Le héros éponyme d’un roman, c’est celui qui lui donne son titre — et jamais l’inverse, contrairement à ce qu’on entend partout.',
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

const poolDe = (themes, types) => toutesLesQuestions().filter((q) => {
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

  const duFil = fil ? toutesLesQuestions().filter((q) => q.fil === fil) : [];
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
