import * as migration_20261104_070549_inicial from './20261104_070549_inicial';

export const migrations = [
  {
    up: migration_20261104_070549_inicial.up,
    down: migration_20261104_070549_inicial.down,
    name: '20261104_070549_inicial'
  },
];
