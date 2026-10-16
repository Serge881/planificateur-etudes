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

/* ============ Dates et tâches (outils) ============ */

const deuxChiffres = (n) => String(n).padStart(2, "0");
function enISO(date) {
  return date.getFullYear() + "-" + deuxChiffres(date.getMonth() + 1) + "-" + deuxChiffres(date.getDate());
}
function libelleEcheance(echeance, heure) {
  if (!echeance) return heure || "Sans date";
  const [an, mois, jourNum] = echeance.split("-").map(Number);
  const jour = new Date(an, mois - 1, jourNum);
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const ecart = Math.round((jour - auj) / 86400000);
  let texte;
  if (ecart === 0) texte = "Aujourd'hui";
  else if (ecart === 1) texte = "Demain";
  else if (ecart === -1) texte = "Hier";
  else texte = jour.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return heure ? texte + " · " + heure : texte;
}
const enRetard = (t) => !t.fait && t.echeance && t.echeance < enISO(new Date());

// Toutes les tâches des matières de la filière, triées : à faire d'abord, par date puis heure
async function tachesDe(filiere) {
  const matieres = await matieresDe(filiere);
  const parId = new Map(matieres.map((m) => [m.id, m]));
  const cle = (t) => (t.echeance || "9999") + (t.heure || "99:99");
  const taches = (await db.taches.toArray()).filter((t) => parId.has(t.matiereId));
  taches.sort((a, b) => ((a.fait ? 1 : 0) - (b.fait ? 1 : 0)) || cle(a).localeCompare(cle(b)));
  return { matieres, parId, taches };
}

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

/* ============ Écran : Accueil ============ */

async function vueAccueil(filiere) {
  const { matieres, parId, taches } = await tachesDe(filiere);
  const auj = enISO(new Date());
  const duJour = taches.filter((t) => !t.fait && t.echeance && t.echeance <= auj);
  const faites = taches.filter((t) => t.fait).length;
  const date = majuscule(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  const pourcent = taches.length ? Math.round((faites / taches.length) * 100) : 0;

  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, date),
      h("h1", { class: "hero-titre" }, "Bonjour !"),
      h("p", { class: "hero-texte" }, filiere.nom)
    ),
    h("section", { class: "carte carte-haute" },
      h("h2", { class: "carte-titre" }, "Ta progression"),
      taches.length === 0
        ? h("p", { class: "texte" }, matieres.length === 0
            ? "Commence par ajouter tes matières, puis tes tâches."
            : "Aucune tâche pour l'instant. Ajoute ta première tâche !")
        : [h("div", { class: "barre", role: "progressbar", "aria-valuenow": String(pourcent), "aria-valuemin": "0", "aria-valuemax": "100", "aria-label": "Tâches terminées" },
              h("div", { class: "barre-pleine", style: "width:" + pourcent + "%" })),
           h("p", { class: "texte" }, faites + " tâche" + (faites > 1 ? "s" : "") + " terminée" + (faites > 1 ? "s" : "") + " sur " + taches.length)]
    ),
    h("h2", { class: "titre-section" }, "À faire aujourd'hui"),
    duJour.length
      ? h("div", { class: "liste-taches" }, duJour.slice(0, 5).map((t) => carteTache(t, parId.get(t.matiereId))))
      : h("p", { class: "texte marge" }, matieres.length === 0 ? "Aucune matière pour le moment." : "Rien d'urgent aujourd'hui."),
    h("div", { class: "zone-bouton" },
      matieres.length === 0
        ? h("a", { class: "bouton lien-bouton", href: "#/matieres" }, "Ajouter mes matières")
        : h("a", { class: "bouton lien-bouton", href: "#/taches" }, "Voir toutes les tâches"))
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
      case "taches": vue = await vueTaches(filiere); break;
      case "tache": vue = await vueFormulaireTache(filiere, argument); actif = null; break;
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
