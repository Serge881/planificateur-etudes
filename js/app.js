"use strict";

// Couleurs proposées pour les matières
const COULEURS = ["#1d4ed8", "#6d28d9", "#c2410c", "#047857", "#be185d", "#0f766e"];

/* ============ Petits outils ============ */

// Crée un élément HTML : h("div", {class: "carte"}, "texte", autreElement)
// Le texte est toujours inséré comme du texte (jamais comme du HTML) : c'est plus sûr.
function h(balise, proprietes = {}, ...enfants) {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(proprietes)) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (cle === "class") el.className = valeur;
    else if (cle === "style") el.style.cssText = valeur;
    else if (cle.startsWith("on")) el.addEventListener(cle.slice(2), valeur);
    else el.setAttribute(cle, valeur === true ? "" : valeur);
  }
  for (const enfant of enfants.flat()) {
    el.append(enfant instanceof Node ? enfant : document.createTextNode(enfant ?? ""));
  }
  return el;
}

// Crée une icône à partir d'un petit code SVG écrit par nous (jamais de l'utilisateur)
function icone(chemin) {
  const modele = document.createElement("template");
  modele.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="' + chemin + '"/></svg>';
  return modele.content.firstChild;
}

const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);
const initiales = (nom) => majuscule(nom.trim().slice(0, 2));

/* ============ Données ============ */

async function filiereActive() {
  const reglage = await db.reglages.get("filiereActive");
  if (!reglage) return null;
  return (await db.filieres.get(reglage.valeur)) || null;
}

function matieresDe(filiere) {
  return db.matieres.where("filiereId").equals(filiere.id).sortBy("nom");
}

/* ============ Composants réutilisables ============ */

function hero(...contenu) {
  return h("header", { class: "hero" }, contenu);
}

function palette(couleurInitiale, quandChoisie) {
  const boite = h("div", { class: "palette", role: "radiogroup", "aria-label": "Couleur de la matière" });
  COULEURS.forEach((couleur) => {
    const choisie = couleur === couleurInitiale;
    const bouton = h("button", {
      type: "button",
      class: "pastille" + (choisie ? " choisie" : ""),
      style: "background:" + couleur,
      role: "radio",
      "aria-checked": String(choisie),
      "aria-label": "Couleur " + (COULEURS.indexOf(couleur) + 1),
      onclick: () => {
        for (const autre of boite.children) {
          autre.classList.remove("choisie");
          autre.setAttribute("aria-checked", "false");
        }
        bouton.classList.add("choisie");
        bouton.setAttribute("aria-checked", "true");
        quandChoisie(couleur);
      }
    });
    boite.append(bouton);
  });
  return boite;
}

