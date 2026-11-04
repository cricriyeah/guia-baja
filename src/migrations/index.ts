import * as migration_20261104_074022_inicial from './20261104_074022_inicial';

export const migrations = [
  {
    up: migration_20261104_074022_inicial.up,
    down: migration_20261104_074022_inicial.down,
    name: '20261104_074022_inicial'
  },
];
