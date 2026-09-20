//  Se connecter avec Apple.
//
//  À déposer dans ios/App/App/ comme les autres, puis à ajouter à la cible :
//  cible App › Build Phases › Compile Sources. Il faut aussi activer la
//  capacité « Sign in with Apple » (cible App › Signing & Capabilities › +),
//  sans quoi la feuille de connexion refuse de s'ouvrir avec une erreur 1000
//  qui ne dit rien de ce qui manque.
//
//  Le plugin ne décide rien, exactement comme celui des achats : il obtient
//  d'Apple un jeton d'identité SIGNÉ et le rend tel quel. C'est le serveur qui
//  vérifie la signature, l'émetteur, l'audience et le nonce
//  (`lib/comptes.js`). Un plugin qui rendrait « connexion réussie » rendrait un
//  booléen, et un booléen se falsifie sur un appareil modifié.
//
//  Le nonce est le seul point subtil. On tire une valeur au hasard, on en donne
//  l'EMPREINTE à Apple, et on rend la valeur BRUTE au serveur : celui-ci
//  recompose l'empreinte et la compare à celle inscrite dans le jeton. Un jeton
//  capté ailleurs, même encore valide, ne répond alors pas à la demande en
//  cours.
//
//  Apple ne donne le nom qu'à la TOUTE première connexion, et plus jamais
//  ensuite. On le transmet donc quand il arrive ; si l'utilisateur a supprimé
//  son compte et revient, ce sera son adresse qui servira de nom.

import Foundation
@preconcurrency import Capacitor
import AuthenticationServices
import CryptoKit

@objc(CompteApplePlugin)
public class CompteApplePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "CompteApplePlugin"
    public let jsName = "CompteApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    /// L'appel en cours. `ASAuthorizationController` répond par délégué, hors
    /// du fil de la méthode : il faut bien garder de quoi répondre.
    private var appelEnCours: CAPPluginCall?
    private var nonceBrut: String?

    @objc func signIn(_ call: CAPPluginCall) {
        let brut = Self.nonceAleatoire()
        appelEnCours = call
        nonceBrut = brut

        let demande = ASAuthorizationAppleIDProvider().createRequest()
        demande.requestedScopes = [.fullName, .email]
        demande.nonce = Self.empreinte(brut)

        let controleur = ASAuthorizationController(authorizationRequests: [demande])
        controleur.delegate = self
        controleur.presentationContextProvider = self
        controleur.performRequests()
    }

    // MARK: - Fabrication du nonce

    private static func nonceAleatoire(longueur: Int = 32) -> String {
        var octets = [UInt8](repeating: 0, count: longueur)
        _ = SecRandomCopyBytes(kSecRandomDefault, longueur, &octets)
        return octets.map { String(format: "%02x", $0) }.joined()
    }

    private static func empreinte(_ texte: String) -> String {
        SHA256.hash(data: Data(texte.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension CompteApplePlugin: ASAuthorizationControllerDelegate {

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let identifiants = authorization.credential as? ASAuthorizationAppleIDCredential,
            let jetonBrut = identifiants.identityToken,
            let jeton = String(data: jetonBrut, encoding: .utf8)
        else {
            appelEnCours?.reject("Apple n’a pas rendu de jeton d’identité.")
            appelEnCours = nil
            return
        }

        // Le nom complet n'arrive qu'à la première connexion. On n'envoie que le
        // prénom : c'est ce qui s'affiche au-dessus d'un pupitre, et le reste ne
        // sert à rien ici.
        let prenom = identifiants.fullName?.givenName ?? ""

        appelEnCours?.resolve([
            "identityToken": jeton,
            "nonce": nonceBrut ?? "",
            "nom": prenom
        ])
        appelEnCours = nil
        nonceBrut = nil
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        // Fermer la feuille n'est pas une panne : on le dit autrement, pour que
        // l'appli n'affiche pas d'erreur à quelqu'un qui a simplement changé
        // d'avis.
        let annule = (error as? ASAuthorizationError)?.code == .canceled
        appelEnCours?.reject(annule ? "Connexion annulée." : error.localizedDescription)
        appelEnCours = nil
        nonceBrut = nil
    }
}

extension CompteApplePlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
