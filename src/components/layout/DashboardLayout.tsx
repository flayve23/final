import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Video, User, Wallet, LogOut, Shield, Menu, X, Users, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import IncomingCallModal from '../ui/IncomingCallModal';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex">
      {/* Inject Ringer for Streamers */}
      {user?.role === 'streamer' && <IncomingCallModal />}

      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-dark-800 rounded-lg border border-dark-700 text-white"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-200 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Video className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold text-white tracking-tight">FLAYVE</span>
          </div>

          <div className="flex flex-col items-center mb-8 p-4 bg-dark-900/50 rounded-xl border border-dark-700">
             <div className="w-16 h-16 rounded-full bg-dark-700 mb-3 flex items-center justify-center text-xl font-bold text-gray-500">
                {user?.username.substring(0,2).toUpperCase()}
             </div>
             <h3 className="font-bold text-white">{user?.username}</h3>
             <span className="text-xs text-primary-400 uppercase font-bold tracking-wider">{user?.role}</span>
          </div>

          <nav className="space-y-1">
            {user?.role === 'streamer' && (
              <>
                <NavLink to="/dashboard/streamer" icon={<Home />} label="Dashboard" active={isActive('/dashboard/streamer')} />
                <NavLink to="/dashboard/streamer/profile" icon={<User />} label="Meu Perfil" active={isActive('/dashboard/streamer/profile')} />
                <NavLink to="/dashboard/streamer/earnings" icon={<Wallet />} label="Ganhos" active={isActive('/dashboard/streamer/earnings')} />
                <NavLink to="/dashboard/streamer/kyc" icon={<Shield />} label="Verificação" active={isActive('/dashboard/streamer/kyc')} />
              </>
            )}

            {user?.role === 'viewer' && (
              <>
                <NavLink to="/dashboard/viewer" icon={<Home />} label="Explorar" active={isActive('/dashboard/viewer')} />
                <NavLink to="/dashboard/viewer/wallet" icon={<Wallet />} label="Carteira" active={isActive('/dashboard/viewer/wallet')} />
              </>
            )}

            {user?.role === 'admin' && (
               <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="px-4 text-xs font-bold text-gray-500 uppercase mb-2">Admin</p>
                  <NavLink to="/admin" icon={<Shield />} label="Visão Geral" active={isActive('/admin')} />
                  <NavLink to="/admin/users" icon={<Users />} label="Usuários" active={isActive('/admin/users')} />
               </div>
            )}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-dark-700">
          <button onClick={logout} className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors w-full">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen bg-black">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLink({ to, icon, label, active }: any) {
  return (
    <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-primary-600 text-white font-bold shadow-lg shadow-primary-900/20' : 'text-gray-400 hover:bg-dark-700 hover:text-white'
    }`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
