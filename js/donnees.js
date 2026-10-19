"use strict";
// Accès aux données, calculs, sauvegarde et rappels.

/* ============ Données ============ */

async function filiereActive() {
  const reglage = await db.reglages.get("filiereActive");
  if (!reglage) return null;
  return (await db.filieres.get(reglage.valeur)) || null;
}

function matieresDe(filiere) {
  return db.matieres.where("filiereId").equals(filiere.id).sortBy("nom");
}


// Toutes les tâches des matières de la filière : à faire d'abord, par date puis heure
async function tachesDe(filiere) {
  const matieres = await matieresDe(filiere);
  const parId = new Map(matieres.map((m) => [m.id, m]));
  const cle = (t) => (t.echeance || "9999") + (t.heure || "99:99");
  const taches = (await db.taches.toArray()).filter((t) => parId.has(t.matiereId));
  taches.sort((a, b) => ((a.fait ? 1 : 0) - (b.fait ? 1 : 0)) || cle(a).localeCompare(cle(b)));
  return { matieres, parId, taches };
}

async function examensDe(filiere) {
  const matieres = await matieresDe(filiere);
  const parId = new Map(matieres.map((m) => [m.id, m]));
  const cle = (e) => e.date + (e.heure || "99:99");
  const examens = (await db.examens.toArray()).filter((e) => parId.has(e.matiereId));
  examens.sort((a, b) => cle(a).localeCompare(cle(b)));
  return { matieres, parId, examens };
}

async function notesDe(filiere) {
  const matieres = await matieresDe(filiere);
  const parId = new Map(matieres.map((m) => [m.id, m]));
  const notesParMatiere = new Map(matieres.map((m) => [m.id, []]));
  (await db.notes.toArray()).forEach((n) => {
    if (notesParMatiere.has(n.matiereId)) notesParMatiere.get(n.matiereId).push(n);
  });
  return { matieres, parId, notesParMatiere };
}

// Moyenne d'une matière sur 20, en tenant compte du barème et du coefficient de chaque note
function moyenneMatiere(notes) {
  let somme = 0, poids = 0;
  for (const n of notes) { somme += (n.valeur / n.sur) * 20 * n.coef; poids += n.coef; }
  return poids > 0 ? somme / poids : null;
}
// Moyenne générale : moyennes des matières pondérées par leur coefficient
function moyenneGenerale(matieres, notesParMatiere) {
  let somme = 0, poids = 0;
  for (const m of matieres) {
    const moy = moyenneMatiere(notesParMatiere.get(m.id) || []);
    if (moy !== null) { somme += moy * m.coef; poids += m.coef; }
  }
  return poids > 0 ? somme / poids : null;
}

/* ============ Suppressions en cascade ============ */

async function supprimerMatiere(id) {
  await db.transaction("rw", db.matieres, db.taches, db.examens, db.notes, db.documents, async () => {
    for (const table of [db.taches, db.examens, db.notes, db.documents]) {
      await table.where("matiereId").equals(id).delete();
    }
    await db.matieres.delete(id);
  });
}

async function supprimerFiliere(id) {
  const idsMatieres = await db.matieres.where("filiereId").equals(id).primaryKeys();
  for (const idMatiere of idsMatieres) await supprimerMatiere(idMatiere);
  await db.filieres.delete(id);
  const actif = await db.reglages.get("filiereActive");
  if (actif && actif.valeur === id) {
    const autre = await db.filieres.toCollection().first();
    if (autre) await db.reglages.put({ cle: "filiereActive", valeur: autre.id });
    else await db.reglages.delete("filiereActive");
  }
}

/* ============ Sauvegarde (export / import) ============ */

async function exporterDonnees() {
  const donnees = {
    application: "planificateur-etudes", version: 2, exporteLe: new Date().toISOString(),
    filieres: await db.filieres.toArray(), matieres: await db.matieres.toArray(),
    taches: await db.taches.toArray(), examens: await db.examens.toArray(), notes: await db.notes.toArray(),
    // Les fichiers joints (PDF, images) ne sont pas inclus : seules les notes écrites le sont
    documents: (await db.documents.toArray()).filter((d) => d.type === "note"),
    reglages: await db.reglages.toArray()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(donnees)], { type: "application/json" }));
  const lien = h("a", { href: url, download: "planificateur-sauvegarde-" + enISO(new Date()) + ".json" });
  document.body.append(lien); lien.click(); lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function importerDonnees(texte) {
  const d = JSON.parse(texte);
  const liste = (x) => (Array.isArray(x) ? x : []);
  if (!d || d.application !== "planificateur-etudes" || !Array.isArray(d.filieres) || !Array.isArray(d.matieres)) {
    throw new Error("Fichier de sauvegarde invalide");
  }
  await db.transaction("rw", db.filieres, db.matieres, db.taches, db.examens, db.notes, db.documents, db.reglages, async () => {
    for (const table of [db.filieres, db.matieres, db.taches, db.examens, db.notes, db.documents, db.reglages]) await table.clear();
    await db.filieres.bulkAdd(liste(d.filieres));
    await db.matieres.bulkAdd(liste(d.matieres));
    await db.taches.bulkAdd(liste(d.taches));
    await db.examens.bulkAdd(liste(d.examens));
    await db.notes.bulkAdd(liste(d.notes));
    await db.documents.bulkAdd(liste(d.documents));
    await db.reglages.bulkPut(liste(d.reglages));
  });
}

/* ============ Rappels ============ */

function notifier(titre, corps, etiquette) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body: corps, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: etiquette };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => reg.showNotification(titre, options)).catch(() => {});
  }
}

// Envoie une notification pour chaque tâche ou examen qui approche (une seule fois chacun)
async function verifierRappels() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reglage = await db.reglages.get("rappels");
    if (!reglage || !reglage.valeur || !reglage.valeur.actif) return;
    const avance = (reglage.valeur.avance || 30) * 60000;
    const maintenant = Date.now();
    const deja = ((await db.reglages.get("rappelsEnvoyes")) || { valeur: [] }).valeur;
    const noms = new Map((await db.matieres.toArray()).map((m) => [m.id, m.nom]));
    const aEnvoyer = [];
    const verifier = (cle, jour, heure, titre, corps) => {
      const quand = new Date(jour + "T" + heure + ":00").getTime();
      if (maintenant >= quand - avance && maintenant <= quand + 30 * 60000 && !deja.includes(cle)) {
        aEnvoyer.push({ cle, titre, corps });
      }
    };
    (await db.taches.toArray()).forEach((t) => {
      if (!t.fait && t.echeance && t.heure) {
        verifier("t" + t.id + "@" + t.echeance + t.heure, t.echeance, t.heure, "Tâche à faire", t.titre + " · " + (noms.get(t.matiereId) || "") + " · " + t.heure);
      }
    });
    (await db.examens.toArray()).forEach((e) => {
      const heure = e.heure || "08:00";
      verifier("e" + e.id + "@" + e.date + heure, e.date, heure, "Examen à venir", (noms.get(e.matiereId) || "Examen") + (e.titre ? " · " + e.titre : "") + " · " + libelleEcheance(e.date, e.heure));
    });
    if (aEnvoyer.length) {
      aEnvoyer.forEach((r) => notifier(r.titre, r.corps, r.cle));
      await db.reglages.put({ cle: "rappelsEnvoyes", valeur: deja.concat(aEnvoyer.map((r) => r.cle)).slice(-200) });
    }
  } catch (erreur) {
    console.error("Rappels :", erreur);
  }
}
