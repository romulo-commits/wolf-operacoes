const moedaBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const moedaBrlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nomesMeses = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const SEM_VALOR = '—';

export function moeda(valor: number | null, comCentavos = false): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  return (comCentavos ? moedaBrlCentavos : moedaBrl).format(valor);
}

const percentual2 = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

/** Fração em percentual: 0,123 → "12,3%". Com `casas = 2`: 0,0151 → "1,51%" (taxa de conversão). */
export function percentualFracao(valor: number | null, casas: 1 | 2 = 1): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  return (casas === 2 ? percentual2 : percentual).format(valor);
}

export function inteiro(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  return numero.format(valor);
}

export function decimal(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  return decimal2.format(valor);
}

/** AAAA-MM-DD → DD/MM/AAAA. */
export function dataBr(iso: string | null): string {
  if (!iso) return SEM_VALOR;
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function mesPorExtenso(ano: number, mes: number): string {
  return `${nomesMeses[mes - 1]} de ${ano}`;
}

/** Ano e mês de um input type="month" ("2026-10"). */
export function parseMesInput(valor: string): { ano: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano: Number(m[1]), mes };
}

export function mesParaInput(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}
