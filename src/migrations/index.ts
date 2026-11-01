import * as migration_20261101_023835_inicial from './20261101_023835_inicial';

export const migrations = [
  {
    up: migration_20261101_023835_inicial.up,
    down: migration_20261101_023835_inicial.down,
    name: '20261101_023835_inicial'
  },
];
