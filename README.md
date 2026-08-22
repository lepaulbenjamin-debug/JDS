# Scores — compteur de points pour jeux de société

Application web (PWA) pour compter les points d'une partie sans calcul mental,
avec une lecture des scores par IA à partir d'une photo.

Le premier jeu implémenté est le **Papayoo**. L'architecture est prévue pour en
ajouter d'autres : un jeu = un module dans `web/js/games/`.

## Ce que ça fait

- **Saisie en deux gestes.** Mode « Cartes » : on touche un joueur, puis les
  Payoos qu'il a ramassés — le score se calcule tout seul et le total ne peut
  pas être faux. Mode « Points » : saisie directe au clavier numérique, avec un
  raccourci `+40` pour le Papayoo et un bouton « attribuer le reste » quand il
  ne manque plus qu'un joueur.
- **Contrôle automatique.** Une manche de Papayoo distribue exactement
  250 points (210 de Payoos + 40 pour le Papayoo). L'appli affiche en continu
  ce qu'il reste à répartir et refuse silencieusement rien : elle demande
  confirmation si le compte ne tombe pas juste.
- **Règles et mise en place expliquées à voix haute.** Chaque jeu a sa fiche :
  une présentation en deux phrases à lire à la table, puis la mise en place
  découpée en étapes courtes. On lance la lecture, on pose le téléphone au
  milieu de la table, et l'appli annonce chaque étape pendant qu'on prépare le
  jeu — avec pause et reprise, et une étape à la fois si besoin. Le texte
  s'adapte à l'effectif : à 4 joueurs elle dit « 15 cartes chacun, écart de 5 »,
  à 7 elle dit de retirer les quatre 1 d'abord.
- **Lecture par IA.** Photo d'une feuille de scores manuscrite → les manches
  sont proposées, joueur par joueur. Photo des cartes ramassées par un joueur →
  la somme des Payoos (+ le Papayoo) est calculée. Les résultats sont toujours
  affichés pour relecture avant d'être appliqués.
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
    games/index.js       registre des jeux
server/                  serveur optionnel (Node ≥ 20, SDK Anthropic)
scripts/make-icons.mjs   génère les PNG d'icône (node scripts/make-icons.mjs)
```

## Ajouter un jeu

Créer `web/js/games/<jeu>.js` exportant un objet avec `id`, `name`,
`minPlayers`, `maxPlayers`, `lowestWins`, `roundTotal`, `targetChoices`,
`validateRound(scores, players)`, puis l'ajouter au tableau `GAMES` de
`web/js/games/index.js`. Le mode « cartes » est optionnel : il s'active avec
`supportsTokens: true` et une liste `tokens` (`{ id, value, label, kind }`).

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
