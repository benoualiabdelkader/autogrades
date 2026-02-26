/**
 * Compatibility shim for older imports.
 * Keep a single LocalDatabase implementation under src/lib/db.
 */

export { LocalDatabase } from '../db/LocalDatabase';
export type { Student, Assignment } from '../db/LocalDatabase';
