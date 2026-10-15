// Code principal du Planificateur d'études

// 1) Enregistrer le Service Worker (nécessaire au mode hors ligne)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then(() => console.log("Service Worker enregistré"))
      .catch((erreur) => console.error("Erreur Service Worker :", erreur));
  });
}

// 2) Afficher l'état du réseau (pour tester le mode avion)
const zoneEtat = document.getElementById("etat-reseau");

function afficherEtatReseau() {
  if (navigator.onLine) {
    zoneEtat.textContent = "Connecté à Internet";
    zoneEtat.className = "etat en-ligne";
  } else {
    zoneEtat.textContent = "Mode hors ligne";
    zoneEtat.className = "etat hors-ligne";
  }
}

window.addEventListener("online", afficherEtatReseau);
window.addEventListener("offline", afficherEtatReseau);
afficherEtatReseau();
