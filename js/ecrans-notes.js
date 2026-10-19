"use strict";
// Écrans : notes et moyennes, notes de cours et fichiers.

/* ============ Notes et moyennes ============ */

async function vueNotes(filiere) {
  const { matieres, notesParMatiere } = await notesDe(filiere);
  const generale = moyenneGenerale(matieres, notesParMatiere);

  let contenu;
  if (matieres.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Ajoute d'abord une matière"),
      h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Gérer mes matières"));
  } else {
    contenu = h("div", { class: "liste-taches" }, matieres.map((m) => {
      const notes = notesParMatiere.get(m.id);
      const moy = moyenneMatiere(notes);
      return h("section", { class: "carte-note" },
        h("div", { class: "note-entete" },
          h("span", { class: "note-nom" }, h("span", { class: "point-matiere", style: "background:" + m.couleur }), m.nom),
          h("span", { class: "note-moy" }, moy === null ? "—" : formaterNombre(moy) + "/20")),
        h("div", { class: "barre", role: "img", "aria-label": "Moyenne " + (moy === null ? "non disponible" : formaterNombre(moy) + " sur 20") },
          h("div", { class: "barre-pleine", style: "width:" + (moy === null ? 0 : Math.min(100, moy * 5)) + "%;background:" + m.couleur })),
        h("p", { class: "tache-date" }, "Coef. " + m.coef + " · " + notes.length + " note" + (notes.length > 1 ? "s" : "")),
        notes.map((n) => h("a", { class: "ligne-note", href: "#/note/" + n.id, "aria-label": "Modifier la note " + n.intitule },
          h("span", {}, n.intitule),
          h("span", { class: "tache-date" }, formaterNombre(n.valeur) + "/" + formaterNombre(n.sur) + " · coef. " + formaterNombre(n.coef)))),
        h("a", { class: "lien-ajout", href: "#/note/new/" + m.id }, "+ Ajouter une note"));
    }));
  }

  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, "Moyenne générale"),
         h("div", { class: "gros-chiffre" }, generale === null ? "—" : formaterNombre(generale), h("span", { class: "sur" }, "/20"))),
    h("div", { class: "espace" }),
    contenu);
}

async function vueFormulaireNote(filiere, argument, argument2) {
  const estNouvelle = argument === "new";
  const matieres = await matieresDe(filiere);
  if (matieres.length === 0) { location.hash = "#/notes"; return h("div"); }
  const existante = estNouvelle ? null : await db.notes.get(Number(argument));
  if (!estNouvelle && (!existante || !matieres.some((m) => m.id === existante.matiereId))) {
    location.hash = "#/notes"; return h("div");
  }
  const matierePreset = matieres.some((m) => m.id === Number(argument2)) ? Number(argument2) : matieres[0].id;
  const note = existante || { matiereId: matierePreset, intitule: "", valeur: "", sur: 20, coef: 1 };

  const champMatiere = selectMatiere("mat", matieres, note.matiereId);
  const champIntitule = h("input", { id: "intitule", class: "champ", type: "text", maxlength: "80", value: note.intitule, placeholder: "Ex. : Contrôle 1" });
  const champValeur = h("input", { id: "valeur", class: "champ", type: "number", step: "0.25", min: "0", inputmode: "decimal", value: String(note.valeur) });
  const champSur = h("input", { id: "sur", class: "champ", type: "number", step: "any", min: "1", inputmode: "decimal", value: String(note.sur) });
  const champCoef = h("input", { id: "coefnote", class: "champ", type: "number", step: "0.5", min: "0.5", inputmode: "decimal", value: String(note.coef) });
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    const lire = (champ) => (champ.value.trim() === "" ? NaN : Number(champ.value.replace(",", ".")));
    const valeur = lire(champValeur), sur = lire(champSur), coef = lire(champCoef);
    if (Number.isNaN(valeur)) { message.textContent = "Saisis la note obtenue."; champValeur.focus(); return; }
    if (!(sur > 0)) { message.textContent = "Le barème doit être supérieur à 0."; champSur.focus(); return; }
    if (valeur < 0 || valeur > sur) { message.textContent = "La note doit être comprise entre 0 et " + formaterNombre(sur) + "."; champValeur.focus(); return; }
    if (!(coef > 0)) { message.textContent = "Le coefficient doit être supérieur à 0."; champCoef.focus(); return; }
    const donnees = { matiereId: Number(champMatiere.value), intitule: champIntitule.value.trim() || "Note", valeur, sur, coef };
    if (estNouvelle) await db.notes.add({ ...donnees, creeLe: Date.now() });
    else await db.notes.update(existante.id, donnees);
    location.hash = "#/notes";
  }
  async function supprimer() {
    if (!confirm("Supprimer cette note ?")) return;
    await db.notes.delete(existante.id);
    location.hash = "#/notes";
  }

  return h("main", { class: "page" },
    hero(h("p", { class: "hero-petit" }, "Filière : " + filiere.nom),
         h("h1", { class: "hero-titre" }, estNouvelle ? "Nouvelle note" : "Modifier la note")),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "mat" }, "Matière"), champMatiere,
      h("label", { class: "etiquette", for: "intitule" }, "Intitulé"), champIntitule,
      h("label", { class: "etiquette", for: "valeur" }, "Note obtenue"), champValeur,
      h("label", { class: "etiquette", for: "sur" }, "Sur combien ?"), champSur,
      h("label", { class: "etiquette", for: "coefnote" }, "Coefficient de cette note"), champCoef,
      message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/notes" }, "Annuler"),
      existante ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer cette note") : null));
}

