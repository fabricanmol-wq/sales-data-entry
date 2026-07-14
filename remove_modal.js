const fs = require('fs');
const file = 'src/main/resources/static/app.html';
const lines = fs.readFileSync(file, 'utf8').split('\n');
lines.splice(1098, 48);
fs.writeFileSync(file, lines.join('\n'));
console.log('Removed old ledger modal');
