/** Quantos dias tem o mês (ano, mes com mes de 1 a 12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Dias já fechados do mês de referência, em relação a `hoje`.
 * Dados fecham no dia anterior: no mês corrente são `hoje - 1`.
 * Mês passado: todos os dias. Mês futuro: zero.
 */
export function diasFechados(ano: number, mes: number, hoje: Date): number {
  const indiceMes = ano * 12 + (mes - 1);
  const indiceHoje = hoje.getFullYear() * 12 + hoje.getMonth();
  if (indiceMes < indiceHoje) return diasNoMes(ano, mes);
  if (indiceMes > indiceHoje) return 0;
  return Math.max(hoje.getDate() - 1, 0);
}
