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
  if (!ano || !mes || !dia) return SEM_VALOR;
  return `${dia}/${mes}/${ano}`;
}

/** Mantém só dígitos e insere as barras: 27102026 → 27/10/2026. */
export function mascararDataBr(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** DD/MM/AAAA → AAAA-MM-DD. Null se a data não existir. */
export function dataBrParaIso(texto: string): string | null {
  const encontrado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!encontrado) return null;
  const dia = Number(encontrado[1]);
  const mes = Number(encontrado[2]);
  const ano = Number(encontrado[3]);
  if (ano < 1900 || ano > 2100) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
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
