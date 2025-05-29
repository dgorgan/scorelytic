const { Client } = require('pg');
const { execSync } = require('child_process');

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL env var not set');
  process.exit(1);
}

const [, , table, column] = process.argv;
if (!table || !column) {
  console.error('Usage: node scripts/check-and-migrate.js <table> <column>');
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });

(async () => {
  try {
    await client.connect();
    const res = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      [table, column],
    );
    if (res.rows.length > 0) {
      console.log(`Column ${column} already exists in ${table}. No migration needed.`);
      process.exit(0);
    } else {
      console.log(`Column ${column} does not exist in ${table}. Running migrations...`);
      execSync('supabase db push', { stdio: 'inherit' });
      process.exit(0);
    }
  } catch (err) {
    console.error('Error checking or running migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
