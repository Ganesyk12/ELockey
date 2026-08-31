import 'dotenv/config';
import pg from 'pg';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const DATABASE_URL = process.env['DATABASE_URL']!;

// The physical Postgres schema selected via `?schema=<name>` in the connection
// string. The logical namespace in the contract stays `public`, so the ORM's
// type surface (`db.orm.public.*`) is unchanged; we only retarget the storage
// schema that SQL is emitted against, allowing the data to live in a schema
// other than `public` (e.g. when `public` is reserved for other apps).
function resolveSchema(url: string): string {
  const parsed = new URL(url);
  return parsed.searchParams.get('schema')?.trim() || 'public';
}

// Deep-copy the contract and rewrite every storage namespace's physical schema
// id to the target schema. The logical namespace id (`public`) is untouched.
function selectSchema<T>(contract: T, schema: string): T {
  if (schema === 'public') return contract;
  const copy = JSON.parse(JSON.stringify(contract)) as any;
  for (const key of Object.keys(copy?.storage?.namespaces ?? {})) {
    copy.storage.namespaces[key].id = schema;
  }
  return copy as T;
}

const schema = resolveSchema(DATABASE_URL);
const contract = selectSchema(contractJson, schema);

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 20_000,
  idleTimeoutMillis: 30_000,
});

export const db = postgres<Contract>({
  contractJson: contract,
  binding: { kind: 'pgPool', pool },
});
