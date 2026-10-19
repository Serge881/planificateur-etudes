"use strict";
// Écrans : menu "Plus", réglages, gestion des filières.

const CHEVRON = "M9 6l6 6-6 6";

function ligneMenu(href, libelle, description, chemin) {
  return h("a", { class: "ligne-menu", href },
    h("span", { class: "ligne-icone" }, icone(chemin)),
    h("span", { class: "ligne-texte" }, h("strong", {}, libelle), h("span", { class: "tache-date" }, description)),
    icone(CHEVRON));
}

async function vuePlus() {
  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, "Tout le reste"), h("h1", { class: "hero-titre" }, "Plus")),
    h("div", { class: "espace" }),
    h("div", { class: "liste-taches" },
      ligneMenu("#/matieres", "Matières", "Ajouter, modifier, choisir les couleurs", "M4 6h16M4 12h16M4 18h10"),
      ligneMenu("#/notes", "Notes et moyennes", "Tes notes et ta moyenne générale", "M4 20V10M10 20V4M16 20v-7M22 20H2"),
      ligneMenu("#/cours", "Notes de cours", "Notes écrites, exercices et sujets", "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6"),
      ligneMenu("#/reglages", "Réglages", "Thème, rappels, filières, sauvegarde", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z")));
}

async function vueReglages(filiere) {
  const filieres = await db.filieres.toArray();
  const reglageRappels = ((await db.reglages.get("rappels")) || { valeur: { actif: false, avance: 30 } }).valeur;
  const theme = themeEnregistre();
  const infoRappels = h("p", { class: "tache-date", role: "status" });
  const infoDonnees = h("p", { class: "tache-date", role: "status" });

  // --- Thème ---
  const segments = h("div", { class: "segments", role: "radiogroup", "aria-label": "Thème" },
    [["clair", "Clair"], ["sombre", "Sombre"], ["auto", "Auto"]].map(([cle, libelle]) =>
      h("button", { type: "button", class: "segment" + (theme === cle ? " actif" : ""), role: "radio", "aria-checked": String(theme === cle),
        onclick: () => { enregistrerTheme(cle); render(); } }, libelle)));

  // --- Filières ---
  const choixFiliere = h("select", { id: "filiere-active", class: "champ",
    onchange: async (e) => { await db.reglages.put({ cle: "filiereActive", valeur: Number(e.target.value) }); render(); } },
    filieres.map((f) => h("option", { value: String(f.id), selected: f.id === filiere.id }, f.nom)));

  // --- Rappels ---
  const interrupteur = h("button", { type: "button", class: "interrupteur" + (reglageRappels.actif ? " actif" : ""),
    role: "switch", "aria-checked": String(!!reglageRappels.actif), "aria-label": "Activer les rappels",
    onclick: async () => {
      const nouvelEtat = !reglageRappels.actif;
      if (nouvelEtat) {
        if (!("Notification" in window)) { infoRappels.textContent = "Ce navigateur ne gère pas les notifications."; return; }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          infoRappels.textContent = "Autorisation refusée : active les notifications du site dans les réglages de Chrome.";
          return;
        }
      }
      await db.reglages.put({ cle: "rappels", valeur: { ...reglageRappels, actif: nouvelEtat } });
      render();
    } }, h("span", { class: "interrupteur-bouton" }));
  const choixAvance = h("select", { id: "avance", class: "champ",
    onchange: async (e) => { await db.reglages.put({ cle: "rappels", valeur: { ...reglageRappels, avance: Number(e.target.value) } }); } },
    [[15, "15 minutes avant"], [30, "30 minutes avant"], [60, "1 heure avant"], [1440, "1 jour avant"]].map(([minutes, libelle]) =>
      h("option", { value: String(minutes), selected: minutes === (reglageRappels.avance || 30) }, libelle)));

  // --- Données ---
  const champImport = h("input", { type: "file", accept: "application/json,.json", class: "cache", "aria-label": "Fichier de sauvegarde",
    onchange: async () => {
      const fichier = champImport.files[0];
      if (!fichier) return;
      if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) { champImport.value = ""; return; }
      try {
        await importerDonnees(await fichier.text());
        location.hash = "#/accueil";
        render();
      } catch (erreur) {
        console.error(erreur);
        infoDonnees.textContent = "Fichier invalide : aucune donnée n'a été modifiée.";
        champImport.value = "";
      }
    } });

  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, "Personnalise"), h("h1", { class: "hero-titre" }, "Réglages")),
    h("div", { class: "espace" }),
    h("section", { class: "carte" }, h("h2", { class: "carte-titre" }, "Thème"), segments),
    h("section", { class: "carte" }, h("h2", { class: "carte-titre" }, "Filière"),
      h("label", { class: "etiquette", for: "filiere-active" }, "Filière active"), choixFiliere,
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/filiere/" + filiere.id }, "Renommer ou supprimer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/filiere/new" }, "+ Nouvelle filière")),
    h("section", { class: "carte" },
      h("div", { class: "ligne-interrupteur" }, h("h2", { class: "carte-titre" }, "Rappels"), interrupteur),
      reglageRappels.actif ? [h("label", { class: "etiquette", for: "avance" }, "Me prévenir"), choixAvance,
        h("button", { type: "button", class: "bouton-secondaire", onclick: () => notifier("Planificateur d'études", "Les rappels fonctionnent !", "test") }, "Envoyer une notification de test")] : null,
      infoRappels,
      h("p", { class: "texte" }, "Les rappels s'affichent lorsque l'application est ouverte ou récemment utilisée. Les rappels application fermée arriveront avec la version Android native.")),
    h("section", { class: "carte" }, h("h2", { class: "carte-titre" }, "Mes données"),
      h("p", { class: "texte" }, "Tes données restent dans ce téléphone. Exporte-les pour garder une copie (les fichiers joints ne sont pas inclus)."),
      h("button", { type: "button", class: "bouton-secondaire", onclick: async () => {
        await exporterDonnees(); infoDonnees.textContent = "Sauvegarde téléchargée.";
      } }, "Exporter mes données"),
      h("button", { type: "button", class: "bouton-secondaire", onclick: () => champImport.click() }, "Importer une sauvegarde"),
      champImport, infoDonnees),
    h("p", { class: "texte marge" }, "Planificateur d'études · version 1.0"));
}

