// Usage: node apply.js <lang> <json_file>
// Updates keys in the specified language block of i18n.js
const fs = require('fs');
const lang = process.argv[2];
const file = process.argv[3];
if (!lang || !file) { console.log('Usage: node apply.js <lang> <json_file>'); process.exit(1); }

const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
let lines = fs.readFileSync('src/data/i18n.js', 'utf8').split('\n');

let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === `  ${lang}: {`) { start = i; break; }
}
if (start === -1) { console.log(`Language ${lang} not found`); process.exit(1); }

let end = -1;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i] === '  },') { end = i; break; }
}

const keyLines = {};
for (let i = start + 1; i < end; i++) {
  const m = lines[i].match(/^    ([a-zA-Z0-9_]+):/);
  if (m) keyLines[m[1]] = i;
}

let updated = 0;
for (const [k, v] of Object.entries(translations)) {
  if (keyLines[k] !== undefined) {
    const esc = String(v).replace(/'/g, "\\'");
    lines[keyLines[k]] = `    ${k}: '${esc}',`;
    updated++;
  }
}

fs.writeFileSync('src/data/i18n.js', lines.join('\n'));
console.log(`${lang}: updated ${updated} keys from ${file}`);
