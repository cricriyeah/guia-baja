import * as migration_20261109_001757_inicial from './20261109_001757_inicial';
import * as migration_20261109_001802_busqueda from './20261109_001802_busqueda';

export const migrations = [
  {
    up: migration_20261109_001757_inicial.up,
    down: migration_20261109_001757_inicial.down,
    name: '20261109_001757_inicial',
  },
  {
    up: migration_20261109_001802_busqueda.up,
    down: migration_20261109_001802_busqueda.down,
    name: '20261109_001802_busqueda'
  },
];
