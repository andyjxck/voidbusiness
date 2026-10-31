// Update existing translation keys in i18n.js with new translated values
const fs = require('fs');

const langs = ['es','fr','de','it','pt','nl','pl','ru','uk','tr','ja','ko','zh','ar','hi','vi','th','sv','da','fi','no','cs','hu','ro','el','he','id','ms'];

let lines = fs.readFileSync('src/data/i18n.js', 'utf8').split('\n');

// Find line indices for each language block
const blocks = {};
for (let i = 0; i < lines.length; i++) {
  for (const lang of langs) {
    if (lines[i] === `  ${lang}: {`) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === '  },') {
          blocks[lang] = { start: i, end: j };
          break;
        }
      }
    }
  }
}

// For each language, update existing keys with new translations
for (const lang of langs) {
  if (!blocks[lang]) { console.log(`${lang}: block not found`); continue; }
  const trans = JSON.parse(fs.readFileSync(`.translations/translated_${lang}.json`, 'utf8'));
  const { start, end } = blocks[lang];
  let updated = 0;

  // Build a map of key -> line index within this block
  const keyLines = {};
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(/^    ([a-zA-Z0-9_]+):/);
    if (m) keyLines[m[1]] = i;
  }

  // Update each key
  for (const [k, v] of Object.entries(trans)) {
    if (keyLines[k] !== undefined) {
      const esc = String(v).replace(/'/g, "\\'");
      const newLine = `    ${k}: '${esc}',`;
      if (lines[keyLines[k]] !== newLine) {
        lines[keyLines[k]] = newLine;
        updated++;
      }
    }
  }
  console.log(`${lang}: updated ${updated} keys`);
}

fs.writeFileSync('src/data/i18n.js', lines.join('\n'));
console.log('Done.');
