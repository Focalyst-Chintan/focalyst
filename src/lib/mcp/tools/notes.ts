import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { McpNotFound, must } from '../run';
import { localDateTime } from '../time';
import { clip, htmlToText, sanitizeQuery, truncate } from '../text';
import { READ, defineTool, round1 } from './shared';

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
      let q = sb
        .from('notes')
        .select('id, title, note_type, folder, created_at, updated_at, content, content_text, transcript, duration_seconds')
        .eq('user_id', userId)
        .not('is_deleted', 'is', true);
      if (args.type !== 'all') q = q.eq('note_type', args.type);
      if (args.folder?.trim()) q = q.eq('folder', args.folder.trim());
      const term = sanitizeQuery(args.query);
      if (term) q = q.or(`title.ilike.*${term}*,content.ilike.*${term}*,transcript.ilike.*${term}*`);

      const rows = (must(await q.order('updated_at', { ascending: false }).limit(args.limit)) ?? []) as NoteRow[];
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
      const n = must(
        await sb
          .from('notes')
          .select(
            'id, title, note_type, folder, tags, created_at, updated_at, content, content_text, transcript, duration_seconds'
          )
          .eq('id', args.note_id)
          .eq('user_id', userId)
          .not('is_deleted', 'is', true)
          .maybeSingle()
      ) as NoteRow | null;
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
