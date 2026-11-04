import * as migration_20261104_075844_inicial from './20261104_075844_inicial';

export const migrations = [
  {
    up: migration_20261104_075844_inicial.up,
    down: migration_20261104_075844_inicial.down,
    name: '20261104_075844_inicial'
  },
];
