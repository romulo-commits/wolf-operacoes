import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { montarLinhasCarteira } from '@/domain/carteira';
import type { LancamentoReceita, MetaMes } from '@/domain/tipos';
import { carregarDadosWolfos, consolidarSync } from '@/data/wolfos/carteira';
import { repositorios } from '@/data/local';
import type { AlteracaoMeta, NovaMeta, NovoLancamento } from '@/data/local/repositorio';

export const chaves = {
  carteira: (ano: number, mes: number) => ['carteira', ano, mes] as const,
  metas: ['metas'] as const,
  lancamentos: ['lancamentos'] as const,
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
