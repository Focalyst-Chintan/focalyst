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
  try {
    const parsed = new URL(connStr);
    if (!parsed.hostname.includes('.postgres.database.azure.com')) {
      throw new Error('Ambiguous host');
    }
    return { connectionString: connStr };
  } catch {
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
}

async function run() {
  const clientConfig = getClientConfig(connectionString);
  const client = new Client({
    ...clientConfig,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Azure PostgreSQL successfully.');

  const sqlPath = path.resolve(process.cwd(), 'azure/AZURE_01_blog_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying azure/AZURE_01_blog_schema.sql...');
  await client.query(sql);
  console.log('Schema applied successfully.');

  const verifyQuery = `
    select 'blog tables' as item, count(*)::text as value from pg_tables
     where schemaname = 'public' and tablename in ('blog_posts','blog_config','blog_features','blog_topics','blog_jobs','blog_model_events','blog_feeds','blog_log')
    union all
    select 'functions', count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('blog_enqueue_daily','blog_claim_job','blog_similar_titles')
    union all
    select 'features', count(*)::text from public.blog_features
    union all
    select 'topics', count(*)::text from public.blog_topics
    union all
    select 'feeds', count(*)::text from public.blog_feeds;
  `;

  const res = await client.query(verifyQuery);
  console.log('Verification results:');
  console.table(res.rows);

  await client.end();
}

run().catch((err) => {
  console.error('Error applying schema:', err);
  process.exit(1);
});
