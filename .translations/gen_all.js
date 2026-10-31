// Generate translations for all 28 languages from missing_*.json files.
// Approach: word-level translation dictionaries + phrase patterns.
// Proper nouns (luxury items, vehicles, places) stay as-is or get transliterated.
const fs = require('fs');
const path = require('path');

const missing = JSON.parse(fs.readFileSync(path.join(__dirname, 'missing_es.json'), 'utf8'));
const keys = Object.keys(missing);

// ─── Translation dictionaries per language ───
// Common words that appear across many keys
const DICTS = {
  es: {
    // UI labels
    'ON THE LOT': 'EN EL LOTE', 'Maxed': 'Al máximo', 'Phase': 'Fase',
    'Locked': 'Bloqueado', 'OPENING': 'ABRIENDO', 'SETUP': 'CONFIGURAR',
    'READY': 'LISTO', 'Your Branch': 'Tu Sucursal', 'Your Store': 'Tu Tienda',
    'AVG SKILL': 'HAB. MEDIA', 'MEMBERS': 'MIEMBROS', 'SALARY/HR': 'SALARIO/H',
    'Requires': 'Requiere', 'items': 'artículos', 'menu': 'menú',
    'Tap here to continue.': 'Toca aquí para continuar.',
    'Go to the': 'Ve a la pestaña', 'tab': '',
    'Needs Maintenance': 'Necesita mantenimiento',
    'No Driver Assigned': 'Sin conductor asignado',
    'In Transit': 'En tránsito', 'PENDING HIRES': 'CONTRATACIONES PENDIENTES',
    'Buy': 'Comprar', 'Upgrade': 'Mejorar', 'mi': 'mi',
    'GROUNDED': 'EN TIERRA', 'RUNNING': 'EN MARCHA', 'SUSPENDED': 'SUSPENDIDO',
    'Resume': 'Reanudar', 'Pay': 'Pagar', 'Fully Upgraded': 'Completamente mejorado',
    'Send to Maintenance': 'Enviar a mantenimiento',
    'Done': 'Hecho', 'Unassign': 'Desasignar',
    'SKILL': 'HABILIDAD', 'RATING': 'VALORACIÓN',
    'Train': 'Entrenar', 'Raise': 'Aumentar salario',
    'Slots Full': 'Cupos llenos', 'Garage Full': 'Garaje lleno',
    'District Required': 'Distrito requerido',
    'Missing Materials': 'Materiales faltantes',
    'Start Construction': 'Iniciar construcción',
    'Accept Contract': 'Aceptar contrato',
    'Too Expensive': 'Muy caro',
    'Need Bus License': 'Necesita licencia de bus',
    'Open Branch': 'Abrir sucursal', 'Open Store': 'Abrir tienda',
    'Need': 'Necesitas', 'staff': 'personal', 'Available Staff': 'personal disponible',
    'Free Staff': 'personal libre', 'releases': 'estrenos',
    'avg rating': 'puntuación media', 'Unlock at Level': 'Desbloquear en nivel',
    'Buy Insurance': 'Comprar seguro', 'day': 'día',
    'Open': 'Abrir', 'Branch': 'Sucursal', 'more': 'más',
    'Operational': 'Operativa', 'Opening...': 'Abriendo...',
    'Needs Setup': 'Necesita configuración',
    'Cafe': 'Cafetería', 'Store': 'Tienda',
    'Scrap Risk': 'Riesgo de chatarra', 'Safe to maintain': 'Seguro para mantener',
    'Low risk': 'Riesgo bajo', 'Moderate risk': 'Riesgo moderado',
    'High risk!': '¡Riesgo alto!',
    'Vault Lvl': 'Nivel de bóveda', 'Upgrading...': 'Mejorando...',
    'Free': 'Gratis', 'New Hire': 'Nueva contratación',
    'Buy Supplies First': 'Compra suministros primero',
    'Buy Stock First': 'Compra existencias primero',
    'Requirements Not Met': 'Requisitos no cumplidos',
    'Add Staff': 'Añadir personal', 'Enter Quantity': 'Introduce cantidad',
    'Order': 'Pedir', 'Unknown': 'Desconocido',
    'Studio Full': 'Estudio lleno',
    'Start Development': 'Iniciar desarrollo',
    'Start Production': 'Iniciar producción',
    'Select all options': 'Selecciona todas las opciones',
    'No Driver Assigned': 'Sin conductor asignado',
    'Unknown error': 'Error desconocido',
    'Your Dealership': 'Tu Concesionario',
    'Owned': 'Propiedad', 'None': 'Ninguno',
    'Assign Staff First': 'Asigna personal primero',
    'Game Expired': 'Juego expirado', 'Movie Expired': 'Película expirada',
    'Market': 'Marketing', 'Game': 'Juego', 'Movie': 'Película',
    'Your game': 'Tu juego', 'Your movie': 'Tu película',
    'Maint.': 'Mant.', 'Active': 'Activa',
    'Bus': 'Autobús', 'Driver': 'Conductor', 'the bus': 'el autobús',
    'Vehicle': 'Vehículo', 'the vehicle': 'el vehículo',
    'was beyond repair': 'estaba más allá de reparación',
    'Insurance paid out': 'El seguro pagó',
    'You salvaged': 'Recuperaste',
    'new driver(s) joined!': 'nuevo(s) conductor(es) se unieron!',
    'requires': 'requiere', 'available staff': 'personal disponible',
    'you have': 'tienes', 'staff': 'personal',
    'Open a store in': 'Abre una tienda en', 'first.': 'primero.',
    'Unlock requirement not met.': 'Requisito de desbloqueo no cumplido.',
  },
  fr: {
    'ON THE LOT': 'SUR LE LOT', 'Maxed': 'Max', 'Phase': 'Phase',
    'Locked': 'Verrouillé', 'OPENING': 'OUVERTURE', 'SETUP': 'CONFIG',
    'READY': 'PRÊT', 'Your Branch': 'Votre Succursale', 'Your Store': 'Votre Boutique',
    'AVG SKILL': 'COMP. MOY', 'MEMBERS': 'MEMBRES', 'SALARY/HR': 'SALAIRE/H',
    'Requires': 'Requiert', 'items': 'articles', 'menu': 'menu',
    'Tap here to continue.': 'Touchez ici pour continuer.',
    'Go to the': 'Allez à l\'onglet', 'tab': '',
    'Needs Maintenance': 'Besoin d\'entretien',
    'No Driver Assigned': 'Pas de conducteur assigné',
    'In Transit': 'En transit', 'PENDING HIRES': 'EMBAUCHES EN ATTENTE',
    'Buy': 'Acheter', 'Upgrade': 'Améliorer', 'mi': 'mi',
    'GROUNDED': 'AU SOL', 'RUNNING': 'EN MARCHE', 'SUSPENDED': 'SUSPENDU',
    'Resume': 'Reprendre', 'Pay': 'Payer', 'Fully Upgraded': 'Totalement amélioré',
    'Send to Maintenance': 'Envoyer à l\'entretien',
    'Done': 'Terminé', 'Unassign': 'Désassigner',
    'SKILL': 'COMPÉTENCE', 'RATING': 'ÉVALUATION',
    'Train': 'Former', 'Raise': 'Augmenter',
    'Slots Full': 'Places pleines', 'Garage Full': 'Garage plein',
    'District Required': 'District requis',
    'Missing Materials': 'Matériaux manquants',
    'Start Construction': 'Commencer la construction',
    'Accept Contract': 'Accepter le contrat',
    'Too Expensive': 'Trop cher',
    'Need Bus License': 'Permis de bus requis',
    'Open Branch': 'Ouvrir succursale', 'Open Store': 'Ouvrir boutique',
    'Need': 'Besoin de', 'staff': 'personnel', 'Available Staff': 'personnel disponible',
    'Free Staff': 'personnel libre', 'releases': 'sorties',
    'avg rating': 'note moyenne', 'Unlock at Level': 'Débloquer au niveau',
    'Buy Insurance': 'Acheter assurance', 'day': 'jour',
    'Open': 'Ouvrir', 'Branch': 'Succursale', 'more': 'plus',
    'Operational': 'Opérationnel', 'Opening...': 'Ouverture...',
    'Needs Setup': 'Configuration requise',
    'Cafe': 'Café', 'Store': 'Boutique',
    'Scrap Risk': 'Risque de casse', 'Safe to maintain': 'Sûr à entretenir',
    'Low risk': 'Risque faible', 'Moderate risk': 'Risque modéré',
    'High risk!': 'Risque élevé!',
    'Vault Lvl': 'Niveau coffre', 'Upgrading...': 'Amélioration...',
    'Free': 'Gratuit', 'New Hire': 'Nouvel employé',
    'Buy Supplies First': 'Achetez d\'abord des fournitures',
    'Buy Stock First': 'Achetez d\'abord du stock',
    'Requirements Not Met': 'Exigences non remplies',
    'Add Staff': 'Ajouter du personnel', 'Enter Quantity': 'Entrez la quantité',
    'Order': 'Commander', 'Unknown': 'Inconnu',
    'Studio Full': 'Studio plein',
    'Start Development': 'Commencer le développement',
    'Start Production': 'Commencer la production',
    'Select all options': 'Sélectionnez toutes les options',
    'No Driver Assigned': 'Pas de conducteur assigné',
    'Unknown error': 'Erreur inconnue',
    'Your Dealership': 'Votre Concession',
    'Owned': 'Possédé', 'None': 'Aucun',
    'Assign Staff First': 'Assignez d\'abord le personnel',
    'Game Expired': 'Jeu expiré', 'Movie Expired': 'Film expiré',
    'Market': 'Marketing', 'Game': 'Jeu', 'Movie': 'Film',
    'Your game': 'Votre jeu', 'Your movie': 'Votre film',
    'Maint.': 'Entret.', 'Active': 'Actif',
    'Bus': 'Bus', 'Driver': 'Conducteur', 'the bus': 'le bus',
    'Vehicle': 'Véhicule', 'the vehicle': 'le véhicule',
    'was beyond repair': 'était irréparable',
    'Insurance paid out': 'L\'assurance a payé',
    'You salvaged': 'Vous avez récupéré',
    'new driver(s) joined!': 'nouveau(x) conducteur(s) rejoint(s)!',
    'requires': 'requiert', 'available staff': 'personnel disponible',
    'you have': 'vous avez',
    'Open a store in': 'Ouvrez une boutique à', 'first.': 'd\'abord.',
    'Unlock requirement not met.': 'Exigence de déblocage non remplie.',
  },
  de: {
    'ON THE LOT': 'AUF DEM HOF', 'Maxed': 'Max', 'Phase': 'Phase',
    'Locked': 'Gesperrt', 'OPENING': 'ERÖFFNUNG', 'SETUP': 'EINRICHTEN',
    'READY': 'BEREIT', 'Your Branch': 'Ihre Filiale', 'Your Store': 'Ihr Geschäft',
    'AVG SKILL': 'Ø FÄHIGK.', 'MEMBERS': 'MITGLIEDER', 'SALARY/HR': 'GEHALT/STD',
    'Requires': 'Erfordert', 'items': 'Artikel', 'menu': 'Menü',
    'Tap here to continue.': 'Hier tippen zum Fortfahren.',
    'Go to the': 'Gehen Sie zum', 'tab': 'Tab',
    'Needs Maintenance': 'Wartung erforderlich',
    'No Driver Assigned': 'Kein Fahrer zugewiesen',
    'In Transit': 'Unterwegs', 'PENDING HIRES': 'AUSSTEHENDE EINSTELLUNGEN',
    'Buy': 'Kaufen', 'Upgrade': 'Verbessern', 'mi': 'mi',
    'GROUNDED': 'GEGROUNDET', 'RUNNING': 'IN BETRIEB', 'SUSPENDED': 'SUSPENDIERT',
    'Resume': 'Fortsetzen', 'Pay': 'Zahlen', 'Fully Upgraded': 'Vollständig verbessert',
    'Send to Maintenance': 'Zur Wartung senden',
    'Done': 'Fertig', 'Unassign': 'Zuweisung aufheben',
    'SKILL': 'FÄHIGKEIT', 'RATING': 'BEWERTUNG',
    'Train': 'Schulen', 'Raise': 'Gehalt erhöhen',
    'Slots Full': 'Plätze voll', 'Garage Full': 'Garage voll',
    'District Required': 'Bezirk erforderlich',
    'Missing Materials': 'Fehlende Materialien',
    'Start Construction': 'Bau beginnen',
    'Accept Contract': 'Vertrag annehmen',
    'Too Expensive': 'Zu teuer',
    'Need Bus License': 'Buslizenz erforderlich',
    'Open Branch': 'Filiale eröffnen', 'Open Store': 'Geschäft eröffnen',
    'Need': 'Brauchen', 'staff': 'Personal', 'Available Staff': 'verfügbares Personal',
    'Free Staff': 'freies Personal', 'releases': 'Veröffentlichungen',
    'avg rating': 'Ø Bewertung', 'Unlock at Level': 'Freischalten ab Level',
    'Buy Insurance': 'Versicherung kaufen', 'day': 'Tag',
    'Open': 'Öffnen', 'Branch': 'Filiale', 'more': 'mehr',
    'Operational': 'In Betrieb', 'Opening...': 'Eröffnung...',
    'Needs Setup': 'Einrichtung nötig',
    'Cafe': 'Café', 'Store': 'Geschäft',
    'Scrap Risk': 'Schrottrisiko', 'Safe to maintain': 'Sicher zu warten',
    'Low risk': 'Niedriges Risiko', 'Moderate risk': 'Mittleres Risiko',
    'High risk!': 'Hohes Risiko!',
    'Vault Lvl': 'Gewölbe-Lvl', 'Upgrading...': 'Verbesserung...',
    'Free': 'Kostenlos', 'New Hire': 'Neue Einstellung',
    'Buy Supplies First': 'Zuerst Vorräte kaufen',
    'Buy Stock First': 'Zuerst Bestand kaufen',
    'Requirements Not Met': 'Anforderungen nicht erfüllt',
    'Add Staff': 'Personal hinzufügen', 'Enter Quantity': 'Menge eingeben',
    'Order': 'Bestellen', 'Unknown': 'Unbekannt',
    'Studio Full': 'Studio voll',
    'Start Development': 'Entwicklung beginnen',
    'Start Production': 'Produktion beginnen',
    'Select all options': 'Alle Optionen auswählen',
    'No Driver Assigned': 'Kein Fahrer zugewiesen',
    'Unknown error': 'Unbekannter Fehler',
    'Your Dealership': 'Ihr Autohaus',
    'Owned': 'Besitzt', 'None': 'Keine',
    'Assign Staff First': 'Zuerst Personal zuweisen',
    'Game Expired': 'Spiel abgelaufen', 'Movie Expired': 'Film abgelaufen',
    'Market': 'Marketing', 'Game': 'Spiel', 'Movie': 'Film',
    'Your game': 'Ihr Spiel', 'Your movie': 'Ihr Film',
    'Maint.': 'Wart.', 'Active': 'Aktiv',
    'Bus': 'Bus', 'Driver': 'Fahrer', 'the bus': 'der Bus',
    'Vehicle': 'Fahrzeug', 'the vehicle': 'das Fahrzeug',
    'was beyond repair': 'war irreparabel',
    'Insurance paid out': 'Versicherung zahlte',
    'You salvaged': 'Sie haben gerettet',
    'new driver(s) joined!': 'neue(r) Fahrer beigetreten!',
    'requires': 'erfordert', 'available staff': 'verfügbares Personal',
    'you have': 'Sie haben',
    'Open a store in': 'Geschäft eröffnen in', 'first.': 'zuerst.',
    'Unlock requirement not met.': 'Freischaltungsanforderung nicht erfüllt.',
  },
};

// For languages not yet in DICTS, use English as fallback (will be replaced)
const LANGS = ['es','fr','de','it','pt','nl','pl','ru','uk','tr','ja','ko','zh','ar','hi','vi','th','sv','da','fi','no','cs','hu','ro','el','he','id','ms'];

// Generate translation for a single key-value pair
function translate(value, dict) {
  let result = value;
  // Sort by length descending so longer phrases match first
  const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  for (const [en, tr] of entries) {
    if (en === '') continue;
    // Use global replace, case-sensitive for exact phrases
    result = result.split(en).join(tr);
  }
  return result;
}

// For now, only es, fr, de have dictionaries. Others will use English fallback.
// We'll generate files for all languages; those without dicts get English values.
for (const lang of LANGS) {
  const dict = DICTS[lang] || {};
  const translated = {};
  for (const k of keys) {
    if (Object.keys(dict).length > 0) {
      translated[k] = translate(missing[k], dict);
    } else {
      translated[k] = missing[k]; // fallback to English
    }
  }
  fs.writeFileSync(path.join(__dirname, `translated_${lang}.json`), JSON.stringify(translated, null, 2));
  console.log(`${lang}: ${Object.keys(translated).length} keys`);
}
console.log('Done.');
