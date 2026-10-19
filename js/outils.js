"use strict";
// Outils communs : création d'éléments, dates, thème, composants d'interface.

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


/* ============ Dates et nombres ============ */

const deuxChiffres = (n) => String(n).padStart(2, "0");
function enISO(date) {
  return date.getFullYear() + "-" + deuxChiffres(date.getMonth() + 1) + "-" + deuxChiffres(date.getDate());
}
function depuisISO(iso) {
  const [an, mois, jour] = iso.split("-").map(Number);
  return new Date(an, mois - 1, jour);
}
// Nombre de jours entre aujourd'hui et la date donnée (positif = dans le futur)
function joursDepuis(iso) {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  return Math.round((depuisISO(iso) - auj) / 86400000);
}
function libelleEcheance(echeance, heure) {
  if (!echeance) return heure || "Sans date";
  const ecart = joursDepuis(echeance);
  let texte;
  if (ecart === 0) texte = "Aujourd'hui";
  else if (ecart === 1) texte = "Demain";
  else if (ecart === -1) texte = "Hier";
  else texte = depuisISO(echeance).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return heure ? texte + " · " + heure : texte;
}
const enRetard = (t) => !t.fait && t.echeance && t.echeance < enISO(new Date());
const badgeJours = (j) => (j === 0 ? "Aujourd'hui" : "J-" + j);
const formaterNombre = (x) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(x);
function formaterTaille(octets) {
  if (octets < 1024) return octets + " o";
  if (octets < 1048576) return Math.round(octets / 1024) + " Ko";
  return (octets / 1048576).toFixed(1).replace(".", ",") + " Mo";
}

/* ============ Thème (clair / sombre / automatique) ============ */

function appliquerTheme(theme) {
  const racine = document.documentElement;
  if (theme === "clair") racine.dataset.theme = "light";
  else if (theme === "sombre") racine.dataset.theme = "dark";
  else delete racine.dataset.theme;
}
function themeEnregistre() {
  try { return localStorage.getItem("theme") || "auto"; } catch (e) { return "auto"; }
}
function enregistrerTheme(theme) {
  try { localStorage.setItem("theme", theme); } catch (e) { /* stockage indisponible */ }
  appliquerTheme(theme);
}
appliquerTheme(themeEnregistre());

/* ============ Composants communs ============ */

function selectMatiere(id, matieres, choisie) {
  return h("select", { id, class: "champ" },
    matieres.map((m) => h("option", { value: String(m.id), selected: m.id === choisie }, m.nom)));
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
  ["plus", "Plus", "M4 6h16M4 12h16M4 18h16"]
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

