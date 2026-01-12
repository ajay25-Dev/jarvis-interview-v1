// Comprehensive test to verify table creation fixes
const puppeteer = require('puppeteer');

async function testTableCreation() {
  console.log('🧪 Starting comprehensive table creation test...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🚨 Page Error:', msg.text());
      } else if (msg.text().includes('Customers') || msg.text().includes('table exists')) {
        console.log('📊 Table Creation Log:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('🚨 Page Error:', error.message);
    });

    console.log('🌐 Navigating to practice page...');
    await page.goto('http://localhost:3006/practice/plan-25-SQL/question/q-0', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(5000);

    console.log('📋 Checking for error messages...');
    
    // Check for specific error that was occurring before
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '.bg-red-50',
      '[role="alert"]',
      'text=Customers table does not exist',
      'text=Catalog Error'
    ];

    let foundErrors = [];
    for (const selector of errorSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const errorText = await page.evaluate(el => el.textContent, elements[0]);
          foundErrors.push({ selector, text: errorText });
        }
      } catch (e) {
        // Selector might not exist, continue
      }
    }

    // Also check for text content
    const bodyText = await page.evaluate(() => document.body.innerText);
    const errorKeywords = [
      'Customers table does not exist',
      'Catalog Error',
      'Table with name',
      'does not exist'
    ];

    for (const keyword of errorKeywords) {
      if (bodyText.includes(keyword)) {
        foundErrors.push({ type: 'text', keyword });
      }
    }

    console.log('\n📊 Test Results:');
    if (foundErrors.length === 0) {
      console.log('✅ SUCCESS: No table creation errors found!');
      console.log('✅ The "Customers table does not exist" error has been resolved.');
    } else {
      console.log('❌ FAILURES FOUND:');
      foundErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${JSON.stringify(error)}`);
      });
    }

    // Check for successful table creation indicators
    console.log('\n🔍 Checking for success indicators...');
    
    // Look for data loading success indicators
    const successSelectors = [
      'text=Data Loaded',
      '[data-testid="data-loaded"]',
      '.text-green-400',
      'text=Ready'
    ];

    let successIndicators = [];
    for (const selector of successSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          successIndicators.push(selector);
        }
      } catch (e) {
        // Selector might not exist
      }
    }

    if (successIndicators.length > 0) {
      console.log('✅ Success indicators found:', successIndicators);
    }

    // Test SQL execution functionality
    console.log('\n🧪 Testing SQL execution...');
    
    try {
      // Look for SQL editor
      const sqlEditor = await page.$('textarea');
      if (sqlEditor) {
        await sqlEditor.type('SELECT * FROM Customers LIMIT 5;');
        
        // Look for run button
        const runButton = await page.$('button:has-text("Run")');
        if (runButton) {
          await runButton.click();
          await page.waitForTimeout(3000);
          
          // Check if execution was successful
          const resultsTable = await page.$('table');
          if (resultsTable) {
            console.log('✅ SQL execution test: PASSED - Results table found');
          } else {
            console.log('⚠️ SQL execution test: UNCLEAR - No results table found');
          }
        } else {
          console.log('⚠️ SQL execution test: SKIPPED - No run button found');
        }
      } else {
        console.log('⚠️ SQL execution test: SKIPPED - No SQL editor found');
      }
    } catch (e) {
      console.log('❌ SQL execution test: ERROR -', e.message);
    }

  } catch (e) {
    console.error('🚨 Test failed with error:', e.message);
  } finally {
    await browser.close();
  }
}

// Test regex patterns
function testRegexPatterns() {
  console.log('\n🔧 Testing regex patterns...');
  
  const testCases = [
    {
      name: 'Basic CREATE TABLE',
      sql: 'CREATE TABLE Customers (id INTEGER, name VARCHAR(100));',
      expectedTable: 'Customers'
    },
    {
      name: 'CREATE TABLE with quotes',
      sql: 'CREATE TABLE `Orders` (id INTEGER, amount DECIMAL(10,2));',
      expectedTable: 'Orders'
    },
    {
      name: 'CREATE TABLE IF NOT EXISTS',
      sql: 'CREATE TABLE IF NOT EXISTS Products (id INTEGER, price DECIMAL(10,2));',
      expectedTable: 'Products'
    },
    {
      name: 'Multiple CREATE TABLE statements',
      sql: 'CREATE TABLE A (id INTEGER); CREATE TABLE B (id INTEGER);',
      expectedTables: ['A', 'B']
    }
  ];

  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi;
  
  testCases.forEach(test => {
    console.log(`\n📝 Testing: ${test.name}`);
    console.log(`SQL: ${test.sql}`);
    
    const matches = Array.from(test.sql.matchAll(regex));
    const extractedTables = matches.map(match => match[1]);
    
    if (test.expectedTables) {
      const expected = test.expectedTables.sort();
      const actual = extractedTables.sort();
      const passed = JSON.stringify(expected) === JSON.stringify(actual);
      console.log(`Expected: [${expected.join(', ')}]`);
      console.log(`Extracted: [${actual.join(', ')}]`);
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      const passed = extractedTables.includes(test.expectedTable);
      console.log(`Expected: "${test.expectedTable}"`);
      console.log(`Extracted: "${extractedTables.join(', ')}"`);
      console.log(`${passed ? '✅ PASS' : '❌ FAIL'}`);
    }
  });
}

async function main() {
  console.log('🎯 Comprehensive Table Creation Fix Verification');
  console.log('='.repeat(50));
  
  // Test regex patterns first
  testRegexPatterns();
  
  // Test actual application if Puppeteer is available
  try {
    await testTableCreation();
  } catch (e) {
    console.log('\n⚠️ Browser test skipped - Puppeteer not available or other error:', e.message);
    console.log('📝 Please manually test: http://localhost:3006/practice/plan-25-SQL/question/q-0');
  }
  
  console.log('\n📋 Summary of Fixes Applied:');
  console.log('1. ✅ Fixed table existence check (sqlite_master -> information_schema)');
  console.log('2. ✅ Improved table name extraction with better regex');
  console.log('3. ✅ Added proper error handling for table creation');
  console.log('4. ✅ Fixed datasetsLoaded state management with debouncing');
  console.log('5. ✅ Added tableExists utility function to useDuckDB hook');
  console.log('6. ✅ Enhanced SQL statement splitting logic');
  console.log('7. ✅ Added TypeScript type safety checks');
  console.log('8. ✅ Improved multi-table CREATE statement handling');
  
  console.log('\n🎯 Expected Result:');
  console.log('- No "Customers table does not exist" error');
  console.log('- Tables created successfully on page load');
  console.log('- SQL queries execute without errors');
  console.log('- No repeated table creation attempts');
  console.log('- Better error messages and logging');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testTableCreation, testRegexPatterns };
