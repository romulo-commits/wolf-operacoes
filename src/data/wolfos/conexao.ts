import { createClient } from '@supabase/supabase-js';
import { criarLeituraSomenteSelect, type LeituraWolfos } from './leitura';

export interface ConfigWolfos {
  adsUrl: string;
  adsKey: string;
  devUrl: string;
  devKey: string;
}

export interface LeiturasWolfos {
  /** wolfos-ads: mídia, GA4, saúde do sync. */
  ads: LeituraWolfos;
  /** wolfos-dev: core, clientes e PDAs. */
  dev: LeituraWolfos;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

/** Lê as variáveis VITE_WOLFOS_*. Qualquer uma faltando = null (modo exemplo). */
export function lerConfigWolfos(env: Record<string, unknown> = import.meta.env): ConfigWolfos | null {
  const adsUrl = texto(env.VITE_WOLFOS_ADS_URL);
  const adsKey = texto(env.VITE_WOLFOS_ADS_KEY);
  const devUrl = texto(env.VITE_WOLFOS_DEV_URL);
  const devKey = texto(env.VITE_WOLFOS_DEV_KEY);
  if (!adsUrl || !adsKey || !devUrl || !devKey) return null;
  return { adsUrl, adsKey, devUrl, devKey };
}

let leituras: LeiturasWolfos | null = null;

/**
 * Leituras prontas, ou null quando não há credenciais.
 * Sem sessão de usuário: a chave é a anon/publishable, e a RLS do WOLFOS vale.
 */
export function obterLeiturasWolfos(config: ConfigWolfos | null = lerConfigWolfos()): LeiturasWolfos | null {
  if (!config) return null;
  if (!leituras) {
    const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
    leituras = {
      ads: criarLeituraSomenteSelect(createClient(config.adsUrl, config.adsKey, opcoes)),
      dev: criarLeituraSomenteSelect(createClient(config.devUrl, config.devKey, opcoes)),
    };
  }
  return leituras;
}
