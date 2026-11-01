import * as migration_20261101_034555_inicial from './20261101_034555_inicial';

export const migrations = [
  {
    up: migration_20261101_034555_inicial.up,
    down: migration_20261101_034555_inicial.down,
    name: '20261101_034555_inicial'
  },
];
