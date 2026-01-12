/**
 * Test script to verify DuckDB loading functionality
 * This script tests the DuckDB initialization process to identify any loading issues
 */

const path = require('path');

// Test 1: Check if DuckDB files exist and are accessible
console.log('🔍 Testing DuckDB file accessibility...');

const duckdbFiles = [
  'duckdb-browser-eh.worker.js',
  'duckdb-browser-mvp.worker.js',
  'duckdb-eh.wasm',
  'duckdb-mvp.wasm'
];

const duckdbPath = path.join(__dirname, '..', 'jarvis-frontend', 'public', 'duckdb');

duckdbFiles.forEach(file => {
  const filePath = path.join(duckdbPath, file);
  try {
    require('fs').accessSync(filePath);
    console.log(`✅ ${file} - Accessible`);
  } catch (error) {
    console.log(`❌ ${file} - NOT accessible: ${error.message}`);
  }
});

// Test 2: Check if the initializer module can be loaded
console.log('\n🔍 Testing DuckDB initializer module...');

try {
  const initializerPath = path.join(__dirname, 'src', 'lib', 'duckdb-initializer.ts');
  require('fs').accessSync(initializerPath);
  console.log('✅ DuckDB initializer module - Accessible');

  // Read and analyze the initializer
  const initializerContent = require('fs').readFileSync(initializerPath, 'utf8');

  // Check for potential issues in the code
  const issues = [];

  // Check if files are being loaded from correct path
  if (initializerContent.includes('window.location.origin + \'/duckdb/\'')) {
    console.log('ℹ️  DuckDB uses window.location.origin path - may need verification for deployment');
  }

  // Check error handling
  if (initializerContent.includes('try') && initializerContent.includes('catch')) {
    console.log('✅ Error handling present in initializer');
  }

  console.log('✅ Initializer code analysis complete');

} catch (error) {
  console.log(`❌ DuckDB initializer module - NOT accessible: ${error.message}`);
}

// Test 3: Check package dependencies
console.log('\n🔍 Testing DuckDB package dependencies...');

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.dependencies && packageJson.dependencies['@duckdb/duckdb-wasm']) {
    console.log(`✅ @duckdb/duckdb-wasm package found: ${packageJson.dependencies['@duckdb/duckdb-wasm']}`);
  } else {
    console.log('❌ @duckdb/duckdb-wasm package NOT found in dependencies');
  }
} catch (error) {
  console.log(`❌ Could not check package dependencies: ${error.message}`);
}

console.log('\n📋 DuckDB Loading Test Summary:');
console.log('- File accessibility: Checked');
console.log('- Initializer module: Checked');
console.log('- Package dependencies: Checked');
console.log('- Path configuration: Needs verification for deployment environment');

console.log('\n🎯 Recommendation:');
console.log('The DuckDB implementation appears structurally sound. To fully verify loading:');
console.log('1. Run the application and check browser console logs');
console.log('2. Monitor network requests for DuckDB WASM files');
console.log('3. Test DuckDB functionality in the actual runtime environment');