/* ============ Notes de cours et fichiers ============ */

const TYPES_DOC = [["note", "Notes"], ["exercice", "Exercices"], ["sujet", "Sujets"]];
let ongletCours = "note";

function carteDocument(d, matiere) {
  const extension = d.type === "note" ? "NOTE"
    : (d.nomFichier && d.nomFichier.includes(".") ? d.nomFichier.split(".").pop().slice(0, 4).toUpperCase() : "FICH");
  const info = d.type === "note"
    ? "Modifiée " + libelleEcheance(enISO(new Date(d.modifieLe || d.creeLe || Date.now())))
    : formaterTaille(d.taille || 0);
  return h("a", { class: "tache doc", href: "#/document/" + d.id, "aria-label": "Ouvrir " + d.titre },
    h("span", { class: "doc-icone", style: "background:" + matiere.couleur }, extension),
    h("span", { class: "tache-corps" },
      h("span", { class: "tache-titre" }, d.titre),
      h("span", { class: "tache-meta" },
        h("span", { class: "etiquette-matiere", style: "background:" + matiere.couleur }, matiere.nom),
        h("span", { class: "tache-date" }, info))));
}

async function vueCours(filiere) {
  const matieres = await matieresDe(filiere);
  const parId = new Map(matieres.map((m) => [m.id, m]));
  const tous = (await db.documents.toArray()).filter((d) => parId.has(d.matiereId));
  const docs = tous.filter((d) => d.type === ongletCours).sort((a, b) => (b.modifieLe || b.creeLe || 0) - (a.modifieLe || a.creeLe || 0));
  const libelleType = TYPES_DOC.find(([cle]) => cle === ongletCours)[1].toLowerCase();

  let contenu;
  if (matieres.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Ajoute d'abord une matière"),
      h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Gérer mes matières"));
  } else if (docs.length === 0) {
    contenu = h("section", { class: "vide" }, illustrationVide(),
      h("h2", { class: "vide-titre" }, "Rien ici pour l'instant"),
      h("p", { class: "texte" }, "Ajoute tes " + libelleType + (ongletCours === "note" ? " de cours" : "") + " pour les retrouver hors ligne."),
      h("a", { class: "bouton lien-bouton", href: "#/document/new/" + ongletCours }, "+ Ajouter"));
  } else {
    contenu = h("div", { class: "liste-taches" }, docs.map((d) => carteDocument(d, parId.get(d.matiereId))));
  }

  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, tous.length + " élément" + (tous.length > 1 ? "s" : "")),
         h("h1", { class: "hero-titre" }, "Notes de cours"),
         h("div", { class: "filtres", role: "group", "aria-label": "Type de document" },
           TYPES_DOC.map(([cle, libelle]) => h("button", {
             type: "button", class: "filtre" + (ongletCours === cle ? " actif" : ""), "aria-pressed": String(ongletCours === cle),
             onclick: () => { ongletCours = cle; render(); } }, libelle)))),
    h("div", { class: "espace" }),
    contenu,
    matieres.length ? h("a", { class: "fab", href: "#/document/new/" + ongletCours, "aria-label": "Ajouter" }, "+") : null);
}

