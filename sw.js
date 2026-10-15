// Service Worker : permet à l'application de fonctionner hors ligne.
// Quand tu modifies un fichier de l'application, change le numéro de version
// ci-dessous (v1 -> v2...) pour que le téléphone récupère les nouveaux fichiers.
const CACHE_NAME = "planificateur-v1";

// Liste des fichiers à garder en mémoire sur le téléphone.
const FICHIERS_A_CACHER = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 1) Installation : on enregistre tous les fichiers dans le cache.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_CACHER))
  );
  self.skipWaiting();
});

// 2) Activation : on supprime les anciens caches (anciennes versions).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// 3) Chaque requête : on cherche d'abord dans le cache, sinon sur le réseau.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((reponse) => reponse || fetch(event.request))
  );
});
