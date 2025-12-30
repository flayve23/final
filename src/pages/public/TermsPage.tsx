import { Link } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-900 text-gray-300 font-sans selection:bg-primary-500 selection:text-white">
      
      {/* Header */}
      <nav className="border-b border-white/5 bg-dark-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            FLAYVE
          </Link>
          <Link to="/" className="text-sm font-bold text-white hover:text-primary-400">Voltar</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white mb-2">Termos de Uso e Segurança</h1>
        <p className="text-gray-500 mb-8">Última atualização: 26 de Dezembro de 2025</p>

        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl mb-12 flex gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-1">Aviso de Conteúdo Adulto (+18)</h3>
            <p className="text-sm text-gray-300">
              Este site contém material destinado exclusivamente a adultos. Ao acessar, você declara sob as penas da lei ter 18 anos ou mais. O acesso por menores de idade é estritamente proibido e monitorado.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          
          {/* Seção 1 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary-500" /> 1. Natureza do Serviço
            </h2>
            <div className="prose prose-invert max-w-none text-gray-400">
              <p>
                A <strong>FLAYVE</strong> é uma plataforma tecnológica de intermediação que conecta Criadores de Conteúdo (Streamers) a Espectadores (Viewers) para interações de vídeo em tempo real.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>A FLAYVE <strong>não é uma agência de modelos</strong> e não possui vínculo empregatício com os Criadores.</li>
                <li>Os Criadores são prestadores de serviço independentes que utilizam a plataforma para monetizar seu tempo.</li>
                <li><strong>Proibição de Encontros Físicos:</strong> A plataforma destina-se exclusivamente ao entretenimento virtual. É estritamente proibido utilizar a FLAYVE para solicitar, negociar ou promover encontros presenciais, prostituição ou qualquer atividade ilegal fora do ambiente virtual.</li>
              </ul>
            </div>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary-500" /> 2. Segurança e Conduta
            </h2>
            <div className="prose prose-invert max-w-none text-gray-400">
              <p>Mantemos uma política de <strong>Tolerância Zero</strong> para atividades ilegais. O descumprimento resultará em banimento imediato, retenção de saldos e denúncia às autoridades competentes (Polícia Federal e Ministério Público).</p>
              
              <h4 className="text-white font-bold mt-4 mb-2">É EXPRESSAMENTE PROIBIDO:</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Participação de menores de 18 anos em qualquer capacidade (mesmo que acompanhados).</li>
                <li>Conteúdo que simule ou sugira violência, coerção ou abuso.</li>
                <li>Uso de drogas ilícitas durante as transmissões.</li>
                <li>Compartilhamento de dados pessoais sensíveis (endereço, telefone) no chat público.</li>
                <li>Gravar, capturar a tela ou redistribuir o conteúdo das chamadas sem autorização expressa (Violação de Direito de Imagem e Propriedade Intelectual).</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary-500" /> 3. Pagamentos e Reembolsos
            </h2>
            <div className="prose prose-invert max-w-none text-gray-400">
              <p>
                A FLAYVE atua como intermediadora de pagamentos.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li><strong>Consumo de Saldo:</strong> O serviço é cobrado por tempo. Uma vez que o tempo de chamada foi consumido, o serviço é considerado prestado e <strong>não é passível de reembolso</strong>, exceto em casos de falha técnica comprovada da plataforma.</li>
                <li><strong>Chargebacks:</strong> Contestação de pagamentos fraudulentos (chargeback) resultará no bloqueio imediato da conta e do dispositivo (IMEI/IP), além de inclusão em listas de proteção ao crédito.</li>
                <li><strong>Taxa de Serviço:</strong> A plataforma retém uma percentagem (comissão) sobre as transações para cobrir custos de hospedagem, streaming, taxas bancárias e manutenção. O valor líquido é repassado ao Criador.</li>
              </ul>
            </div>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Isenção de Responsabilidade</h2>
            <div className="prose prose-invert max-w-none text-gray-400">
              <p>
                Conforme o Marco Civil da Internet (Lei 12.965/2014), a FLAYVE não é responsável pelo conteúdo gerado por terceiros (User Generated Content). Cada usuário é o único responsável civil e criminalmente pelo que transmite ou fala. A plataforma possui mecanismos de denúncia e moderação para remover conteúdo infrator assim que notificada.
              </p>
            </div>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-dark-700 text-center text-sm text-gray-500">
          <p>Ao criar uma conta, você concorda integralmente com estes termos.</p>
          <p className="mt-2">&copy; 2025 Flayve Inc. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
