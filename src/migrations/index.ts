import * as migration_20260910_152045_inicial from './20260910_152045_inicial';
import * as migration_20260910_192922_galeria from './20260910_192922_galeria';
import * as migration_20260911_190314_carrinho_e_clientes from './20260911_190314_carrinho_e_clientes';
import * as migration_20260911_193654_pedidos from './20260911_193654_pedidos';
import * as migration_20260911_224416_minha_conta from './20260911_224416_minha_conta';
import * as migration_20260911_230255_caixa_de_saida from './20260911_230255_caixa_de_saida';
import * as migration_20260911_233030_cupons from './20260911_233030_cupons';
import * as migration_20260911_235830_carrinho_abandonado from './20260911_235830_carrinho_abandonado';
import * as migration_20260912_043707_comprovante from './20260912_043707_comprovante';

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
    name: '20260911_193654_pedidos',
  },
  {
    up: migration_20260911_224416_minha_conta.up,
    down: migration_20260911_224416_minha_conta.down,
    name: '20260911_224416_minha_conta',
  },
  {
    up: migration_20260911_230255_caixa_de_saida.up,
    down: migration_20260911_230255_caixa_de_saida.down,
    name: '20260911_230255_caixa_de_saida',
  },
  {
    up: migration_20260911_233030_cupons.up,
    down: migration_20260911_233030_cupons.down,
    name: '20260911_233030_cupons',
  },
  {
    up: migration_20260911_235830_carrinho_abandonado.up,
    down: migration_20260911_235830_carrinho_abandonado.down,
    name: '20260911_235830_carrinho_abandonado',
  },
  {
    up: migration_20260912_043707_comprovante.up,
    down: migration_20260912_043707_comprovante.down,
    name: '20260912_043707_comprovante'
  },
];
