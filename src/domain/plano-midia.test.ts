import { describe, expect, it } from 'vitest';
import type { ControleMeta } from './controle-meta';
import {
  comProjetadosDoFunil,
  MOTIVO_NAO_SUPERA_MINIMO,
  papelRevisorDoTier,
  planoVazio,
  proximoStatus,
  STATUS_PLANO,
  validarMotivoNaoSupera,
  validarTransicao,
  type PlanoMidia,
} from './plano-midia';
import { EXEMPLO_ANATOMIA, MODELO_SEMANAS_ANATOMIA } from './planejamento';

function planoPronto(sobre: Partial<PlanoMidia> = {}): PlanoMidia {
  const plano = planoVazio('cliente-teste', 2026, 11);
  plano.tier = 'beta';
  plano.papelRevisor = papelRevisorDoTier('beta');
  plano.analista = 'Analista teste';
  plano.metaFaturamento = EXEMPLO_ANATOMIA.faturadoPago;
  plano.taxaAprovacao = EXEMPLO_ANATOMIA.taxaAprovacao;
  plano.fonteAprovacao = 'Exemplo da anatomia';
  plano.faturamentoMesAnterior = 800_000;
  plano.faturamentoAnoAnterior = 700_000;
  plano.investimentoBase = 120_000;
  plano.roasBase = 4;
  plano.breakEven = 4.5;
  plano.fonteBase = 'Série de exemplo';
  plano.premissas.ticket.projetado = EXEMPLO_ANATOMIA.ticketMedio;
  plano.premissas.conversao.projetado = EXEMPLO_ANATOMIA.taxaConversao;
  plano.premissas.cps.projetado = 0.8;
  for (const chave of Object.keys(plano.premissas) as Array<keyof PlanoMidia['premissas']>) {
    plano.premissas[chave].fonte = 'Exemplo da anatomia';
  }
  plano.origemSessoes = { ...EXEMPLO_ANATOMIA.origem };
  plano.aquisicao = { ...EXEMPLO_ANATOMIA.origem };
  plano.semanas = MODELO_SEMANAS_ANATOMIA.map((semana) => ({ ...semana, acoes: [...semana.acoes] }));
  plano.criativos = [{ id: 'c1', nome: 'Campanha 1', quantidade: 5, unidade: 'criativos' }];
  plano.acoesMacro = [{ id: 'm1', descricao: 'Subir verba de busca', premissa: 'investimento' }];
  plano.acoesMicro = [{ id: 'i1', descricao: 'Trocar criativo da campanha', destino: 'pda' }];
  plano.capacidadeVerba = 'Até o investimento calculado';
  plano.restricoesCliente = 'Nenhuma';
  return comProjetadosDoFunil({ ...plano, ...sobre, premissas: sobre.premissas ?? plano.premissas });
}

const controleCompleto: ControleMeta = {
  clientId: 'cliente-teste',
  ano: 2026,
  mes: 11,
  adstart: { lancada: true, data: '2026-10-30' },
  wolfos: { lancada: true, data: '2026-10-30' },
  updatedAt: null,
};

describe('motivo quando a meta não supera o ano anterior', () => {
  it('é obrigatório se a meta é menor ou igual, e dispensado se supera', () => {
    expect(validarMotivoNaoSupera(100, 150, '')).not.toEqual([]);
    expect(validarMotivoNaoSupera(150, 150, '')).not.toEqual([]);
    expect(validarMotivoNaoSupera(151, 150, '')).toEqual([]);
    expect(validarMotivoNaoSupera(100, 150, 'x'.repeat(MOTIVO_NAO_SUPERA_MINIMO))).toEqual([]);
  });

  it('bloqueia a saída de elaboração sem o motivo', () => {
    const abaixo = planoPronto({ faturamentoAnoAnterior: 2_000_000, motivoNaoSupera: '' });
    expect(validarTransicao(abaixo, 'em_revisao', null).some((erro) => erro.includes('motivo'))).toBe(true);
    const comMotivo = planoPronto({
      faturamentoAnoAnterior: 2_000_000,
      motivoNaoSupera: 'Verba do cliente limitada neste mês',
    });
    expect(validarTransicao(comMotivo, 'em_revisao', null)).toEqual([]);
  });
});

