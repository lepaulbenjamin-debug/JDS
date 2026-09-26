//  Faire parler l'animateur même quand le téléphone est en silencieux.
//
//  À copier dans ios/App/App/, puis à appeler depuis AppDelegate. UNE ligne :
//
//      SessionAudio.activer()
//
//  dans `application(_:didFinishLaunchingWithOptions:)`, avant le `return true`.
//  Rien d'autre à toucher.
//
//  Ce fichier ne définit aucune classe, et c'est délibéré : un AppDelegate
//  complet livré tel quel entrerait en collision avec celui que Capacitor
//  engendre — deux classes du même nom et deux `@UIApplicationMain` dans la
//  même cible, et le projet ne compile plus.
//
//  Le problème qu'il règle. Sur iOS, un élément <audio> dans une WebView
//  appartient par défaut à la catégorie audio « ambiante » : le système la
//  coupe dès que l'interrupteur latéral est sur silencieux. Or le téléphone qui
//  tient la régie EST l'enceinte de la soirée, et beaucoup de gens laissent
//  leur téléphone en silencieux en permanence.
//
//  Rien côté JavaScript ne peut le corriger : la catégorie de session audio est
//  une notion native. Et rien ne le signale — pas d'erreur, pas d'exception,
//  juste du silence.

import Foundation
import UIKit
import AVFoundation

enum SessionAudio {

    /// À appeler une fois, au lancement.
    ///
    /// `.playback` dit au système que ce son est le propos de l'application et
    /// non un bruitage d'accompagnement : il joue donc malgré l'interrupteur
    /// silencieux.
    ///
    /// `mixWithOthers` laisse la musique de la soirée continuer par-dessus, ce
    /// qui est ce qu'on veut dans un salon — on baisse la musique, on ne la
    /// coupe pas. À retirer si l'on préfère que l'animateur ait le silence.
    static func activer() {
        appliquer()
        surveillerLesRetours()
    }

    private static func appliquer() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // La partie reste jouable : l'animateur sera seulement muet quand
            // le téléphone est en silencieux.
            print("Session audio non configurée : \(error)")
        }
    }

    /// Le système désactive la session quand une autre application prend la
    /// main — un appel entrant, une vidéo. Sans reprise, l'animateur redevient
    /// muet au milieu de la soirée et plus rien ne le rétablit.
    ///
    /// On s'abonne à la notification plutôt que de compter sur une méthode de
    /// l'AppDelegate : dès qu'une application adopte les scènes — ce que fait
    /// le gabarit de Capacitor — `applicationDidBecomeActive` n'est plus
    /// appelé, et le code qu'on y aurait mis ne servirait jamais. La
    /// notification, elle, est postée dans les deux cas.
    private static func surveillerLesRetours() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            try? AVAudioSession.sharedInstance().setActive(true)
        }
    }
}
