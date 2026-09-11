import * as migration_20260910_152045_inicial from './20260910_152045_inicial';
import * as migration_20260910_192922_galeria from './20260910_192922_galeria';

export const migrations = [
  {
    up: migration_20260910_152045_inicial.up,
    down: migration_20260910_152045_inicial.down,
    name: '20260910_152045_inicial',
  },
  {
    up: migration_20260910_192922_galeria.up,
    down: migration_20260910_192922_galeria.down,
    name: '20260910_192922_galeria'
  },
];
