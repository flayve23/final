import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('age_verified');
    if (!accepted) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('age_verified', 'true');
    setShow(false);
  };

  const handleReject = () => {
    window.location.href = 'https://www.google.com';
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600"></div>
        
        <ShieldAlert className="w-16 h-16 text-primary-500 mx-auto mb-6" />
        
        <h2 className="text-3xl font-black text-white mb-4">Conteúdo Adulto</h2>
        
        <p className="text-gray-400 mb-8 leading-relaxed">
          Este site contém material destinado exclusivamente a maiores de <strong>18 anos</strong>. 
          Ao entrar, você confirma que tem idade legal e que deseja visualizar este conteúdo.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={handleAccept}
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02]"
          >
            SOU MAIOR DE 18 ANOS
          </button>
          
          <button 
            onClick={handleReject}
            className="w-full py-3 bg-dark-800 hover:bg-dark-700 text-gray-400 font-medium rounded-xl transition-colors"
          >
            Sair do site
          </button>
        </div>
      </div>
    </div>
  );
}
