/**
 * server/db.ts — Backward-compatibility re-export shim.
 *
 * The database layer has been split into domain modules under server/db/.
 * All existing imports of the form `import { foo } from '../db'` continue to
 * work without modification via this file.
 *
 * Prefer importing from 'server/db' (the directory index) in new code.
 */
export * from './db/index';
