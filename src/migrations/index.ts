import * as migration_20261106_114605_inicial from './20261106_114605_inicial';
import * as migration_20261106_114609_busqueda from './20261106_114609_busqueda';

export const migrations = [
  {
    up: migration_20261106_114605_inicial.up,
    down: migration_20261106_114605_inicial.down,
    name: '20261106_114605_inicial',
  },
  {
    up: migration_20261106_114609_busqueda.up,
    down: migration_20261106_114609_busqueda.down,
    name: '20261106_114609_busqueda'
  },
];
