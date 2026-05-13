// ============================================
// LAYOUT PRINCIPAL CRM - Estilo Maqui Mary
// Con verificación de autenticación
// ============================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FileText, 
  Users, 
  Package,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  Store,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Boxes,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Rutas públicas que NO requieren autenticación y NO usan este layout
const PUBLIC_ROUTES = ['/crm/login', '/crm/cambiar-contrasena'];

// ============================================
// ITEMS DE NAVEGACIÓN SIMPLIFICADOS
// ============================================

const menuItems = [
  { 
    href: '/crm', 
    label: 'Dashboard', 
    icon: BarChart3,
  },
  { 
    href: '/crm/documentos', 
    label: 'Documentos', 
    icon: FileText,
    badge: 'BOL/FAC/GUI'
  },
  { 
    href: '/crm/clientes', 
    label: 'Clientes', 
    icon: Users,
  },
  { 
    href: '/crm/transportistas', 
    label: 'Transportistas', 
    icon: Package,
  },
  { 
    href: '/crm/productos', 
    label: 'Productos', 
    icon: ShoppingBag,
  },
  { 
    href: '/crm/inventario', 
    label: 'Inventario', 
    icon: Boxes,
  },
  { 
    href: '/crm/configuracion', 
    label: 'Configuración', 
    icon: Settings,
  },
];

// ============================================
// COMPONENTE DE CARGA
// ============================================

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-accent-sand/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-accent-terracotta animate-spin" />
        <p className="text-ink-600 font-medium">Verificando acceso...</p>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE SIDEBAR
// ============================================

function Sidebar({ 
  isOpen, 
  onClose,
  onLogout
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-accent-cream border-r border-ink-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink-200">
          <Link href="/" className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 bg-gradient-to-br from-accent-terracotta to-accent-gold rounded-lg flex items-center justify-center shadow-warm">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-ink-800 text-sm">Maqui Mary</h1>
              <p className="text-xs text-ink-500">Sistema de Gestión</p>
            </div>
          </Link>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-ink-100 rounded-lg"
          >
            <X className="w-5 h-5 text-ink-600" />
          </button>
        </div>

        {/* Botón volver al landing */}
        <div className="p-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
              bg-accent-sand text-ink-700 hover:bg-accent-gold/20 transition-all duration-200
              border border-ink-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>
        </div>

        {/* Menú */}
        <nav className="px-3 pb-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-accent-terracotta text-white shadow-warm' 
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  }
                `}
              >
                <Icon className={`
                  w-5 h-5 transition-colors
                  ${isActive ? 'text-white' : 'text-ink-400 group-hover:text-ink-600'}
                `} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full font-mono
                    ${isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-ink-100 text-ink-600'
                    }
                  `}>
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-white/70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ink-200 bg-accent-cream">
          {/* Empresa Info */}
          <div className="mb-3 p-3 bg-ink-50 rounded-xl border border-ink-200">
            <p className="text-xs font-semibold text-ink-700">INVERSIONES MAQUI MARY</p>
            <p className="text-xs text-ink-500">RUC: 20606218801</p>
          </div>
          
          {/* Usuario */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent-gold/20 rounded-full flex items-center justify-center border border-accent-gold">
              <User className="w-5 h-5 text-accent-terracotta" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-700 truncate">Empleado</p>
              <p className="text-xs text-ink-500">Sistema CRM</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 hover:bg-red-50 rounded-lg text-ink-400 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ============================================
// HEADER
// ============================================

function Header({ 
  onMenuClick,
  titulo
}: { 
  onMenuClick: () => void;
  titulo: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-accent-cream border-b border-ink-200 shadow-soft">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Izquierda */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-ink-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-ink-600" />
          </button>
          <h2 className="text-lg font-heading font-semibold text-ink-800">{titulo}</h2>
        </div>

        {/* Derecha */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent-gold hover:bg-accent-goldlight 
              text-ink-900 rounded-xl font-medium transition-all shadow-warm hover:shadow-elevated"
          >
            <Store className="w-4 h-4" />
            <span>Ir a la Tienda</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ============================================
// LAYOUT PRINCIPAL CON AUTENTICACIÓN
// ============================================

export default function CRMLayout({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No hay sesión, redirigir al login
          router.push('/crm/login');
          return;
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error verificando auth:', error);
        router.push('/crm/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        router.push('/crm/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Función de logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sesión cerrada');
      router.push('/crm/login');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  // Obtener título según ruta
  const getTitulo = () => {
    const item = menuItems.find(i => pathname === i.href || pathname?.startsWith(i.href + '/'));
    return item?.label || 'Dashboard';
  };

  // Si es ruta pública, renderizar solo los children sin layout ni protección
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Mostrar pantalla de carga mientras verifica auth
  if (loading) {
    return <LoadingScreen />;
  }

  // Si no está autenticado, no renderizar nada (ya redirige el useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-accent-sand/30">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          titulo={getTitulo()}
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