describe('fluxo de status do plano', () => {
  it('segue a ordem do processo, um passo por vez', () => {
    expect(STATUS_PLANO).toEqual([
      'em_elaboracao',
      'em_revisao',
      'aprovada_revisor',
      'enviada_cliente',
      'aprovada_cliente',
      'lancada',
    ]);
    expect(proximoStatus('em_elaboracao')).toBe('em_revisao');
    expect(proximoStatus('lancada')).toBeNull();
    const pronto = planoPronto();
    expect(validarTransicao(pronto, 'em_revisao', null)).toEqual([]);
    expect(validarTransicao(pronto, 'aprovada_cliente', null)[0]).toMatch(/não faz parte do fluxo/);
    expect(validarTransicao(pronto, 'lancada', controleCompleto)[0]).toMatch(/não faz parte do fluxo/);
  });

  it('revisor é o gerente no Alpha e o coordenador em Beta e Gamma', () => {
    expect(papelRevisorDoTier('alpha')).toBe('gerente');
    expect(papelRevisorDoTier('beta')).toBe('coordenador');
    expect(papelRevisorDoTier('gamma')).toBe('coordenador');

    const alphaErrado = planoPronto({ tier: 'alpha', papelRevisor: 'coordenador' });
    expect(validarTransicao(alphaErrado, 'em_revisao', null).some((erro) => erro.includes('Gerente'))).toBe(true);

    const beta = planoPronto({ tier: 'beta', papelRevisor: 'coordenador', status: 'em_revisao' });
    expect(validarTransicao(beta, 'aprovada_revisor', null)).not.toEqual([]);
    expect(validarTransicao({ ...beta, revisorData: '2026-10-28' }, 'aprovada_revisor', null)).toEqual([]);
  });

  it('aprovação do cliente pede forma e data; lançada pede Adstart e WolfOS', () => {
    const enviada = planoPronto({ status: 'enviada_cliente' });
    expect(validarTransicao(enviada, 'aprovada_cliente', null)).not.toEqual([]);
    const aprovada = planoPronto({
      status: 'enviada_cliente',
      clienteForma: 'WhatsApp',
      clienteData: '2026-10-29',
    });
    expect(validarTransicao(aprovada, 'aprovada_cliente', null)).toEqual([]);

    const prontaLancamento = planoPronto({ status: 'aprovada_cliente' });
    expect(validarTransicao(prontaLancamento, 'lancada', null).join(' ')).toMatch(/Adstart/);
    expect(validarTransicao(prontaLancamento, 'lancada', controleCompleto)).toEqual([]);
  });

  it('origem, aquisição e calendário diário entram na revisão', () => {
    const canais = planoPronto();
    canais.origemSessoes = { ...canais.origemSessoes, outros: 9 };
    expect(validarTransicao(canais, 'em_revisao', null).some((erro) => erro.includes('origem'))).toBe(true);

    const dias = planoPronto();
    dias.dias = dias.dias.map((dia) => ({ ...dia, valorManual: 1 }));
    expect(validarTransicao(dias, 'em_revisao', null).some((erro) => erro.includes('soma dos dias'))).toBe(true);
  });

  it('preenche os projetados do funil sem apagar a fonte', () => {
    const plano = planoPronto();
    plano.premissas.sessoes.projetado = null;
    plano.premissas.sessoes.fonte = 'GA4 de exemplo';
    const aplicado = comProjetadosDoFunil(plano);
    expect(aplicado.premissas.sessoes.fonte).toBe('GA4 de exemplo');
    expect(aplicado.premissas.sessoes.projetado).toBeGreaterThan(0);
    expect(aplicado.premissas.pedidos.projetado).toBeCloseTo(aplicado.premissas.sessoes.projetado! * 0.02, 4);
  });
});
