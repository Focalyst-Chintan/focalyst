import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';

function loadEnv() {
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

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.AZURE_POSTGRES_URL;
const storageConnStr = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
if (!postgresUrl) {
  console.error('Missing AZURE_POSTGRES_URL in .env.local');
  process.exit(1);
}
if (!storageConnStr) {
  console.error('Missing AZURE_STORAGE_CONNECTION_STRING in .env.local');
  process.exit(1);
}

function getClientConfig(connStr: string) {
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

async function migrate() {
  console.log('--- Starting Voice Notes Migration: Supabase -> Azure ---');

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const clientConfig = getClientConfig(postgresUrl!);
  const pgClient = new Client({
    ...clientConfig,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();
  console.log('✓ Connected to Azure Database for PostgreSQL');

  const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnStr!);
  const containerClient = blobServiceClient.getContainerClient('voice-notes');
  await containerClient.createIfNotExists();
  console.log('✓ Connected to Azure Blob Storage (container: voice-notes)');

  let migratedFromVoiceNotesTable = 0;
  let migratedFromNotesTable = 0;
  let audioFilesMigrated = 0;

  // 1. Migrate rows from Supabase `voice_notes` table if any exist
  try {
    const { data: vnRows, error: vnErr } = await supabase.from('voice_notes').select('*');
    if (vnErr) {
      console.warn('Notice querying Supabase voice_notes table:', vnErr.message);
    } else if (vnRows && vnRows.length > 0) {
      console.log(`Found ${vnRows.length} rows in Supabase voice_notes table. Migrating...`);
      for (const row of vnRows) {
        let audioBlobUrl = row.audio_blob_url || null;

        // Migrate audio if present in Supabase Storage
        if (row.audio_url && row.audio_url.includes('supabase.co/storage')) {
          try {
            const ext = row.audio_url.split('.').pop()?.split('?')[0] || 'm4a';
            const blobName = `${row.user_id}/${row.id}.${ext}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            const res = await fetch(row.audio_url);
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              await blockBlobClient.upload(buffer, buffer.length);
              audioBlobUrl = blockBlobClient.url;
              audioFilesMigrated++;
            }
          } catch (audioErr: any) {
            console.warn(`Could not transfer audio file for ${row.id}:`, audioErr.message);
          }
        }

        const upsertQuery = `
          insert into public.voice_notes (
            id, user_id, title, audio_blob_url, audio_url, duration_seconds,
            transcript, raw_transcript, summary, extracted_tasks, local_uri, created_at, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          on conflict (id) do update set
            title = excluded.title,
            audio_blob_url = coalesce(excluded.audio_blob_url, voice_notes.audio_blob_url),
            audio_url = coalesce(excluded.audio_url, voice_notes.audio_url),
            duration_seconds = excluded.duration_seconds,
            transcript = excluded.transcript,
            raw_transcript = coalesce(excluded.raw_transcript, voice_notes.raw_transcript),
            summary = excluded.summary,
            extracted_tasks = excluded.extracted_tasks,
            local_uri = excluded.local_uri,
            updated_at = excluded.updated_at;
        `;
        await pgClient.query(upsertQuery, [
          row.id,
          row.user_id,
          row.title || 'Voice Note',
          audioBlobUrl,
          row.audio_url || audioBlobUrl,
          row.duration_seconds || 0,
          row.raw_transcript || row.transcript || null,
          row.raw_transcript || row.transcript || null,
          row.summary || null,
          row.extracted_tasks ? JSON.stringify(row.extracted_tasks) : JSON.stringify([]),
          row.local_uri || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || row.created_at || new Date().toISOString(),
        ]);
        migratedFromVoiceNotesTable++;
      }
    }
  } catch (err: any) {
    console.warn('voice_notes table migration step notice:', err?.message);
  }

  // 2. Migrate voice rows from Supabase `notes` table (where note_type = 'voice')
  try {
    const { data: noteRows, error: noteErr } = await supabase
      .from('notes')
      .select('*')
      .eq('note_type', 'voice');

    if (noteErr) {
      console.warn('Notice querying Supabase notes table:', noteErr.message);
    } else if (noteRows && noteRows.length > 0) {
      console.log(`Found ${noteRows.length} voice notes in Supabase notes table. Migrating...`);
      for (const row of noteRows) {
        let audioBlobUrl = null;

        if (row.audio_url && row.audio_url.includes('supabase.co/storage')) {
          try {
            const ext = row.audio_url.split('.').pop()?.split('?')[0] || 'm4a';
            const blobName = `${row.user_id}/${row.id}.${ext}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            const res = await fetch(row.audio_url);
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              await blockBlobClient.upload(buffer, buffer.length);
              audioBlobUrl = blockBlobClient.url;
              audioFilesMigrated++;
            }
          } catch (audioErr: any) {
            console.warn(`Could not transfer audio file for ${row.id}:`, audioErr.message);
          }
        }

        const upsertQuery = `
          insert into public.voice_notes (
            id, user_id, title, audio_blob_url, audio_url, duration_seconds,
            transcript, raw_transcript, summary, created_at, updated_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
          on conflict (id) do update set
            title = excluded.title,
            audio_blob_url = coalesce(excluded.audio_blob_url, voice_notes.audio_blob_url),
            audio_url = coalesce(excluded.audio_url, voice_notes.audio_url),
            duration_seconds = excluded.duration_seconds,
            transcript = excluded.transcript,
            raw_transcript = coalesce(excluded.raw_transcript, voice_notes.raw_transcript),
            summary = excluded.summary,
            updated_at = excluded.updated_at;
        `;

        await pgClient.query(upsertQuery, [
          row.id,
          row.user_id,
          row.title || 'Voice Note',
          audioBlobUrl,
          row.audio_url || audioBlobUrl,
          row.duration_seconds || 0,
          row.transcript || row.content || null,
          row.transcript || row.content || null,
          row.content || row.transcript || null,
          row.created_at || new Date().toISOString(),
          row.updated_at || row.created_at || new Date().toISOString(),
        ]);
        migratedFromNotesTable++;
      }
    }
  } catch (err: any) {
    console.warn('notes table voice migration step notice:', err?.message);
  }

  // 3. Verify total rows in Azure PostgreSQL voice_notes
  const countRes = await pgClient.query('select count(*)::int as total from public.voice_notes');
  const totalInAzure = countRes.rows[0]?.total;

  console.log('✓ Migration finished successfully:');
  console.log(`  - Migrated from voice_notes table: ${migratedFromVoiceNotesTable}`);
  console.log(`  - Migrated from notes (voice) table: ${migratedFromNotesTable}`);
  console.log(`  - Audio files transferred to Azure Blob: ${audioFilesMigrated}`);
  console.log(`  - Total voice_notes rows in Azure PostgreSQL: ${totalInAzure}`);

  await pgClient.end();
}

migrate().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
