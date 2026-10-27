import { LIMITE_FAIXA_B, LIMITE_FAIXA_C, MATRIZ_GRADE, type Faixa, type NotaGrade } from './grade-config';

export type NotaGradeComSemDado = NotaGrade | 'NC';

export interface ResultadoGrade {
  nota: NotaGradeComSemDado;
  faixaAtingimento: Faixa | null;
  faixaVariacao: Faixa | null;
}

/** Faixa de uma variação em fração (0,02 = +2%). Null sem dado. */
export function faixaDe(variacao: number | null): Faixa | null {
  if (variacao === null || !Number.isFinite(variacao)) return null;
  if (variacao >= 0) return 'A';
  if (variacao >= LIMITE_FAIXA_B) return 'B';
  if (variacao >= LIMITE_FAIXA_C) return 'C';
  return 'D';
}

/**
 * Nota G0–G3 cruzando o atingimento da meta com a variação contra o ano anterior.
 * Sem dado em qualquer um dos eixos = NC.
 */
export function calcularGrade(entrada: {
  /** Atingimento da meta − 1 (ex.: -0,08 = 92% da meta). */
  desvioMeta: number | null;
  /** Atual ÷ ano anterior − 1. */
  variacaoAnoAnterior: number | null;
}): ResultadoGrade {
  const faixaAtingimento = faixaDe(entrada.desvioMeta);
  const faixaVariacao = faixaDe(entrada.variacaoAnoAnterior);
  const nota: NotaGradeComSemDado =
    faixaAtingimento !== null && faixaVariacao !== null
      ? MATRIZ_GRADE[faixaAtingimento][faixaVariacao]
      : 'NC';
  return { nota, faixaAtingimento, faixaVariacao };
}
