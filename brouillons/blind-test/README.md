# Blind test — en brouillon

Le mode DJ existe dans le jeu, mais il n'est pas encore au point : rien ne le
met en avant sur le site ni sur la fiche App Store tant qu'il ne l'est pas. Tout
ce qui a été écrit pour le promouvoir est rangé ici, prêt à remettre.

Ce dossier est hors de `web/` : il n'est ni publié ni copié dans l'appli.

## Pour publier

1. `git mv brouillons/blind-test/page.html web/site/blind-test/index.html`
2. `scripts/site-seo.mjs` :
   - `'/blind-test/'` dans `adressesDuSite()` ;
   - `join('blind-test', 'index.html')` dans la boucle des pages dont on remplit
     les chiffres ;
   - le lien « Blind test » dans `ENTETE` (après « Les thèmes ») et dans `PIED`
     (après « Jouer »).
3. `web/site/index.html` : les morceaux ci-dessous, plus
   `<a class="lien-menu" href="/blind-test/">Blind test</a>` dans le menu, à la
   place de « Les manches », et `<a href="/blind-test/">Blind test</a>` dans le
   pied de page.
4. `scripts/check-quiz.mjs` : remettre `join('blind-test', 'index.html')` dans la
   liste des pages vérifiées.
5. `docs/fiche-app-store.md` : la section « Fiche App Store » ci-dessous.
6. Une fois en ligne : Search Console → Inspection de l'URL →
   `/blind-test/` → Demander l'indexation.

## Accueil — la section, avant `<section id="prix">`

```html
  <section id="blind-test">
    <div class="enveloppe">
      <h2>Et un blind test, où c’est vous le DJ</h2>
      <p class="chapo">L’hôte passe la musique depuis son appli habituelle — Spotify, Deezer, Apple Music — et les autres tapent le titre et l’artiste sur leur téléphone. Le jeu donne le top, ramasse les réponses et compte les points.</p>
      <a class="bouton" href="/blind-test/">Le blind test entre amis</a>
    </div>
  </section>
```

## Accueil — la question de la FAQ visible, avant « Ça marche sur Android ? »

```html
      <details class="question">
        <summary>Peut-on faire un blind test&nbsp;?</summary>
        <p>Oui. En mode blind test, l’hôte devient DJ : il passe la musique depuis son application habituelle, les autres tapent le titre et l’artiste sur leur téléphone, et le jeu compte les points. <a href="/blind-test/">Tout sur le blind test</a>.</p>
      </details>
```

## Accueil — la même dans les données structurées (FAQPage)

```json
        {
          "@type": "Question",
          "name": "Peut-on faire un blind test ?",
          "acceptedAnswer": { "@type": "Answer", "text": "Oui. En mode blind test, l’hôte devient DJ : il passe la musique depuis son application habituelle, les autres tapent le titre et l’artiste sur leur téléphone, et le jeu compte les points." }
        },
```

Et dans les textes : la meta description peut finir par « …thèmes, un blind
test. Gratuit, sans inscription. », la description du `SoftwareApplication` par
« …thèmes, un mode blind test. », et la carte de l'offre gratuite dire « Le
blind test, l'écran commun et le mode solo ».

## Fiche App Store

- **Nom :** `Quiz entre amis : Blind test` (28/30). « Blind test » est la
  recherche la plus tapée de la catégorie après « quiz ».
- **Texte promotionnel :**
  ```
  Nouveau : le blind test ! Passez la musique depuis votre appli habituelle, vos
  amis trouvent le titre et l'artiste sur leur téléphone. Et toujours 448
  questions offertes, avec l'appli qui fait l'animateur.
  ```
- **Description**, avant « DES JOKERS POUR RENVERSER LA TABLE » :
  ```
  LE BLIND TEST, OÙ C'EST VOUS LE DJ
  Passez la musique depuis Spotify, Deezer, Apple Music ou YouTube, sur
  l'enceinte du salon. Vos amis tapent le titre et l'artiste sur leur téléphone,
  l'appli donne le top, ramasse les réponses et tient les scores. Toute votre
  bibliothèque musicale devient un blind test.
  ```
- **Nouveautés**, en tête :
  ```
  • Le blind test : l'hôte devient DJ et passe sa propre musique, les autres
    trouvent le titre et l'artiste. Le jeu pré-coche les bonnes réponses, le DJ
    valide d'un geste.
  ```
- **Notes à l'examinateur**, après « Pour tester seul » :
  ```
  Le mode blind test (« Créer une partie » → « Blind test ») ne diffuse aucune
  musique : l'hôte passe la sienne depuis son application de streaming, sur son
  propre abonnement, et l'application se contente de chronométrer et de compter
  les points. Aucun extrait audio protégé n'est embarqué ni téléchargé.
  ```
