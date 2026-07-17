// build-visitor.js — genera la página del visitante servida, a partir del
// fuente legible.
//
//   index.src.html   ← EDITÁ ESTE (código moderno, legible)
//   index.html       ← generado: JS transpilado a ES5 (NO editar a mano)
//
// Por qué: la página del visitante la abre el teléfono de cualquiera, incluidos
// iPhones viejos. Un solo token que ese Safari no entienda tumba el archivo
// entero al parsearlo y la página queda clavada en "Cargando timbre...". Para
// blindarla se transpila a ES5 (objetivo IE11), que corre en todo.
//
// Uso:  cd visitor-web/tools && npm install && node build-visitor.js
//
// El vigía (bloque <script> corto, ya en ES5) NO se transpila: es la red de
// seguridad que debe correr aunque el resto falle.
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..', '..');           // raíz del repo
const SRC = path.join(ROOT, 'visitor-web', 'index.src.html');
const OUTS = [
  path.join(ROOT, 'visitor-web', 'index.html'),
  path.join(ROOT, 'backend', 'visitor-web', 'index.html'), // la que sirve server.js
];

const html = fs.readFileSync(SRC, 'utf8');

// Bloques <script>: el más largo es el principal; el resto (vigía) se deja igual.
const blocks = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) blocks.push({ full: m[0], code: m[1], index: m.index });
if (!blocks.length) throw new Error('No se encontró ningún <script> en index.src.html');
const main = blocks.reduce((a, b) => (b.code.length > a.code.length ? b : a));

const out = babel.transformSync(main.code, {
  presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]],
  babelrc: false, configFile: false, comments: false, compact: false,
});
if (!out || !out.code) throw new Error('Babel no devolvió código');

const regenerator = fs.readFileSync(
  path.join(__dirname, 'node_modules', 'regenerator-runtime', 'runtime.js'), 'utf8'
);

const nuevoScript =
  '<script>\n/* regenerator-runtime (async/await en Safari viejo) */\n' + regenerator +
  '\n</script>\n  <script>\n/* GENERADO desde index.src.html por tools/build-visitor.js — NO editar */\n' +
  out.code + '\n</script>';

const generado = html.slice(0, main.index) + nuevoScript + html.slice(main.index + main.full.length);

// Sanidad: que no haya quedado sintaxis moderna en el código transpilado.
const soloCodigo = out.code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const moderno = [['optional chaining', /[)\]\w]\?\./], ['arrow', /=>/], ['template literal', /`/], ['const/let', /\b(const|let)\b/]];
const malas = moderno.filter(([, r]) => r.test(soloCodigo)).map(([n]) => n);
if (malas.length) throw new Error('Quedó sintaxis moderna sin transpilar: ' + malas.join(', '));

for (const o of OUTS) { fs.writeFileSync(o, generado, 'utf8'); console.log('✓', path.relative(ROOT, o)); }
console.log('OK — ES5 puro, ' + generado.length + ' bytes');
