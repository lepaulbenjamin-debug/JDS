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

## Avant tout : le dépôt ne doit pas être dans iCloud

Si le dossier est sous `~/Documents` ou `~/Desktop` et qu'iCloud Drive
synchronise ces emplacements, **rien ne marchera de façon fiable**. iCloud
dématérialise les fichiers peu consultés, et un dépôt git comme un projet Xcode
en comptent des milliers.

Les symptômes ne désignent jamais la cause :

- `fatal: not a git repository` alors que `.git` est bien là ;
- `error reading from .git/objects/pack/…: Operation timed out`, puis
  `is far too short to be a packfile` ;
- `error: Error opening input file '…/CapApp-SPM.swift' (Operation timed out)` ;
- des « Cannot find X in scope » sur des fichiers du gabarit qu'on n'a jamais
  touchés — ce sont les reliquats d'un build qui n'aboutit pas ;
- une étape « Planning Swift module » qui dure huit minutes.

La solution est de sortir le dépôt des dossiers synchronisés :

```sh
mkdir -p ~/Dev
mv ~/Documents/JDS ~/Dev/JDS
cd ~/Dev/JDS
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
```

Tout suit — `ios/`, `node_modules/`, les fichiers ajoutés à la cible. La purge
des DerivedData est nécessaire : ils contiennent des chemins absolus vers
l'ancien emplacement.

## Le projet natif

Les fichiers de ce dossier s'appellent `apple/` et non `ios/`, et ce n'est pas
une coquetterie : **`ios/` appartient à Capacitor**. C'est lui qui l'y crée, et
y trouver quoi que ce soit avant `cap add ios` lui fait croire la plateforme
déjà installée. Il refuse alors de la créer, puis synchronise dans un projet
Xcode qui n'existe pas — l'erreur qu'on obtient parle d'un `Podfile` introuvable,
et n'a plus aucun rapport visible avec la cause.

Capacitor est dans les dépendances du dépôt, et les commandes passent par des
scripts npm plutôt que par `npx` :

```sh
node -v                    # doit afficher 22 ou plus (exigence de Capacitor 8)
npm install
rm -rf ios                 # seulement si un essai précédent en a laissé un
npm run ios:add            # c'est cette commande qui crée ios/
cp apple/AchatsPlugin.swift apple/SessionAudio.swift ios/App/App/
npm run ios:sync           # rebâtit le paquet web, puis le synchronise
npm run ios:open
```

**Pourquoi pas `npx cap` :** il existe sur npm un paquet nommé `cap`, sans
rapport, et **sans aucun exécutable**. Quand `@capacitor/cli` n'est pas installé
localement, `npx cap add ios` télécharge celui-là, ne trouve rien à lancer, et
répond `could not determine executable to run`. Les scripts npm, eux, mettent
`node_modules/.bin` sur le chemin : la confusion devient impossible.

Si `node -v` affiche moins de 22, deux issues : mettre Node à jour, ou
rétrograder Capacitor en 7 (`npm install -D @capacitor/cli@^7 @capacitor/core@^7
@capacitor/ios@^7`), qui se contente de Node 20.

`capacitor.config.json` fixe `iosScheme: "capacitor"`, donc l'origine de la page
est `capacitor://localhost`. **Ce n'est pas un détail** : c'est l'origine que le
relais autorise (voir `lib/cors.js`). La changer sans toucher à la liste des
origines couperait le jeu en ligne.

## Les trois choses à faire dans Xcode

### 1. La session audio — sans elle, l'animateur est muet

