import * as migration_20261104_081208_inicial from './20261104_081208_inicial';

export const migrations = [
  {
    up: migration_20261104_081208_inicial.up,
    down: migration_20261104_081208_inicial.down,
    name: '20261104_081208_inicial'
  },
];
