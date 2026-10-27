import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { montarLinhasCarteira } from '@/domain/carteira';
import type { LancamentoReceita, MetaMes } from '@/domain/tipos';
import { carregarDadosWolfos, consolidarSync } from '@/data/wolfos/carteira';
import { repositorios } from '@/data/local';
import type { AvancoPlano, NovoControle } from '@/data/local/ciclo';
import type { AlteracaoMeta, NovaMeta, NovoLancamento } from '@/data/local/repositorio';
import type { PlanoMidia } from '@/domain/plano-midia';

export const chaves = {
  carteira: (ano: number, mes: number) => ['carteira', ano, mes] as const,
  metas: ['metas'] as const,
  lancamentos: ['lancamentos'] as const,
  controles: ['controles'] as const,
  planos: ['planos'] as const,
};

/** Carteira do mês: metas, realizado, projeção, grade, tracking, sync e PDAs por cliente. */
export function useCarteira(ano: number, mes: number) {
  return useQuery({
    queryKey: chaves.carteira(ano, mes),
    queryFn: async () => {
      const hoje = new Date();
      const [dados, metas, lancamentos] = await Promise.all([
        carregarDadosWolfos(ano, mes, hoje),
        repositorios.metas.listar(),
        repositorios.lancamentos.listar(),
      ]);
      const sync = consolidarSync(dados.syncPlataformas);
      const linhas = montarLinhasCarteira({
        ano,
        mes,
        hoje,
        clientes: dados.clientes,
        metas,
        lancamentos,
        sync,
        pdas: dados.pdas,
        receitaGa4: dados.receitaGa4,
        ga4AnoAnterior: dados.ga4AnoAnterior,
        investimento: dados.investimento,
        investimentoAnoAnterior: dados.investimentoAnoAnterior,
      });
      return {
        fonte: dados.fonte,
        hoje,
        linhas,
        syncPlataformas: dados.syncPlataformas,
        clientes: dados.clientes,
      };
    },
  });
}

export function useMetas() {
  return useQuery({
    queryKey: chaves.metas,
    queryFn: (): Promise<MetaMes[]> => repositorios.metas.listar(),
  });
}

export function useLancamentos() {
  return useQuery({
    queryKey: chaves.lancamentos,
    queryFn: (): Promise<LancamentoReceita[]> => repositorios.lancamentos.listar(),
  });
}

/** Invalida o que depende de meta ou de lançamento. */
function useInvalidarDerivados() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['carteira'] });
    void client.invalidateQueries({ queryKey: chaves.metas });
    void client.invalidateQueries({ queryKey: chaves.lancamentos });
  };
}

export function useCriarLancamento() {
  const invalidar = useInvalidarDerivados();
  return useMutation({
    mutationFn: (novo: NovoLancamento) => repositorios.lancamentos.criar(novo),
    onSuccess: invalidar,
  });
}

export function useCriarMeta() {
  const invalidar = useInvalidarDerivados();
  return useMutation({
    mutationFn: (nova: NovaMeta) => repositorios.metas.criar(nova),
    onSuccess: invalidar,
  });
}

export function useAlterarMeta() {
  const invalidar = useInvalidarDerivados();
  return useMutation({
    mutationFn: (alteracao: AlteracaoMeta) => repositorios.metas.alterar(alteracao),
    onSuccess: invalidar,
  });
}

export function useControles() {
  return useQuery({
    queryKey: chaves.controles,
    queryFn: () => repositorios.controles.listar(),
  });
}

export function usePlanos() {
  return useQuery({
    queryKey: chaves.planos,
    queryFn: () => repositorios.planos.listar(),
  });
}

function useInvalidarCiclo() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: chaves.controles });
    void client.invalidateQueries({ queryKey: chaves.planos });
  };
}

export function useRegistrarControle() {
  const invalidar = useInvalidarCiclo();
  return useMutation({
    mutationFn: (novo: NovoControle) => repositorios.controles.registrar(novo),
    onSuccess: invalidar,
  });
}

export function useSalvarPlano() {
  const invalidar = useInvalidarCiclo();
  return useMutation({
    mutationFn: (plano: PlanoMidia) => repositorios.planos.salvar(plano),
    onSuccess: invalidar,
  });
}

export function useAvancarPlano() {
  const invalidar = useInvalidarCiclo();
  return useMutation({
    mutationFn: (pedido: AvancoPlano) => repositorios.planos.avancar(pedido),
    onSuccess: invalidar,
  });
}
