# Mettre Quiz entre amis en production

Ce qui reste à faire, dans l'ordre, et qui le fait. Tout ce qui pouvait être
préparé depuis le dépôt l'est ; le reste demande des comptes chez Apple, chez
Google et chez un expéditeur de courriels — trois endroits où personne d'autre
que toi ne peut se connecter.

Le fil conducteur : **le compte est facultatif**. On joue sans, on rejoint une
partie sans, et c'est ce qui garde le jeu distribuable. Si un examinateur
d'App Store doit créer un compte pour voir l'application fonctionner, la
soumission part mal.

---

## 1. Les variables d'environnement du relais

À saisir dans Vercel (Settings › Environment Variables), jamais dans le dépôt.

| Variable | Où se trouve la valeur | À quoi ça ressemble | Sans elle |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | console Upstash › la base › REST API | `https://eu1-xxx-12345.upstash.io` | tout tourne en mémoire : en serverless, rien ne survit d'une requête à l'autre |
| `UPSTASH_REDIS_REST_TOKEN` | idem, bouton « copy » à côté du jeton | une longue chaîne opaque | idem |
| `QUIZROOM_MAIL_CLE` | console Resend › API Keys | `re_XXXXXXXXXXXXXXXX` | la connexion par courriel refuse en production (503) |
| `QUIZROOM_MAIL_DE` | toi, sur le **sous-domaine vérifié** chez Resend | `Quiz entre amis <bonjour@mail.quizentreamis.fr>` | idem |
| `QUIZROOM_APPLE_AUD` | l'identifiant de l'app | `fr.quizentreamis.app` | « Se connecter avec Apple » répond 503 |
| `QUIZROOM_GOOGLE_AUD` | console Google Cloud › Credentials › client iOS | `1054167637145-93loo4s7vnuv5nb534bnh2risdc3svee.apps.googleusercontent.com` | « Se connecter avec Google » répond 503 |
| `QUIZROOM_CONTACT_A` | toi — plusieurs adresses séparées par des virgules | `moi@agence.fr,moi@gmail.com` | les messages partent vers la seule adresse inscrite dans `lib/contact.js` |
| `QUIZROOM_CODES_CADEAU` | toi | `NOEL2026,PRESSE,TEST42` | aucun code cadeau ne fonctionne |
| `ORIGINES_APP` | toi, **seulement** si l'appli web est servie ailleurs que l'API | `https://quizentreamis.fr` | les appels depuis cette origine sont refusés par le navigateur |

Trois variables qu'il vaut mieux **laisser vides** en production :

- `QUIZROOM_SECRET_ACHAT` : elle n'ouvre l'encaissement hors App Store qu'aux
  webhooks d'un prestataire de paiement. Tant qu'il n'y en a pas, la porte doit
  rester fermée ;
- `QUIZROOM_PACKS_OFFERTS` : elle offre les packs qu'elle nomme à tout le monde,
  sans rien demander. Utile pour tester, ruineux en boutique ;
- `APPLE_BUNDLE_ID` et `APPLE_ROOT_CA` : la première vaut déjà
  `fr.quizentreamis.app`, la seconde n'existe que pour les hébergeurs sans
  disque persistant — le certificat est dans `certs/`, et `vercel.json`
  l'embarque avec la fonction.

Et deux qui ne doivent **jamais** monter sur Vercel : `OPENAI_API_KEY` et
`OPENAI_TTS_MODEL` ne servent qu'à fabriquer les clips, depuis une machine de
développement. Le relais n'a aucune raison de parler à OpenAI.

`ANTHROPIC_API_KEY` ne sert plus à rien sur ce projet : sa seule route,
`/api/scan`, appartient au compteur de points et n'est plus déployée ici
(voir 1 ter). Autant la retirer — une clé qui n'est nulle part ne fuite pas.

**Après chaque ajout, il faut redéployer** : Vercel ne relit pas les variables
d'un déploiement déjà en ligne. Et si les déploiements de préversion doivent
marcher, cocher aussi *Preview* — au prix d'une base partagée avec la
production, ou d'une seconde base Upstash.

