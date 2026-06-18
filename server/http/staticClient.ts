import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

export function registerStaticClient(app: express.Express, serverDirname: string) {
  const clientDist = path.resolve(serverDirname, '../dist/client');
  const clientIndex = path.join(clientDist, 'index.html');

  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res, next) => {
    if (!fs.existsSync(clientIndex)) return next();
    res.sendFile(clientIndex);
  });
}
