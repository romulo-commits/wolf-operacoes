import { describe, expect, it } from 'vitest';
import {
  clientesSemMetaLancada,
  montarQuadroControle,
  validarRegistroLancamento,
  type ControleMeta,
} from './controle-meta';

const clientes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const metas = [
  { clientId: 'a', ano: 2026, mes: 10 },
  { clientId: 'b', ano: 2026, mes: 10 },
];

function controle(clientId: string, adstart: boolean, wolfos: boolean): ControleMeta {
  return {
    clientId,
    ano: 2026,
    mes: 10,
    adstart: { lancada: adstart, data: adstart ? '2026-10-25' : null },
    wolfos: { lancada: wolfos, data: wolfos ? '2026-10-25' : null },
    updatedAt: null,
  };
}

describe('quadro de controle da meta', () => {
  it('lista quem não tem meta lançada nas duas casas', () => {
    const linhas = montarQuadroControle(clientes, metas, [controle('a', true, true), controle('b', true, false)], 2026, 10);
    expect(linhas.map((linha) => linha.situacao)).toEqual(['lancada', 'nao_lancada', 'sem_meta']);
    expect(clientesSemMetaLancada(linhas).map((linha) => linha.clientId)).toEqual(['b', 'c']);
  });

  it('lançada só na Adstart continua na lista', () => {
    const linhas = montarQuadroControle([{ id: 'a' }], metas, [controle('a', true, false)], 2026, 10);
    expect(clientesSemMetaLancada(linhas)).toHaveLength(1);
  });

  it('data obrigatória quando marcada, e vazia quando não', () => {
    expect(validarRegistroLancamento({ lancada: true, data: null }, 'Adstart')).not.toEqual([]);
    expect(validarRegistroLancamento({ lancada: false, data: '2026-10-01' }, 'WolfOS')).not.toEqual([]);
    expect(validarRegistroLancamento({ lancada: true, data: '2026-10-01' }, 'Adstart')).toEqual([]);
  });
});
