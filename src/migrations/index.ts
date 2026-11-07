import * as migration_20261107_171443_inicial from './20261107_171443_inicial';
import * as migration_20261107_171447_busqueda from './20261107_171447_busqueda';

export const migrations = [
  {
    up: migration_20261107_171443_inicial.up,
    down: migration_20261107_171443_inicial.down,
    name: '20261107_171443_inicial',
  },
  {
    up: migration_20261107_171447_busqueda.up,
    down: migration_20261107_171447_busqueda.down,
    name: '20261107_171447_busqueda'
  },
];
