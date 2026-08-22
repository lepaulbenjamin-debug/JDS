# Scores — compteur de points pour jeux de société

Application web (PWA) pour compter les points d'une partie sans calcul mental,
avec une lecture des scores par IA à partir d'une photo.

Deux jeux sont implémentés : le **Papayoo** et le **Skyjo**. Un jeu = un module
dans `web/js/games/`, et le moteur s'adapte à ses règles.

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
  manche, elle décide si son score double, et vous dit pourquoi. Elle ne refuse
  jamais rien en silence : si le compte ne tombe pas juste, elle demande
  confirmation.
- **Règles et mise en place expliquées à voix haute.** Chaque jeu a sa fiche :
  une présentation en deux phrases à lire à la table, puis la mise en place
  découpée en étapes courtes. On lance la lecture, on pose le téléphone au
  milieu de la table, et l'appli annonce chaque étape pendant qu'on prépare le
  jeu — avec pause et reprise, et une étape à la fois si besoin. Le texte
  s'adapte à l'effectif : à 4 joueurs elle dit « 15 cartes chacun, écart de 5 »,
  à 7 elle dit de retirer les quatre 1 d'abord.
- **Lecture par IA.** Photo d'une feuille de scores manuscrite → les manches
  sont proposées, joueur par joueur. Photo des cartes d'un joueur → le total est
  calculé : les Payoos ramassés au Papayoo, la grille de fin de manche au Skyjo.
  Les résultats sont toujours affichés pour relecture avant d'être appliqués.
- **Hors-ligne.** Tout le comptage fonctionne sans réseau ; l'appli s'installe
  sur l'écran d'accueil du téléphone. Seule la lecture IA a besoin d'Internet.
- **Local.** Parties et réglages restent dans le navigateur (`localStorage`).
  Rien n'est envoyé nulle part, à part les photos que vous soumettez à l'IA.

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
    store.js             état + persistance localStorage + calculs de scores
    ui.js                helpers DOM
    ai.js                capture, redimensionnement, appel de lecture
    vision-prompt.js     prompt + schéma de sortie (partagé client/serveur)
    speech.js            lecture à voix haute (SpeechSynthesis du navigateur)
    games/papayoo.js     règles, mise en place orale, validation, jetons
    games/skyjo.js       idem + règle du doublement de fin de manche
    games/index.js       registre des jeux
server/                  serveur optionnel (Node ≥ 20, SDK Anthropic)
scripts/make-icons.mjs   génère les PNG d'icône (node scripts/make-icons.mjs)
```

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
| `vision` | contexte de règles et mode « cartes » pour la lecture par IA |

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
