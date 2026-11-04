import * as migration_20261104_073347_inicial from './20261104_073347_inicial';

export const migrations = [
  {
    up: migration_20261104_073347_inicial.up,
    down: migration_20261104_073347_inicial.down,
    name: '20261104_073347_inicial'
  },
];
