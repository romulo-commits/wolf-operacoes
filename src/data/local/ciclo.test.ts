import { describe, expect, it } from 'vitest';
import { CHAVE_METAS, criarRepositoriosLocais, type ArmazenamentoLocal, type NovaMeta } from './repositorio';
import { CHAVE_CONTROLE_META, CHAVE_PLANOS_MIDIA } from './ciclo';
import { sementeMetas } from './seed';
import { planoVazio } from '@/domain/plano-midia';
import { EXEMPLO_ANATOMIA, MODELO_SEMANAS_ANATOMIA } from '@/domain/planejamento';

function memoria(): ArmazenamentoLocal & { bruto(chave: string): string | null } {
  const mapa = new Map<string, string>();
  return {
    getItem: (chave) => mapa.get(chave) ?? null,
    setItem: (chave, valor) => {
      mapa.set(chave, valor);
    },
    bruto: (chave) => mapa.get(chave) ?? null,
  };
}

const novaMeta = (): NovaMeta => ({
  clientId: 'cliente-teste',
  ano: 2026,
  mes: 11,
  metaReceita: 500_000,
  premissas: { orcamento: 50_000, cps: 0.5, conversao: 0.01, ticket: 300 },
  pesos: { d1: 0.3, d2: 0.3, d3: 0.4 },
  autor: 'Analista teste',
});

describe('ciclo mensal não altera metas já gravadas', () => {
  it('controle e plano usam chaves novas e deixam a chave de metas intacta', async () => {
    const arm = memoria();
    const repo = criarRepositoriosLocais(arm, () => '2026-10-27T12:00:00.000Z');
    await repo.metas.criar(novaMeta());
    const antes = arm.bruto(CHAVE_METAS);

    await repo.controles.registrar({
      clientId: 'cliente-teste',
      ano: 2026,
      mes: 11,
      adstart: { lancada: true, data: '2026-10-27' },
      wolfos: { lancada: false, data: null },
    });
    await repo.planos.salvar(planoVazio('cliente-teste', 2026, 11));

    expect(arm.bruto(CHAVE_METAS)).toBe(antes);
    expect(arm.bruto(CHAVE_CONTROLE_META)).toBeTruthy();
    expect(arm.bruto(CHAVE_PLANOS_MIDIA)).toBeTruthy();
    const metas = await repo.metas.listar();
    const meta = metas.find((item) => item.clientId === 'cliente-teste')!;
    expect(meta.metaReceita).toBe(500_000);
    expect(meta.motivoAlteracao).toBeNull();
    expect(meta.premissas).toEqual({ orcamento: 50_000, cps: 0.5, conversao: 0.01, ticket: 300 });
  });

  it('não reescreve o JSON de metas que já estava salvo', async () => {
    const arm = memoria();
    const original = JSON.stringify(sementeMetas());
    arm.setItem(CHAVE_METAS, original);
    const repo = criarRepositoriosLocais(arm);
    await repo.metas.listar();
    await repo.controles.listar();
    await repo.planos.listar();
    expect(arm.bruto(CHAVE_METAS)).toBe(original);
  });

  it('recusa avançar sem motivo quando a meta não supera o ano anterior', async () => {
    const repo = criarRepositoriosLocais(memoria(), () => '2026-10-27T12:00:00.000Z');
    const plano = planoVazio('cliente-teste', 2026, 11);
    plano.tier = 'gamma';
    plano.papelRevisor = 'coordenador';
    plano.analista = 'Analista';
    plano.metaFaturamento = EXEMPLO_ANATOMIA.faturadoPago;
    plano.taxaAprovacao = EXEMPLO_ANATOMIA.taxaAprovacao;
    plano.fonteAprovacao = 'Exemplo';
    plano.faturamentoAnoAnterior = 2_000_000;
    plano.faturamentoMesAnterior = 900_000;
    plano.investimentoBase = 100_000;
    plano.roasBase = 4;
    plano.breakEven = 4.5;
    plano.fonteBase = 'Exemplo';
    plano.premissas.ticket.projetado = 250;
    plano.premissas.conversao.projetado = 0.02;
    plano.premissas.cps.projetado = 0.8;
    for (const chave of Object.keys(plano.premissas) as Array<keyof typeof plano.premissas>) {
      plano.premissas[chave].fonte = 'Exemplo';
    }
    plano.origemSessoes = { ...EXEMPLO_ANATOMIA.origem };
    plano.aquisicao = { ...EXEMPLO_ANATOMIA.origem };
    plano.semanas = MODELO_SEMANAS_ANATOMIA.map((semana) => ({ ...semana, acoes: [...semana.acoes] }));
    plano.criativos = [{ id: 'c', nome: 'Campanha', quantidade: 2, unidade: 'criativos' }];
    plano.acoesMacro = [{ id: 'm', descricao: 'Segurar verba', premissa: 'investimento' }];
    plano.capacidadeVerba = 'Limitada';
    plano.restricoesCliente = 'Nenhuma';
    plano.motivoNaoSupera = '';

    await repo.planos.salvar(plano);
    await expect(repo.planos.avancar({ clientId: 'cliente-teste', ano: 2026, mes: 11 })).rejects.toThrow(/motivo/);
    const gravado = (await repo.planos.listar())[0];
    expect(gravado.status).toBe('em_elaboracao');
  });

  it('avança um passo e persiste o status', async () => {
    const repo = criarRepositoriosLocais(memoria(), () => '2026-10-27T12:00:00.000Z');
    const plano = planoVazio('cliente-teste', 2026, 11);
    plano.tier = 'alpha';
    plano.papelRevisor = 'gerente';
    plano.analista = 'Analista';
    plano.metaFaturamento = 1_000_000;
    plano.taxaAprovacao = 0.92;
    plano.fonteAprovacao = 'Exemplo';
    plano.faturamentoAnoAnterior = 700_000;
    plano.faturamentoMesAnterior = 800_000;
    plano.investimentoBase = 100_000;
    plano.roasBase = 4;
    plano.breakEven = 4.5;
    plano.fonteBase = 'Exemplo';
    plano.premissas.ticket.projetado = 250;
    plano.premissas.conversao.projetado = 0.02;
    plano.premissas.cps.projetado = 0.8;
    for (const chave of Object.keys(plano.premissas) as Array<keyof typeof plano.premissas>) {
      plano.premissas[chave].fonte = 'Exemplo';
    }
    plano.origemSessoes = { ...EXEMPLO_ANATOMIA.origem };
    plano.aquisicao = { ...EXEMPLO_ANATOMIA.origem };
    plano.semanas = MODELO_SEMANAS_ANATOMIA.map((semana) => ({ ...semana, acoes: [...semana.acoes] }));
    plano.criativos = [{ id: 'c', nome: 'Campanha', quantidade: 2, unidade: 'criativos' }];
    plano.acoesMacro = [{ id: 'm', descricao: 'Subir verba', premissa: 'investimento' }];
    plano.capacidadeVerba = 'Ok';
    plano.restricoesCliente = 'Nenhuma';
    await repo.planos.salvar(plano);
    const avancado = await repo.planos.avancar({ clientId: 'cliente-teste', ano: 2026, mes: 11 });
    expect(avancado.status).toBe('em_revisao');
    await expect(
      repo.planos.avancar({ clientId: 'cliente-teste', ano: 2026, mes: 11, revisorData: '2026-10-28' }),
    ).resolves.toMatchObject({ status: 'aprovada_revisor' });
  });
});