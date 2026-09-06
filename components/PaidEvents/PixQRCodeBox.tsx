import React, { useState } from 'react';
import { Copy, Check, QrCode, DollarSign, Sparkles } from 'lucide-react';
import { PaidEvent } from '../../types';
import { pixService } from '../../services/pixService';

interface PixQRCodeBoxProps {
  event: PaidEvent;
  qrCodeDataURL?: string;
  payload?: string;
}

const PixQRCodeBox: React.FC<PixQRCodeBoxProps> = ({ event, qrCodeDataURL, payload }) => {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Calcula o payload Pix Copia e Cola completo caso não tenha sido repassado via prop
  const pixPayload = payload || event.pix_qrcode_payload || (
    event.pix_key && event.pix_receiver_name
      ? pixService.generatePayload(
          event.pix_key,
          event.pix_receiver_name,
          event.pix_receiver_city || 'SAO PAULO',
          event.price
        )
      : ''
  );

  const handleCopyPayload = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
    }
  };

  const handleCopyKey = () => {
    if (event.pix_key) {
      navigator.clipboard.writeText(pixService.sanitizeKey(event.pix_key));
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
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
          <p className="text-[10px] text-zinc-500 font-bold">{event.payment_instructions || 'Escaneie o QR Code ou use o Pix Copia e Cola abaixo'}</p>
        </div>
      </div>

      {/* Valor */}
      <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-400" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor do Pagamento</span>
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

      {/* Pix Copia e Cola (Payload completo com o Valor embutido) */}
      {pixPayload && (
        <div className="space-y-2 bg-violet-950/20 border border-violet-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              Pix Copia e Cola (Com Valor)
            </p>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              Valor {formatCurrency(event.price)} incluso
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              readOnly
              value={pixPayload}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-300 select-all outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleCopyPayload}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-lg ${
              copiedPayload
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20'
                : 'bg-violet-600 hover:bg-violet-700 border-violet-500 text-white shadow-violet-600/20'
            }`}
          >
            {copiedPayload ? (
              <>
                <Check size={16} /> Código Pix Copiado com Sucesso!
              </>
            ) : (
              <>
                <Copy size={16} /> Copiar Código Pix Copia e Cola
              </>
            )}
          </button>
          <p className="text-[9px] text-zinc-400 text-center font-medium">
            Cole este código na opção <strong>"Pix Copia e Cola"</strong> do seu app bancário. O valor de {formatCurrency(event.price)} será preenchido automaticamente.
          </p>
        </div>
      )}

      {/* Chave Pix Simples (Opção secundária) */}
      {event.pix_key && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chave Pix (Opcional)</p>
            <span className="text-[9px] text-zinc-500 font-medium">Se preferir digitar manualmente no banco</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-zinc-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 truncate">
              {pixService.sanitizeKey(event.pix_key)}
            </div>
            <button
              type="button"
              onClick={handleCopyKey}
              className={`p-2.5 rounded-xl transition-all border ${
                copiedKey
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title="Copiar apenas a Chave"
            >
              {copiedKey ? <Check size={16} /> : <Copy size={16} />}
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

