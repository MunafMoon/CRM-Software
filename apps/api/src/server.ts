import { app } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
const server = app.listen(config.PORT, () =>
  console.log(`Folio API listening on ${config.PORT}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
