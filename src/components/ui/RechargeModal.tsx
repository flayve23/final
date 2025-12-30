import { useState } from 'react';
import { X, DollarSign, Loader2, CreditCard, QrCode, Copy, CheckCircle } from 'lucide-react';
import api from '../../services/api.ts';

export default function RechargeModal({ isOpen, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [paymentData, setPaymentData] = useState<any>(null);
  const packages = [20, 50, 100, 200];

  if (!isOpen) return null;

  const handleRecharge = async (value: number, method: 'pix' | 'card') => {
    setLoading(true);
    try {
      const { data } = await api.post('/wallet/recharge', { 
        amount: value,
        method: 'pix' // We send as PIX to MP to get the QR Code/Ticket
      });

      if (data.qr_code_base64) {
          // Real MP Transaction
          setPaymentData(data);
          setStep('payment');
      } else {
          // Simulator
          alert('Recarga simulada realizada com sucesso!');
          onSuccess();
          onClose();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao gerar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
      navigator.clipboard.writeText(paymentData.qr_code);
      alert('Código PIX copiado!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-dark-800 w-full max-w-md rounded-2xl border border-dark-600 shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex justify-between items-center bg-dark-900">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="text-primary-500" /> 
            {step === 'select' ? 'Adicionar Saldo' : 'Pagamento Seguro'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>

        {/* STEP 1: Selection */}
        {step === 'select' && (
            <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
                {packages.map((pkg) => (
                <button
                    key={pkg}
                    onClick={() => handleRecharge(pkg, 'pix')}
                    disabled={loading}
                    className="p-4 bg-dark-700 hover:bg-primary-600 hover:text-white rounded-xl border border-dark-600 transition-all text-center group"
                >
                    <div className="text-sm text-gray-400 group-hover:text-primary-200">Pacote</div>
                    <div className="text-2xl font-bold text-white">R$ {pkg}</div>
                </button>
                ))}
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-600"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-dark-800 text-gray-500">Ou digite</span></div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-3.5 text-gray-500">R$</span>
                    <input 
                        type="number" placeholder="0,00" value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-xl text-white focus:border-primary-500 outline-none"
                    />
                </div>
                <button 
                    onClick={() => amount && handleRecharge(Number(amount), 'pix')}
                    disabled={!amount || loading}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Gerar PIX'}
                </button>
            </div>
            </div>
        )}

        {/* STEP 2: Payment Display (The "In-Site" Experience) */}
        {step === 'payment' && paymentData && (
            <div className="p-6 flex flex-col items-center text-center space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                    {/* Render Base64 QR Code */}
                    <img 
                        src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                        alt="QR Code Pix" 
                        className="w-48 h-48 object-contain"
                    />
                </div>
                
                <div className="w-full">
                    <p className="text-gray-400 text-sm mb-2">Ou copie e cole o código abaixo:</p>
                    <div className="flex gap-2">
                        <input 
                            readOnly 
                            value={paymentData.qr_code} 
                            className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 text-xs text-gray-300 outline-none"
                        />
                        <button onClick={copyPix} className="p-2 bg-primary-600 rounded-lg text-white hover:bg-primary-500">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="w-full border-t border-dark-700 pt-4">
                    <a 
                        href={paymentData.payment_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                    >
                        <CreditCard className="w-4 h-4" /> Pagar com Cartão (Seguro)
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Abre em nova janela segura do Mercado Pago.</p>
                </div>

                <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
                    Fechar e aguardar confirmação
                </button>
            </div>
        )}

      </div>
    </div>
  );
}
