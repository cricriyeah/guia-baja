import * as migration_20261101_032209_inicial from './20261101_032209_inicial';

export const migrations = [
  {
    up: migration_20261101_032209_inicial.up,
    down: migration_20261101_032209_inicial.down,
    name: '20261101_032209_inicial'
  },
];
