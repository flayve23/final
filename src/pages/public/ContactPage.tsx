import { Link } from 'react-router-dom';
import { Mail, MessageCircle, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-dark-900 text-white font-sans">
      <nav className="border-b border-white/5 bg-dark-900/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tighter">FLAYVE</Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Voltar</Link>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
          
          {/* Info */}
          <div>
            <h1 className="text-4xl font-black mb-6">Fale Conosco</h1>
            <p className="text-gray-400 mb-8">
              Tem alguma dúvida, sugestão ou precisa de ajuda com sua conta? 
              Nossa equipe está pronta para te atender.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-dark-800 rounded-lg"><Mail className="text-primary-500" /></div>
                <div>
                  <h3 className="font-bold text-white">Email</h3>
                  <p className="text-gray-400">suporte@flayve.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-dark-800 rounded-lg"><MessageCircle className="text-primary-500" /></div>
                <div>
                  <h3 className="font-bold text-white">Chat ao Vivo</h3>
                  <p className="text-gray-400">Disponível no Dashboard (9h às 18h)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-dark-800 p-8 rounded-2xl border border-dark-700">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Seu Nome</label>
                <input type="text" className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <input type="email" className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Mensagem</label>
                <textarea rows={4} className="w-full bg-dark-900 border border-dark-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"></textarea>
              </div>
              <button className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> Enviar Mensagem
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
