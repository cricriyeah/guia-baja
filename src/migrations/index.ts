import * as migration_20261104_071603_inicial from './20261104_071603_inicial';

export const migrations = [
  {
    up: migration_20261104_071603_inicial.up,
    down: migration_20261104_071603_inicial.down,
    name: '20261104_071603_inicial'
  },
];
