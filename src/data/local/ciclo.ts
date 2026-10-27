import type { ControleMeta, RegistroLancamento } from '@/domain/controle-meta';
import { validarRegistroLancamento } from '@/domain/controle-meta';
import { comProjetadosDoFunil, proximoStatus, validarRascunho, validarTransicao, type PlanoMidia } from '@/domain/plano-midia';
import type { ArmazenamentoLocal } from './repositorio';

/** Chaves novas. A chave wolf-operacoes:metas:v1 não é lida para escrita aqui. */
export const CHAVE_CONTROLE_META = 'wolf-operacoes:controle-meta:v1';
export const CHAVE_PLANOS_MIDIA = 'wolf-operacoes:planos-midia:v1';

export interface NovoControle {
  clientId: string;
  ano: number;
  mes: number;
  adstart: RegistroLancamento;
  wolfos: RegistroLancamento;
}

export interface AvancoPlano {
  clientId: string;
  ano: number;
  mes: number;
  revisorData?: string | null;
  clienteForma?: string;
  clienteData?: string | null;
}

export interface RepositorioCiclo {
  controles: {
    listar(): Promise<ControleMeta[]>;
    registrar(novo: NovoControle): Promise<ControleMeta>;
  };
  planos: {
    listar(): Promise<PlanoMidia[]>;
    salvar(plano: PlanoMidia): Promise<PlanoMidia>;
    avancar(pedido: AvancoPlano): Promise<PlanoMidia>;
  };
}

function lerJson<T>(armazenamento: ArmazenamentoLocal, chave: string): T[] {
  const bruto = armazenamento.getItem(chave);
  if (bruto === null) {
    armazenamento.setItem(chave, '[]');
    return [];
  }
  return JSON.parse(bruto) as T[];
}

function mesmo(item: { clientId: string; ano: number; mes: number }, alvo: { clientId: string; ano: number; mes: number }): boolean {
  return item.clientId === alvo.clientId && item.ano === alvo.ano && item.mes === alvo.mes;
}

export function criarCiclo(
  armazenamento: ArmazenamentoLocal,
  agora: () => string,
): RepositorioCiclo {
  const lerControles = () => lerJson<ControleMeta>(armazenamento, CHAVE_CONTROLE_META);
  const lerPlanos = () => lerJson<PlanoMidia>(armazenamento, CHAVE_PLANOS_MIDIA);

  return {
    controles: {
      async listar() {
        return lerControles();
      },

      async registrar(novo) {
        const erros = [
          ...validarRegistroLancamento(novo.adstart, 'Adstart'),
          ...validarRegistroLancamento(novo.wolfos, 'WolfOS'),
        ];
        if (!novo.clientId) erros.push('Escolha o cliente.');
        if (!Number.isInteger(novo.ano) || novo.ano < 2000) erros.push('Ano inválido.');
        if (!Number.isInteger(novo.mes) || novo.mes < 1 || novo.mes > 12) erros.push('Mês deve ser de 1 a 12.');
        if (erros.length > 0) throw new Error(erros.join(' '));

        const lista = lerControles();
        const registro: ControleMeta = {
          clientId: novo.clientId,
          ano: novo.ano,
          mes: novo.mes,
          adstart: { ...novo.adstart },
          wolfos: { ...novo.wolfos },
          updatedAt: agora(),
        };
        const indice = lista.findIndex((item) => mesmo(item, novo));
        const proxima = [...lista];
        if (indice >= 0) proxima[indice] = registro;
        else proxima.push(registro);
        armazenamento.setItem(CHAVE_CONTROLE_META, JSON.stringify(proxima));
        return registro;
      },
    },

    planos: {
      async listar() {
        return lerPlanos();
      },

      async salvar(plano) {
        if (plano.status !== 'em_elaboracao') {
          throw new Error('O status só muda pelo fluxo.');
        }
        const preparado = comProjetadosDoFunil(plano);
        const erros = validarRascunho(preparado);
        if (erros.length > 0) throw new Error(erros.join(' '));

        const lista = lerPlanos();
        const indice = lista.findIndex((item) => mesmo(item, plano));
        if (indice >= 0 && lista[indice].status !== 'em_elaboracao') {
          throw new Error('Plano fora de elaboração só muda pelo fluxo.');
        }
        const gravado: PlanoMidia = { ...preparado, status: 'em_elaboracao', updatedAt: agora() };
        const proxima = [...lista];
        if (indice >= 0) proxima[indice] = gravado;
        else proxima.push(gravado);
        armazenamento.setItem(CHAVE_PLANOS_MIDIA, JSON.stringify(proxima));
        return gravado;
      },

      async avancar(pedido) {
        const lista = lerPlanos();
        const indice = lista.findIndex((item) => mesmo(item, pedido));
        if (indice < 0) throw new Error('Plano não encontrado. Salve o rascunho antes.');

        const atual = lista[indice];
        const destino = proximoStatus(atual.status);
        if (!destino) throw new Error('O plano já está lançado.');

        let mesclado: PlanoMidia = {
          ...atual,
          revisorData: pedido.revisorData !== undefined ? pedido.revisorData : atual.revisorData,
          clienteForma: pedido.clienteForma !== undefined ? pedido.clienteForma : atual.clienteForma,
          clienteData: pedido.clienteData !== undefined ? pedido.clienteData : atual.clienteData,
        };
        if (destino === 'em_revisao') mesclado = comProjetadosDoFunil(mesclado);

        const controle = lerControles().find((item) => mesmo(item, pedido)) ?? null;
        const erros = validarTransicao(mesclado, destino, controle);
        if (erros.length > 0) throw new Error(erros.join(' '));

        const gravado: PlanoMidia = { ...mesclado, status: destino, updatedAt: agora() };
        const proxima = [...lista];
        proxima[indice] = gravado;
        armazenamento.setItem(CHAVE_PLANOS_MIDIA, JSON.stringify(proxima));
        return gravado;
      },
    },
  };
}
