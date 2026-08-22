# Scores — compteur de points pour jeux de société

Application web (PWA) pour compter les points d'une partie sans calcul mental,
avec une lecture des scores par IA à partir d'une photo.

Sept jeux sont implémentés : **Papayoo**, **Skyjo**, **6 qui prend !**,
**Tarot**, **Belote**, **Skull King** et **Le Barbu**. Un jeu = un module dans
`web/js/games/`, et le moteur s'adapte à ses règles.

## Ce que ça fait

- **Saisie en deux gestes.** Au Papayoo, mode « Cartes » : on touche un joueur,
  puis les Payoos qu'il a ramassés — le score se calcule tout seul et le total
  ne peut pas être faux. Partout, mode « Points » : saisie au clavier numérique,
  avec les raccourcis utiles au jeu (`+40` pour le Papayoo, `±` pour les scores
  négatifs du Skyjo) et un bouton « attribuer le reste » quand il ne manque plus
  qu'un joueur.
- **Les calculs pénibles, faits par l'appli.** Une manche de Papayoo distribue
  exactement 250 points : l'appli affiche en continu ce qu'il reste à répartir.
  Au Skyjo, elle applique la règle du doublement — vous désignez qui a fermé la
  manche, elle décide si son score double, et vous dit pourquoi. Au 6 qui prend,
  les cinq valeurs de têtes de bœuf sont des boutons : on compte son tas en
  tapotant, sans se souvenir que le 55 en vaut sept. Elle ne refuse jamais rien
  en silence : si le compte ne tombe pas juste, elle demande confirmation.
- **Au Tarot, le score n'est plus saisi mais calculé.** On décrit la donne —
  preneur, contrat, bouts, points réalisés, petit au bout, poignée, chelem — et
  l'appli applique la formule officielle, répartit entre le preneur, l'appelé et
  les défenseurs, et **montre le détail du calcul** en permanence au-dessus du
  bouton de validation : `(25 + 8) × 2 = 66, petit au bout +20, poignée +20.
  Ana +318, les autres −106.`
- **À la Belote, le litige traverse les donnes.** L'appli juge le contrat belote
  comprise, applique le capot à 252, et sur une égalité 81-81 met les points du
  preneur de côté — puis préremplit toute seule le champ de report sur la donne
  suivante. Au Skull King, une ligne par joueur : mise, plis réalisés, bonus ; et
  un garde-fou qui refuse une manche dont le total des plis ne colle pas au
  nombre de cartes distribuées.
- **Au Barbu, chaque manche a son contrat, donc son formulaire.** On annonce ce
  qu'il fallait éviter — les plis, les cœurs, les dames, le roi de cœur, les
  derniers plis, tout à la fois, ou la réussite — et l'appli ne demande que ce
  qui compte pour ce contrat-là : une grille de plis, ou simplement qui a
  ramassé le Barbu. Elle vérifie que les treize cœurs et les quatre dames sont
  tous attribués, propose d'office le premier contrat encore à jouer, marque
  d'un ✓ ceux qui sont faits, et nomme chaque manche par son contrat dans
  l'historique plutôt que par un numéro.
- **Règles et mise en place expliquées à voix haute.** Chaque jeu a sa fiche :
  une présentation en deux phrases à lire à la table, puis la mise en place
  découpée en étapes courtes. On lance la lecture, on pose le téléphone au
  milieu de la table, et l'appli annonce chaque étape pendant qu'on prépare le
  jeu — avec pause et reprise, et une étape à la fois si besoin. Le texte
  s'adapte à l'effectif : à 4 joueurs elle dit « 15 cartes chacun, écart de 5 »,
  à 7 elle dit de retirer les quatre 1 d'abord.
- **Compter en photo.** Photo d'une feuille de scores manuscrite → les manches
  sont proposées, joueur par joueur. Photo des cartes d'un joueur → le total est
  calculé : les Payoos ramassés au Papayoo, la grille de fin de manche au Skyjo,
  le tas ramassé au 6 qui prend. Là, l'IA ne lit que les numéros des cartes et
  c'est l'appli qui applique le barème — plus fiable que de lui demander de
  connaître la valeur de chaque carte. Les résultats sont toujours affichés pour
  relecture avant d'être appliqués.
