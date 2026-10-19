"use strict";
// Écrans : examens et calendrier.

/* ============ Examens ============ */

function carteExamen(e, matiere, passe) {
  const jours = joursDepuis(e.date);
  return h("a", { class: "examen" + (passe ? " passe" : ""), style: "background:" + matiere.couleur,
                  href: "#/examen/" + e.id, "aria-label": "Modifier l'examen " + matiere.nom },
    h("span", { class: "examen-haut" },
      h("span", { class: "examen-matiere" }, matiere.nom + (e.titre ? " · " + e.titre : "")),
      h("span", { class: "examen-badge", style: "color:" + matiere.couleur }, passe ? "Passé" : badgeJours(jours))),
    h("span", { class: "examen-date" }, depuisISO(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })),
    h("span", { class: "examen-info" }, [e.heure, e.lieu].filter(Boolean).join(" · ") || "Heure et lieu non précisés"));
}

async function vueExamens(filiere) {
  const { matieres, parId, examens } = await examensDe(filiere);
  const aVenir = examens.filter((e) => joursDepuis(e.date) >= 0);
  const passes = examens.filter((e) => joursDepuis(e.date) < 0).reverse();

  let contenu;
  if (matieres.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Ajoute d'abord une matière"),
      h("p", { class: "texte" }, "Chaque examen est rattaché à une matière."),
      h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Gérer mes matières"));
  } else if (examens.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Aucun examen prévu"),
      h("p", { class: "texte" }, "Ajoute tes examens pour voir le compte à rebours."),
      h("a", { class: "bouton lien-bouton", href: "#/examen/new" }, "+ Ajouter un examen"));
  } else {
    contenu = h("div", {},
      aVenir.length ? h("div", { class: "liste-taches" }, aVenir.map((e) => carteExamen(e, parId.get(e.matiereId), false)))
                    : h("p", { class: "texte marge" }, "Aucun examen à venir."),
      passes.length ? [h("h2", { class: "titre-section" }, "Passés"),
                       h("div", { class: "liste-taches" }, passes.map((e) => carteExamen(e, parId.get(e.matiereId), true)))] : null);
  }

  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, aVenir.length + " à venir"), h("h1", { class: "hero-titre" }, "Tes examens")),
    h("div", { class: "espace" }),
    contenu,
    matieres.length ? h("a", { class: "fab", href: "#/examen/new", "aria-label": "Ajouter un examen" }, "+") : null);
}

async function vueFormulaireExamen(filiere, argument) {
  const estNouveau = argument === "new";
  const matieres = await matieresDe(filiere);
  if (matieres.length === 0) { location.hash = "#/examens"; return h("div"); }
  const existant = estNouveau ? null : await db.examens.get(Number(argument));
  if (!estNouveau && (!existant || !matieres.some((m) => m.id === existant.matiereId))) {
    location.hash = "#/examens"; return h("div");
  }
  const examen = existant || { matiereId: matieres[0].id, titre: "", date: enISO(new Date()), heure: "", lieu: "" };

  const champMatiere = selectMatiere("mat", matieres, examen.matiereId);
  const champTitre = h("input", { id: "titre", class: "champ", type: "text", maxlength: "80", value: examen.titre || "", placeholder: "Ex. : Partiel" });
  const champDate = h("input", { id: "date", class: "champ", type: "date", value: examen.date || "" });
  const champHeure = h("input", { id: "heure", class: "champ", type: "time", value: examen.heure || "" });
  const champLieu = h("input", { id: "lieu", class: "champ", type: "text", maxlength: "80", value: examen.lieu || "", placeholder: "Ex. : Salle B12" });
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    if (!champDate.value) { message.textContent = "Choisis la date de l'examen."; champDate.focus(); return; }
    const donnees = { matiereId: Number(champMatiere.value), titre: champTitre.value.trim(), date: champDate.value,
                      heure: champHeure.value, lieu: champLieu.value.trim() };
    if (estNouveau) await db.examens.add({ ...donnees, creeLe: Date.now() });
    else await db.examens.update(existant.id, donnees);
    location.hash = "#/examens";
  }
  async function supprimer() {
    if (!confirm("Supprimer cet examen ?")) return;
    await db.examens.delete(existant.id);
    location.hash = "#/examens";
  }

  return h("main", { class: "page" },
    hero(h("p", { class: "hero-petit" }, "Filière : " + filiere.nom),
         h("h1", { class: "hero-titre" }, estNouveau ? "Nouvel examen" : "Modifier l'examen")),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "mat" }, "Matière"), champMatiere,
      h("label", { class: "etiquette", for: "titre" }, "Intitulé (facultatif)"), champTitre,
      h("label", { class: "etiquette", for: "date" }, "Date"), champDate,
      h("label", { class: "etiquette", for: "heure" }, "Heure (facultative)"), champHeure,
      h("label", { class: "etiquette", for: "lieu" }, "Lieu (facultatif)"), champLieu,
      message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/examens" }, "Annuler"),
      existant ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer cet examen") : null));
}

