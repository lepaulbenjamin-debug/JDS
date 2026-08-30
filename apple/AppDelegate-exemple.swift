//  L'AppDelegate de Capacitor, avec la seule ligne qu'on y ajoute.
//
//  Ce fichier ne se copie PAS dans le projet : c'est un exemple à comparer avec
//  votre `ios/App/App/AppDelegate.swift`. Le vôtre peut différer selon la
//  version de Capacitor — ne remplacez pas le vôtre par celui-ci les yeux
//  fermés, ajoutez-y simplement la ligne marquée.
//
//  Elle va DANS la méthode existante, pas à la suite du fichier : redéclarer
//  `didFinishLaunchingWithOptions` une seconde fois est une erreur de
//  compilation, pas un ajout.

import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        SessionAudio.activer()          // ←←← LA SEULE LIGNE À AJOUTER
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Rien à mettre ici : cette application adopte les scènes, donc cette
        // méthode n'est jamais appelée. La reprise de la session audio passe
        // par une notification, dans SessionAudio.
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
