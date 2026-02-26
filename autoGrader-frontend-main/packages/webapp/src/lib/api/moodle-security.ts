import type { NextApiRequest } from 'next';

export type MoodleDbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  prefix: string;
};

const PREFIX_PATTERN = /^[a-zA-Z0-9_]+$/;
const SAFE_QUERY_START = /^(select|with)\b/i;
const FORBIDDEN_QUERY_TOKENS =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|rename|replace|set|call|into\s+outfile|load_file|load\s+data|show|describe)\b/i;

function readValue(req: NextApiRequest, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const fromBody = req.body?.[key];
    if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();

    const fromQuery = req.query?.[key];
    if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim();
  }
  return undefined;
}

export function sameOriginRequest(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Requests without origin are usually same-origin server calls or tools.
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function parseMoodleConfig(req: NextApiRequest): MoodleDbConfig {
  const host = readValue(req, 'host', 'dbhost') || '127.0.0.1';
  const portRaw = readValue(req, 'port', 'dbport') || '3307';
  const database = readValue(req, 'database', 'dbname') || 'moodle';
  const user = readValue(req, 'user', 'dbuser') || 'root';
  const password = readValue(req, 'password', 'dbpass') || '';
  const prefix = sanitizePrefix(readValue(req, 'prefix') || 'mdl_');

  const parsedPort = Number(portRaw);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3307;

  return { host, port, database, user, password, prefix };
}

export function sanitizePrefix(value: string): string {
  const trimmed = value.trim();
  return PREFIX_PATTERN.test(trimmed) ? trimmed : 'mdl_';
}

export function validateReadOnlyQuery(query: string): string | null {
  const compact = query.trim();
  if (!compact) return 'Query is required';
  if (compact.length > 10000) return 'Query is too large';
  if (!SAFE_QUERY_START.test(compact)) return 'Only read-only SELECT/WITH queries are allowed';
  if (compact.includes(';')) return 'Multiple statements are not allowed';
  if (/--|\/\*/.test(compact)) return 'SQL comments are not allowed';
  if (FORBIDDEN_QUERY_TOKENS.test(compact)) return 'Query contains forbidden SQL keywords';
  return null;
}
