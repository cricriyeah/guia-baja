import * as migration_20261110_012743_inicial from './20261110_012743_inicial';
import * as migration_20261110_012748_busqueda from './20261110_012748_busqueda';

export const migrations = [
  {
    up: migration_20261110_012743_inicial.up,
    down: migration_20261110_012743_inicial.down,
    name: '20261110_012743_inicial',
  },
  {
    up: migration_20261110_012748_busqueda.up,
    down: migration_20261110_012748_busqueda.down,
    name: '20261110_012748_busqueda'
  },
];
