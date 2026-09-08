import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = dirname(require.resolve('@prisma/client/package.json'));
const generatedRoot = resolve(clientRoot, '../../.prisma/client');
const normalize = (value) =>
  (value.match(/"(?:\\.|[^"\\])*"|[^\s]/g) || []).join('');
let current = false;
try {
  const source = readFileSync(resolve(apiRoot, 'prisma/schema.prisma'), 'utf8');
  const generated = readFileSync(
    resolve(generatedRoot, 'schema.prisma'),
    'utf8',
  );
  const expectedVersion = require('@prisma/client/package.json').version;
  const actualVersion = require(resolve(generatedRoot, 'index.js')).Prisma
    .prismaVersion.client;
  current =
    normalize(source) === normalize(generated) &&
    expectedVersion === actualVersion;
} catch {
  // A fresh installation has no generated client yet.
}
if (current) {
  console.log('Prisma client is up to date.');
} else {
  const cli = resolve(
    dirname(require.resolve('prisma/package.json')),
    'build/index.js',
  );
  const result = spawnSync(process.execPath, [cli, 'generate'], {
    cwd: apiRoot,
    stdio: 'inherit',
  });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
