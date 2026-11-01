import * as migration_20261101_030859_inicial from './20261101_030859_inicial';

export const migrations = [
  {
    up: migration_20261101_030859_inicial.up,
    down: migration_20261101_030859_inicial.down,
    name: '20261101_030859_inicial'
  },
];
