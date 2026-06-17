import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- config ---------------------------------------------------------------

const MAX_EVENTS = 500;        // ring buffer size; oldest events drop off
const DEDUPE_WINDOW_MS = 60_000; // skip identical errors fired within this window

// --- types ----------------------------------------------------------------

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  t: string;
  level: LogLevel;
  event: string;
  data?: unknown;
}

interface DebugContext {
  family_id?: string | null;
  app_version?: string | null;
  [key: string]: unknown;
}

// --- state ----------------------------------------------------------------

let buffer: LogEntry[] = [];
let supabase: SupabaseClient | null = null;
let getContext: () => DebugContext = () => ({});
let handlerInstalled = false;
const lastSent = new Map<string, number>();

// --- init -----------------------------------------------------------------

/**
 * Call once at app startup, after the Supabase client exists.
 * getContext is read at flush time, so it always sees the current
 * signed-in family / version without you wiring it through everywhere.
 */
export function initDebugLog(opts: {
  client: SupabaseClient;
  getContext?: () => DebugContext;
}) {
  supabase = opts.client;
  if (opts.getContext) getContext = opts.getContext;
  installGlobalHandler();
}

// --- recording ------------------------------------------------------------

function push(level: LogLevel, event: string, data?: unknown) {
  const entry: LogEntry = { t: new Date().toISOString(), level, event, data };
  buffer.push(entry);
  if (buffer.length > MAX_EVENTS) buffer.shift();

  if (__DEV__) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${event}]`, data ?? '');
  }
}

// Log IDs and counts, never raw kid names or anything you would not want
// sitting in a support row. Keeps the COPPA line clean and the dump readable.
export const log = (event: string, data?: unknown) => push('info', event, data);
export const logWarn = (event: string, data?: unknown) => push('warn', event, data);
export const logError = (event: string, data?: unknown) => push('error', event, data);

/**
 * For the many `.catch(e => console.warn('[DB] ...'))` write sites. Records a
 * failed Supabase write into the buffer (does NOT flush — these are common and
 * a flush-per-failure would spam; the breadcrumb rides along on the next real
 * trigger or a manual dump). This is the core silent-failure case: a write that
 * never surfaces to the user but quietly drops their data. IDs/counts only.
 */
export function logDbError(op: string, err: unknown, data?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  logWarn(op, { message, ...data });
}

export function dumpLogs(): string {
  return buffer.map((e) => JSON.stringify(e)).join('\n');
}

export function clearLogs() {
  buffer = [];
}

// --- error capture --------------------------------------------------------

/**
 * Call this in catch blocks for failures you can predict.
 * Records the error into the buffer and phones the buffer home.
 */
export async function captureError(err: unknown, where?: string) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logError(where ?? 'error.captured', { message, stack });
  await flushToSupabase(where ? `${where}: ${message}` : message);
}

/**
 * Writes the current buffer to public.debug_logs as one row.
 * `reason` doubles as the error_message column: it is why the row exists
 * (e.g. 'uncaught: ...', 'manual', 'session.background').
 * Best effort: it will never throw, so logging cannot crash the app.
 *
 * dedupe defaults on (crash-loop guard). Turn it off for manual / session
 * flushes, which you always want to land.
 */
export async function flushToSupabase(reason: string, opts: { dedupe?: boolean } = {}) {
  if (!supabase) return;

  const dedupe = opts.dedupe ?? true;
  if (dedupe) {
    const now = Date.now();
    const prev = lastSent.get(reason);
    if (prev && now - prev < DEDUPE_WINDOW_MS) return;
    lastSent.set(reason, now);
  }

  const ctx = safeContext();

  try {
    await supabase.from('debug_logs').insert({
      family_id: ctx.family_id ?? null,
      platform: Platform.OS,
      app_version: ctx.app_version ?? null,
      error_message: reason.slice(0, 500),
      logs: dumpLogs(),
      context: ctx,
    });
  } catch {
    // swallow: a failed log write must stay invisible to the user
  }
}

/**
 * On-demand dump. No error required. Use this for the silent-failure case:
 * the user says "it didn't work" but nothing threw. Wire it to a hidden
 * debug gesture, or call it from an AppState 'background' listener.
 */
export async function flushNow(reason = 'manual') {
  await flushToSupabase(reason, { dedupe: false });
}

function safeContext(): DebugContext {
  try {
    return getContext() ?? {};
  } catch {
    return {};
  }
}

// --- global JS error handler ----------------------------------------------

function installGlobalHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;

  const g = global as any;
  if (g.ErrorUtils?.getGlobalHandler) {
    const prev = g.ErrorUtils.getGlobalHandler();
    g.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      logError('error.uncaught', { message: error?.message, stack: error?.stack, isFatal });
      // fire and forget; do not await inside the global handler
      flushToSupabase(`uncaught: ${error?.message ?? 'unknown'}`);
      prev?.(error, isFatal);
    });
  }
}
