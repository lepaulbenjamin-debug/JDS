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
| `QUIZROOM_MAIL_DE` | toi, une fois le domaine vérifié | `Quiz entre amis <bonjour@ton-domaine.fr>` | idem |
| `QUIZROOM_APPLE_AUD` | l'identifiant de l'app | `fr.quizentreamis.app` | « Se connecter avec Apple » répond 503 |
| `QUIZROOM_GOOGLE_AUD` | console Google Cloud › Credentials › client iOS | `123456-abc.apps.googleusercontent.com` | « Se connecter avec Google » répond 503 |
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

`ANTHROPIC_API_KEY` ne concerne pas le quiz : c'est `/api/scan`, pour le
compteur de points qui vit dans le même dépôt.

**Après chaque ajout, il faut redéployer** : Vercel ne relit pas les variables
d'un déploiement déjà en ligne. Et si les déploiements de préversion doivent
marcher, cocher aussi *Preview* — au prix d'une base partagée avec la
production, ou d'une seconde base Upstash.

Les deux `_AUD` n'ont **pas** de valeur par défaut, et c'est voulu : sans
audience déclarée, n'importe quel jeton Google du monde — délivré à n'importe
quelle application — ouvrirait un compte ici. Un test le vérifie.

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

1. console.cloud.google.com › APIs & Services › Credentials › Create OAuth
   client ID › **iOS**, bundle `fr.quizentreamis.app` ;
2. reporter l'identifiant client dans `clientId`, en tête de
   `apple/CompteGooglePlugin.swift` ;
3. Info.plist › URL Types › URL Schemes : le schéma inversé, de la forme
   `com.googleusercontent.apps.XXXXXXXX` ;
4. déposer le fichier dans `ios/App/App/` et l'ajouter à Compile Sources ;
5. `QUIZROOM_GOOGLE_AUD=<le même identifiant client>`.

Pas de SDK Google : le plugin fait OpenID Connect avec PKCE en trois écrans de
code. Le protocole est public et ne bouge pas, là où le SDK pèse quelques
mégaoctets et réclame des mises à jour.

## 5. La politique de confidentialité

Obligatoire dès qu'il y a des comptes, et l'URL est demandée dans App Store
Connect. Elle doit dire, en français, ce que le dépôt fait déjà :

- ce qui est collecté : une adresse électronique (ou l'identifiant relayé par
  Apple), un prénom d'affichage, des compteurs de parties et la liste des
  questions déjà vues ;
- ce qui ne l'est pas : aucune publicité, aucun pistage, aucun carnet
  d'adresses, aucune revente, aucun partage avec un tiers hors hébergeur ;
- où : Vercel et Upstash, en Europe si la région est réglée ainsi ;
- combien de temps : tant que le compte existe ;
- comment partir : bouton **Supprimer mon compte et mes données** dans l'appli,
  qui efface tout, y compris les index d'identité — se reconnecter avec la même
  adresse donne un compte neuf, et un test le vérifie.

Apple demande aussi une **page web** de suppression de compte, accessible sans
installer l'application. La page du quiz sur le web fait l'affaire : c'est la
même application, et le bouton y est.

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

## 7. Avant d'appuyer sur « Soumettre »

- [ ] `npm run check:quiz` au vert (194 tests) ;
- [ ] `node scripts/repetition.mjs` : une partie entière à quatre pupitres et
      une télé, contre le relais de production ;
- [ ] une partie jouée sur un vrai téléphone, sans compte, du salon au podium ;
- [ ] une connexion par courriel, une par Apple, une par Google, puis la
      suppression du compte — et la vérification que le jeu continue après ;
- [ ] un achat de pack en bac à sable, puis **Restaurer les achats** sur un
      second appareil connecté au même compte ;
- [ ] les captures d'écran de l'App Store : elles doivent montrer une partie,
      pas un écran de connexion ;
- [ ] la note à l'examinateur : « L'application se joue sans compte. Pour tester
      un salon, ouvrir l'application sur deux appareils, ou utiliser le mode
      *Jouer seul*. » ;
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
