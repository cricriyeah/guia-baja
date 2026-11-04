import * as migration_20261104_080509_inicial from './20261104_080509_inicial';

export const migrations = [
  {
    up: migration_20261104_080509_inicial.up,
    down: migration_20261104_080509_inicial.down,
    name: '20261104_080509_inicial'
  },
];