const ELEMENTS_NAV = [
  ["accueil", "Accueil", "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  ["taches", "Tâches", "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"],
  ["examens", "Examens", "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6"],
  ["agenda", "Agenda", "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM16 3v4M8 3v4M3 10h18"],
  ["matieres", "Matières", "M4 6h16M4 12h16M4 18h16"]
];

function barreNavigation(actif) {
  return h("nav", { class: "nav", "aria-label": "Navigation principale" },
    ELEMENTS_NAV.map(([cle, libelle, chemin]) =>
      h("a", {
        class: "nav-item" + (cle === actif ? " actif" : ""),
        href: "#/" + cle,
        "aria-current": cle === actif ? "page" : null
      }, icone(chemin), libelle)
    )
  );
}

/* ============ Écran : Démarrage (création de la filière et des matières) ============ */

function vueDemarrage() {
  const brouillon = [];
  let couleurChoisie = COULEURS[0];

  const champFiliere = h("input", {
    id: "filiere", class: "champ", type: "text", maxlength: "60",
    placeholder: "Ex. : Informatique, Licence 2"
  });
  const champMatiere = h("input", {
    id: "matiere", class: "champ", type: "text", maxlength: "60",
    placeholder: "Nom de la matière",
    onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); ajouter(); } }
  });
  const puces = h("div", { class: "puces" });
  const message = h("p", { class: "erreur", role: "alert" });

  function afficherPuces() {
    puces.replaceChildren(...brouillon.map((m, i) =>
      h("span", { class: "puce", style: "background:" + m.couleur },
        m.nom,
        h("button", {
          type: "button", class: "puce-x", "aria-label": "Retirer " + m.nom,
          onclick: () => { brouillon.splice(i, 1); afficherPuces(); }
        }, "×"))
    ));
  }

  function ajouter() {
    const nom = champMatiere.value.trim();
    if (!nom) { champMatiere.focus(); return; }
    brouillon.push({ nom, couleur: couleurChoisie, coef: 1 });
    champMatiere.value = "";
    afficherPuces();
    champMatiere.focus();
  }

  async function commencer() {
    const nom = champFiliere.value.trim();
    if (!nom) {
      message.textContent = "Donne un nom à ta filière pour continuer.";
      champFiliere.focus();
      return;
    }
    // Si une matière est tapée mais pas encore ajoutée, on l'ajoute pour ne pas la perdre
    if (champMatiere.value.trim()) ajouter();
    await db.transaction("rw", db.filieres, db.matieres, db.reglages, async () => {
      const id = await db.filieres.add({ nom, creeLe: Date.now() });
      await db.matieres.bulkAdd(brouillon.map((m) => ({ ...m, filiereId: id })));
      await db.reglages.put({ cle: "filiereActive", valeur: id });
    });
    location.hash = "#/accueil";
    render();
  }

  return h("main", { class: "page" },
    hero(
      h("p", { class: "hero-petit" }, "Première fois ici"),
      h("h1", { class: "hero-titre" }, "Prépare ton année d'études"),
      h("p", { class: "hero-texte" }, "Crée ta filière et tes matières. Tu pourras tout modifier ensuite.")
    ),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "filiere" }, "Ta filière"),
      champFiliere,
      h("label", { class: "etiquette", for: "matiere" }, "Tes matières"),
      puces,
      h("div", { class: "ligne-ajout" }, champMatiere,
        h("button", { type: "button", class: "bouton-secondaire", onclick: ajouter }, "Ajouter")),
      palette(couleurChoisie, (c) => { couleurChoisie = c; }),
      message
    ),
    h("div", { class: "zone-bouton" },
      h("button", { type: "button", class: "bouton", onclick: commencer }, "Commencer"))
  );
}

/* ============ Écran : Accueil ============ */

async function vueAccueil(filiere) {
  const matieres = await matieresDe(filiere);
  const date = majuscule(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, date),
      h("h1", { class: "hero-titre" }, "Bonjour !"),
      h("p", { class: "hero-texte" }, filiere.nom)
    ),
    h("section", { class: "carte carte-haute" },
      h("h2", { class: "carte-titre" }, "Tes matières"),
      h("p", { class: "texte" },
        matieres.length === 0 ? "Aucune matière pour le moment."
          : matieres.length + (matieres.length > 1 ? " matières enregistrées." : " matière enregistrée.")),
      h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Gérer mes matières")
    ),
    h("section", { class: "carte" },
      h("h2", { class: "carte-titre" }, "Bientôt"),
      h("p", { class: "texte" }, "Les tâches, les examens et le calendrier arrivent dans les prochaines étapes.")
    )
  );
}

/* ============ Écran : Matières ============ */

async function vueMatieres(filiere) {
  const matieres = await matieresDe(filiere);
  const grille = h("div", { class: "grille" },
    matieres.map((m) =>
      h("a", { class: "tuile", style: "background:" + m.couleur, href: "#/matiere/" + m.id,
               "aria-label": "Modifier " + m.nom },
        h("span", { class: "tuile-init" }, initiales(m.nom)),
        h("span", { class: "tuile-nom" }, m.nom),
        h("span", { class: "tuile-sous" }, "Coef. " + m.coef))
    ),
    h("a", { class: "tuile-ajout", href: "#/matiere/new" }, "+ Ajouter une matière")
  );
  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, "Filière"),
      h("h1", { class: "hero-titre" }, "Matières"),
      h("span", { class: "pilule" }, filiere.nom)
    ),
    grille
  );
}

/* ============ Écran : Ajouter / modifier une matière ============ */

