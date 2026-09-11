import * as migration_20260910_152045_inicial from './20260910_152045_inicial';
import * as migration_20260910_192922_galeria from './20260910_192922_galeria';
import * as migration_20260911_190314_carrinho_e_clientes from './20260911_190314_carrinho_e_clientes';
import * as migration_20260911_193654_pedidos from './20260911_193654_pedidos';

export const migrations = [
  {
    up: migration_20260910_152045_inicial.up,
    down: migration_20260910_152045_inicial.down,
    name: '20260910_152045_inicial',
  },
  {
    up: migration_20260910_192922_galeria.up,
    down: migration_20260910_192922_galeria.down,
    name: '20260910_192922_galeria',
  },
  {
    up: migration_20260911_190314_carrinho_e_clientes.up,
    down: migration_20260911_190314_carrinho_e_clientes.down,
    name: '20260911_190314_carrinho_e_clientes',
  },
  {
    up: migration_20260911_193654_pedidos.up,
    down: migration_20260911_193654_pedidos.down,
    name: '20260911_193654_pedidos'
  },
];
