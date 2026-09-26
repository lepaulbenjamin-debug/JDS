# Les captures de revue des achats intégrés

App Store Connect en réclame une **par achat intégré**, et ce qu'elle doit
montrer est précis : l'endroit de l'application où *ce* produit-là est proposé.
Une capture générique de la boutique vaut pour un produit, pas pour huit —
l'examinateur vérifie qu'il voit le produit qu'il examine.

Elles sont prises dans l'application réelle, avec le catalogue réel, au format
1290 × 2796 (grands iPhone). Rien n'est mis en scène.

| Fichier | À coller sous le produit |
|---|---|
| `01-tout.png` | `fr.quizentreamis.pack.tout` |
| `02-annees80_90.png` | `fr.quizentreamis.pack.annees80_90` |
| `03-enfamille.png` | `fr.quizentreamis.pack.enfamille` |
| `04-geek.png` | `fr.quizentreamis.pack.geek` |
| `05-generation2000.png` | `fr.quizentreamis.pack.generation2000` |
| `06-jeuxsociete.png` | `fr.quizentreamis.pack.jeuxsociete` |
| `07-manga.png` | `fr.quizentreamis.pack.manga` |
| `08-noel.png` | `fr.quizentreamis.pack.noel` |

Le nom du fichier reprend la fin de l'identifiant du produit : il n'y a pas à
réfléchir pour savoir laquelle va où.

## Les notes de revue, à coller dans chaque produit

App Store Connect a un champ *Review Notes* par achat intégré. Le même texte
convient aux huit — il répond à la seule question que l'examinateur se pose,
qui est comment atteindre le produit :

```
Pour voir ce produit dans l'application, sans compte et sans code :

1. écran d'accueil → saisir un prénom → « Créer une partie » ;
2. faire défiler jusqu'à la section « Packs de questions ».

Tous les produits y figurent, avec leur prix et leur bouton d'achat. C'est la
capture jointe.

Ce sont des packs de questions supplémentaires, non consommables. Ils ne
débloquent aucune mécanique de jeu : l'application est entièrement jouable sans
eux, avec 409 questions et 19 thèmes inclus. « Restaurer les achats » se trouve
au bas de cette même page.
```

Pour l'offre groupée `fr.quizentreamis.pack.tout`, ajouter cette phrase :

```
Ce produit ouvre en une fois tous les packs de questions de l'application. Il
n'en est pas un lui-même : il ne contient pas de contenu propre.
```

## Les refaire

Le script vit dans le bac à sable de la session qui les a produites, pas dans le
dépôt : il dépend de Playwright, qui n'est pas une dépendance du projet. Il
ouvre la boutique, fait défiler jusqu'à chaque carte et photographie l'écran.
StoreKit n'existant pas dans un navigateur, le module d'achats est intercepté
pour rendre `disponible() === true` et des prix — c'est la seule façon de voir
les boutons d'achat ailleurs que sur un téléphone, et ce sont bien eux que
l'examinateur doit voir.

Plus simple, si un pack change : refaire la capture concernée depuis un vrai
téléphone, en mode bac à sable. Le cadrage n'a aucune importance, seul compte
que le produit et son prix soient lisibles.
