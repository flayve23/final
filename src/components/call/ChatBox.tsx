// src/components/call/ChatBox.tsx
// Chat em Tempo Real durante Chamada

import { useState, useEffect, useRef } from 'react';
import { Send, Smile, MoreVertical } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  created_at: number;
}

export default function ChatBox({ roomId, currentUserId }: { roomId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(pollNewMessages, 2000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const pollNewMessages = async () => {
    if (messages.length === 0) return;
    const lastTimestamp = messages[messages.length - 1]?.created_at;
    
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/poll?since=${lastTimestamp}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => [...prev, ...data.messages]);
      }
    } catch (error) {
      console.error('Erro no poll:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          message: newMessage.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Chat</h3>
        <button className="text-gray-400 hover:text-white">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.user_id === currentUserId ? 'flex-row-reverse' : ''}`}>
            <img
              src={msg.user_avatar || '/default-avatar.png'}
              alt={msg.user_name}
              className="w-8 h-8 rounded-full"
            />
            <div className={`max-w-[70%] ${msg.user_id === currentUserId ? 'items-end' : 'items-start'}`}>
              <p className="text-xs text-gray-400 mb-1">{msg.user_name}</p>
              <div className={`rounded-lg px-3 py-2 ${
                msg.user_id === currentUserId
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                <p className="text-sm">{msg.message}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.created_at * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-white">
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Digite uma mensagem..."
            maxLength={500}
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {newMessage.length}/500 caracteres
        </p>
      </div>
    </div>
  );
}