/* ============ Calendrier ============ */

let moisAffiche = null;
let jourChoisi = null;

async function vueAgenda(filiere) {
  const maintenant = new Date();
  if (!moisAffiche) { moisAffiche = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1); jourChoisi = enISO(maintenant); }
  const { parId, taches } = await tachesDe(filiere);
  const { examens } = await examensDe(filiere);

  const couleursParJour = new Map();
  const ajouter = (iso, couleur) => {
    if (!iso) return;
    if (!couleursParJour.has(iso)) couleursParJour.set(iso, []);
    couleursParJour.get(iso).push(couleur);
  };
  taches.filter((t) => !t.fait).forEach((t) => ajouter(t.echeance, parId.get(t.matiereId).couleur));
  examens.forEach((e) => ajouter(e.date, parId.get(e.matiereId).couleur));

  const an = moisAffiche.getFullYear(), mois = moisAffiche.getMonth();
  const decalage = (new Date(an, mois, 1).getDay() + 6) % 7;   // la semaine commence le lundi
  const nbJours = new Date(an, mois + 1, 0).getDate();
  const aujourdhui = enISO(maintenant);

  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(h("span"));
  for (let jour = 1; jour <= nbJours; jour++) {
    const iso = an + "-" + deuxChiffres(mois + 1) + "-" + deuxChiffres(jour);
    const couleurs = couleursParJour.get(iso) || [];
    cases.push(h("button", {
      type: "button", class: "jour" + (iso === jourChoisi ? " choisi" : "") + (iso === aujourdhui ? " auj" : ""),
      "aria-pressed": String(iso === jourChoisi),
      "aria-label": depuisISO(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
        (couleurs.length ? ", " + couleurs.length + " élément" + (couleurs.length > 1 ? "s" : "") : ""),
      onclick: () => { jourChoisi = iso; render(); }
    }, h("span", { class: "jour-num" }, String(jour)),
       h("span", { class: "points" }, couleurs.slice(0, 3).map((c) => h("span", { class: "point", style: "background:" + c })))));
  }

  const changerMois = (decalageMois) => {
    moisAffiche = new Date(an, mois + decalageMois, 1);
    const m = moisAffiche;
    jourChoisi = (m.getFullYear() === maintenant.getFullYear() && m.getMonth() === maintenant.getMonth()) ? aujourdhui : enISO(m);
    render();
  };

  const tachesDuJour = taches.filter((t) => t.echeance === jourChoisi);
  const examensDuJour = examens.filter((e) => e.date === jourChoisi);
  const titreJour = majuscule(depuisISO(jourChoisi).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));

  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, String(an)),
      h("div", { class: "mois-nav" },
        h("button", { type: "button", class: "fleche", "aria-label": "Mois précédent", onclick: () => changerMois(-1) }, icone("M15 6l-6 6 6 6")),
        h("h1", { class: "hero-titre" }, majuscule(moisAffiche.toLocaleDateString("fr-FR", { month: "long" }))),
        h("button", { type: "button", class: "fleche", "aria-label": "Mois suivant", onclick: () => changerMois(1) }, icone("M9 6l6 6-6 6")))
    ),
    h("section", { class: "carte carte-haute" },
      h("div", { class: "cal-entete", "aria-hidden": "true" }, ["L", "M", "M", "J", "V", "S", "D"].map((j) => h("span", {}, j))),
      h("div", { class: "cal-grille" }, cases)),
    h("h2", { class: "titre-section" }, titreJour),
    (examensDuJour.length || tachesDuJour.length)
      ? h("div", { class: "liste-taches" },
          examensDuJour.map((e) => carteExamen(e, parId.get(e.matiereId), joursDepuis(e.date) < 0)),
          tachesDuJour.map((t) => carteTache(t, parId.get(t.matiereId))))
      : h("p", { class: "texte marge" }, "Rien de prévu ce jour-là."),
    h("div", { class: "zone-bouton" },
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/tache/new" }, "+ Ajouter une tâche"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/examen/new" }, "+ Ajouter un examen")));
}
