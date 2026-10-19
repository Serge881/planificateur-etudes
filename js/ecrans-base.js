"use strict";
// Écrans : démarrage, accueil, matières.

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
  const { matieres, parId, taches } = await tachesDe(filiere);
  const { examens } = await examensDe(filiere);
  const auj = enISO(new Date());
  const duJour = taches.filter((t) => !t.fait && t.echeance && t.echeance <= auj);
  const faites = taches.filter((t) => t.fait).length;
  const prochain = examens.find((e) => joursDepuis(e.date) >= 0);
  const date = majuscule(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  const pourcent = taches.length ? Math.round((faites / taches.length) * 100) : 0;

  let carteExamen = null;
  if (prochain) {
    const m = parId.get(prochain.matiereId);
    carteExamen = h("a", { class: "carte-examen", style: "background:" + m.couleur, href: "#/examen/" + prochain.id },
      h("span", { class: "ex-gauche" },
        h("span", { class: "ex-petit" }, "Prochain examen"),
        h("strong", { class: "ex-nom" }, m.nom),
        h("span", { class: "ex-info" }, libelleEcheance(prochain.date, prochain.heure) + (prochain.lieu ? " · " + prochain.lieu : ""))),
      h("span", { class: "ex-badge", style: "color:" + m.couleur }, badgeJours(joursDepuis(prochain.date))));
  }

  return h("main", { class: "page avec-nav" },
    hero(
      h("p", { class: "hero-petit" }, date),
      h("h1", { class: "hero-titre" }, "Bonjour !"),
      h("p", { class: "hero-texte" }, filiere.nom)
    ),
    carteExamen,
    h("section", { class: "carte" + (carteExamen ? "" : " carte-haute") },
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
    await supprimerMatiere(existante.id);
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

