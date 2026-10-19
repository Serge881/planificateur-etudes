"use strict";
// Navigation entre les écrans et démarrage de l'application.
// Chaque route : [fonction qui construit l'écran, onglet de la barre du bas à mettre en avant (null = pas de barre)]

const ROUTES = {
  accueil: [vueAccueil, "accueil"],
  taches: [vueTaches, "taches"], tache: [vueFormulaireTache, null],
  examens: [vueExamens, "examens"], examen: [vueFormulaireExamen, null],
  agenda: [vueAgenda, "agenda"],
  plus: [vuePlus, "plus"],
  matieres: [vueMatieres, "plus"], matiere: [vueFormulaireMatiere, null],
  notes: [vueNotes, "plus"], note: [vueFormulaireNote, null],
  cours: [vueCours, "plus"], document: [vueFormulaireDocument, null],
  reglages: [vueReglages, "plus"], filiere: [vueFormulaireFiliere, null]
};

async function render() {
  const app = document.getElementById("app");
  try {
    const filiere = await filiereActive();
    if (!filiere) { app.replaceChildren(vueDemarrage()); return; }

    const [page, argument, argument2] = (location.hash.replace(/^#\//, "") || "accueil").split("/");
    const [construire, actif] = ROUTES[page] || ROUTES.accueil;
    const vue = await construire(filiere, argument, argument2);
    app.replaceChildren(vue, ...(actif ? [barreNavigation(actif)] : []));
    window.scrollTo(0, 0);
  } catch (erreur) {
    console.error(erreur);
    app.replaceChildren(h("main", { class: "page" },
      h("section", { class: "carte carte-haute" },
        h("h1", { class: "carte-titre" }, "Un problème est survenu"),
        h("p", { class: "texte" }, "Impossible d'afficher cet écran. Recharge l'application."),
        h("a", { class: "bouton lien-bouton", href: "#/accueil" }, "Retour à l'accueil"))));
  }
}

window.addEventListener("hashchange", render);

// Demande au téléphone de ne pas effacer les données de l'application
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

// Service Worker (mode hors ligne)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.error("Service Worker :", e));
  });
}

// Rappels : vérification au démarrage, au retour dans l'application, puis chaque minute
render();
verifierRappels();
document.addEventListener("visibilitychange", () => { if (!document.hidden) verifierRappels(); });
setInterval(verifierRappels, 60000);