async function vueFormulaireMatiere(filiere, argument) {
  const estNouvelle = argument === "new";
  const existante = estNouvelle ? null : await db.matieres.get(Number(argument));
  if (!estNouvelle && (!existante || existante.filiereId !== filiere.id)) {
    location.hash = "#/matieres";
    return h("div");
  }
  const matiere = existante || { nom: "", coef: 1, couleur: COULEURS[0] };
  let couleur = matiere.couleur;

  const champNom = h("input", { id: "nom", class: "champ", type: "text", maxlength: "60",
    value: matiere.nom, placeholder: "Ex. : Mathématiques" });
  const champCoef = h("input", { id: "coef", class: "champ", type: "number",
    min: "0.5", max: "20", step: "0.5", value: String(matiere.coef), inputmode: "decimal" });
  const message = h("p", { class: "erreur", role: "alert" });

  async function enregistrer() {
    const nom = champNom.value.trim();
    const coef = Number(champCoef.value.replace(",", "."));
    if (!nom) { message.textContent = "Donne un nom à la matière."; champNom.focus(); return; }
    if (!(coef > 0)) { message.textContent = "Le coefficient doit être supérieur à 0."; champCoef.focus(); return; }
    if (estNouvelle) await db.matieres.add({ nom, coef, couleur, filiereId: filiere.id });
    else await db.matieres.update(existante.id, { nom, coef, couleur });
    location.hash = "#/matieres";
  }

  async function supprimer() {
    if (!confirm("Supprimer « " + existante.nom + " » ? Ses tâches seront aussi supprimées.")) return;
    await db.transaction("rw", db.matieres, db.taches, async () => {
      await db.taches.where("matiereId").equals(existante.id).delete();
      await db.matieres.delete(existante.id);
    });
    location.hash = "#/matieres";
  }

  return h("main", { class: "page" },
    hero(
      h("p", { class: "hero-petit" }, "Filière : " + filiere.nom),
      h("h1", { class: "hero-titre" }, estNouvelle ? "Nouvelle matière" : "Modifier la matière")
    ),
    h("section", { class: "carte carte-haute" },
      h("label", { class: "etiquette", for: "nom" }, "Nom"), champNom,
      h("label", { class: "etiquette", for: "coef" }, "Coefficient"), champCoef,
      h("span", { class: "etiquette" }, "Couleur"),
      palette(couleur, (c) => { couleur = c; }),
      message,
      h("button", { type: "button", class: "bouton", onclick: enregistrer }, "Enregistrer"),
      h("a", { class: "bouton-secondaire lien-bouton", href: "#/matieres" }, "Annuler"),
      existante ? h("button", { type: "button", class: "bouton-danger", onclick: supprimer }, "Supprimer cette matière") : null
    )
  );
}

/* ============ Écrans à venir ============ */

function vueBientot(titre) {
  return h("main", { class: "page avec-nav" },
    hero(h("p", { class: "hero-petit" }, "À venir"), h("h1", { class: "hero-titre" }, titre)),
    h("section", { class: "carte carte-haute" },
      h("p", { class: "texte" }, "Cet écran sera construit dans une prochaine étape.")));
}

/* ============ Navigation entre les écrans ============ */

async function render() {
  const app = document.getElementById("app");
  try {
    const filiere = await filiereActive();
    if (!filiere) { app.replaceChildren(vueDemarrage()); return; }

    const [page, argument] = (location.hash.replace(/^#\//, "") || "accueil").split("/");
    let vue;
    let actif = page;
    switch (page) {
      case "matieres": vue = await vueMatieres(filiere); break;
      case "matiere": vue = await vueFormulaireMatiere(filiere, argument); actif = null; break;
      case "taches": vue = vueBientot("Tâches"); break;
      case "examens": vue = vueBientot("Examens"); break;
      case "agenda": vue = vueBientot("Agenda"); break;
      default: vue = await vueAccueil(filiere); actif = "accueil";
    }
    app.replaceChildren(vue, ...(actif ? [barreNavigation(actif)] : []));
    window.scrollTo(0, 0);
  } catch (erreur) {
    console.error(erreur);
    app.replaceChildren(h("main", { class: "page" },
      h("section", { class: "carte carte-haute" },
        h("h1", { class: "carte-titre" }, "Un problème est survenu"),
        h("p", { class: "texte" }, "Impossible d'ouvrir la base de données. Recharge l'application."))));
  }
}

window.addEventListener("hashchange", render);

/* ============ Démarrage ============ */

// Demande au téléphone de ne pas effacer les données de l'application
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

// Service Worker (mode hors ligne)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((e) => console.error("Service Worker :", e));
  });
}

render();
