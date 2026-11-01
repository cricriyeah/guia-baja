import * as migration_20261101_073751_inicial from './20261101_073751_inicial';

export const migrations = [
  {
    up: migration_20261101_073751_inicial.up,
    down: migration_20261101_073751_inicial.down,
    name: '20261101_073751_inicial'
  },
];
