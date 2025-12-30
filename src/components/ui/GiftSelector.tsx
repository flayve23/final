import { useState } from 'react';
import api from '../../services/api.ts';
import { Gift, Loader2 } from 'lucide-react';

interface GiftSelectorProps {
  streamerId: string;
  onLowBalance: (amount: number) => void;
  onSuccess: (giftName: string) => void;
}

const GIFTS = [
  { id: 'rose', name: 'Rosa', icon: '🌹', price: 5 },
  { id: 'drink', name: 'Drink', icon: '🍸', price: 15 },
  { id: 'perfume', name: 'Perfume', icon: '🧴', price: 50 },
  { id: 'diamond', name: 'Diamante', icon: '💎', price: 100 },
  { id: 'yacht', name: 'Iate', icon: '🛥️', price: 500 },
  { id: 'castle', name: 'Castelo', icon: '🏰', price: 1000 },
];

export default function GiftSelector({ streamerId, onLowBalance, onSuccess }: GiftSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    setSending(gift.id);
    try {
      await api.post('/wallet/tip', {
        streamer_id: Number(streamerId),
        amount: gift.price,
        gift_name: gift.name
      });
      onSuccess(gift.icon);
      setIsOpen(false);
    } catch (error: any) {
      if (error.response?.data?.code === 'insufficient_funds') {
        onLowBalance(gift.price);
      } else {
        alert('Erro ao enviar presente.');
      }
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="absolute bottom-24 right-4 z-[40]">
      {isOpen ? (
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-4 border border-primary-500/30 animate-in slide-in-from-bottom-5 w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold text-sm">Enviar Presente</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xs">Fechar</button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {GIFTS.map((gift) => (
              <button
                key={gift.id}
                onClick={() => handleSendGift(gift)}
                disabled={!!sending}
                className="flex flex-col items-center p-2 rounded-xl bg-white/5 hover:bg-primary-600/20 hover:border-primary-500 border border-transparent transition-all"
              >
                <span className="text-2xl mb-1 filter drop-shadow-lg">{gift.icon}</span>
                <span className="text-xs font-medium text-white">{gift.name}</span>
                <span className="text-[10px] text-yellow-400 font-bold">R$ {gift.price}</span>
                {sending === gift.id && <Loader2 className="absolute h-6 w-6 animate-spin text-white" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-primary-900/50 hover:scale-110 transition-transform animate-bounce-slow"
        >
          <Gift className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
