import React, { useState } from 'react';
import { Copy, Check, QrCode, DollarSign } from 'lucide-react';
import { PaidEvent } from '../../types';

interface PixQRCodeBoxProps {
  event: PaidEvent;
  qrCodeDataURL: string;
}

const PixQRCodeBox: React.FC<PixQRCodeBoxProps> = ({ event, qrCodeDataURL }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    if (event.pix_key) {
      navigator.clipboard.writeText(event.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/20 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <QrCode size={20} className="text-violet-400" />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest">Pagamento via Pix</h4>
          <p className="text-[10px] text-zinc-500 font-bold">{event.payment_instructions || 'Escaneie o QR Code para pagar'}</p>
        </div>
      </div>

      {/* Valor */}
      <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor</span>
        </div>
        <span className="text-xl font-black text-emerald-400">{formatCurrency(event.price)}</span>
      </div>

      {/* QR Code */}
      {qrCodeDataURL && (
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-2xl shadow-lg">
            <img src={qrCodeDataURL} alt="QR Code Pix" className="w-48 h-48" />
          </div>
        </div>
      )}

      {/* Chave Pix */}
      {event.pix_key && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chave Pix</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-sm font-mono text-zinc-300 truncate">
              {event.pix_key}
            </div>
            <button
              type="button"
              onClick={handleCopyKey}
              className={`p-3 rounded-xl transition-all border ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title="Copiar chave"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Recebedor */}
      {event.pix_receiver_name && (
        <p className="text-xs text-zinc-500 text-center">
          Recebedor: <span className="font-bold text-zinc-400">{event.pix_receiver_name}</span>
        </p>
      )}
    </div>
  );
};

export default PixQRCodeBox;
