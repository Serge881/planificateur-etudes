// Service Worker : permet à l'application de fonctionner hors ligne.
// IMPORTANT : à chaque modification de l'application, augmente le numéro
// ci-dessous (v2 -> v3...) pour que le téléphone récupère les nouveaux fichiers.
const CACHE_NAME = "planificateur-v2";

const FICHIERS_A_CACHER = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/lib/dexie.min.js",
  "./js/db.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 1) Installation : on enregistre tous les fichiers dans le cache.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FICHIERS_A_CACHER)));
  self.skipWaiting();
});

// 2) Activation : on supprime les anciens caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom)))
    )
  );
  self.clients.claim();
});

// 3) Chaque requête : cache d'abord, réseau sinon.
self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((reponse) => reponse || fetch(event.request)));
});