- **Un carnet de joueurs.** Les habitués sont enregistrés une fois : au
  démarrage d'une partie on les touche dans l'ordre où ils sont assis, sans
  rien retaper, et chacun garde sa couleur d'une partie à l'autre. Les jeux en
  équipes gardent la saisie libre.
- **Les parties restent consultables.** Une partie archivée s'ouvre sur son
  tableau complet, manche par manche. Et comme les joueurs ont une identité
  durable, chacun a son palmarès : victoires sur parties jouées, détaillé par
  jeu.
- **Hors-ligne.** Tout le comptage fonctionne sans réseau ; l'appli s'installe
  sur l'écran d'accueil du téléphone. Seule la lecture IA a besoin d'Internet.
- **Local.** Parties, carnet et réglages restent dans le navigateur
  (`localStorage`). Rien n'est envoyé nulle part, à part les photos que vous
  soumettez à l'IA.

## Lancer l'appli

### Sans serveur (le plus simple)

`web/` est un site statique : n'importe quel serveur de fichiers suffit.

```bash
cd web
python3 -m http.server 8080
# puis http://localhost:8080
```

Il peut aussi être publié tel quel sur GitHub Pages, Netlify, etc.
Pour la lecture IA dans ce mode, allez dans **Réglages → Lecture IA → Clé
directe** et collez une clé API Anthropic : elle est stockée uniquement dans ce
navigateur et l'appel part directement de l'appareil. Pratique en usage
personnel ; à éviter sur un poste partagé.

### Avec le serveur Node (clé API côté serveur)

```bash
cd server
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
# puis http://localhost:8080
```

Le serveur sert la PWA et expose `POST /api/scan`, qui relaie la photo à l'API
Claude. La clé ne quitte jamais le serveur. C'est le mode par défaut dans les
réglages de l'appli (« Via un serveur », adresse vide = même origine).

## Structure

```
web/                     PWA statique, sans build ni dépendance
  index.html             tous les écrans (affichés/masqués en JS)
  styles.css
  manifest.webmanifest   installation sur mobile
  sw.js                  service worker (fonctionnement hors-ligne)
  js/
    app.js               navigation, rendu, câblage des écrans
    store.js             état + persistance localStorage + carnet + calculs
    ui.js                helpers DOM
    ai.js                capture, redimensionnement, appel de lecture
    vision-prompt.js     prompt + schéma de sortie (partagé client/serveur)
    speech.js            lecture à voix haute (SpeechSynthesis du navigateur)
    games/papayoo.js     règles, mise en place orale, validation, jetons
    games/skyjo.js       idem + règle du doublement de fin de manche
    games/six-qui-prend.js  idem + barème des têtes de bœuf
    games/tarot.js       idem + saisie par formulaire et calcul officiel FFT
    games/belote.js      idem + contrat, capot et report de litige
    games/skull-king.js  idem + saisie en grille (mise / plis / bonus)
    games/barbu.js       idem + un formulaire par contrat et barèmes réglables
    games/index.js       registre des jeux
server/                  serveur optionnel (Node ≥ 20, SDK Anthropic)
scripts/make-icons.mjs   génère les PNG d'icône (node scripts/make-icons.mjs)
scripts/build-single-file.mjs  assemble tout en un seul fichier HTML
```

## Tester sans rien installer

```bash
node scripts/build-single-file.mjs
# → dist/scores-app.html, un fichier autonome à ouvrir ou à héberger n'importe où
```

Le fichier est dérivé des sources : on le régénère, on ne le modifie pas. Il
comporte deux limites par rapport au dossier `web/` : pas de service worker,
donc ni installation ni fonctionnement hors-ligne ; et la lecture par IA
suppose que la page puisse joindre `api.anthropic.com`, ce que certains
hébergeurs bloquent.

## Ajouter un jeu

Créer `web/js/games/<jeu>.js` exportant un objet avec `id`, `name`,
`minPlayers`, `maxPlayers`, `lowestWins`, `targetChoices` et
`validateRound(scores, players, extras)`, puis l'ajouter au tableau `GAMES` de
`web/js/games/index.js`.

Le moteur s'adapte au jeu par des champs optionnels :