Les deux `_AUD` n'ont **pas** de valeur par défaut, et c'est voulu : sans
audience déclarée, n'importe quel jeton Google du monde — délivré à n'importe
quelle application — ouvrirait un compte ici. Un test le vérifie.

## 1 bis. Le domaine, et l'hôte qui compte

`quizentreamis.fr` est branché sur Vercel, et l'apex **redirige en 308 vers
`www`**. Ça n'a l'air de rien pour un navigateur, mais l'adresse du relais est
gravée dans le paquet iOS : la viser sur l'apex ferait passer chaque battement
de la partie — toutes les 450 ms sur la régie — par une redirection. Le paquet
vise donc `https://www.quizentreamis.fr`, l'hôte qui répond pour de bon.

Si un jour l'apex devient le domaine principal dans Vercel, il faut refaire
`npm run build:ios` et resoumettre : les installations existantes garderont
l'ancienne adresse jusqu'à leur mise à jour.

## 1 ter. Ce que le site publie, et à quelle adresse

    /            la page d'accueil, qui existe pour être trouvée
    /jouer/      le jeu
    /jouer/tv.html   l'écran commun (en `noindex` : une page vide n'a rien à
                     faire dans des résultats de recherche)

Le dépôt héberge aussi le compteur de points, à la racine de `web/`. Servir
`web/` en entier donnait un quizentreamis.fr dont l'adresse de base ouvrait le
compteur, avec tout son code source à disposition.

Le déploiement passe donc par `scripts/build-web.mjs`, qui assemble `dist/web/`
et n'y met que ce qui précède — l'assemblage du jeu est partagé avec le paquet
natif, dans `scripts/paquet-quiz.mjs`. On ne masque pas le compteur, on ne le
publie pas : aucune adresse à deviner, et rien ne réapparaît le jour où
quelqu'un lui ajoute un fichier.

La page d'accueil vit dans `web/site/`, avec `robots.txt`, `sitemap.xml` et
l'image de partage. Elle est en HTML et en CSS, sans une ligne de JavaScript :
ce qui se référence, ce sont des phrases, et elles doivent être là avant que
quoi que ce soit ne s'exécute.

Trois conséquences :

- **le quiz vit sous `/jouer/`.** Les anciennes adresses `/quiz/…` redirigent,
  en 307 et non en 308 : une redirection permanente se grave dans les
  navigateurs, et on ne veut pas d'un choix irréversible sur un déménagement ;
- **`api/scan.mjs` n'est plus déployé** (`.vercelignore`). C'est la route du
  compteur de points : elle envoie une photo à l'API d'Anthropic avec la clé du
  projet, sans aucun garde-fou, et plus personne ne l'appelle depuis ce
  domaine. La laisser en ligne, c'était laisser ouverte une porte qui dépense ;
- **le compteur de points n'est plus en ligne du tout.** Pour l'y remettre, il
  lui faut son propre projet Vercel sur ce même dépôt, avec
  `outputDirectory: web` — et, tant qu'à faire, un secret partagé devant
  `/api/scan`, qui n'en a jamais eu.

Un détail sans conséquence, mais qui surprend : ceux qui ont déjà ouvert
`/quiz/` ont un service worker enregistré sur cette portée-là. Il ne contrôle
pas la nouvelle racine, ne sert donc rien de périmé, et disparaît de lui-même.

## 2. L'expéditeur de courriels

1. créer un compte Resend (ou équivalent : l'appel est un simple POST JSON,
   changer de prestataire est une dizaine de lignes dans `lib/comptes.js`) ;
2. vérifier le domaine d'envoi — trois enregistrements DNS (SPF, DKIM, DMARC).
   Sans domaine vérifié, les codes partent en indésirables, et un code qu'on ne
   reçoit pas est une connexion qui n'existe pas ;
3. reporter la clé et l'adresse dans les variables ci-dessus.

