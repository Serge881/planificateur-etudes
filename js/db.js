// Base de données locale (stockée dans le téléphone, fonctionne hors ligne).
// Chaque ligne de "stores" décrit une table : "++id" = numéro automatique,
// les autres noms sont les champs sur lesquels on pourra rechercher vite.
const db = new Dexie("planificateur");

db.version(1).stores({
  filieres: "++id, nom",                         // parcours d'études de l'utilisateur
  matieres: "++id, filiereId, nom",              // matières, rattachées à une filière
  taches: "++id, matiereId, fait, echeance",     // tâches (utilisées à l'étape suivante)
  reglages: "cle"                                // réglages : filière active, thème...
});
