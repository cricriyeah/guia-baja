import * as migration_20261109_012457_inicial from './20261109_012457_inicial';
import * as migration_20261109_012502_busqueda from './20261109_012502_busqueda';

export const migrations = [
  {
    up: migration_20261109_012457_inicial.up,
    down: migration_20261109_012457_inicial.down,
    name: '20261109_012457_inicial',
  },
  {
    up: migration_20261109_012502_busqueda.up,
    down: migration_20261109_012502_busqueda.down,
    name: '20261109_012502_busqueda'
  },
];
