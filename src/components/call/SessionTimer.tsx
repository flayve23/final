import { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface SessionTimerProps {
  startTime: number; // timestamp em ms
  pricePerMinute: number; // preço por minuto
  onLimitReached?: () => void; // callback quando atingir limite de gasto
  spendingLimit?: number; // limite de gasto (opcional)
}

export default function SessionTimer({ 
  startTime, 
  pricePerMinute, 
  onLimitReached,
  spendingLimit 
}: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      setElapsed(elapsedSeconds);

      // Calcular custo em tempo real
      const minutes = elapsedSeconds / 60;
      const currentCost = minutes * pricePerMinute;
      setCost(currentCost);

      // Verificar se atingiu o limite
      if (spendingLimit && currentCost >= spendingLimit) {
        if (onLimitReached) {
          onLimitReached();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, pricePerMinute, spendingLimit, onLimitReached]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = spendingLimit 
    ? Math.min((cost / spendingLimit) * 100, 100)
    : 0;

  const isNearLimit = spendingLimit && cost >= spendingLimit * 0.8;
  const isOverLimit = spendingLimit && cost >= spendingLimit;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 space-y-4">
      {/* Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <Timer className={`w-5 h-5 ${isOverLimit ? 'text-red-500' : 'text-primary-500'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Tempo de Chamada</p>
            <p className="text-2xl font-bold text-white">{formatTime(elapsed)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400">Gasto Atual</p>
          <p className={`text-2xl font-bold ${isOverLimit ? 'text-red-500' : 'text-primary-500'}`}>
            R$ {cost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Progress bar (se houver limite) */}
      {spendingLimit && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Limite de Gasto</span>
            <span>R$ {spendingLimit.toFixed(2)}</span>
          </div>
          <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverLimit
                  ? 'bg-red-500'
                  : isNearLimit
                  ? 'bg-yellow-500'
                  : 'bg-primary-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Alertas */}
      {isNearLimit && !isOverLimit && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Você está próximo do seu limite de gasto!</span>
        </div>
      )}

      {isOverLimit && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Limite de gasto atingido! A chamada será encerrada.</span>
        </div>
      )}

      {/* Info adicional */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>Preço: R$ {pricePerMinute.toFixed(2)}/min</span>
        <span>Próximo minuto: R$ {(cost + pricePerMinute).toFixed(2)}</span>
      </div>
    </div>
  );
}
