# Quiz entre amis

Le quiz de soirée où **chaque téléphone devient un pupitre**, et où l'animateur,
c'est l'appli. Une page web : rien à installer pour les invités, aucun compte à
créer.

En ligne sur **[quizentreamis.fr](https://www.quizentreamis.fr)** — la page
d'accueil à la racine, le jeu sur `/jouer/`.

> Ce dépôt a longtemps hébergé une seconde application, un compteur de points
> pour jeux de société. Elle vit maintenant dans
> **[JDS-compteur](https://github.com/lepaulbenjamin-debug/JDS-compteur)**.

## Ce que c'est

Le principe est celui des salles de quiz : tout le monde répond en même temps,
et **plus on répond vite, plus on marque**. La différence, c'est qu'il n'y a
**pas d'animateur humain**. Personne ne pilote l'écran, personne n'annonce les
points, personne ne reste sur la touche : la partie se déroule toute seule et
tout le monde joue.

- **Chaque téléphone est un pupitre.** Un joueur crée le salon, les autres
  tapent un code à quatre lettres (ou suivent le lien partagé). Aucune install :
  c'est une page web.
- **Dix-neuf thèmes** et 409 questions, cochables à volonté : culture générale,
  musique, cinéma & séries, années 2000, bouffe, insolite, sport, le monde,
  marques & pubs, mots & expressions, Disney & Pixar, les régions de France,
  nature, histoire, fake news ou pas ?, Harry Potter, Pokémon, serial killers,
  géopolitique. Chacun tient une partie entière à lui seul — un test s'en
  assure — et rien n'empêche de tout cocher pour piocher partout.
- **Six formes de manche**, mêlées dans la même partie et cochables dans les
  réglages. **Question** : quatre réponses, le plus rapide marque le plus.
  **Estimation** : un nombre à avancer, le plus proche rafle la manche et la
  vitesse ne compte plus — on réfléchit au lieu de dégainer. **Dans l'ordre** :
  quatre éléments à classer, des points par position juste. **Rafale** : cinq
  vrai-faux d'un coup, barème plat. **Le mix** : un thème, une réponse libre —
  « une chanson avec un animal dans le titre » — et la course à celui qui sort
  un titre valable ; toute proposition reconnue marque, mais un titre déjà cité
  ne compte plus, ce qui force à chercher au lieu de converger vers l'évidence.
  **Tu te mets combien ?** : une carte porte dix questions d'un même thème, de
  la plus facile à la plus coriace ; chacun annonce son niveau avant de voir
  quoi que ce soit, puis chaque téléphone affiche LA question de son niveau —
  cinq joueurs, cinq questions différentes dans la même manche. Se mettre à 10
  et trouver rapporte dix fois se mettre à 1 et trouver. Chaque type ajuste son
  chrono : taper un titre prend bien plus de temps que toucher un bouton.

  Le « tu te mets combien ? » reprend le principe de **TTMC**. Deux
  conséquences dont il faut avoir conscience : l'animateur ne peut pas lire la
  question à voix haute, puisqu'il y en a dix en cours en même temps — il
  annonce la carte, se tait, et commente à la révélation, les énoncés restant
  sur les écrans ; et le chrono est commun alors que les questions ne le sont
  pas, si bien que celui qui s'est mis à 10 a le même temps que celui qui s'est
  mis à 1. C'est une part du risque, pas un oubli.

  Le mix reprend le fonctionnement de **DJ Set** sans sa musique : les droits
  sur des extraits enregistrés ne se contournent pas, et un QR code qui lance
  un service de streaming supposerait un abonnement chez chaque joueur. Ce qui
  se transpose, c'est le reste — le thème annoncé, la réponse ouverte, la
  course. Sa limite est assumée : l'appli juge sur une liste, elle ne connaît
  pas toute la musique du monde. La révélation affiche donc tout ce qu'elle
  acceptait, et c'est là que la table découvre les vingt titres auxquels
  personne n'avait pensé.
- **Un fil rouge, en option.** Un même mot relie les bonnes réponses de
  plusieurs manches, sans que rien ne l'annonce. Chacun peut le nommer à tout
  moment : le premier à trouver rafle une prime qui fond au fil de la partie, et
  se tromper coûte deux manches de silence. Les réglages ne proposent que
  l'énigme ou pas d'énigme : laquelle des quatre tombe est tiré au sort à
  l'ouverture du salon, sinon celui qui crée la partie connaîtrait la réponse.
  C'est la seule chose qui traverse les manches — et elle ne demande aucun
  secret par joueur, donc rien à filtrer côté relais.
- **L'animateur, c'est l'appli.** Il ouvre la soirée, annonce les manches, lit
  l'énoncé, révèle la bonne réponse et son explication, et clôt sur le podium —
  avec quatre personnalités au choix.
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

## Mettre le jeu en ligne

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
curl -s -o /dev/null -w '%{http_code}\n' https://…/jouer/           # 200
curl -s https://…/api/packs                                          # le catalogue
curl -s -o /dev/null -w '%{http_code}\n' https://…/packs/noel.json   # 404, impérativement
```

Ce dernier compte plus que les deux autres : un 200 signifierait qu'un pack
payant est téléchargeable par n'importe qui.

## Faire une première partie

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

## Les packs de questions

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

## La voix de l'animateur

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

Une relance ne refait que ce qui manque **ou ce qui a changé de texte**
(`--tout` pour tout regénérer). Le manifeste garde l'empreinte de chaque phrase :
sans elle, reformuler une question laissait l'animateur lire l'ancienne version
indéfiniment — invisible avec des clips muets, embarrassant en soirée. Les `.wav`
d'essai sont ignorés par git ; les vrais enregistrements, eux, sont versionnés.

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

## Structure

```
web/
  quiz/                  le jeu
    index.html           ses écrans (accueil, réglages, salon, manche, podium)
    tv.html              l'écran commun, en option
    styles.css
    manifest.webmanifest
    sw.js                service worker : la partie tient hors-ligne
    icons/
    audio/<voix>/        les clips pré-générés de l'animateur, une banque par voix
    js/
      app.js             écrans, boucle réseau, actions du joueur
      engine.js          LA RÈGLE DU JEU : barème, jokers, déroulé d'une partie
      net.js             appels au relais + calage d'horloge entre pupitres
      emcee.js           l'animateur : répliques, voix, jingles synthétisés
      questions.js       la banque, le tirage et les fils rouges
      historique.js      ce qui a déjà été joué, pour ne pas le reposer
      audio.js           lecture des clips, repli sur la synthèse du navigateur
      vues.js            la saisie à l'écran, une vue par type de manche
      compte.js          le compte facultatif : code par courriel, Apple, Google
      achats.js          le pont StoreKit, inerte hors application native
      packs.js           téléchargement et installation des packs achetés
      ui.js, speech.js   helpers DOM et synthèse vocale
      manches/           un module par type : préparer, publier, lire, noter
  site/                  la page d'accueil publiée à la racine du domaine

packs/                   les packs payants — HORS de web/, et c'est l'invariant
  *.json                 un pack = 30 questions
  offres.json            les offres groupées
  audio/<voix>/<pack>/   leurs clips, servis derrière une licence

lib/rooms.js             le relais de salons : état publié, réponses, horloge
lib/packs.js             catalogue, licences, achats App Store vérifiés
lib/comptes.js           comptes facultatifs, sessions, statistiques, amis
lib/apple.js             vérification des transactions StoreKit
lib/contact.js           le formulaire de contact du site
api/*.mjs                les mêmes, en fonctions Vercel
server/index.js          le serveur de développement : sert web/ + les API

apple/                   les sources Swift et le mode d'emploi Xcode
docs/                    mise en production, fiche App Store, captures
scripts/                 tests, builds, génération audio, outils
```

## Vérifier

```bash
npm run check:quiz        # les règles, le relais, les comptes, la boutique
node scripts/repetition.mjs   # une vraie partie à quatre, dans des navigateurs
```

`repetition.mjs` demande Playwright, qui n'est pas une dépendance du projet : il
ne sert qu'à ça et pèse plus que tout le reste réuni.

## Publier

| | |
|---|---|
| Le site | `npm run build:web` → `dist/web/`, déployé par Vercel |
| L'application iOS | `docs/publication-ios.md` — GitHub Actions, ou Xcode à la main |
| La fiche App Store | `docs/fiche-app-store.md` — tout est écrit d'avance |
| Les variables, les comptes, la confidentialité | `docs/mise-en-production.md` |