function ouvrirFichier(doc) {
  const url = URL.createObjectURL(doc.fichier);
  const lien = h("a", { href: url, target: "_blank", rel: "noopener" });
  document.body.append(lien); lien.click(); lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function vueFormulaireDocument(filiere, argument, argument2) {
  const estNouveau = argument === "new";
  const matieres = await matieresDe(filiere);
  if (matieres.length === 0) { location.hash = "#/cours"; return h("div"); }
  const existant = estNouveau ? null : await db.documents.get(Number(argument));
  if (!estNouveau && (!existant || !matieres.some((m) => m.id === existant.matiereId))) {
    location.hash = "#/cours"; return h("div");
  }
  const type = existant ? existant.type : (TYPES_DOC.some(([cle]) => cle === argument2) ? argument2 : ongletCours);
  const doc = existant || { matiereId: matieres[0].id, titre: "", contenu: "" };
  const libelleType = TYPES_DOC.find(([cle]) => cle === type)[1];

  const champMatiere = selectMatiere("mat", matieres, doc.matiereId);
  const champTitre = h("input", { id: "titre", class: "champ", type: "text", maxlength: "120", value: doc.titre,
    placeholder: type === "note" ? "Ex. : Chapitre 3 — Dérivées" : "Ex. : Série d'exercices 2" });
  const champContenu = type === "note" ? h("textarea", { id: "contenu", class: "champ", rows: "10" }, doc.contenu || "") : null;
  const champFichier = type !== "note" ? h("input", { id: "fichier", class: "champ", type: "file" }) : null;
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    let titre = champTitre.value.trim();
    const donnees = { matiereId: Number(champMatiere.value), type };
    if (type === "note") {
      if (!titre) { message.textContent = "Donne un titre à la note."; champTitre.focus(); return; }
      donnees.contenu = champContenu.value;
    } else {
      const fichier = champFichier.files[0];
      if (estNouveau && !fichier) { message.textContent = "Choisis un fichier à ajouter."; champFichier.focus(); return; }
      if (fichier) {
        donnees.fichier = fichier; donnees.nomFichier = fichier.name; donnees.mime = fichier.type; donnees.taille = fichier.size;
        if (!titre) titre = fichier.name.replace(/\.[^.]+$/, "");
      }
      if (!titre) { message.textContent = "Donne un titre au document."; champTitre.focus(); return; }
    }
    donnees.titre = titre;
    try {
      if (estNouveau) await db.documents.add({ ...donnees, creeLe: Date.now(), modifieLe: Date.now() });
      else await db.documents.update(existant.id, { ...donnees, modifieLe: Date.now() });
      ongletCours = type;
      location.hash = "#/cours";
    } catch (erreur) {
      console.error(erreur);
      message.textContent = "Impossible d'enregistrer (espace de stockage insuffisant ?).";
    }
  }
  async function supprimer() {
    if (!confirm("Supprimer « " + existant.titre + " » ?")) return;
    await db.documents.delete(existant.id);
    location.hash = "#/cours";
  }

  return h("main", { class: "page" },
    hero(h("p", { class: "hero-petit" }, libelleType),
         h("h1", { class: "hero-titre" }, estNouveau ? (type === "note" ? "Nouvelle note" : "Nouveau fichier") : "Modifier")),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "titre" }, "Titre"), champTitre,
      h("label", { class: "etiquette", for: "mat" }, "Matière"), champMatiere,
      type === "note"
        ? [h("label", { class: "etiquette", for: "contenu" }, "Contenu"), champContenu]
        : [existant && existant.fichier
             ? h("p", { class: "texte" }, "Fichier actuel : " + existant.nomFichier + " (" + formaterTaille(existant.taille || 0) + ")")
             : null,
           h("label", { class: "etiquette", for: "fichier" }, existant ? "Remplacer le fichier (facultatif)" : "Fichier"), champFichier],
      message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      existant && existant.fichier ? h("button", { type: "button", class: "bouton-secondaire", onclick: () => ouvrirFichier(existant) }, "Ouvrir le fichier") : null,
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/cours" }, "Annuler"),
      existant ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer") : null));
}
