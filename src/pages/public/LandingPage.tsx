import { Link } from 'react-router-dom';
import { Video, Shield, DollarSign, Heart, Star, CheckCircle, Smartphone, Globe, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary-500 selection:text-white overflow-x-hidden">
      
      {/* Navbar Transparente */}
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
               <div className="bg-gradient-to-tr from-primary-600 to-purple-600 p-2 rounded-lg">
                  <Video className="h-6 w-6 text-white" />
               </div>
               <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                 FLAYVE
               </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hidden sm:block text-gray-300 hover:text-white font-medium transition-colors">
                Já tenho conta
              </Link>
              <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Começar Agora
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Impacto Visual */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary-600 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">Plataforma Exclusiva para Criadoras de Elite</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-8 leading-tight">
            Sua Beleza, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-500">Seu Império.</span><br />
            Sem Intermediários.
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A única plataforma que conecta você diretamente aos seus fãs através de vídeo-chamadas privadas de alta qualidade.
            <strong className="text-white block mt-2">Segurança total, pagamentos garantidos e controle absoluto.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup" className="px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl text-lg font-bold hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all transform hover:-translate-y-1">
              Criar Perfil Gratuito
            </Link>
            <Link to="/login" className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-lg font-bold transition-all backdrop-blur-sm">
              Acessar Painel
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
             <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary-500" /> Pagamentos Mensais Seguros</div>
             <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary-500" /> Proteção Anti-Fraude</div>
             <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary-500" /> +18 Apenas</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-dark-900/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Por que escolher a Flayve?</h2>
                <p className="text-gray-400">Desenvolvemos a tecnologia para que você só precise se preocupar em criar.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<Video className="h-8 w-8 text-primary-400" />}
                    title="Vídeo Ultra HD Privado"
                    desc="Chamadas de vídeo 1:1 criptografadas de ponta a ponta. A qualidade de imagem que sua beleza merece."
                />
                <FeatureCard 
                    icon={<DollarSign className="h-8 w-8 text-green-400" />}
                    title="Planejamento Financeiro"
                    desc="Recebimentos mensais (D+30) garantidos. Um fluxo de caixa previsível para você construir sua vida com segurança."
                />
                <FeatureCard 
                    icon={<Shield className="h-8 w-8 text-blue-400" />}
                    title="Segurança & Privacidade"
                    desc="Bloqueie usuários, países ou estados específicos. Seus dados nunca são compartilhados. Você no controle."
                />
            </div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/10 to-black/90 pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
             <h2 className="text-4xl font-black mb-8">Quanto você pode ganhar?</h2>
             <div className="bg-dark-800 border border-dark-600 p-8 rounded-3xl shadow-2xl max-w-3xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-dark-600">
                    <div className="p-4">
                        <div className="text-gray-400 text-sm mb-2 uppercase tracking-wide">Iniciante</div>
                        <div className="text-3xl font-bold text-white mb-1">R$ 1.500</div>
                        <div className="text-xs text-gray-500">2h/dia dedicadas</div>
                    </div>
                    <div className="p-4">
                        <div className="text-primary-400 text-sm mb-2 uppercase tracking-wide font-bold">Dedicada</div>
                        <div className="text-4xl font-black text-white mb-1">R$ 5.800</div>
                        <div className="text-xs text-gray-500">4h/dia dedicadas</div>
                    </div>
                    <div className="p-4">
                        <div className="text-purple-400 text-sm mb-2 uppercase tracking-wide font-bold">Top Model</div>
                        <div className="text-5xl font-black text-white mb-1">R$ 15.000+</div>
                        <div className="text-xs text-gray-500">Full-time + Fãs fiéis</div>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-dark-600">
                    <p className="text-gray-400 text-sm mb-6">
                        *Estimativas baseadas na média das nossas top 100 criadoras. O resultado depende da sua dedicação e divulgação.
                    </p>
                    <Link to="/signup" className="inline-block w-full sm:w-auto px-12 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                        Simular Meus Ganhos na Prática
                    </Link>
                </div>
             </div>
        </div>
      </div>

      {/* Mobile App Teaser */}
      <div className="py-24 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-bold mb-6">Leve seu escritório no bolso.</h2>
                <p className="text-gray-400 text-lg mb-8">
                    Nossa plataforma é 100% otimizada para mobile. Não precisa baixar app, não ocupa espaço no celular. 
                    Funciona perfeitamente no Safari (iPhone) e Chrome (Android).
                </p>
                <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3">
                        <div className="bg-primary-500/20 p-2 rounded-lg"><Smartphone className="h-5 w-5 text-primary-400" /></div>
                        <span>Notificações de chamadas em tempo real</span>
                    </li>
                     <li className="flex items-center gap-3">
                        <div className="bg-primary-500/20 p-2 rounded-lg"><Globe className="h-5 w-5 text-primary-400" /></div>
                        <span>Conecte-se com fãs do mundo todo</span>
                    </li>
                     <li className="flex items-center gap-3">
                        <div className="bg-primary-500/20 p-2 rounded-lg"><Lock className="h-5 w-5 text-primary-400" /></div>
                        <span>Painel discreto e seguro</span>
                    </li>
                </ul>
            </div>
            <div className="relative">
                 {/* Abstract Phone Representation */}
                 <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                    <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                    <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                    <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                    <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
                    <div className="rounded-[2rem] overflow-hidden w-full h-full bg-dark-900 relative">
                        {/* Mockup Content */}
                        <div className="p-4 pt-12 text-center">
                            <div className="w-16 h-16 bg-gradient-to-tr from-primary-500 to-purple-500 rounded-full mx-auto mb-4 animate-pulse"></div>
                            <div className="h-4 w-32 bg-gray-700 rounded mx-auto mb-2"></div>
                            <div className="h-3 w-20 bg-gray-800 rounded mx-auto mb-8"></div>
                            
                            <div className="bg-dark-800 p-3 rounded-xl mb-3 flex items-center gap-3 border border-dark-700">
                                <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                                <div className="text-left flex-1">
                                    <div className="h-3 w-24 bg-gray-700 rounded mb-1"></div>
                                    <div className="h-2 w-16 bg-gray-800 rounded"></div>
                                </div>
                                <div className="h-8 w-14 bg-green-500/20 rounded"></div>
                            </div>
                            <div className="bg-dark-800 p-3 rounded-xl mb-3 flex items-center gap-3 border border-dark-700 opacity-60">
                                <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                                <div className="text-left flex-1">
                                    <div className="h-3 w-24 bg-gray-700 rounded mb-1"></div>
                                    <div className="h-2 w-16 bg-gray-800 rounded"></div>
                                </div>
                            </div>
                            <div className="bg-dark-800 p-3 rounded-xl mb-3 flex items-center gap-3 border border-dark-700 opacity-30">
                                <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
                                <div className="text-left flex-1">
                                    <div className="h-3 w-24 bg-gray-700 rounded mb-1"></div>
                                    <div className="h-2 w-16 bg-gray-800 rounded"></div>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-6 left-6 right-6">
                                <div className="h-12 bg-primary-600 rounded-xl w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-4 text-center sm:text-left grid sm:grid-cols-4 gap-8">
            <div className="col-span-2">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-4">
                    <Video className="h-6 w-6 text-primary-500" />
                    <span className="text-xl font-bold text-white">FLAYVE</span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs mx-auto sm:mx-0">
                    A plataforma premium para criadores de conteúdo adulto monetizarem sua audiência com segurança e tecnologia.
                </p>
            </div>
            <div>
                <h4 className="font-bold text-white mb-4">Plataforma</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                    <li><Link to="/login" className="hover:text-primary-400">Login</Link></li>
                    <li><Link to="/signup" className="hover:text-primary-400">Cadastro</Link></li>
                    <li><Link to="/dashboard/viewer" className="hover:text-primary-400">Explorar</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                    <li><Link to="/terms" className="hover:text-primary-400">Termos de Uso</Link></li>
                    <li><Link to="/contact" className="hover:text-primary-400">Contato</Link></li>
                    <li><Link to="/privacy" className="hover:text-primary-400">Privacidade</Link></li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
            © 2025 Flayve. Todos os direitos reservados. +18.
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
    return (
        <div className="bg-dark-800 p-8 rounded-3xl border border-dark-700 hover:border-primary-500/50 transition-colors group">
            <div className="mb-6 p-4 bg-dark-900 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-gray-400 leading-relaxed">
                {desc}
            </p>
        </div>
    )
}
