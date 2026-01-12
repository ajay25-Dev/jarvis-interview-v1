
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// We need to read .env.local to get the keys
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');

try {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.log('No .env.local found or error reading it');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = [
    'interview_practice_questions',
    'interview_practice_answers',
    'interview_practice_datasets',
    'interview_practice_test_cases'
  ];

  for (const table of tables) {
    console.log(`Checking ${table}...`);
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      console.log(`${table} exists.`);
    }
  }
}

checkTables();
