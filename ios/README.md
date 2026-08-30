# Quiz entre amis sur iOS

Ce qu'il faut faire sur un Mac, et pourquoi. Tout ce qui pouvait être préparé
et vérifié depuis le dépôt l'a été ; ce qui reste demande Xcode.

## Le paquet web

```sh
npm run build:ios          # produit dist/ios/ — 61 Mo, dont 60 Mo de clips
```

Le script ne copie pas `web/` en entier : le dépôt héberge deux applications, et
embarquer le compteur de points dans une appli de quiz n'aurait aucun sens. Il
prend le quiz, remonte les deux modules partagés dans `commun/`, et réécrit les
chemins que ce déplacement casse.

Trois différences assumées avec la version web, toutes dans le script :

- **Le relais est nommé en dur.** Sur le web, l'appli et l'API viennent du même
  serveur, donc l'origine courante suffit. Dans l'application, la page vit sur
  `capacitor://localhost`, où il n'y a aucune API : sans adresse explicite,
  chaque appel part dans le vide. Changer de relais : `--relais=https://…`.
- **Pas de service worker.** Tout est déjà dans le paquet ; un cache par-dessus
  ne pourrait que servir une version périmée.
- **Pas de réglage « adresse du relais ».** Utile en développement, c'est dans
  une application publiée un bouton pour tout casser.

## Le projet natif

```sh
npm install @capacitor/core @capacitor/cli @capacitor/ios
npm install @capacitor-community/keep-awake
npx cap add ios
npm run build:ios && npx cap sync ios
npx cap open ios
```

`capacitor.config.json` fixe `iosScheme: "capacitor"`, donc l'origine de la page
est `capacitor://localhost`. **Ce n'est pas un détail** : c'est l'origine que le
relais autorise (voir `lib/cors.js`). La changer sans toucher à la liste des
origines couperait le jeu en ligne.

## Les trois choses à faire dans Xcode

### 1. La session audio — sans elle, l'animateur est muet

Coller le contenu de `ios/AppDelegate-audio.swift` dans
`ios/App/App/AppDelegate.swift`.

Sur iOS, un `<audio>` en WebView appartient à la catégorie « ambiante » : le
système le coupe dès que l'interrupteur latéral est sur silencieux. Or le
téléphone qui tient la régie *est* l'enceinte de la soirée, et beaucoup de gens
laissent leur téléphone en silencieux en permanence.

Rien côté JavaScript ne peut le corriger, et rien ne le signale : pas d'erreur,
pas d'exception, juste du silence. **C'est le seul défaut de cette liste qui
livrerait une application qui a l'air de marcher.**

À vérifier en premier sur un vrai iPhone, interrupteur sur silencieux.

### 2. Le manifeste de confidentialité

Créer `ios/App/App/PrivacyInfo.xcprivacy`. Capacitor lit les préférences
système, ce qui relève des API « à raison requise » depuis 2024 :

- `NSPrivacyAccessedAPICategoryUserDefaults`, raison `CA92.1`
  (accès aux seules préférences de l'application elle-même).

L'application ne suit personne et ne collecte rien : `NSPrivacyTracking` à
`false`, `NSPrivacyCollectedDataTypes` vide. À déclarer dans le même sens dans
App Store Connect.

### 3. La cible

iPhone seulement, portrait seulement — l'appli est écrite pour un téléphone tenu
à la verticale. Sinon Apple la testera sur iPad et jugera la mise en page.

## Ce qui n'est pas fait, et pourquoi

- **L'identité du joueur reste en `localStorage`.** iOS peut purger ce stockage
  quand l'appareil manque de place : on perdrait sa place dans une partie en
  cours. Le passage au module de préférences natif rend les lectures
  asynchrones, ce qui touche l'identité *et* la licence d'achat — autant le
  faire d'un seul geste avec les achats intégrés, qui refondent la licence de
  toute façon.
- **Les achats intégrés.** Décidés (15 %, Small Business Program), pas encore
  écrits. Une application sans achat passe la revue ; une application rejetée
  pour fonctionnalité minimale, non. Le mode solo d'abord, la caisse ensuite.

## Les notes pour l'examinateur

À coller dans le champ « Notes for Review » d'App Store Connect :

> Quiz entre amis est un jeu de quiz de soirée. Chaque téléphone devient un
> pupitre et répond en même temps ; il n'y a pas d'animateur humain, c'est
> l'application qui pose les questions et annonce les scores.
>
> **Pour tester seul, sans second appareil : appuyer sur « Jouer seul » sur
> l'écran d'accueil.** Une partie complète démarre immédiatement, sans compte,
> sans code et sans connexion réseau — les questions et les 741 enregistrements
> de l'animateur sont embarqués dans l'application.
>
> Le mode à plusieurs (« Créer une partie ») affiche un code à quatre lettres
> que les autres joueurs saisissent sur leur propre téléphone. Il demande donc
> au moins deux appareils, et une connexion.
>
> Aucun compte, aucune donnée personnelle : le prénom saisi reste sur l'appareil
> et sert uniquement à s'afficher au tableau des scores pendant la partie.
