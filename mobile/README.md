# Empaquetage iOS et Android

Le code de l'appli n'est pas ici : il vit dans `../web`, et Capacitor s'en
sert tel quel. Ce dossier ne contient que la coquille native.

## Ce que l'empaquetage apporte

Trois choses, dont deux sont des obligations de publication.

1. **Les données survivent au changement de téléphone.** Le `localStorage` d'un
   WebView n'entre pas de façon garantie dans la sauvegarde du système. L'appli
   recopie donc chaque enregistrement dans les préférences natives
   (`@capacitor/preferences` → UserDefaults sur iOS, SharedPreferences sur
   Android), qui, elles, sont reprises par la sauvegarde iCloud et l'Auto Backup
   Android. Voir `web/js/coffre.js` : le `localStorage` reste la source de
   vérité pendant l'exécution, le coffre est un second étage écrit en différé.
   **À confirmer sur un vrai appareil** avant d'en dépendre : restaurer une
   sauvegarde sur un téléphone neuf et vérifier que l'historique revient.
2. **Les achats intégrés et la publicité n'existent que là.** AdMob ne prend en
   charge qu'Android et iOS, et l'achat intégré est une API de store. Rien de
   monétaire ne peut fonctionner sur la PWA.
3. **La guideline 4.2 d'Apple** refuse les sites web réempaquetés. Le comptage
   hors ligne, la synthèse vocale et les données locales plaident déjà en notre
   faveur ; passer la caméra en natif (`@capacitor/camera`) renforcerait le
   dossier si la lecture photo revenait au premier plan.

## Commandes

```bash
cd mobile
npm install
npx cap sync              # recopie ../web dans les deux plateformes
npx cap open android      # ouvre Android Studio
npx cap open ios          # ouvre Xcode (macOS uniquement)
```

`npx cap sync` est à relancer après **chaque** modification de `../web` : les
plateformes embarquent une copie, pas un lien.

## Ce qui demande une autre machine

| | Ici (Linux) | Ce qu'il faut |
| --- | --- | --- |
| Squelettes Android et iOS | faits | — |
| Compiler un APK / AAB | non | SDK Android + Android Studio |
| Compiler pour iOS | non | un Mac avec Xcode |
| Signer et publier | non | comptes développeur Apple et Google |

## Ce qui reste à faire avant une première soumission

- **Icônes et écran de lancement** aux formats de chaque store. L'icône
  actuelle (`web/icons/`) est un SVG prévu pour le web.
- **Politique de confidentialité** hébergée, et étiquettes de confidentialité
  renseignées sur les deux stores.
- **Suppression du compte depuis l'appli** si un compte est ajouté un jour :
  c'est une obligation Apple (guideline 5.1.1(v)), pas une option.
- **Vérifier la reprise de sauvegarde** sur un appareil réel, point 1 ci-dessus.
