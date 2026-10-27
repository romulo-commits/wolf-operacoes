import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Input, campoSelect } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dataBr, dataBrParaIso, mascararDataBr } from '@/lib/formatar';
import { cn } from '@/lib/utils';

export function CampoNumero({
  id,
  rotulo,
  valor,
  onChange,
  step = 'any',
  disabled,
}: {
  id: string;
  rotulo: string;
  valor: number | null;
  onChange: (valor: number | null) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        disabled={disabled}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </div>
  );
}

/** Fração 0,92 no estado, "92" no campo. */
export function CampoFracaoPercentual({
  id,
  rotulo,
  fracao,
  onChange,
  disabled,
}: {
  id: string;
  rotulo: string;
  fracao: number | null;
  onChange: (fracao: number | null) => void;
  disabled?: boolean;
}) {
  const texto = fracao === null ? '' : String(Number((fracao * 100).toFixed(4)));
  return (
    <CampoNumero
      id={id}
      rotulo={rotulo}
      valor={texto === '' ? null : Number(texto)}
      step="0.01"
      disabled={disabled}
      onChange={(valor) => onChange(valor === null ? null : valor / 100)}
    />
  );
}

/** Data em dd/mm/aaaa. O valor de fora continua AAAA-MM-DD. O campo nativo segue o idioma do navegador, não o da página. */
export function CampoData({
  id,
  valor,
  onChange,
  disabled,
}: {
  id: string;
  valor: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
}) {
  const editando = useRef(false);
  const [texto, setTexto] = useState(() => (valor ? dataBr(valor) : ''));

  useEffect(() => {
    if (editando.current) return;
    setTexto(valor ? dataBr(valor) : '');
  }, [valor]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      lang="pt-BR"
      placeholder="dd/mm/aaaa"
      maxLength={10}
      className="w-36"
      disabled={disabled}
      value={texto}
      title="dd/mm/aaaa"
      onFocus={() => {
        editando.current = true;
      }}
      onBlur={() => {
        editando.current = false;
        if (texto === '') {
          onChange(null);
          return;
        }
        const iso = dataBrParaIso(texto);
        if (iso) onChange(iso);
        else setTexto(valor ? dataBr(valor) : '');
      }}
      onChange={(e) => {
        const mascarado = mascararDataBr(e.target.value);
        setTexto(mascarado);
        if (mascarado === '') onChange(null);
        else {
          const iso = dataBrParaIso(mascarado);
          if (iso) onChange(iso);
        }
      }}
    />
  );
}

export function CampoLinha({
  id,
  rotulo,
  valor,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} value={valor} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export const classeArea =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function SelectSimples({
  id,
  rotulo,
  valor,
  onChange,
  opcoes,
  disabled,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  opcoes: Array<{ valor: string; rotulo: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <select
        id={id}
        className={cn(campoSelect, 'disabled:opacity-50')}
        value={valor}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
