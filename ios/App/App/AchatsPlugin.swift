//  Le pont vers la caisse d'Apple.
//
//  À déposer dans ios/App/App/ après `npm run ios:add`, puis à ajouter à la
//  cible : cible App › Build Phases › Compile Sources. Copier le fichier dans
//  le dossier ne suffit pas, et son absence ne provoque aucune erreur — la
//  boutique se croit simplement sur le web.
//
//  Ce plugin ne décide rien. Il encaisse par StoreKit et rend le jeton SIGNÉ
//  par Apple — le `jwsRepresentation` — que le serveur vérifie ensuite
//  (`lib/apple.js`). C'est tout l'intérêt de l'écrire nous-mêmes plutôt que de
//  prendre un plugin tout fait : la plupart rendent « l'achat a réussi », un
//  booléen qu'un appareil modifié dira aussi bien. Un booléen ne se vérifie
//  pas ; une signature d'Apple, si.
//
//  StoreKit vérifie déjà la transaction de son côté, et on ne s'en contente
//  délibérément pas : cette vérification-là s'exécute sur le téléphone, donc
//  sur la machine de celui qui aurait intérêt à la contourner. Le jeton est
//  donc transmis dans tous les cas, et c'est le serveur qui tranche.
//
//  Demande iOS 15 (StoreKit 2). Régler la cible du projet en conséquence.
//
//  Sur la concurrence : `CAPPluginCall` n'est pas `Sendable`, et le passer dans
//  une tâche est refusé par la vérification stricte de Swift 6. Chaque méthode
//  reste donc sur l'acteur principal du début à la fin, et l'import de
//  Capacitor est marqué `@preconcurrency` — c'est une bibliothèque écrite avant
//  ces règles.

import Foundation
@preconcurrency import Capacitor
import StoreKit

@objc(AchatsPlugin)
public class AchatsPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "AchatsPlugin"
    public let jsName = "Achats"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Le catalogue

    /// Les prix tels que l'App Store les affiche : bonne devise, bon format,
    /// bonne grille tarifaire. Montrer « 3,99 € » à un compte canadien serait
    /// faux, et c'est un motif de refus à la revue.
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let identifiants = call.getArray("productIds", String.self), !identifiants.isEmpty else {
            call.reject("Aucun identifiant de produit.")
            return
        }
        Task { @MainActor in
            do {
                let produits = try await Product.products(for: identifiants)
                let liste = produits.map { produit -> [String: Any] in
                    [
                        "id": produit.id,
                        "price": produit.displayPrice,
                        "title": produit.displayName,
                        "description": produit.description
                    ]
                }
                call.resolve(["products": liste])
            } catch {
                call.reject("Catalogue indisponible : \(error.localizedDescription)")
            }
        }
    }

    // MARK: - L'achat

    /// Trois issues, et l'appli doit savoir les distinguer : un abandon n'est
    /// pas une panne, et une attente d'autorisation parentale non plus. Les
    /// traiter toutes comme des erreurs afficherait un message d'échec à
    /// quelqu'un qui a simplement changé d'avis.
    @objc func purchase(_ call: CAPPluginCall) {
        guard let identifiant = call.getString("productId") else {
            call.reject("Produit non précisé.")
            return
        }
        Task { @MainActor in
            do {
                guard let produit = try await Product.products(for: [identifiant]).first else {
                    call.reject("Produit introuvable dans l’App Store.")
                    return
                }

                switch try await produit.purchase() {
                case .success(let verification):
                    // Le jeton part même si StoreKit doute : c'est le serveur
                    // qui tranche, et lui seul tourne sur une machine dont on
                    // n'a pas confié les clés à l'utilisateur.
                    let jeton = verification.jwsRepresentation

                    // On ne clôt que ce qu'Apple a validé localement. Une
                    // transaction douteuse reste ouverte, plutôt que d'être
                    // refermée sans avoir servi.
                    if case .verified(let transaction) = verification {
                        await transaction.finish()
                    }
                    call.resolve(["transaction": jeton])

                case .userCancelled:
                    call.resolve(["cancelled": true])

                case .pending:
                    // « Demander la permission d'acheter » : la transaction
                    // arrivera plus tard, et sera reprise à la restauration.
                    call.resolve(["pending": true])

                @unknown default:
                    call.reject("Résultat d’achat inattendu.")
                }
            } catch {
                call.reject("Achat impossible : \(error.localizedDescription)")
            }
        }
    }

    // MARK: - La restauration

    /// Obligatoire chez Apple, et pas seulement pour la forme : nos packs sont
    /// attachés à une licence d'appareil, donc changer de téléphone les
    /// perdrait. StoreKit, lui, sait ce que ce compte a acheté.
    ///
    /// `currentEntitlements` rend les droits en cours, y compris ceux acquis
    /// sur un autre appareil du même compte, ceux débloqués après une
    /// autorisation parentale, et ceux d'un code promotionnel. C'est aussi le
    /// filet quand un achat a été encaissé mais que l'appel au serveur a
    /// échoué juste après : rien n'est perdu, il suffit de restaurer.
    ///
    /// On clôt au passage ce qui ne l'était pas : une transaction jamais close
    /// revient indéfiniment.
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task { @MainActor in
            var jetons: [String] = []
            for await verification in Transaction.currentEntitlements {
                jetons.append(verification.jwsRepresentation)
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                }
            }
            call.resolve(["transactions": jetons])
        }
    }
}