`SessionAudio.swift` est copié par la commande ci-dessus. Il ne reste **qu'une
seule ligne** à ajouter, DANS la méthode existante de
`ios/App/App/AppDelegate.swift` :

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    SessionAudio.activer()          // ←←← la seule ligne à ajouter
    return true
}
```

**Dans la méthode, pas à la suite du fichier.** Redéclarer
`didFinishLaunchingWithOptions` une seconde fois n'ajoute rien : c'est une
erreur de compilation. `apple/AppDelegate-exemple.swift` montre le fichier
complet, à comparer avec le vôtre — il ne se copie pas.

Une seule ligne suffit parce que `SessionAudio` s'abonne lui-même au retour au
premier plan. Le système désactive la session dès qu'une autre application
prend la main — un appel entrant — et sans reprise l'animateur redevient muet au
milieu de la soirée. On passe par une notification plutôt que par
`applicationDidBecomeActive` : le gabarit de Capacitor adopte les scènes, et
cette méthode-là n'est alors **jamais appelée**. Ce qu'on y aurait mis n'aurait
jamais servi, sans que rien ne le signale.

Sur iOS, un `<audio>` en WebView appartient à la catégorie « ambiante » : le
système le coupe dès que l'interrupteur latéral est sur silencieux. Or le
téléphone qui tient la régie *est* l'enceinte de la soirée, et beaucoup de gens
laissent leur téléphone en silencieux en permanence.

Rien côté JavaScript ne peut le corriger, et rien ne le signale : pas d'erreur,
pas d'exception, juste du silence. **C'est le seul défaut de cette liste qui
livrerait une application qui a l'air de marcher.**

À vérifier en premier sur un vrai iPhone, interrupteur sur silencieux.

### 1 bis. Ajouter les deux fichiers Swift au projet Xcode

**C'est l'étape qui manque le plus souvent, et son symptôme ne la désigne pas :**
`Cannot find 'SessionAudio' in scope`, alors que le fichier est bien sur le
disque.

Copier un `.swift` dans `ios/App/App/` ne l'ajoute pas au projet. Le gabarit de
Capacitor utilise un groupe Xcode classique, où l'appartenance à la cible se
déclare explicitement : un fichier posé à côté des autres n'est simplement pas
compilé.

Dans Xcode, une fois pour toutes :

1. Sélectionner le groupe **App › App** dans le navigateur de gauche (celui qui
   contient `AppDelegate.swift`).
2. Menu **File › Add Files to "App"…**
3. Choisir `AchatsPlugin.swift` et `SessionAudio.swift` dans `ios/App/App/`.
4. **Décocher « Copy items if needed »** — ils y sont déjà — et **cocher la cible
   « App »** dans *Add to targets*.

Les deux fichiers doivent alors apparaître dans le navigateur, à côté de
`AppDelegate.swift`. S'ils n'y sont pas, ils ne sont pas compilés.

Un glisser-déposer depuis le Finder vers le groupe **App › App** fait la même
chose, avec les mêmes cases à régler dans la boîte de dialogue.

Tant que `AchatsPlugin.swift` n'est pas dans la cible, `Capacitor.Plugins.Achats`
reste introuvable au démarrage : la boutique se croit alors sur le web et
n'affiche aucun bouton d'achat, **sans rien signaler**. C'est un défaut muet,
comme celui de la session audio.

Le sync ne le dira pas non plus : « Found 1 Capacitor plugin » ne compte que les
paquets npm. Un plugin local se déclare au démarrage de l'application, jamais à
la synchronisation.

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

## Les achats intégrés

Le serveur est écrit et éprouvé ; il manque le pont natif et les fiches
produits.

### Ce qui est fait

`lib/apple.js` vérifie une transaction StoreKit entièrement hors ligne : chaîne
de certificats, signature ES256, épinglage de la racine d'Apple
(`certs/AppleRootCA-G3.cer`, empreinte vérifiée par un test), identifiant
d'application, remboursement. Neuf tentatives de falsification sont éprouvées
par les tests, dont la chaîne fabriquée de toutes pièces et la charge remplacée
après signature.

Faute de racine installée, la vérification **refuse** au lieu d'ouvrir : une
configuration incomplète ne doit jamais distribuer les packs gratuitement.

Achat et restauration empruntent la même route (`POST /api/packs` avec
`transactions`) : l'application envoie ce que StoreKit lui donne, le serveur
accorde ce qui est valable. Une transaction refusée n'annule pas les autres.

### Ce qu'il reste

1. **Créer les produits dans App Store Connect**, en non-consommables :
   - `fr.quizentreamis.pack.noel`
   - `fr.quizentreamis.pack.annees80-90`

   Les identifiants sont dans `packs/*.json`, champ `produitApple`. Les prix
   affichés viennent de l'App Store, pas du champ `prix` — celui-ci n'est plus
   qu'un repli pour le web.

2. **Déposer le pont natif.** Copier `apple/AchatsPlugin.swift` dans
   `ios/App/App/`. Capacitor le découvre seul, il n'y a rien à déclarer
   ailleurs. Régler la cible du projet sur **iOS 15** minimum : StoreKit 2
   n'existe pas avant.

   Le plugin est écrit ici plutôt que pris sur étagère pour une raison précise :
   la plupart des plugins d'achat rendent « l'achat a réussi », un booléen qu'un
   appareil modifié dira tout aussi bien. Un booléen ne se vérifie pas ; le
   `jwsRepresentation` signé par Apple, si. C'est ce jeton que le plugin rend,
   et c'est ce que `lib/apple.js` vérifie.

   Le contrat, tenu des deux côtés :

   ```
   getProducts({ productIds })  → { products: [{ id, price, title }] }
   purchase({ productId })      → { transaction } | { cancelled } | { pending }
   restorePurchases()           → { transactions: ['<jws>', …] }
   ```

   Les trois issues de `purchase` comptent : un abandon n'est pas une panne, et
   une attente d'autorisation parentale non plus. Les confondre afficherait un
   message d'échec à quelqu'un qui a simplement changé d'avis.

   Les transactions venues d'ailleurs — autorisation parentale accordée après
   coup, code promotionnel, achat fait sur un autre appareil — sont reprises par
   « Restaurer mes achats », qui lit `currentEntitlements` et clôt ce qui ne
   l'était pas. Une écoute permanente de `Transaction.updates` ferait la même
   chose plus tôt, mais elle oblige à capturer le plugin dans une tâche
   détachée, ce que la concurrence stricte de Swift 6 refuse — et l'événement
   qu'elle émettait n'était écouté par personne côté JavaScript.

3. **Configurer `APPLE_BUNDLE_ID`** sur Vercel s'il diffère de
   `fr.quizentreamis.app`.

4. **Tester en bac à sable** avec un compte Sandbox : acheter, désinstaller,
   réinstaller, restaurer. Les transactions de test portent
   `environment: "Sandbox"` — le vérificateur les accepte, ce qui est voulu
   pendant la revue, puisque Apple examine en bac à sable.

## Ce qui n'est pas fait, et pourquoi

- **L'identité du joueur reste en `localStorage`.** iOS peut purger ce stockage
  quand l'appareil manque de place. Pour les achats ce n'est pas grave — la
  vérité est chez Apple, et « Restaurer mes achats » la redonne au serveur. Ce
  qu'on perdrait, c'est sa place dans une partie en cours. Le passage aux
  préférences natives rend les lectures asynchrones et touche tout le
  démarrage : à faire d'un seul geste, pas au détour de la boutique.

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
