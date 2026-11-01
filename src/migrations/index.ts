import * as migration_20261101_033208_inicial from './20261101_033208_inicial';

export const migrations = [
  {
    up: migration_20261101_033208_inicial.up,
    down: migration_20261101_033208_inicial.down,
    name: '20261101_033208_inicial'
  },
];
