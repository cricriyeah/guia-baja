import * as migration_20261106_072347_inicial from './20261106_072347_inicial';
import * as migration_20261106_072351_busqueda from './20261106_072351_busqueda';

export const migrations = [
  {
    up: migration_20261106_072347_inicial.up,
    down: migration_20261106_072347_inicial.down,
    name: '20261106_072347_inicial',
  },
  {
    up: migration_20261106_072351_busqueda.up,
    down: migration_20261106_072351_busqueda.down,
    name: '20261106_072351_busqueda'
  },
];
