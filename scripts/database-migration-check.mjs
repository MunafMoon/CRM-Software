import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const database=`folio_migration_check_${randomBytes(8).toString('hex')}`;
if(!/^folio_migration_check_[a-f0-9]{16}$/.test(database))throw new Error('Invalid temporary database name');
function run(service,command){
  return new Promise((res,rej)=>{
    const child=spawn('docker',['compose','exec','-T',service,'sh','-c',command,'sh',database],{cwd:root,stdio:'inherit'});
    child.on('error',rej);child.on('close',code=>code===0?res():rej(new Error(`Migration verification failed (${code})`)));
  });
}
let created=false;
try {
  await run('db','createdb -U "$POSTGRES_USER" "$1"');created=true;
  const migrate='export DATABASE_URL="${DATABASE_URL%/*}/$1?schema=public"; unset DIRECT_DATABASE_URL; npx prisma migrate deploy';
  await run('api',migrate);
  await run('api',migrate);
  await run('db','psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c \'SELECT count(*) AS applied_migrations FROM "_prisma_migrations" WHERE finished_at IS NOT NULL; SELECT count(*) AS empty_prospects FROM "Prospect";\'');
  console.log('Fresh database migration and repeat deployment succeeded.');
} finally { if(created)await run('db','dropdb -U "$POSTGRES_USER" "$1"'); }
