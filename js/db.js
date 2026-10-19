// Base de données locale (stockée dans le téléphone, fonctionne hors ligne).
// "++id" = numéro automatique ; les autres noms sont les champs indexés (recherche rapide).
const db = new Dexie("planificateur");

// Version 1 : filières, matières, tâches, réglages
db.version(1).stores({
  filieres: "++id, nom",
  matieres: "++id, filiereId, nom",
  taches: "++id, matiereId, fait, echeance",
  reglages: "cle"
});

// Version 2 : examens, notes, documents (notes de cours et fichiers).
// Les données déjà enregistrées sont conservées automatiquement.
db.version(2).stores({
  examens: "++id, matiereId, date",
  notes: "++id, matiereId",
  documents: "++id, matiereId, type"
});
