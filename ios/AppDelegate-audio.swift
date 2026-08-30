//  À coller dans ios/App/App/AppDelegate.swift après `npx cap add ios`.
//
//  Pourquoi c'est indispensable, et pourquoi aucun test ne le verrait.
//
//  Sur iOS, un élément <audio> dans une WebView appartient par défaut à la
//  catégorie audio « ambiante » : le système la coupe dès que l'interrupteur
//  latéral est sur silencieux. Or le téléphone qui tient la régie EST l'enceinte
//  de la soirée — et beaucoup de gens laissent leur téléphone en silencieux en
//  permanence. Sans ces quelques lignes, l'application se lance, affiche tout
//  correctement, joue la partie… et l'animateur ne parle chez personne.
//
//  Rien côté JavaScript ne peut le corriger : la catégorie de session audio est
//  une notion native. Et rien ne le signale — pas d'erreur, pas d'exception,
//  juste du silence.
//
//  `.playback` dit au système : ce son est le propos de l'application, pas un
//  bruitage d'accompagnement. Il joue donc malgré l'interrupteur silencieux.
//
//  `mixWithOthers` laisse la musique de la soirée continuer par-dessus, ce qui
//  est exactement ce qu'on veut dans un salon : on baisse la musique, on ne la
//  coupe pas. À retirer si l'on préfère que l'animateur ait le silence.

import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        configurerLaSessionAudio()
        return true
    }

    private func configurerLaSessionAudio() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // Rien à faire de plus : la partie reste jouable, l'animateur sera
            // seulement muet quand le téléphone est en silencieux.
            print("Session audio non configurée : \(error)")
        }
    }

    // --- Le reste est le AppDelegate que Capacitor génère : à conserver tel
    //     quel si le vôtre en contient déjà d'autres méthodes. ---

    func applicationDidBecomeActive(_ application: UIApplication) {
        // La session se fait parfois désactiver par le système (appel entrant,
        // autre application au premier plan). On la reprend au retour, sinon
        // l'animateur redevient muet au milieu de la soirée.
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application, continue: userActivity, restorationHandler: restorationHandler
        )
    }
}
