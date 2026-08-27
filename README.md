# Scores — compteur de points pour jeux de société

Application web (PWA) pour compter les points d'une partie sans calcul mental,
avec une lecture des scores par IA à partir d'une photo.

Le dépôt héberge aussi **Quiz Room** (`/quiz/`), un quiz de soirée où chaque
téléphone devient un pupitre et où l'animateur, c'est l'appli — [voir plus
bas](#quiz-room--le-quiz-de-soirée).

Dix jeux sont implémentés : **Papayoo**, **Skyjo**, **6 qui prend !**,
**Tarot**, **Belote**, **Skull King**, **Le Barbu**, **7 Wonders**, **Mölkky**
et **Les Aventuriers du Rail** (États-Unis, Europe, Autour du Monde). Un jeu =
un module dans `web/js/games/`, et le moteur s'adapte à ses règles.

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
- **Au 7 Wonders, le décompte final n'est plus une corvée.** Sept sources de
  points à additionner en fin de partie, dont deux que personne ne calcule juste
  du premier coup. Pour la science, on saisit **le nombre de symboles**, pas les
  points : l'appli fait les carrés et les groupes de trois, et montre son
  calcul — `3² + 2² + 1² = 14, plus 1 groupe de trois à 7 points → 21`. Le
  trésor est divisé par trois, le classement se met à jour à chaque case
  remplie, et en cas d'égalité c'est le trésor qui départage, dans le tableau
  comme dans la règle.
- **Au Mölkky, une manche est un seul lancer.** L'appli sait qui doit lancer,
  saute ceux qui sont éliminés, et il n'y a que deux gestes à faire : toucher
  ce qui est tombé, valider. Elle applique le retour à 25 — et le dit **avant**
  que vous validiez : « 48 + 5 dépasserait 50 : Alice redescend à 25 ». Elle
  compte les lancers nuls et affiche « 2 ratés » à côté du nom avant que le
  troisième n'élimine. Et comme un lancer dépend de tous les précédents,
  corriger un vieux lancer **rejoue la partie entière** : le dépassement qui
  n'a plus lieu d'être disparaît de lui-même.
- **Aux Aventuriers du Rail, on saisit des routes, pas des points.** Combien de
  routes de 3, combien de 6 : l'appli applique le barème, qui n'est pas
  linéaire — une route de 6 vaut quinze fois une route de 1 — et montre sa
  conversion (`3×2 + 2×10 + 1×18 + 2×21 = 86`). Les trois éditions ont chacune
  leur décompte, et l'écran s'y adapte : les gares en Europe, les ports Autour
  du Monde, et le bonus du plus long chemin — qui se partage entre ex æquo, et
  qui **n'existe pas** dans l'édition Autour du Monde. La mise en place lue à
  voix haute change elle aussi avec la boîte choisie.
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

## Quiz Room — le quiz de soirée

Deuxième appli du dépôt, sous `web/quiz/`, servie à **`/quiz/`**. Elle ne compte
pas les points d'un jeu de plateau : elle *est* le jeu.

Le principe est celui des salles de quiz : tout le monde répond en même temps,
et **plus on répond vite, plus on marque**. La différence, c'est qu'il n'y a
**pas d'animateur humain**. Personne ne pilote l'écran, personne n'annonce les
points, personne ne reste sur la touche : la partie se déroule toute seule et
tout le monde joue.

- **Chaque téléphone est un pupitre.** Un joueur crée le salon, les autres
  tapent un code à quatre lettres (ou suivent le lien partagé). Aucune install :
  c'est une page web.
- **Quatre formes de manche**, mêlées dans la même partie et cochables dans les
  réglages. **Question** : quatre réponses, le plus rapide marque le plus.
  **Estimation** : un nombre à avancer, le plus proche rafle la manche et la
  vitesse ne compte plus — on réfléchit au lieu de dégainer. **Dans l'ordre** :
  quatre éléments à classer, des points par position juste. **Rafale** : cinq
  vrai-faux d'un coup, barème plat. Chaque type ajuste son chrono : taper un
  nombre prend plus de temps que toucher un bouton.
- **Un fil rouge, en option.** Un même mot relie les bonnes réponses de
  plusieurs manches, sans que rien ne l'annonce. Chacun peut le nommer à tout
  moment : le premier à trouver rafle une prime qui fond au fil de la partie, et
  se tromper coûte deux manches de silence. C'est la seule chose qui traverse
  les manches — et elle ne demande aucun secret par joueur, donc rien à filtrer
  côté relais.
- **L'animateur, c'est l'appli.** Il ouvre la soirée, annonce les manches, lit
  l'énoncé, révèle la bonne réponse et son explication, et clôt sur le podium —
  avec trois personnalités au choix : classique, chambreur, pince-sans-rire.
  **Seul l'appareil qui tient la régie parle** : sinon toute la table récite la
  même phrase en canon. Le bouton 🔊 l'active ou la coupe sur chaque appareil.
- **Des jokers pour renverser la table.** Un usage chacun par partie, et une
  seule fenêtre pour les jouer : les six secondes qui précèdent la question,
  **avant d'avoir vu l'énoncé**. Passé le top, la barre se verrouille — un
  joker choisi la question sous les yeux ne serait plus un pari mais une
  évidence. Au menu : **quitte ou double**, **vol** (prendre la moitié de ce
  que le leader gagne), **sabotage** (le leader ne marque rien), **sang-froid**
  (marquer le maximum sans courir après le chrono), **50/50** (deux mauvaises
  réponses disparaissent, points divisés par deux). C'est ce qui fait qu'un jeu
  de soirée n'est pas gagné d'avance par le plus cultivé.
- **Les jokers se choisissent à la partie.** Les réglages permettent de n'en
  ouvrir que certains — ou aucun. Sans jokers, c'est le « quiz loyal » : pas de
  filet, le plus rapide gagne. La section disparaît alors de l'écran de jeu, et
  un joker écarté n'a aucun effet même si un pupitre en renvoie un.
- **Un seul vol et un seul sabotage par manche**, au plus rapide à avoir trouvé.
  Les autres récupèrent leur joker : il n'y avait plus rien à prendre, ils ne
  vont pas le perdre pour autant. Un joker joué sur une mauvaise réponse, lui,
  est bel et bien perdu.
- **La dernière manche vaut double**, et un score ne descend jamais sous zéro :
  personne n'est éliminé avant la fin.

### Mettre la Quiz Room en ligne

Le jeu tourne en local avec `npm start`, mais il n'est vraiment « accessible sur
le web » qu'une fois déployé — et le HTTPS n'est pas cosmétique : sur une
adresse `http://192.168.x.x`, le navigateur désactive `crypto.randomUUID`, le
verrou de veille, le presse-papiers et le service worker. Les quatre reviennent
en ligne, dont le verrou de veille, qui est précisément ce qui empêche la partie
de se figer quand l'écran de la régie s'éteint.

Trois choses à faire, dans cet ordre :

1. **Un stockage partagé.** En serverless, deux requêtes tombent sur deux
   instances différentes : sans lui, un salon paraît introuvable une fois sur
   deux et une licence achetée disparaît. Créez une base Upstash Redis et
   renseignez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`. Le code
   les lit déjà, pour les salons comme pour les licences.
2. **Les enregistrements de l'animateur.** `node scripts/generate-audio.mjs`
   avec une clé, puis on versionne le dossier `web/quiz/audio/` : quelques
   mégaoctets de MP3, servis par le CDN. Sans eux, l'animateur retombe sur la
   voix de synthèse de chaque appareil.
3. **Le déploiement.** Importer le dépôt sur Vercel, ajouter les variables. Rien
   d'autre : `vercel.json` dit déjà tout, y compris de joindre `packs/` au
   paquet de la fonction.

Vérifier après coup, sans ouvrir l'interface :

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://…/quiz/            # 200
curl -s https://…/api/packs                                          # le catalogue
curl -s -o /dev/null -w '%{http_code}\n' https://…/packs/noel.json   # 404, impérativement
```

Ce dernier compte plus que les deux autres : un 200 signifierait qu'un pack
payant est téléchargeable par n'importe qui.

### Faire une première partie

```bash
npm install
npm start
```

Le serveur affiche au démarrage l'adresse à donner aux téléphones
(`http://192.168.x.x:8080/quiz/`). Tout le monde est sur le même Wi-Fi, rien à
installer : c'est une page web.

**Tenez la régie depuis l'ordinateur qui fait tourner `npm start`**, sur
`http://localhost:8080/quiz/`. Trois raisons, et la première suffit :

1. La partie avance sur l'appareil qui a créé le salon. Si son écran s'éteint,
   le navigateur gèle les minuteurs et **le jeu s'arrête pour tout le monde**.
   L'appli demande un verrou de veille, mais celui-ci n'existe qu'en contexte
   sécurisé — donc sur `localhost`, pas sur une adresse `http://192.168…`.
2. Un ordinateur ne reçoit pas d'appel en pleine manche finale.
3. C'est la même machine que le serveur : si elle est là, la partie est là.

Pensez aussi à désactiver la mise en veille de l'ordinateur, et à **laisser
l'onglet au premier plan** : un onglet en arrière-plan est ralenti par le
navigateur.

**Le reste des téléphones** peut se verrouiller, perdre le Wi-Fi, revenir : le
joueur retrouve sa place et son score. Un retardataire peut entrer entre deux
manches.

Pour une première fois : **8 questions, 15 secondes, trois ou quatre joueurs**.
Ça dure cinq minutes, ce qui est exactement ce qu'il faut pour voir si le rythme
tient avant d'y passer la soirée.

**Comment ça tient debout.** L'appareil qui crée le salon fait tourner le moteur
de jeu — « la régie ». Le serveur, lui, est volontairement bête : il garde le
dernier état publié, encaisse les réponses, et donne l'heure. Trois
conséquences :

- Les points de rapidité sont mesurés **sur le pupitre**, pas à l'arrivée au
  serveur : la latence réseau n'entre jamais dans le score. Les pupitres se
  calent sur l'horloge du relais pour partir tous au même instant.
- Faire évoluer les règles ne demande aucun redéploiement du serveur.

**Ce que le jeu ne protège pas.** La banque de questions est embarquée dans la
PWA — c'est ce qui permet de jouer sans réseau — donc **chaque téléphone connaît
déjà toutes les bonnes réponses**. L'état publié n'inclut `bonne` qu'à la
révélation, ce qui évite de l'avoir sous les yeux dans l'onglet réseau, mais ce
n'est pas une protection : qui veut tricher le peut. C'est assumé — entre amis
sur un canapé, une partie qui s'arrête quand le Wi-Fi tombe coûterait plus cher
qu'un tricheur théorique. C'est aussi ce qui rend le **50/50** possible sans
rien demander à la régie : le pupitre retrouve la bonne réponse tout seul.

En contrepartie : **si l'appareil de la régie recharge la page, la partie
s'arrête** pour tout le monde (une confirmation prévient avant de quitter). Les
autres pupitres, eux, peuvent se verrouiller, perdre le Wi-Fi ou revenir : ils
retrouvent leur place et leur score.

**En hébergement serverless**, le relais a besoin d'un stockage partagé, sinon
deux requêtes successives tombent sur deux instances différentes et le salon
paraît introuvable une fois sur deux. Renseignez `UPSTASH_REDIS_REST_URL` et
`UPSTASH_REDIS_REST_TOKEN` ; sans elles, le relais retombe sur un stockage en
mémoire, qui ne convient qu'au serveur Node autonome.

```bash
npm run check:quiz            # barème, jokers, déroulé d'une partie, relais
```

### Les packs de questions

Le modèle tient en une phrase : **dans une partie, un seul joueur paie**. Les
invités tapent un code, ne créent aucun compte et n'installent rien — chaque
partie est donc une démonstration gratuite à toute la table, et c'est le seul
canal de distribution réel. On ne vend jamais un mécanisme du jeu, seulement du
contenu : ce qui s'épuise, c'est la banque.

Les fichiers de `packs/` sont lus au moment de la requête, pas importés : sur
Vercel, il faut donc les joindre explicitement au paquet de la fonction, ce que
fait la clé `includeFiles` de `vercel.json`. Sans elle, le catalogue est vide en
production alors que tout marche en local.

```
packs/                   les packs, HORS de web/ — jamais servis en statique
lib/packs.js             catalogue, licences, contrôle d'accès
api/packs.mjs            la même chose, en fonction Vercel
web/quiz/js/packs.js     côté pupitre : téléchargement et cache hors-ligne
```

**Le point qui commande tout** : un fichier posé sous `web/` est servi à qui le
demande. Les packs vivent donc ailleurs et ne sortent que par l'API, après
vérification. Le catalogue, lui, est public — il faut bien montrer ce qu'on
vend. Une fois téléchargé, un pack est rangé dans le navigateur : **la promesse
hors-ligne vaut aussi pour ce qu'on a acheté**.

```bash
QUIZROOM_PACKS_OFFERTS=noel npm start     # débloque un pack sans paiement
```

Cette variable sert à trois choses : développer avec la mécanique complète,
offrir un pack en promotion, et vérifier la chaîne de bout en bout.

**Ce qui n'est pas ici, et volontairement** : l'encaissement. Prendre un
paiement demande un prestataire, un compte et des mentions légales, et rien de
tout cela n'a sa place dans un dépôt. Ce qui est branché, c'est ce qui vient
après : `accorder(licence, packId)` dans `lib/packs.js` est le seul point
d'entrée qu'un webhook de paiement doit appeler, une fois la transaction
confirmée. L'écriture par l'API exige `QUIZROOM_SECRET_ACHAT` ; sans cette
variable, elle est refusée — mieux vaut une boutique fermée qu'une boutique où
l'on se sert.

**Ajouter un pack** : un fichier JSON dans `packs/` (`id`, `nom`, `emoji`,
`resume`, `prix`, `questions`). Les questions suivent exactement le format de la
banque de base, types compris.

### La voix de l'animateur

`speechSynthesis` ne donne accès qu'aux voix **installées sur l'appareil**. Un
Mac, un iPhone et un Android n'ont pas le même catalogue, iOS n'en laisse pas
installer d'autres, et la qualité va du correct au robot de 2005. Aucun réglage
ne permet de garantir la même voix à toute la table : c'est structurel.

La banque de questions étant connue à l'avance, on ne lit pas en direct — on
**fabrique les fichiers une fois** :

```bash
node scripts/generate-audio.mjs --blanc          # clips muets, pour tester la chaîne
OPENAI_API_KEY=sk-... node scripts/generate-audio.mjs --voix=onyx
```

Même voix partout, aucune latence, hors-ligne, rien à payer à chaque partie, et
surtout : on peut **écouter chaque prise avant de la livrer**. Trois clips par
question — l'énoncé, la bonne réponse, l'explication — plus les répliques de
l'animateur. Comptez une quinzaine de minutes d'audio pour soixante questions.

Une relance ne refait que ce qui manque (`--tout` pour tout regénérer), et
`web/quiz/audio/` est ignoré par git : ce sont des binaires lourds, régénérables
à l'identique depuis la banque.

**La contrainte à connaître** : un fichier pré-généré ne peut pas dire « Ana ».
Les répliques prononcées ne contiennent donc **ni prénom, ni score, ni bonne
réponse** — tout cela reste à l'écran, comme dans une vraie salle de quiz où la
voix off commente et où le tableau porte les noms. La bonne réponse et son
explication, elles, ont leurs propres clips par question.

Sans le dossier `audio/`, rien ne casse : l'animateur retombe sur la synthèse du
navigateur, et l'accueil permet alors de choisir parmi les voix du système. La
durée de la phase de révélation s'ajuste d'elle-même à la longueur des clips —
sinon la phrase serait coupée en plein milieu de l'explication, c'est-à-dire
juste avant le moment intéressant.

**Ajouter des questions** : `web/quiz/js/questions.js`. Sans `type`, c'est un
QCM et la bonne réponse va en premier — le jeu mélange au tirage. Les autres
formes portent leur `type` et leurs champs : `valeur` pour une estimation,
`elements` dans le bon ordre pour un classement, `affirmations` pour une rafale.
Dans tous les cas, l'explication lue à la révélation est obligatoire.

**Ajouter un type de manche** : un module dans `web/quiz/js/manches/`
(préparer, publier, lire, noter, solutionTexte) et sa vue dans `vues.js`. Le
moteur n'a pas à être touché — il ne sait pas ce qu'est un QCM.
Pour s'aider d'un modèle :

```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-questions.mjs musique 10
```

Le script écrit un **brouillon** dans `scripts/questions-brouillon.json`, jamais
directement dans le jeu, et marque « a-verifier » ce dont il n'est pas sûr. Un
modèle se trompe sur des faits pointus, et une mauvaise réponse annoncée par
l'animateur en pleine soirée ne se rattrape pas : on relit avant de recopier.

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

C'est la seule façon d'avoir la lecture photo sans mettre la clé dans le
navigateur. Le serveur sert la PWA **et** relaie les photos : l'appli et l'API
sont donc sur la même origine, et le champ « Adresse du serveur » des réglages
peut rester vide.

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run check   # vérifie la clé avant de commencer
ANTHROPIC_API_KEY=sk-ant-... npm start       # http://localhost:8080
```

`npm run check` fait deux appels minimaux (moins d'un centime) et dit
clairement si la clé est absente, refusée, sans accès au modèle, ou si c'est le
réseau qui bloque. À lancer en premier : ça évite de déboguer à travers
l'interface.

### Déployer sur Vercel

Le dépôt est configuré pour Vercel : `web/` est servi en statique par le CDN,
et seul `/api/scan` réveille une fonction.

```
vercel.json          outputDirectory: web, et maxDuration: 60 sur la fonction
api/scan.mjs         la fonction : POST /api/scan
lib/scan.js          la logique, partagée avec le serveur Node autonome
```

**Les trois choses à faire :**

1. Importer le dépôt sur Vercel. Aucun framework à choisir, aucune commande de
   build : `vercel.json` dit déjà tout.
2. Ajouter la variable d'environnement **`ANTHROPIC_API_KEY`** dans les
   réglages du projet (Settings → Environment Variables), pour les trois
   environnements si vous voulez tester les préversions.
3. Déployer. Le champ « Adresse du serveur » des réglages de l'appli reste
   **vide** : l'appli et l'API sont sur la même origine.

**Vérifier après le déploiement**, sans ouvrir l'interface :

```bash
curl -s https://votre-projet.vercel.app/api/scan          # doit répondre 405
curl -s -X POST https://votre-projet.vercel.app/api/scan \
  -H 'content-type: application/json' -d '{}'             # doit répondre 400
```

Un 405 puis un 400 signifient que la fonction est bien déployée et que la
validation tourne. Un 404 signifie que Vercel n'a pas vu le dossier `api/`.

**Un 503 sur une vraie photo** veut dire que la fonction tourne mais n'a pas de
clé : une variable d'environnement ajoutée après un déploiement n'est prise en
compte qu'au déploiement suivant. Redéployez.

**Les limites qui comptent** (vérifiées dans la documentation Vercel) :

| | Valeur | Notre besoin |
|---|---|---|
| Durée d'une fonction | 300 s par défaut, même en Hobby | 4 à 18 s — large |
| Corps de requête | 4,5 Mo | ~400 Ko par photo — large |

L'appli refuse d'elle-même une image au-delà de 4 Mo, avec un message
explicite, plutôt que de laisser Vercel renvoyer un 413 opaque.

**Ne committez jamais la clé.** `.env` et `.env.local` sont ignorés par git ;
la clé vit dans les variables d'environnement de Vercel, jamais dans le dépôt.

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
    games/sept-merveilles.js  idem + décompte par catégories et formule de science
    games/molkky.js      idem + un lancer par manche, retour à 25, éliminations
    games/aventuriers-du-rail.js  idem + trois éditions, chacune son décompte
    games/common.js      le peu que plusieurs jeux partagent
    games/index.js       registre des jeux
  quiz/                  la Quiz Room : PWA séparée, servie à /quiz/
    index.html           ses écrans (accueil, réglages, lobby, manche, podium)
    styles.css           mêmes jetons de couleur, cibles plus grandes
    manifest.webmanifest
    sw.js                son propre service worker
    js/
      app.js             écrans, boucle réseau, actions du joueur
      engine.js          LA RÈGLE DU JEU : barème, jokers, déroulé d'une partie
      net.js             appels au relais + calage d'horloge entre pupitres
      emcee.js           l'animateur : répliques, voix, jingles synthétisés
      questions.js       la banque, le tirage et les fils rouges
      audio.js           lecture des clips pré-générés, repli sur la synthèse
      vues.js            la saisie à l'écran, une vue par type de manche
      manches/           un module par type : préparer, publier, lire, noter
        qcm.js           quatre réponses, points à la rapidité
        estimation.js    un nombre, le plus proche gagne
        ordre.js         quatre éléments à classer, points partiels
        rafale.js        cinq vrai-faux, barème plat
lib/scan.js              lecture d'une photo : validation, appel, erreurs
lib/rooms.js             relais de salons : état publié, réponses, horloge
api/scan.mjs             la même chose, en fonction Vercel
api/room.mjs             le relais, en fonction Vercel
vercel.json              configuration du déploiement
server/index.js          serveur Node autonome (sert les deux PWA + les API)
server/check.mjs         vérifie la clé API avant de lancer quoi que ce soit
scripts/check-quiz.mjs   tests des règles du quiz et du relais (npm run check:quiz)
scripts/generate-questions.mjs  brouillon de questions à relire, via l'API Claude
scripts/generate-audio.mjs  fabrique les enregistrements de l'animateur
scripts/make-icons.mjs   génère les PNG d'icône (node scripts/make-icons.mjs)
scripts/build-single-file.mjs  assemble le compteur de points en un fichier HTML
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
| `endModes` | plusieurs façons de finir, au choix de la table avant de commencer : `[{ id: 'score'|'rounds', label, hint, choices, defaut }]`. Au Papayoo, on joue jusqu'à ce que quelqu'un craque, ou en un nombre de manches convenu. Le choix est retenu dans la partie, pas dans le jeu : les parties déjà jouées gardent le leur |
| Prolonger la partie | quand la fin est une convention de table — c'est-à-dire dès que `choices` propose plusieurs valeurs —, le bandeau de fin offre de continuer au lieu d'archiver. Rien à déclarer dans le jeu : un seul choix possible (les 50 points du Mölkky) vaut règle, et la proposition n'apparaît pas |
| `lowestWins: false` | le plus grand total gagne (Tarot) |
| `entry: 'form'` + `form(playerCount, players, rounds, form, options)` | la manche est décrite par un formulaire (`player`, `choice`, `number`, `players`) et non par un score par joueur ; `finalize` calcule alors tous les scores, et `raw` conserve le formulaire pour permettre la correction. Le 4e argument est la saisie en cours (au Barbu, les champs dépendent du contrat choisi) et le 5e les variantes de la partie (aux Aventuriers du Rail, l'édition décide des colonnes) |
| `roundLine(round, index, match)` | `{ title, detail }` : nomme une manche par ce qui s'y est joué plutôt que par son rang (au Barbu, le contrat annoncé) et remplace la ligne de scores par un résumé adapté (au Mölkky, où tous les autres joueurs sont à zéro) |
| `compactBoard` | le tableau n'affiche que les totaux, sans colonne par manche — au Mölkky elles se compteraient par dizaines |
| `playerStatus(player, match)` | `{ text, tone }` affiché à côté d'un nom : ce que le total ne dit pas (au Mölkky, les ratés en cours et l'élimination) |
| `finished(match)` | fin de partie propre au jeu, en plus du score cible ou du nombre de manches (au Mölkky : il ne reste qu'un joueur non éliminé) |
| `replays` | après un ajout, une correction ou une suppression, toutes les manches sont recalculées dans l'ordre, chacune à partir des seules manches qui la précèdent. Indispensable dès qu'une manche dépend de l'état laissé par les précédentes |
| `art` | `{ teinte, svg }` : la vignette du jeu sur l'écran d'accueil. Un dessin **original** dans une boîte 32×32, en `currentColor`, évoquant le matériel du jeu — pas le visuel de la boîte, qui est une œuvre protégée |
| `roundLabelGender: 'm'` | le mot employé pour une manche est masculin (« le lancer ») ; féminin par défaut (« la manche », « la donne », « la partie ») |
| `tieBreak(a, b, match)` | départage deux joueurs à égalité de score par autre chose que le score (au 7 Wonders, le trésor) ; sans lui le tableau tranche au hasard |
| `roundLabel` | « Manche » ou « Donne », employé partout dans l'interface |
| `participantLabel` + `defaultNames` | les participants sont des équipes et non des joueurs (Belote) |
| `options` | variantes fixées avant de commencer, rendues sur l'écran de configuration **et sur la fiche règles**, puis transmises au calcul, à `form()` et à `setup()` (litige à la belote, barèmes du Barbu, édition des Aventuriers du Rail) |
| `multiple: true` sur un champ `player` | le champ accepte plusieurs joueurs, chaque appui ajoutant ou retirant — pour un bonus qui se partage entre ex æquo |
| `finalize` → `meta` | ce que la manche laisse à la suivante ; `formDefaults(players, rounds)` peut le relire (report de litige) |

Les règles reçoivent un contexte unique : `validateRound(saisie, participants,
ctx)` et `finalize(saisie, ctx, participants)`, avec
`ctx = { extras, options, rounds }`.

Trois champs alimentent la fiche règles :

- `pitch` — deux ou trois phrases de présentation, écrites pour être dites.
- `setup(playerCount, options)` — la mise en place, sous forme d'étapes
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

## Ce qui a été vérifié en conditions réelles

La lecture photo a été testée de bout en bout contre l'API, le 23 août 2026 :

| Test | Résultat |
|---|---|
| Feuille de scores manuscrite (Papayoo, 3 manches × 4 joueurs) | 12 chiffres sur 12 exacts, chaque manche vérifiée à 250 points |
| Grille Skyjo de 12 cartes, avec deux −2 et un −1 | 12 valeurs sur 12 exactes, total 51 juste |
| Chemin complet via `POST /api/scan` | HTTP 200 en ~7 s |

Les négatifs du Skyjo étaient le risque identifié : il est levé. Le modèle
signale de lui-même les lignes de totaux cumulés (`cumulative: true`) au lieu
de les compter comme des manches — et de toute façon, **le résultat est
toujours montré avant d'être reporté**.

Compter : environ **2 à 3 centimes par photo** (≈ 2 400 tokens en entrée,
≈ 550 en sortie), et 7 à 18 secondes de réponse.

## Modèle utilisé

La lecture d'image utilise `claude-opus-5` avec une sortie structurée
(`output_config.format`), ce qui garantit que la réponse respecte le schéma
attendu par l'appli — pas de parsing approximatif.

Le serveur passe par le SDK officiel `@anthropic-ai/sdk`. En mode « clé
directe », l'appel part du navigateur en HTTP direct (pas de bundler dans ce
projet, donc pas de SDK côté client) avec l'en-tête
`anthropic-dangerous-direct-browser-access`.

## Règles des Aventuriers du Rail (rappel)

2 à 5 joueurs. À son tour, une seule action : prendre deux cartes, s'emparer
d'une route en dépensant autant de cartes de sa couleur qu'elle compte de
cases, ou piocher de nouvelles cartes Destination. Les routes rapportent tout
de suite ; les Destinations se révèlent à la fin, et coûtent leurs points si
elles ne sont pas réussies.

| Longueur | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Points | 1 | 2 | 4 | 7 | 10 | 15 | 18 | 21 |

Ce qui change d'une boîte à l'autre :

| | États-Unis | Europe | Autour du Monde |
|---|---|---|---|
| Longueurs sur la carte | 1 à 6 | 1 à 8, ni 5 ni 7 | 1 à 8 |
| Pions | 45 wagons | 45 wagons | 60 au choix : 25 wagons / 50 bateaux max |
| Plus long chemin | +10 | +10 | **aucun bonus** |
| En plus | — | 3 gares, +4 chacune si non utilisée | 3 ports : +20 / +30 / +40 selon qu'ils servent 1, 2 ou 3+ destinations réussies ; −4 par port non construit |

Le bonus du plus long chemin se partage : à égalité, chacun des ex æquo le
marque. En cas d'égalité au score final, la règle départage au nombre de cartes
Destination réussies, puis au plus long chemin — l'appli signale l'égalité et
vous laisse trancher, faute de compter les cartes une par une.

## Règles du Mölkky (rappel)

12 quilles numérotées de 1 à 12, un bâton de lancer. Les quilles sont serrées
en quatre rangées, de la plus proche du lanceur à la plus lointaine :
**1-2**, puis **3-10-4**, puis **5-11-12-6**, puis **7-9-8** — les gros numéros
sont au centre, protégés. Le repère de lancer, le *mölkkaari*, se pose à
**3,50 m** ; on ne le franchit pas.

| Situation | Points |
|---|---|
| Une seule quille tombée | son numéro (la 12 seule vaut 12) |
| Plusieurs quilles tombées | leur nombre (5 quilles au sol valent 5) |
| Aucune quille | 0 — et c'est un lancer nul |

Une quille ne compte que si elle est entièrement couchée. Après chaque lancer,
les quilles tombées se relèvent à l'endroit exact où elles se sont arrêtées,
sans être soulevées : la formation se disperse au fil de la partie.

**Il faut marquer exactement 50.** Un lancer qui ferait dépasser ne dépasse
pas : le score redescend à 25. **Trois lancers nuls consécutifs éliminent** ;
le moindre point remet la série à zéro.

## Règles du 7 Wonders (rappel)

3 à 7 joueurs, trois âges. Sept cartes en main au début de chaque âge : on en
pose une simultanément, on passe le reste à son voisin, six fois de suite ; au
dernier tour la carte qui reste est défaussée. On passe à gauche à l'âge I, à
droite à l'âge II, à gauche à l'âge III.

Mise en place : un plateau Merveille par joueur (face A pour découvrir), 3
pièces chacun. Chaque paquet d'âge ne garde que les cartes marquées d'un nombre
inférieur ou égal au nombre de joueurs, soit 7 cartes par joueur ; on ajoute à
l'âge III un nombre de guildes égal au nombre de joueurs plus deux.

Conflits, à la fin de chaque âge, contre chacun de ses deux voisins : victoire
+1 à l'âge I, +3 à l'âge II, +5 à l'âge III ; défaite −1 quel que soit l'âge ;
égalité, rien.

| Source de points | Barème |
|---|---|
| Jetons Conflit | victoires − défaites |
| Trésor | 1 point pour 3 pièces, le reste est perdu |
| Merveille | les points des étapes construites |
| Cartes bleues, jaunes, violettes | les points imprimés |
| Science | le carré du nombre d'exemplaires de chaque symbole, **plus 7 par groupe de trois symboles différents** |

Le plus grand total gagne ; à égalité, c'est le joueur qui a le plus de pièces
qui l'emporte. Exemple de science : 3 tablettes, 2 compas et 1 roue font
9 + 4 + 1 = 14, plus un groupe complet à 7, soit **21 points**.

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
