//  Se connecter avec Google, sans son SDK.
//
//  À déposer dans ios/App/App/ et à ajouter à la cible, comme les autres.
//
//  Pourquoi pas le SDK de Google : il pèse quelques mégaoctets, impose
//  CocoaPods ou un paquet Swift de plus, réclame des mises à jour, et fait ce
//  que trois écrans de code font ici — ouvrir une page de connexion, récupérer
//  un code, l'échanger contre un jeton d'identité. Le protocole est public
//  (OpenID Connect + PKCE) et ne change pas.
//
//  Ce que fait PKCE, et pourquoi il est indispensable : le code d'autorisation
//  revient par une URL à schéma personnalisé, qu'une autre application du
//  téléphone pourrait en théorie intercepter. Le code seul ne sert alors à rien
//  — il faut aussi le `code_verifier`, qui n'est jamais sorti d'ici. C'est ce
//  qui permet de se passer de secret client, lequel n'aurait de toute façon
//  aucun sens dans une application distribuée.
//
//  À faire une fois dans la console Google Cloud :
//    1. créer un identifiant OAuth de type « iOS » avec le bundle
//       fr.quizentreamis.app ;
//    2. reporter l'identifiant client ci-dessous (clientId) ;
//    3. déclarer le schéma inversé dans Info.plist (URL Types › URL Schemes) :
//       com.googleusercontent.apps.XXXXXXXX ;
//    4. mettre ce même identifiant client dans QUIZROOM_GOOGLE_AUD, côté
//       serveur — sans quoi le jeton sera refusé, et c'est voulu.

import Foundation
@preconcurrency import Capacitor
import AuthenticationServices
import CryptoKit

@objc(CompteGooglePlugin)
public class CompteGooglePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "CompteGooglePlugin"
    public let jsName = "CompteGoogle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    /// L'identifiant client iOS, tel que la console Google le donne.
    private let clientId = "REMPLACER.apps.googleusercontent.com"

    private var session: ASWebAuthenticationSession?

    @objc func signIn(_ call: CAPPluginCall) {
        let verifier = Self.aleatoire()
        let challenge = Self.empreinteBase64Url(verifier)
        let nonce = Self.aleatoire()
        // Le schéma inversé : la convention de Google pour les clients iOS.
        let schema = clientId.split(separator: ".").reversed().joined(separator: ".")
        let redirection = "\(schema):/oauth2redirect"

        var composants = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        composants.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: redirection),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "nonce", value: nonce)
        ]

        session = ASWebAuthenticationSession(url: composants.url!, callbackURLScheme: schema) { [weak self] url, erreur in
            guard let self else { return }
            if let erreur {
                let annule = (erreur as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                call.reject(annule ? "Connexion annulée." : erreur.localizedDescription)
                return
            }
            guard
                let url,
                let code = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "code" })?.value
            else {
                call.reject("Google n’a pas rendu de code.")
                return
            }
            Task { await self.echanger(code: code, verifier: verifier, redirection: redirection, nonce: nonce, call: call) }
        }
        // La session éphémère ne partage pas les cookies de Safari : on ne veut
        // ni récupérer une session Google ouverte ailleurs, ni en laisser une.
        session?.prefersEphemeralWebBrowserSession = true
        session?.presentationContextProvider = self
        session?.start()
    }

    /// L'échange du code contre un jeton d'identité. Client public : pas de
    /// secret, c'est le `code_verifier` qui prouve qu'on est bien le demandeur.
    private func echanger(code: String, verifier: String, redirection: String, nonce: String, call: CAPPluginCall) async {
        var requete = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        requete.httpMethod = "POST"
        requete.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let corps = [
            "client_id=\(clientId)",
            "code=\(code)",
            "code_verifier=\(verifier)",
            "grant_type=authorization_code",
            "redirect_uri=\(redirection)"
        ].joined(separator: "&")
        requete.httpBody = Data(corps.utf8)

        do {
            let (donnees, _) = try await URLSession.shared.data(for: requete)
            let json = try JSONSerialization.jsonObject(with: donnees) as? [String: Any]
            guard let idToken = json?["id_token"] as? String else {
                call.reject("Google n’a pas rendu de jeton d’identité.")
                return
            }
            // Le nonce part avec : le serveur vérifie qu'il est bien inscrit
            // dans le jeton, donc que celui-ci répond à CETTE connexion.
            call.resolve(["idToken": idToken, "nonce": nonce])
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    // MARK: - PKCE

    private static func aleatoire(longueur: Int = 32) -> String {
        var octets = [UInt8](repeating: 0, count: longueur)
        _ = SecRandomCopyBytes(kSecRandomDefault, longueur, &octets)
        return Data(octets).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func empreinteBase64Url(_ texte: String) -> String {
        Data(SHA256.hash(data: Data(texte.utf8))).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

extension CompteGooglePlugin: ASWebAuthenticationPresentationContextProviding {
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
