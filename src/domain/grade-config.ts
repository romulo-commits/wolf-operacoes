/**
 * Configuração da grade G0–G3. Valores são PROPOSTA a validar com a Wolf.
 * Mudar a regra = mudar este arquivo (a função em grade.ts não muda).
 */

export type Faixa = 'A' | 'B' | 'C' | 'D';
export type NotaGrade = 'G0' | 'G1' | 'G2' | 'G3';

/**
 * Faixas de variação (fração; -0,05 = -5%).
 * A: ≥ 0% · B: de -5% até antes de 0% · C: de -15% até antes de -5% · D: abaixo de -15%.
 * Só os limites inferiores de B e C ficam aqui; A é "≥ 0".
 */
export const LIMITE_FAIXA_B = -0.05;
export const LIMITE_FAIXA_C = -0.15;

/**
 * Linhas: faixa do atingimento da meta (projeção ÷ meta − 1).
 * Colunas: faixa da variação contra o ano anterior.
 */
export const MATRIZ_GRADE: Record<Faixa, Record<Faixa, NotaGrade>> = {
  A: { A: 'G0', B: 'G0', C: 'G1', D: 'G2' },
  B: { A: 'G0', B: 'G1', C: 'G1', D: 'G2' },
  C: { A: 'G1', B: 'G1', C: 'G2', D: 'G3' },
  D: { A: 'G2', B: 'G2', C: 'G3', D: 'G3' },
};