| Champ | Effet |
|---|---|
| `roundTotal` | total fixe d'une manche ; `null` désactive la vérification et le bouton « attribuer le reste » |
| `allowsNegative` | autorise les scores négatifs et affiche un bouton `±` (le pavé numérique mobile n'a pas de signe moins) |
| `quickAdd` | raccourcis `{ label, value, title }` à côté de chaque score |
| `supportsTokens` + `tokens` | mode « Cartes » : attribution de jetons `{ id, value, label, kind }` |
| `extras` | informations demandées avant de valider, ex. `{ key, type: 'player', label, hint }` |
| `finalize(raw, extras, players)` | applique les règles de fin de manche, renvoie `{ scores, notes }` — les points saisis sont conservés à part, donc rouvrir une manche ne rejoue pas l'effet |
| `vision` | contexte de règles et mode « cartes » pour la lecture par IA ; `vision.cards.mapValue` convertit ce que l'IA lit sur la carte en points |
| `endMode: 'rounds'` | la partie s'arrête après N donnes au lieu d'un score cible ; `targetChoices` est alors un nombre de donnes |
| `lowestWins: false` | le plus grand total gagne (Tarot) |
| `entry: 'form'` + `form(playerCount, players, rounds, form)` | la manche est décrite par un formulaire (`player`, `choice`, `number`, `players`) et non par un score par joueur ; `finalize` calcule alors tous les scores, et `raw` conserve le formulaire pour permettre la correction. Le 4e argument est la saisie en cours : au Barbu, les champs demandés dépendent du contrat qu'on vient de choisir |
| `roundTitle(round, index)` | nomme une manche par ce qui s'y est joué plutôt que par son rang (au Barbu, le contrat annoncé) |
| `roundLabel` | « Manche » ou « Donne », employé partout dans l'interface |
| `participantLabel` + `defaultNames` | les participants sont des équipes et non des joueurs (Belote) |
| `options` | variantes fixées avant de commencer, rendues sur l'écran de configuration et transmises au calcul (litige à la belote, bonus au Skull King, barèmes du Barbu) |
| `finalize` → `meta` | ce que la manche laisse à la suivante ; `formDefaults(players, rounds)` peut le relire (report de litige) |

Les règles reçoivent un contexte unique : `validateRound(saisie, participants,
ctx)` et `finalize(saisie, ctx, participants)`, avec
`ctx = { extras, options, rounds }`.

Trois champs alimentent la fiche règles :

- `pitch` — deux ou trois phrases de présentation, écrites pour être dites.
- `setup(playerCount)` — la mise en place, sous forme d'étapes
  `{ title, say }`. `say` est lu à voix haute : écrivez-le comme vous le diriez
  à la table (« Mélangez, puis distribuez… »), en une à trois phrases, et
  faites-le dépendre de `playerCount` là où les règles varient. Les étapes
  courtes évitent aussi la coupure de synthèse vocale de Chrome.
- `rules` — les sections `{ title, body }` de référence, à lire, pas à écouter.

C'est la partie qui rend l'appli utile sur les petits jeux : même sans compteur
de points sophistiqué, un `pitch` + un `setup()` suffisent à sortir un jeu et à
l'expliquer sans rouvrir la règle.

## Lecture à voix haute

La voix vient de l'API `SpeechSynthesis` du navigateur : pas de réseau, pas de
coût, pas de clé. La voix française du système est choisie automatiquement, en
préférant une voix locale. Si le navigateur n'a pas l'API, les commandes audio
disparaissent et les étapes restent lisibles. S'il a l'API mais aucune voix
installée (le cas de certains Linux de bureau), un garde-fou débloque
l'interface au bout de quelques secondes avec un message clair.

## Modèle utilisé

La lecture d'image utilise `claude-opus-5` avec une sortie structurée
(`output_config.format`), ce qui garantit que la réponse respecte le schéma
attendu par l'appli — pas de parsing approximatif.

Le serveur passe par le SDK officiel `@anthropic-ai/sdk`. En mode « clé
directe », l'appel part du navigateur en HTTP direct (pas de bundler dans ce
projet, donc pas de SDK côté client) avec l'en-tête
`anthropic-dangerous-direct-browser-access`.

## Règles du Barbu (rappel)

3 à 6 joueurs, 52 cartes, tout le paquet distribué. À 3, 5 ou 6 joueurs le
compte ne tombe pas juste : on retire 1, 2 ou 4 petites cartes noires ou
carreau — jamais un cœur ni une dame, sinon les contrats perdent leur valeur.

