import * as migration_20261104_071125_inicial from './20261104_071125_inicial';

export const migrations = [
  {
    up: migration_20261104_071125_inicial.up,
    down: migration_20261104_071125_inicial.down,
    name: '20261104_071125_inicial'
  },
];
