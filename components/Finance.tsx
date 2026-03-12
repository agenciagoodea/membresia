
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  MoreVertical,
  Filter,
  PieChart,
  ArrowRight,
  Search,
  Wallet
} from 'lucide-react';
import { MOCK_TENANT } from '../constants';
import { FinancialRecord } from '../types';
import { financeService } from '../services/financeService';

const FinanceStatCard = ({ title, amount, trend, icon, color, isNegative }: any) => (
  <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
    <div className="flex justify-between items-start mb-8">
      <div className={`p-4 rounded-2xl ${color} shadow-lg`}>
        {icon}
      </div>
      <button className="text-zinc-600 hover:text-zinc-300 transition-colors">
        <MoreVertical size={20} />
      </button>
    </div>

    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-zinc-500 text-sm font-bold">R$</span>
      <h3 className="text-3xl font-black text-white tracking-tighter">{amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
    </div>

    <div className="flex items-center gap-2 mt-4">
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase ${isNegative ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
        {isNegative ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
        {trend}%
      </div>
      <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">vs mês anterior</span>
    </div>

    {/* Decorativo de fundo */}
    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
      <DollarSign size={120} />
    </div>
  </div>
);

const Finance: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await financeService.getAll(MOCK_TENANT.id);
      setRecords(data);
    } catch (error) {
      console.error('Erro ao carregar registros financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter(r =>
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIncome = records.reduce((acc, curr) => curr.type === 'INCOME' ? acc + curr.amount : acc, 0);
  const totalExpense = records.reduce((acc, curr) => curr.type === 'EXPENSE' ? acc + curr.amount : acc, 0);
  const balance = totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-20 text-zinc-500 font-black uppercase tracking-[0.5em] animate-pulse">
        Sincronizando Tesouraria...
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Financeiro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Fluxo Financeiro</h2>
          <p className="text-zinc-500 font-medium text-lg italic">Gestão estratégica de dízimos, ofertas e investimentos eclesiásticos.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-6 py-4 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            <Download size={18} /> Exportar Extrato
          </button>
          <button className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 group">
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FinanceStatCard
          title="Total de Entradas"
          amount={totalIncome}
          trend={15.4}
          icon={<TrendingUp size={24} />}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <FinanceStatCard
          title="Total de Saídas"
          amount={totalExpense}
          trend={2.1}
          icon={<TrendingDown size={24} />}
          color="bg-rose-500/10 text-rose-500"
          isNegative
        />

        <div className="bg-gradient-to-br from-blue-600 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-white/10">
          <div className="absolute top-0 right-0 p-8 opacity-20"><Wallet size={100} /></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-8">
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                <PieChart size={24} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-2 opacity-70">Saldo Disponível em Conta</p>
              <div className="flex items-baseline gap-2">
                <span className="text-blue-200 text-sm font-bold">R$</span>
                <h3 className="text-4xl font-black text-white tracking-tighter">
                  {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-3/4 animate-pulse"></div>
                </div>
                <span className="text-[9px] font-black text-white uppercase whitespace-nowrap">Meta 75%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="bg-zinc-900 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-wrap items-center justify-between gap-6 bg-zinc-950/50">
          <h4 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full" /> Extrato de Atividades
          </h4>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-zinc-950 px-5 py-2.5 rounded-2xl border border-white/5 focus-within:ring-2 focus-within:ring-blue-600 transition-all group">
              <Search size={16} className="text-zinc-600 group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="Filtrar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-zinc-300 w-48"
              />
            </div>
            <button className="p-3 bg-zinc-950 border border-white/5 text-zinc-500 hover:text-white rounded-2xl transition-all">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/30 text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Descrição da Transação</th>
                <th className="px-6 py-6 text-center">Categoria</th>
                <th className="px-6 py-6 text-center">Data Registro</th>
                <th className="px-6 py-6 text-right">Valor Operacional</th>
                <th className="px-10 py-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${record.type === 'INCOME' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        }`}>
                        {record.type === 'INCOME' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{record.description}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Protocolo: #{record.id.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <span className="px-4 py-1.5 bg-zinc-950 border border-white/5 rounded-full text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] group-hover:text-zinc-200 transition-colors">
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-zinc-300">{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                      <span className="text-[9px] font-black text-zinc-600 uppercase">Efetivado</span>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-right">
                    <p className={`text-lg font-black tracking-tighter ${record.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {record.type === 'INCOME' ? '+' : '-'} R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button className="p-3 text-zinc-600 hover:text-white transition-all">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer da Tabela */}
        <div className="p-10 bg-zinc-950/30 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              Mostrando <span className="text-white">{filteredRecords.length}</span> de <span className="text-white">{records.length}</span> lançamentos
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-6 py-3 bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Anterior</button>
            <button className="px-6 py-3 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-zinc-700">Próximo</button>
          </div>
        </div>
      </div>

      {/* Widget Informativo IA */}
      <div className="bg-zinc-100 p-10 rounded-[3rem] text-zinc-950 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={150} /></div>
        <div className="space-y-4 max-w-2xl">
          <h4 className="text-3xl font-black tracking-tighter uppercase leading-none">Insight Financeiro IA</h4>
          <p className="text-zinc-600 font-bold leading-relaxed italic text-lg">
            "Baseado na média dos últimos 3 meses, sua igreja apresenta um crescimento de 12% nas ofertas voluntárias. Recomendamos destinar o excedente para o fundo de expansão de novas células."
          </p>
        </div>
        <button className="shrink-0 px-10 py-5 bg-zinc-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
          Explorar Insights <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Finance;