Sept manches, sept contrats, annoncés à tour de rôle par celui qui a la main.
On doit fournir la couleur demandée si on en a une, sans obligation de monter ;
il n'y a pas d'atout.

| Contrat | Barème |
|---|---|
| Les plis | −10 par pli ramassé |
| Les cœurs | −10 par cœur (−130 en tout) |
| Les dames | −20 par dame (−80 en tout) |
| Le Barbu | −50 pour le roi de cœur |
| Les derniers plis | −50 pour le dernier, −30 pour l'avant-dernier |
| La salade | les cinq précédents cumulés sur une seule manche |
| La réussite | +100 au premier à vider sa main, +50 au deuxième |

Les points sont surtout des pénalités : le gagnant est celui dont le total est
le plus élevé, c'est-à-dire celui qui a le moins ramassé.

**Les barèmes varient d'une famille à l'autre.** Le Barbu se transmet de bouche
à oreille, et les sources consultées ne s'accordent pas : le roi de cœur vaut
−50 ou −80, certaines tables ne comptent que le dernier pli, et la réussite se
joue en +100/+50 ou en +45/+20/+10 avec −10 au dernier. Les valeurs du tableau
sont celles qui reviennent le plus souvent ; les trois écarts sont réglables au
moment de créer la partie plutôt que tranchés dans le code.

## Règles de la Belote (rappel)