En développement, sans configuration, le code s'écrit dans la console du
serveur : `npm start` suffit pour tester le parcours entier.

## 3. Se connecter avec Apple

Obligatoire dès lors qu'un autre service de connexion est proposé — et Google
en est un. Ce n'est pas une préférence, c'est la règle 4.8 de l'App Store.

1. developer.apple.com › Identifiers › `fr.quizentreamis.app` › cocher
   **Sign in with Apple** ;
2. dans Xcode : cible App › Signing & Capabilities › + › **Sign in with Apple** ;
3. déposer `apple/CompteApplePlugin.swift` dans `ios/App/App/`, puis l'ajouter
   à Build Phases › Compile Sources. Copier le fichier ne suffit pas, et son
   absence ne provoque aucune erreur — le bouton ne s'affiche simplement pas ;
4. `QUIZROOM_APPLE_AUD=fr.quizentreamis.app`.

## 4. Se connecter avec Google

**D'abord l'écran de consentement**, sans quoi la création d'un client OAuth est
refusée — c'est le bandeau jaune de la page des identifiants.

1. console.cloud.google.com, projet *Quiz entre amis* › APIs & Services ›
   **Écran de consentement OAuth** ;
2. type d'utilisateur **Externe** (le projet n'appartient à aucune
   organisation, et il s'agit de joueurs, pas de collègues) ;
3. nom de l'application : `Quiz entre amis` — c'est ce que Google affichera au
   moment de la connexion. Adresse d'assistance et contact développeur : la
   tienne ; le logo est facultatif ;
4. **portées** : ne rien ajouter. `openid`, `email` et `profile` sont accordées
   d'office et ne sont pas sensibles. C'est précisément pour ça qu'aucune
   vérification de Google n'est nécessaire — en demander davantage
   déclencherait un examen de plusieurs semaines ;
5. **publier l'application** (bouton *Publier* / *Passer en production*). Laissée
   en *Test*, elle n'accepte que cent comptes inscrits à la main, et leurs
   sessions expirent au bout de sept jours.

**Ensuite le client :**

6. ~~Identifiants › Créer des identifiants › **ID client OAuth** › type
   d'application **iOS**, bundle `fr.quizentreamis.app`~~ — fait ;
7. ~~reporter l'identifiant client dans `clientId`~~ — fait, en tête de
   `apple/CompteGooglePlugin.swift` :
   `1054167637145-93loo4s7vnuv5nb534bnh2risdc3svee.apps.googleusercontent.com` ;
8. Info.plist › URL Types › URL Schemes : le schéma inversé, soit ici
   `com.googleusercontent.apps.1054167637145-93loo4s7vnuv5nb534bnh2risdc3svee` ;
9. déposer le fichier dans `ios/App/App/` et l'ajouter à Compile Sources ;
10. `QUIZROOM_GOOGLE_AUD=` ce même identifiant client, celui de l'étape 7.

Un client iOS n'a **pas** de secret, et c'est normal : un secret livré dans une
application distribuée n'est pas un secret. C'est PKCE qui tient ce rôle, et le
plugin le fait.

Les deux autres entrées du menu ne servent à rien ici : une **clé API**
identifie un projet pour compter des quotas, elle n'authentifie personne ; un
**compte de service** est un robot qui parle à Google pour lui-même, pas un
joueur qui se connecte.

Pas de SDK Google : le plugin fait OpenID Connect avec PKCE en trois écrans de
code. Le protocole est public et ne bouge pas, là où le SDK pèse quelques
mégaoctets et réclame des mises à jour.

## 5. La politique de confidentialité et l'assistance

Les deux pages sont écrites et en ligne :

    https://www.quizentreamis.fr/confidentialite
    https://www.quizentreamis.fr/assistance

Ce sont les deux URL que réclame App Store Connect. La page de confidentialité
décrit ce que le code fait vraiment — les durées y sont celles des constantes
(trois heures pour un salon, quinze minutes pour un code, treize mois pour une
session), et les prestataires sont nommés un par un. Si une de ces valeurs
change dans le code, cette page doit changer avec.

