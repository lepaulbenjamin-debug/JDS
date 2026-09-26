# Publier depuis GitHub Actions

Le workflow `.github/workflows/ios-store.yml` archive l'application sur un
runner macOS et la dépose sur App Store Connect. Il remplace la manipulation
dans Xcode — **pas** la configuration du projet, qui se fait une fois à la main.

## Ce qui doit être fait avant, une seule fois, sur un Mac

Un `cap add ios` neuf donne un projet qui compile, se signe et se publie très
bien **sans** la session audio, sans la boutique et sans les connexions : tous
ces défauts sont muets. La configuration ne se rejoue donc pas à chaque build,
elle se construit une fois et se versionne.

1. `npm run ios:add`
2. les trois choses d'`apple/README.md` › « Les trois choses à faire dans
   Xcode » : les quatre `.swift` et `PrivacyInfo.xcprivacy` dans la cible, la
   capacité *Sign in with Apple*, le schéma d'URL de Google ;
3. `npm run ios:verifier` — il dit ce qui manque, et rien d'autre ne le dira ;
4. `git add ios && git commit`.

Le workflow refait cette vérification avant de signer quoi que ce soit : un
fichier oublié coûte vingt secondes, pas une version publiée muette.

Côté portail Apple, deux réglages que la CI ne peut pas faire à votre place :
la capacité **Sign in with Apple** doit être activée sur l'identifiant
`fr.quizentreamis.app`, et les **huit achats intégrés** doivent exister dans
App Store Connect (`docs/fiche-app-store.md`).

## Les cinq secrets

À déposer dans *Settings › Secrets and variables › Actions › New repository
secret*. Les deux fichiers se convertissent en base64 pour tenir sur une ligne :

```sh
base64 -i Certificats.p12 | pbcopy      # macOS
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

| Secret | D'où il vient |
|---|---|
| `APPLE_CERTIFICAT_P12` | Trousseau d'accès › votre certificat **Apple Distribution** › clic droit › Exporter, en `.p12`. C'est la **clé privée** : elle ne se retélécharge pas depuis le portail, seulement depuis le Mac qui l'a créée. |
| `APPLE_CERTIFICAT_MOTDEPASSE` | Le mot de passe choisi à l'export ci-dessus. |
| `APPLE_ASC_CLE_P8` | App Store Connect › Users and Access › Integrations › App Store Connect API › **+**, rôle **App Manager**. Le `.p8` ne se télécharge **qu'une fois**. |
| `APPLE_ASC_CLE_ID` | L'identifiant de cette clé, dix caractères, affiché à côté d'elle. |
| `APPLE_ASC_EMETTEUR` | L'*Issuer ID*, en haut de la même page. Le même pour toutes vos clés. |

L'identifiant d'équipe (`Y7265GT5W3`) n'est pas un secret : il figure dans
chaque application publiée, et il est écrit en clair dans le workflow.

Il n'y a **pas** de profil d'approvisionnement à fournir : `xcodebuild` le crée
et le télécharge lui-même à partir de la clé d'API. C'est un secret de moins à
renouveler chaque année, et une panne d'expiration en moins.

## Déclencher un build

**Le premier essai, sans rien envoyer à Apple.** Onglet *Actions* › le
workflow › *Run workflow*, en laissant « Téléverser » décoché. Il archive,
signe et exporte un `.ipa` récupérable en pièce jointe du build. C'est là qu'on
vérifie la signature, la taille du paquet et l'icône — sans engager de numéro de
build auprès d'Apple, qu'on ne peut pas reprendre.

**Un vrai dépôt.** Poser un tag :

```sh
git tag v1.0.0 && git push origin v1.0.0
```

La version affichée vient du tag (`v1.0.0` → `1.0.0`), et le numéro de build du
compteur d'exécutions GitHub, qui ne redescend jamais — App Store Connect refuse
un numéro déjà vu, et le refus arrive après le téléversement.

Une exécution manuelle avec « Téléverser » coché fait la même chose sans tag.

## Après le dépôt

Le traitement du binaire prend dix à trente minutes. Ensuite, dans App Store
Connect, à la main : rattacher le build à la version, vérifier que les huit
achats intégrés sont soumis avec elle, et appuyer sur *Soumettre*. Tous les
textes sont écrits dans `docs/fiche-app-store.md`.

## Quand ça casse

| Message | Ce que c'est |
|---|---|
| `Ces fichiers ne sont PAS construits par la cible App` | La configuration Xcode n'a pas été commitée, ou un fichier en est sorti. `apple/README.md` § 1 bis. |
| `No signing certificate "iOS Distribution" found` | Le `.p12` ne contient pas la clé privée, ou le mot de passe est faux. Réexporter depuis le Mac d'origine. |
| `Provisioning profile ... doesn't support the Sign in with Apple capability` | La capacité n'est pas activée sur l'identifiant d'app dans le portail développeur. |
| `The bundle version must be higher than the previously uploaded version` | Deux builds partis avec le même numéro. Relancer : `run_number` aura avancé. |
| `Invalid large app icon` (ITMS-90717) | Ne devrait plus arriver : `npm run build:ios` refuse d'écrire une icône transparente ou hors format, et un test le vérifie. Si ça arrive quand même, c'est qu'une icône a été changée dans Xcode — elle doit l'être dans `assets/icon.png`. |