Deux équipes de deux, 32 cartes, un atout choisi par un camp qui s'engage à
faire mieux que l'autre. À l'atout : Valet 20, Neuf 14, As 11, Dix 10, Roi 4,
Dame 3 ; ailleurs : As 11, Dix 10, Roi 4, Dame 3, Valet 2. Les cartes totalisent
152 points, plus 10 pour le dernier pli — le « dix de der » — soit **162 points
par donne**. En cas de capot (les 8 plis), le dix de der vaut 100 et la donne
monte à **252**. La belote-rebelote (Roi et Dame d'atout annoncés) vaut 20
points, **imprenables même en cas de chute**.

Le contrat est réussi si le camp preneur totalise **strictement plus** que
l'adversaire, belote comprise ; s'il chute, il ne garde que sa belote et
l'adversaire marque toute la donne. En cas d'égalité parfaite, la Fédération
prévoit le **litige** : les points du preneur sont remis en jeu pour la donne
suivante — mais elle laisse chaque table libre de l'appliquer ou non, comme
l'arrondi à la dizaine. Ce sont deux réglages au démarrage de la partie.

## Règles du Skull King (rappel)

Dix manches : une carte à la première, dix à la dixième. Chacun annonce le
nombre exact de plis qu'il compte remporter. **Mise d'au moins 1** tenue
exactement : 20 points par pli ; ratée : −10 par pli d'écart, et rien pour les
plis réalisés. **Mise à zéro** tenue : +10 × le nombre de cartes de la manche ;
ratée : −10 × ce même nombre.

Bonus : 10 points par carte 14 de couleur possédée en fin de manche, 20 pour la
14 noire, 20 par sirène capturée par un pirate, 30 par pirate capturé par le
Skull King, 40 si votre sirène capture le Skull King.

*Attention* : l'édition 2022 accorde ces bonus **quelle que soit la réussite de
la mise**, contrairement à la règle plus ancienne — et plus répandue — qui les
réserve à ceux qui ont tenu leur mise. Le choix se fait au démarrage.

## Règles du Tarot (rappel)

Jeu de 78 cartes : quatre couleurs de quatorze cartes et vingt et un atouts plus
l'Excuse. Le preneur s'engage seul (ou avec un appelé à 5 joueurs) à réaliser un
nombre de points qui dépend des **bouts** qu'il ramasse — le Petit, le 21 et
l'Excuse : **56 points sans bout, 51 avec un, 41 avec deux, 36 avec trois**. Le
total du jeu est de 91 points, comptés au demi-point près ; le demi-point va
toujours au camp qui gagne la donne.

Distribution : 3 joueurs, 24 cartes et chien de 6 ; 4 joueurs, 18 cartes et
chien de 6 ; 5 joueurs, 15 cartes et chien de 3, avec appel d'un roi.

**La formule** : `(25 + écart) × coefficient du contrat` — petite ×1, garde ×2,
garde sans ×4, garde contre ×6. On ajoute ensuite le **petit au bout** (10 points
multipliés par le contrat, au camp qui remporte la dernière levée avec le Petit,
quel que soit le résultat de la donne), la **poignée** et le **chelem**, qui sont
des primes fixes non multipliées. La poignée vaut 20, 30 ou 40 points selon le
nombre d'atouts présentés (10/13/15 à 4 joueurs, 8/10/13 à 5, 13/15/18 à 3) et
revient au camp qui gagne la donne, quel qu'en soit l'annonceur. Le chelem vaut
400 annoncé et réussi, 200 réussi sans annonce, −200 annoncé et manqué.

Répartition : chaque défenseur marque l'opposé de ce total, le preneur en marque
autant de fois qu'il y a de défenseurs. À 5 joueurs avec un appelé distinct, le
preneur en prend deux parts et l'appelé une. Le total d'une donne fait toujours
zéro. On joue un nombre de donnes convenu, et le plus grand total gagne.

*Limite connue* : le chelem réalisé par la défense contre le preneur, cas rare,
n'est pas proposé dans la saisie.

## Règles du 6 qui prend ! (rappel)

104 cartes numérotées de 1 à 104. Chacun reçoit 10 cartes, puis on retourne
4 cartes au centre pour ouvrir 4 rangées de 5 places maximum. À chaque tour,
tout le monde choisit une carte simultanément ; on les résout de la plus petite
à la plus grande, chacune au bout de la rangée dont la dernière carte est la
plus proche en dessous d'elle. Poser la 6e carte d'une rangée fait ramasser les
5 précédentes ; une carte plus petite que toutes les fins de rangées fait
ramasser une rangée au choix. On joue avec les 104 cartes quel que soit
l'effectif (2 à 10 joueurs).

**Le barème qu'on oublie** : 1 tête de bœuf par carte ordinaire, 2 pour les
cartes se terminant par 5, 3 pour les dizaines, 5 pour les doublets (11, 22,
33…), et 7 pour le 55. Une seule règle s'applique, la plus généreuse — le 55
vaut 7 et non 2. Le paquet complet contient 171 têtes de bœuf. Fin de partie à
66 points, plus petit total gagnant.

## Règles du Skyjo (rappel)

150 cartes de -2 à 12. Chacun reçoit 12 cartes en 3 lignes de 4 colonnes, face
cachée, et en retourne 2 ; celui dont la somme est la plus élevée commence. À
son tour on prend la carte de la défausse et on l'échange, ou on pioche puis on
échange ou on défausse en retournant une carte cachée. Trois cartes identiques
et visibles dans une colonne sont retirées du jeu. La manche s'arrête quand un
joueur a retourné ses 12 cartes ; les autres finissent le tour.

**La règle qui se rate** : si le joueur qui a fermé la manche n'a pas
strictement le plus petit score, son score de manche est doublé — mais
uniquement s'il est positif. Un score nul ou négatif n'est jamais doublé, et
une égalité pour la plus petite place compte comme « pas strictement le plus
petit ». La partie s'arrête dès qu'un joueur atteint 100 points ; le plus petit
total gagne.

## Règles du Papayoo (rappel)

60 cartes : les 4 couleurs classiques de 1 à 10 (0 point) et 20 Payoos
numérotés de 1 à 20, chacun valant sa valeur en points de pénalité. Avant
chaque manche, un dé désigne une couleur : le 7 de cette couleur devient le
Papayoo et vaut 40 points. Une manche distribue donc 250 points. On joue en
plis ; celui qui remporte le pli ramasse les points. La partie s'arrête dès
qu'un joueur atteint le score cible, et **le plus petit total gagne**.

Distribution et écart selon l'effectif : 3 joueurs, 20 cartes et écart de 5 ;
4 joueurs, 15 cartes et écart de 5 ; 5 joueurs, 12 cartes et écart de 4 ;
6 joueurs, 10 cartes et écart de 3 ; à 7 et 8 joueurs on retire d'abord les
quatre 1 des couleurs classiques (8 puis 7 cartes chacun, écart de 3).
L'écart se passe face cachée au voisin de gauche, et le donneur ne lance le dé
qu'une fois tous les écarts faits.
