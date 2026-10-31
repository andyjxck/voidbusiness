// Robust merge: insert translated keys into each language block in i18n.js
const fs = require('fs');

const langs = ['es','fr','de','it','pt','nl','pl','ru','uk','tr','ja','ko','zh','ar','hi','vi','th','sv','da','fi','no','cs','hu','ro','el','he','id','ms'];

let lines = fs.readFileSync('src/data/i18n.js', 'utf8').split('\n');

// Find line indices for each language block start and end
const blocks = {};
for (let i = 0; i < lines.length; i++) {
  for (const lang of langs) {
    if (lines[i] === `  ${lang}: {`) {
      // Find the closing '  },' for this block
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === '  },') {
          blocks[lang] = { start: i, end: j };
          break;
        }
      }
    }
  }
}

// Process in reverse order so line indices don't shift
const sortedLangs = langs.filter(l => blocks[l]).sort((a, b) => blocks[b].start - blocks[a].start);

for (const lang of sortedLangs) {
  const trans = JSON.parse(fs.readFileSync(`.translations/translated_${lang}.json`, 'utf8'));
  const { start, end } = blocks[lang];

  // Get existing keys in this block
  const existingKeys = new Set();
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(/^    ([a-zA-Z0-9_]+):/);
    if (m) existingKeys.add(m[1]);
  }

  // Build new lines for missing keys
  const newLines = [];
  for (const [k, v] of Object.entries(trans)) {
    if (!existingKeys.has(k)) {
      const esc = String(v).replace(/'/g, "\\'");
      newLines.push(`    ${k}: '${esc}',`);
    }
  }

  if (newLines.length > 0) {
    // Insert before the closing '  },'
    lines.splice(end, 0, ...newLines);
    console.log(`${lang}: added ${newLines.length} keys at line ${end}`);
  } else {
    console.log(`${lang}: no new keys`);
  }
}

fs.writeFileSync('src/data/i18n.js', lines.join('\n'));
console.log('Done.');
