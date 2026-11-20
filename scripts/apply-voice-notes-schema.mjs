import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  }
}

loadEnvLocal();

const connectionString = process.env.AZURE_POSTGRES_URL;
if (!connectionString) {
  console.error('AZURE_POSTGRES_URL not found in environment');
  process.exit(1);
}

function getClientConfig(connStr) {
  const match = connStr.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/);
  if (match) {
    const [, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
    };
  }
  return { connectionString: connStr };
}

async function run() {
  const clientConfig = getClientConfig(connectionString);
  const client = new Client({
    ...clientConfig,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Azure PostgreSQL successfully.');

  const sqlPath = path.resolve(process.cwd(), 'azure/AZURE_02_voice_notes.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying azure/AZURE_02_voice_notes.sql...');
  await client.query(sql);
  console.log('Schema applied successfully.');

  const verifyQuery = `
    select
      t.tablename,
      i.indexname
    from pg_tables t
    left join pg_indexes i on i.schemaname = t.schemaname and i.tablename = t.tablename
    where t.schemaname = 'public' and t.tablename = 'voice_notes';
  `;

  const res = await client.query(verifyQuery);
  console.log('Verification results:');
  console.table(res.rows);

  const colQuery = `
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'voice_notes'
    order by ordinal_position;
  `;
  const cols = await client.query(colQuery);
  console.log('Columns:');
  console.table(cols.rows);

  await client.end();
}

run().catch((err) => {
  console.error('Error applying schema:', err);
  process.exit(1);
});
