import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;

export function parseAzureConnectionString(connStr: string): PoolConfig {
  // If the password contains unencoded special characters like '@' or '#'
  // (e.g. postgresql://focalystadmin:F0c@lyst#Db2026!x9Z@focalyst-db-prod-02...)
  // standard URL parsing splits at the first '@' causing hostname to become 'lyst'.
  // We use regex to robustly parse the last '@' as the delimiter before the host.
  const regex = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/;
  const match = connStr.match(regex);
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

export function getAzurePool(): Pool | null {
  const connectionString = process.env.AZURE_POSTGRES_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const config = parseAzureConnectionString(connectionString);
    pool = new Pool({
      ...config,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
  }

  return pool;
}

export interface VoiceNoteRecord {
  id: string;
  user_id: string;
  title: string;
  audio_blob_url: string | null;
  audio_url: string | null;
  duration_seconds: number;
  transcript: string | null;
  raw_transcript: string | null;
  summary: string | null;
  extracted_tasks: any;
  local_uri: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertVoiceNoteInput {
  id?: string;
  user_id: string;
  title?: string;
  audio_blob_url?: string | null;
  audio_url?: string | null;
  duration_seconds?: number;
  transcript?: string | null;
  raw_transcript?: string | null;
  summary?: string | null;
  extracted_tasks?: any;
  local_uri?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function insertVoiceNote(input: InsertVoiceNoteInput): Promise<VoiceNoteRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const query = `
    insert into public.voice_notes (
      id,
      user_id,
      title,
      audio_blob_url,
      audio_url,
      duration_seconds,
      transcript,
      raw_transcript,
      summary,
      extracted_tasks,
      local_uri,
      created_at,
      updated_at
    ) values (
      coalesce($1, gen_random_uuid()),
      $2,
      coalesce($3, 'Voice Note'),
      $4,
      coalesce($5, $4),
      coalesce($6, 0),
      $7,
      coalesce($8, $7),
      $9,
      coalesce($10, '[]'::jsonb),
      $11,
      coalesce($12, now()),
      coalesce($13, now())
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
      local_uri = coalesce(excluded.local_uri, voice_notes.local_uri),
      updated_at = now()
    returning *;
  `;

  const values = [
    input.id || null,
    input.user_id,
    input.title || null,
    input.audio_blob_url || null,
    input.audio_url || null,
    input.duration_seconds || 0,
    input.transcript || null,
    input.raw_transcript || null,
    input.summary || null,
    input.extracted_tasks ? JSON.stringify(input.extracted_tasks) : null,
    input.local_uri || null,
    input.created_at || null,
    input.updated_at || null,
  ];

  const res = await p.query<VoiceNoteRecord>(query, values);
  return res.rows[0];
}

export async function getVoiceNotesByUser(
  userId: string,
  limit: number = 50
): Promise<VoiceNoteRecord[]> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<VoiceNoteRecord>(
    `select * from public.voice_notes
      where user_id = $1
      order by created_at desc
      limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getVoiceNoteById(
  id: string,
  userId: string
): Promise<VoiceNoteRecord | null> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<VoiceNoteRecord>(
    `select * from public.voice_notes
      where id = $1 and user_id = $2
      limit 1`,
    [id, userId]
  );
  return res.rows[0] || null;
}

export async function deleteVoiceNoteById(
  id: string,
  userId: string
): Promise<boolean> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query(
    `delete from public.voice_notes
      where id = $1 and user_id = $2`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

