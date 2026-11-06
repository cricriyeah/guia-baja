import * as migration_20261106_063629_inicial from './20261106_063629_inicial';
import * as migration_20261106_063633_busqueda from './20261106_063633_busqueda';

export const migrations = [
  {
    up: migration_20261106_063629_inicial.up,
    down: migration_20261106_063629_inicial.down,
    name: '20261106_063629_inicial',
  },
  {
    up: migration_20261106_063633_busqueda.up,
    down: migration_20261106_063633_busqueda.down,
    name: '20261106_063633_busqueda'
  },
];
