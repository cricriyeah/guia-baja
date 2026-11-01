import * as migration_20261101_025332_inicial from './20261101_025332_inicial';

export const migrations = [
  {
    up: migration_20261101_025332_inicial.up,
    down: migration_20261101_025332_inicial.down,
    name: '20261101_025332_inicial'
  },
];
