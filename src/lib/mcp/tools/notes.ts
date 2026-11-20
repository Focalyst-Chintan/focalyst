import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { McpNotFound, must } from '../run';
import { localDateTime } from '../time';
import { clip, htmlToText, sanitizeQuery, truncate } from '../text';
import { READ, defineTool, round1 } from './shared';
import { getNotesByUser, getNoteById } from '@/lib/server/azure-db';

type NoteRow = {
  id: string;
  title: string;
  note_type: string;
  folder: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  content: string | null;
  content_text: string | null;
  transcript: string | null;
  duration_seconds: number | null;
};

const isVoice = (n: NoteRow) => n.note_type === 'voice';
const plainText = (n: NoteRow) => (n.content_text?.trim() ? n.content_text.trim() : htmlToText(n.content));
const durationMinutes = (n: NoteRow) => (n.duration_seconds ? round1(n.duration_seconds / 60) : 0);

export function registerNoteTools(server: McpServer) {
  defineTool(
    server,
    'search_notes',
    {
      title: 'Search notes',
      description:
        "Search the user's notes and voice notes by words in the title, text or transcript, or list the most recent ones. Use get_note to read one in full.",
      inputSchema: z.object({
        query: z.string().max(80).optional(),
        type: z.enum(['all', 'text', 'voice']).default('all'),
        folder: z.string().max(60).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      let rows: NoteRow[] = [];
      try {
        const azRows = await getNotesByUser(userId, {
          search: args.query,
          limit: args.limit,
        });
        rows = azRows.map((n: any) => ({
          id: n.id,
          title: n.title,
          note_type: n.type || 'text',
          folder: null,
          created_at: n.created_at,
          updated_at: n.updated_at,
          content: n.content,
          content_text: n.content,
          transcript: null,
          duration_seconds: null,
        }));
      } catch {
        let q = sb
          .from('notes')
          .select('id, title, note_type, folder, created_at, updated_at, content, content_text, transcript, duration_seconds')
          .eq('user_id', userId)
          .not('is_deleted', 'is', true);
        if (args.type !== 'all') q = q.eq('note_type', args.type);
        if (args.folder?.trim()) q = q.eq('folder', args.folder.trim());
        const term = sanitizeQuery(args.query);
        if (term) q = q.or(`title.ilike.*${term}*,content.ilike.*${term}*,transcript.ilike.*${term}*`);

        rows = (must(await q.order('updated_at', { ascending: false }).limit(args.limit)) ?? []) as NoteRow[];
      }
      return {
        notes: rows.map((n) => ({
          id: n.id,
          title: n.title,
          type: isVoice(n) ? 'voice' : 'text',
          folder: n.folder,
          created: localDateTime(n.created_at, tz),
          updated: localDateTime(n.updated_at, tz),
          snippet: clip(isVoice(n) ? htmlToText(n.content) || n.transcript : plainText(n), 200) ?? '',
          ...(isVoice(n) ? { duration_minutes: durationMinutes(n) } : {}),
        })),
        count: rows.length,
      };
    }
  );

  defineTool(
    server,
    'get_note',
    {
      title: 'Read a note',
      description:
        'Read one note in full by its id from search_notes. For voice notes this returns the summary and the transcript.',
      inputSchema: z.object({
        note_id: z.uuid(),
        max_chars: z.number().int().min(1000).max(20000).default(8000),
      }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      let n: NoteRow | null = null;
      try {
        const azNote = await getNoteById(userId, args.note_id);
        if (azNote) {
          n = {
            id: azNote.id,
            title: azNote.title,
            note_type: azNote.type || 'text',
            folder: null,
            tags: azNote.tags ?? [],
            created_at: azNote.created_at,
            updated_at: azNote.updated_at,
            content: azNote.content,
            content_text: azNote.content,
            transcript: null,
            duration_seconds: null,
          };
        }
      } catch {}

      if (!n) {
        n = (must(
          await sb
            .from('notes')
            .select(
              'id, title, note_type, folder, tags, created_at, updated_at, content, content_text, transcript, duration_seconds'
            )
            .eq('id', args.note_id)
            .eq('user_id', userId)
            .not('is_deleted', 'is', true)
            .maybeSingle()
        ) as NoteRow | null);
      }
      if (!n) throw new McpNotFound();

      const base = {
        id: n.id,
        title: n.title,
        type: isVoice(n) ? 'voice' : 'text',
        folder: n.folder,
        tags: n.tags ?? [],
        created: localDateTime(n.created_at, tz),
        updated: localDateTime(n.updated_at, tz),
      };

      if (!isVoice(n)) {
        const body = truncate(plainText(n), args.max_chars);
        return { ...base, text: body.text, truncated: body.truncated };
      }

      // Summary first, then the transcript gets whatever is left of max_chars
      const summary = truncate(htmlToText(n.content), args.max_chars);
      const left = Math.max(0, args.max_chars - summary.text.length);
      const transcript = truncate((n.transcript ?? '').trim(), left);
      return {
        ...base,
        summary: summary.text,
        transcript: transcript.text,
        duration_minutes: durationMinutes(n),
        truncated: summary.truncated || transcript.truncated,
      };
    }
  );
}
