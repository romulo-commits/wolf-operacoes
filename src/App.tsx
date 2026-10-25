import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CalculadoraMeta } from '@/pages/CalculadoraMeta';
import { Conexoes } from '@/pages/Conexoes';
import { LancamentoReceita } from '@/pages/LancamentoReceita';
import { NaoEncontrada } from '@/pages/NaoEncontrada';
import { PaginaCliente } from '@/pages/PaginaCliente';
import { QuadroCarteira } from '@/pages/QuadroCarteira';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<QuadroCarteira />} />
        <Route path="clientes/:clientId" element={<PaginaCliente />} />
        <Route path="meta" element={<CalculadoraMeta />} />
        <Route path="lancamentos" element={<LancamentoReceita />} />
        <Route path="conexoes" element={<Conexoes />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
