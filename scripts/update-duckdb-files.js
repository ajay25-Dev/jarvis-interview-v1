const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../node_modules/@duckdb/duckdb-wasm/dist');
const destDir = path.join(__dirname, '../public/duckdb');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = [
  'duckdb-mvp.wasm',
  'duckdb-eh.wasm',
  'duckdb-browser-mvp.worker.js',
  'duckdb-browser-eh.worker.js',
];

files.forEach(file => {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to public/duckdb/`);
  } else {
    console.error(`Source file not found: ${src}`);
  }
});

console.log('DuckDB files updated successfully.');
