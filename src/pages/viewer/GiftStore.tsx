// src/pages/viewer/GiftStore.tsx
// Loja de Presentes Virtuais

import { useState, useEffect } from 'react';
import { Gift, Heart, Crown, Sparkles, Send } from 'lucide-react';

interface GiftItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  rarity: string;
}

export default function GiftStore({ streamerId, onSent }: { streamerId: string; onSent?: () => void }) {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadGifts();
    loadBalance();
  }, []);

  const loadGifts = async () => {
    const res = await fetch('/api/gifts/catalog');
    const data = await res.json();
    setGifts(data.gifts || []);
  };

  const loadBalance = async () => {
    const res = await fetch('/api/wallet/balance');
    const data = await res.json();
    setBalance(data.balance || 0);
  };

  const sendGift = async () => {
    if (!selectedGift || sending) return;

    if (balance < selectedGift.price) {
      alert('Saldo insuficiente! Por favor, recarregue sua carteira.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: streamerId,
          gift_id: selectedGift.id,
          message: message.trim() || undefined
        })
      });

      if (res.ok) {
        alert(`${selectedGift.name} enviado com sucesso! 🎉`);
        setSelectedGift(null);
        setMessage('');
        loadBalance();
        onSent?.();
      } else {
        const error = await res.json();
        alert(error.error || 'Erro ao enviar presente');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao enviar presente');
    } finally {
      setSending(false);
    }
  };

  const rarityColors = {
    common: 'border-gray-300 bg-gray-50',
    rare: 'border-blue-300 bg-blue-50',
    epic: 'border-purple-300 bg-purple-50',
    legendary: 'border-yellow-300 bg-yellow-50'
  };

  const rarityIcons = {
    common: <Gift className="w-4 h-4" />,
    rare: <Sparkles className="w-4 h-4" />,
    epic: <Heart className="w-4 h-4" />,
    legendary: <Crown className="w-4 h-4" />
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🎁 Loja de Presentes</h1>
        <p className="text-gray-600">Envie presentes para mostrar seu apoio!</p>
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            Seu saldo: <span className="font-bold text-xl">R$ {balance.toFixed(2)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            onClick={() => setSelectedGift(gift)}
            className={`border-2 rounded-lg p-4 transition-all hover:scale-105 ${
              selectedGift?.id === gift.id
                ? 'ring-4 ring-blue-500'
                : ''
            } ${rarityColors[gift.rarity]}`}
          >
            <div className="text-6xl mb-2">{gift.name.split(' ')[0]}</div>
            <h3 className="font-semibold text-sm mb-1">{gift.name}</h3>
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mb-2">
              {rarityIcons[gift.rarity]}
              <span className="capitalize">{gift.rarity}</span>
            </div>
            <p className="text-lg font-bold text-green-600">R$ {gift.price.toFixed(2)}</p>
          </button>
        ))}
      </div>

      {selectedGift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Enviar {selectedGift.name}</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
              <div className="text-6xl mb-2">{selectedGift.name.split(' ')[0]}</div>
              <p className="text-xl font-bold text-green-600">R$ {selectedGift.price.toFixed(2)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Mensagem (opcional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Adicione uma mensagem..."
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/200</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedGift(null);
                  setMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={sendGift}
                disabled={sending || balance < selectedGift.price}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Enviando...' : 'Enviar Presente'}
              </button>
            </div>

            {balance < selectedGift.price && (
              <p className="text-sm text-red-600 mt-2 text-center">
                Saldo insuficiente. Recarregue sua carteira!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
