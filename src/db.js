import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function query(text, params=[]) { return pool.query(text, params); }
export async function initSchema(){
  const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
  await pool.query(sql);
}
export async function tx(fn){
  const c=await pool.connect();
  try{await c.query('BEGIN');const out=await fn(c);await c.query('COMMIT');return out;}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
