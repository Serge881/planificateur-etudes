"use strict";
// Écrans : tâches.

/* ============ Composants des tâches ============ */

function carteTache(t, matiere) {
  const retard = enRetard(t);
  return h("article", { class: "tache" + (t.fait ? " faite" : "") },
    h("button", {
      type: "button", class: "coche", role: "checkbox", "aria-checked": String(!!t.fait), "aria-label": t.titre,
      onclick: async () => { await db.taches.update(t.id, { fait: t.fait ? 0 : 1 }); render(); }
    }, h("span", { class: "coche-rond", style: "border-color:" + matiere.couleur + ";background:" + (t.fait ? matiere.couleur : "transparent") },
      t.fait ? icone("M5 12l5 5 9-10") : null)),
    h("a", { class: "tache-corps", href: "#/tache/" + t.id, "aria-label": "Modifier la tâche " + t.titre },
      h("span", { class: "tache-titre" }, t.titre),
      h("span", { class: "tache-meta" },
        h("span", { class: "etiquette-matiere", style: "background:" + matiere.couleur }, matiere.nom),
        h("span", { class: "tache-date" + (retard ? " retard" : "") }, (retard ? "En retard · " : "") + libelleEcheance(t.echeance, t.heure))))
  );
}

function illustrationVide() {
  return h("div", { class: "vide-ill", "aria-hidden": "true" },
    h("span", { class: "vide-rond" }, icone("M5 12l5 5 9-10")),
    h("span", { class: "vide-p1" }), h("span", { class: "vide-p2" }));
}

/* ============ Écran : Tâches ============ */

let filtreTaches = "toutes";

async function vueTaches(filiere) {
  const { matieres, parId, taches } = await tachesDe(filiere);
  const enCours = taches.filter((t) => !t.fait).length;
  const visibles = taches.filter((t) => filtreTaches === "toutes" || (filtreTaches === "afaire" ? !t.fait : !!t.fait));
  const filtres = [["toutes", "Toutes"], ["afaire", "À faire"], ["terminees", "Terminées"]];

  let contenu;
  if (matieres.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Ajoute d'abord une matière"),
      h("p", { class: "texte" }, "Chaque tâche est rattachée à une matière."),
      h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Gérer mes matières"));
  } else if (visibles.length === 0) {
    const messages = {
      toutes: ["Aucune tâche pour l'instant", "Ajoute ta première tâche pour organiser tes révisions."],
      afaire: ["Tout est fait !", "Aucune tâche à faire. Profite de ta journée."],
      terminees: ["Rien de terminé", "Les tâches terminées apparaîtront ici."]
    };
    const [titre, texte] = messages[filtreTaches];
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, titre), h("p", { class: "texte" }, texte),
      h("a", { class: "bouton lien-bouton", href: "#/tache/new" }, "+ Ajouter une tâche"));
  } else {
    contenu = h("div", { class: "liste-taches" }, visibles.map((t) => carteTache(t, parId.get(t.matiereId))));
  }

  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, enCours + " en cours"),
      h("h1", { class: "hero-titre" }, "Tes tâches"),
      h("div", { class: "filtres", role: "group", "aria-label": "Filtrer les tâches" },
        filtres.map(([cle, libelle]) =>
          h("button", {
            type: "button", class: "filtre" + (filtreTaches === cle ? " actif" : ""),
            "aria-pressed": String(filtreTaches === cle),
            onclick: () => { filtreTaches = cle; render(); }
          }, libelle)))
    ),
    h("div", { class: "espace" }),
    contenu,
    matieres.length ? h("a", { class: "fab", href: "#/tache/new", "aria-label": "Ajouter une tâche" }, "+") : null
  );
}

/* ============ Écran : Ajouter / modifier une tâche ============ */

async function vueFormulaireTache(filiere, argument) {
  const estNouvelle = argument === "new";
  const matieres = await matieresDe(filiere);
  if (matieres.length === 0) { location.hash = "#/taches"; return h("div"); }
  const existante = estNouvelle ? null : await db.taches.get(Number(argument));
  if (!estNouvelle && (!existante || !matieres.some((m) => m.id === existante.matiereId))) {
    location.hash = "#/taches"; return h("div");
  }
  const tache = existante || { titre: "", matiereId: matieres[0].id, echeance: enISO(new Date()), heure: "" };

  const champTitre = h("input", { id: "titre", class: "champ", type: "text", maxlength: "120",
    value: tache.titre, placeholder: "Ex. : Exercices série 3" });
  const champMatiere = h("select", { id: "mat", class: "champ" },
    matieres.map((m) => h("option", { value: String(m.id), selected: m.id === tache.matiereId }, m.nom)));
  const champDate = h("input", { id: "date", class: "champ", type: "date", value: tache.echeance || "" });
  const champHeure = h("input", { id: "heure", class: "champ", type: "time", value: tache.heure || "" });
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    const titre = champTitre.value.trim();
    if (!titre) { message.textContent = "Donne un titre à la tâche."; champTitre.focus(); return; }
    if (champHeure.value && !champDate.value) {
      message.textContent = "Choisis une date pour définir une heure."; champDate.focus(); return;
    }
    const donnees = { titre, matiereId: Number(champMatiere.value), echeance: champDate.value, heure: champHeure.value };
    if (estNouvelle) await db.taches.add({ ...donnees, fait: 0, creeLe: Date.now() });
    else await db.taches.update(existante.id, donnees);
    location.hash = "#/taches";
  }

  async function supprimer() {
    if (!confirm("Supprimer la tâche « " + existante.titre + " » ?")) return;
    await db.taches.delete(existante.id);
    location.hash = "#/taches";
  }

  return h("main", { class: "page" },
    hero(
      h("p", { class: "hero-petit" }, "Filière : " + filiere.nom),
      h("h1", { class: "hero-titre" }, estNouvelle ? "Nouvelle tâche" : "Modifier la tâche")
    ),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "titre" }, "Titre"), champTitre,
      h("label", { class: "etiquette", for: "mat" }, "Matière"), champMatiere,
      h("label", { class: "etiquette", for: "date" }, "Date"), champDate,
      h("label", { class: "etiquette", for: "heure" }, "Heure (facultative)"), champHeure,
      message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/taches" }, "Annuler"),
      existante ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer cette tâche") : null
    )
  );
}