async function vueFormulaireFiliere(filiere, argument) {
  const estNouvelle = argument === "new";
  const existante = estNouvelle ? null : await db.filieres.get(Number(argument));
  if (!estNouvelle && !existante) { location.hash = "#/reglages"; return h("div"); }
  const champNom = h("input", { id: "nomfiliere", class: "champ", type: "text", maxlength: "60",
    value: existante ? existante.nom : "", placeholder: "Ex. : Informatique, Licence 2" });
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    const nom = champNom.value.trim();
    if (!nom) { message.textContent = "Donne un nom à la filière."; champNom.focus(); return; }
    if (estNouvelle) {
      const id = await db.filieres.add({ nom, creeLe: Date.now() });
      await db.reglages.put({ cle: "filiereActive", valeur: id });
      location.hash = "#/matieres";
    } else {
      await db.filieres.update(existante.id, { nom });
      location.hash = "#/reglages";
    }
  }
  async function supprimer() {
    if (!confirm("Supprimer la filière « " + existante.nom + " » avec toutes ses matières, tâches, examens et notes ?")) return;
    await supprimerFiliere(existante.id);
    location.hash = "#/accueil";
    render();
  }

  return h("main", { class: "page" },
    hero(h("p", { class: "hero-petit" }, "Filière"), h("h1", { class: "hero-titre" }, estNouvelle ? "Nouvelle filière" : "Modifier la filière")),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "nomfiliere" }, "Nom"), champNom, message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/reglages" }, "Annuler"),
      existante ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer cette filière") : null));
}
