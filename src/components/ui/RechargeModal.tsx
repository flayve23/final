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
        method: method // V104-FIX: Passar o método real (pix ou card)
      });

      if (data.qr_code_base64 || data.payment_url) {
          // Mercado Pago retornou dados de pagamento
          setPaymentData(data);
          setStep('payment');
          
          // Se for cartão E tiver URL, abrir automaticamente
          if (method === 'card' && data.payment_url) {
            window.open(data.payment_url, '_blank');
            // Mas manter modal aberto com QR Code como fallback
          }
      } else {
          // Simulador
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

  // RC1-FIX: Abrir Mercado Pago em nova aba para cartão
  const openMercadoPago = () => {
      if (paymentData.payment_url) {
          window.open(paymentData.payment_url, '_blank');
      } else {
          alert('Link de pagamento não disponível. Use o QR Code PIX.');
      }
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
                <div key={pkg} className="space-y-2">
                    <div className="p-4 bg-dark-700 rounded-xl border border-dark-600 text-center">
                        <div className="text-sm text-gray-400">Pacote</div>
                        <div className="text-2xl font-bold text-white">R$ {pkg}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                        <button
                            onClick={() => handleRecharge(pkg, 'pix')}
                            disabled={loading}
                            className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <QrCode className="w-3 h-3" /> PIX
                        </button>
                        <button
                            onClick={() => handleRecharge(pkg, 'card')}
                            disabled={loading}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            <CreditCard className="w-3 h-3" /> Cartão
                        </button>
                    </div>
                </div>
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
                    {loading ? <Loader2 className="animate-spin" /> : <><QrCode className="w-4 h-4" /> PIX</>}
                </button>
            </div>
            
            {/* V104-FIX: Botão de Cartão separado */}
            {amount && (
                <button 
                    onClick={() => handleRecharge(Number(amount), 'card')}
                    disabled={!amount || loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CreditCard className="w-4 h-4" /> Pagar com Cartão</>}
                </button>
            )}
            </div>
        )}

        {/* STEP 2: Payment Display */}
        {step === 'payment' && paymentData && (
            <div className="p-6 flex flex-col items-center text-center space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img 
                        src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                        alt="QR Code Pix" 
                        className="w-48 h-48 object-contain"
                    />
                </div>
                
                <div className="w-full">
                    <p className="text-gray-400 text-sm mb-2">Ou copie e cole o código:</p>
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

                {/* RC1-FIX: Cartão abre Mercado Pago em nova aba */}
                <div className="w-full border-t border-dark-700 pt-4">
                    <button 
                        onClick={openMercadoPago}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                    >
                        <CreditCard className="w-4 h-4" /> Pagar com Cartão
                    </button>
                    <p className="text-xs text-gray-500 mt-2">Abre em nova aba segura do Mercado Pago.</p>
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