Les deux pages renvoient vers `/contact`, un formulaire qui envoie les
messages par Resend — aucune adresse n'est écrite sur le site, donc aucune
adresse à récolter. La destination se change par `QUIZROOM_CONTACT_A` sans
toucher au code, et accepte **plusieurs adresses séparées par des virgules**.

En mettre deux, chez deux fournisseurs différents, n'est pas de la précaution
gratuite : le premier message de production a été accepté par le serveur du
destinataire — « Delivered » côté expéditeur — et n'est arrivé dans aucune
boîte de réception, pendant que les mêmes envois atterrissaient sans problème
chez un autre fournisseur. Un canal d'assistance qui dépend du filtre
anti-spam d'une seule boîte n'est pas un canal d'assistance.

Les régions sont dites parce qu'elles sont connues : le relais s'exécute à
Paris (`cdg1`), la base Upstash est à Francfort. Si l'une des deux déménage,
cette phrase de la page doit déménager avec.

Apple demande en plus une page de suppression de compte accessible **sans
installer l'application** : c'est l'encadré de la page d'assistance, qui
renvoie vers le jeu sur le web, où le bouton existe.

## 6. Les réponses « App Privacy » dans App Store Connect

Ce qu'il faut déclarer, tel que le code se comporte :

| Donnée | Collectée | Liée à l'identité | Pistage |
|---|---|---|---|
| Adresse électronique | oui, si l'on crée un compte | oui | non |
| Nom (prénom d'affichage) | oui, si l'on crée un compte | oui | non |
| Contenu utilisateur (statistiques de jeu) | oui, si l'on crée un compte | oui | non |
| Identifiants d'appareil | non | — | non |
| Localisation, contacts, santé, achats hors App Store | non | — | non |

« Pistage » est non partout : rien ne quitte le relais, et aucune régie
publicitaire n'est branchée.

## 6 bis. La fiche elle-même

Le nom, le sous-titre, les mots-clés, la description, les notes à
l'examinateur, la classification par âge et les fiches des deux achats
intégrés sont écrits d'avance dans **`docs/fiche-app-store.md`**, prêts à
coller. Les captures d'écran, prises dans une vraie partie à quatre joueurs et
au bon format, sont dans `docs/captures-app-store/`.

## 7. Avant d'appuyer sur « Soumettre »

- [ ] `npm run check:quiz` au vert (194 tests) ;
- [ ] `node scripts/repetition.mjs https://www.quizentreamis.fr/quiz/` : une
      partie entière à quatre pupitres et une télé, contre le relais de
      production ;
- [ ] une partie jouée sur un vrai téléphone, sans compte, du salon au podium ;
- [ ] une connexion par courriel, une par Apple, une par Google, puis la
      suppression du compte — et la vérification que le jeu continue après ;
- [ ] un achat de pack en bac à sable, puis **Restaurer les achats** sur un
      second appareil connecté au même compte ;
- [ ] les captures d'écran et les textes de la fiche : voir
      `docs/fiche-app-store.md`, tout y est écrit ;
- [ ] `npm run build:ios` refait après la dernière modification du web.

## 8. Ce qui n'est pas fait, et qu'il faudra décider

- **Android.** Rien n'empêche le portage — c'est la même PWA et Capacitor sait
  faire — mais les deux plugins natifs sont à réécrire en Kotlin, et la caisse
  de Google Play n'est pas celle d'Apple.
- **Connexion Apple et Google sur le web.** Les deux boutons n'existent
  aujourd'hui que dans l'application native ; sur le web, c'est le courriel. Le
  web les accepterait au prix d'un Service ID chez Apple et d'un client OAuth
  « Web » chez Google, soit les mêmes étapes qu'aux points 3 et 4.
- **Le classement entre amis** se nourrit des parties déclarées par les
  comptes. Une table où personne d'autre n'a de compte affiche une liste vide,
  ce que l'écran dit — mais c'est la fonction qui met le plus de temps à
  devenir intéressante.
