// ============================================
// LAYOUT PRINCIPAL CRM - Estilo Maqui Mary
// Con verificación de autenticación
// ============================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
  ShoppingCart,
  Boxes,
  Settings,
  Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const GuiaAnimada = dynamic(() => import('@/components/GuiaAnimada'), { ssr: false });

type UserRole = 'admin' | 'vendedor' | 'almacen' | null;

type PageStepEntry = {
  icon: string;
  title: string;
  message: string;
  mood: 'wave' | 'point' | 'celebrate' | 'think' | 'warn';
  roles?: NonNullable<UserRole>[];
  sectionId?: string; // coincide con data-crm-section en la página
};

// ─── Tips dinámicos por página (con filtro opcional por rol) ───
const PAGE_STEPS: Record<string, PageStepEntry[]> = {
  '/crm': [
    { icon: '📊', title: 'Panel principal', message: 'Aquí ves el resumen completo del negocio. Desplázate hacia abajo para ver ventas, pedidos pendientes y los productos más vendidos.', mood: 'wave' },
    { icon: '📈', title: 'Gráfico de ventas', message: 'Cada barra es un día de los últimos 7. La más oscura es hoy. Solo suma boletas y facturas SUNAT — los pedidos web sin confirmar no cuentan.', mood: 'point', sectionId: 'chart' },
    { icon: '🛒', title: 'Pedidos Yape/Plin', message: 'Los pedidos del landing llegan aquí en tiempo real. Cuando parpadea en naranja hay pedidos sin atender. ¡Confírmalos a tiempo para no perder al cliente!', mood: 'warn', sectionId: 'pedidos-web' },
    { icon: '🏆', title: 'Top 5 productos', message: 'El ranking muestra los productos más vendidos del historial. La barra completa = puesto 1. Úsalo para decidir qué reponer primero en almacén.', mood: 'celebrate', sectionId: 'top-productos' },
    { icon: '📄', title: 'Documentos recientes', message: 'Los últimos 6 documentos SUNAT. El chip verde "ACEPTADO" confirma que SUNAT los recibió. Rojo "RECHAZADO" necesita corrección urgente.', mood: 'think', sectionId: 'docs-recientes' },
    { icon: '⚡', title: 'Accesos rápidos', message: 'Emite boletas, facturas y guías en un clic desde aquí. El botón más usado por vendedores es "Nueva Boleta".', mood: 'celebrate', sectionId: 'accesos-rapidos', roles: ['admin', 'vendedor'] },
    { icon: '📦', title: 'Accesos rápidos', message: 'El enlace a "Inventario" te lleva directo a revisar stock. Si hay alertas, resuélvelas antes de que lleguen pedidos que no puedes cumplir.', mood: 'warn', sectionId: 'accesos-rapidos', roles: ['almacen'] },
  ],

  '/crm/pedidos': [
    { icon: '🛒', title: 'Pedidos del landing', message: 'Aquí llegan los pedidos de la tienda online. El cliente paga con Yape o Plin, sube el comprobante, y el pedido aparece aquí con estado "Pendiente".', mood: 'wave' },
    { icon: '🔍', title: 'Filtrar pedidos', message: 'Usa los botones "Pendientes / Confirmados" para filtrar rápido. El buscador encuentra por nombre de cliente. Revisa primero los pendientes del día.', mood: 'point', sectionId: 'filtros' },
    { icon: '👁️', title: 'Ver el comprobante', message: 'Toca "Ver detalle" para ver la foto del Yape/Plin. Verifica que el monto coincida con el total del pedido antes de confirmar.', mood: 'think', sectionId: 'lista-pedidos' },
    { icon: '✅', title: 'Confirmar pedido', message: 'El botón verde ✓ confirma el pedido y descuenta el stock automáticamente. El historial queda en "Movimientos" del inventario.', mood: 'celebrate', sectionId: 'lista-pedidos' },
    { icon: '❌', title: 'Cancelar si hay duda', message: 'El botón rojo ✗ cancela sin tocar el stock. Úsalo si el pago no llegó, el monto no coincide, o el cliente desistió. Siempre llama antes de cancelar.', mood: 'warn', sectionId: 'lista-pedidos' },
  ],

  '/crm/documentos': [
    { icon: '📄', title: 'Tipos de documentos', message: 'Aquí gestionas boletas, facturas y guías de remisión. Las boletas van para personas naturales con DNI, las facturas para empresas con RUC.', mood: 'wave' },
    { icon: '➕', title: 'Crear documento', message: 'Toca el botón "+ Nueva Boleta" o "+ Nueva Factura". El formulario tiene 4 pasos: cliente, productos, vista previa y emisión.', mood: 'point' },
    { icon: '🔍', title: 'Buscar documentos', message: 'Usa el buscador para encontrar por número, cliente o fecha. Filtra por tipo o estado SUNAT para ver solo lo que necesitas.', mood: 'think' },
    { icon: '📤', title: 'Estado SUNAT', message: 'El chip verde "Aceptado" significa que SUNAT recibió el CDR. "Pendiente" aún no se envió. "Rechazado" tiene un error que corregir.', mood: 'warn' },
    { icon: '🖨️', title: 'Descargar PDF', message: 'Cada documento tiene botón de PDF. El PDF incluye el QR oficial de SUNAT que el cliente puede escanear para validar el comprobante.', mood: 'celebrate' },
  ],

  '/crm/sunat': [
    { icon: '🔑', title: 'Configuración SUNAT', message: 'Esta sección solo la ve el administrador. Aquí configuras el certificado digital (.pfx) y las claves SOL para emitir documentos electrónicos válidos.', mood: 'wave', roles: ['admin'] },
    { icon: '📜', title: 'Certificado digital', message: 'El archivo .pfx es como la firma digital de la empresa. Lo emite una CA autorizada (ej. DigiCert, Encert). Sin él, no hay emisión válida ante SUNAT.', mood: 'point', roles: ['admin'] },
    { icon: '🌐', title: 'Modo de emisión', message: '"SUNAT Directo" envía con tu certificado por SOAP. "OSE/Nubefact" delega la firma a un proveedor externo. Ambos son válidos ante SUNAT.', mood: 'think', roles: ['admin'] },
    { icon: '🧪', title: 'Ambiente Beta', message: 'Activa el modo beta para hacer pruebas sin afectar la numeración real. Los documentos beta NO son válidos tributariamente — úsalo solo para probar.', mood: 'warn', roles: ['admin'] },
    { icon: '✅', title: 'Verificar en SUNAT', message: 'Después de emitir, puedes validar el comprobante en sunat.gob.pe → "Consulta de Validez del CPE". Si aparece, ¡todo perfecto!', mood: 'celebrate', roles: ['admin'] },
  ],

  '/crm/clientes': [
    { icon: '👥', title: 'Base de clientes', message: 'Aquí están todos los clientes que han comprado alguna vez. Se crean automáticamente al emitir un documento, o los puedes agregar manualmente.', mood: 'wave' },
    { icon: '⭐', title: 'Clientes frecuentes', message: 'Los clientes con ⭐ tienen 3 o más compras. Al emitir un documento, búscalos por DNI o RUC y sus datos se autocompletan automáticamente.', mood: 'point' },
    { icon: '🔍', title: 'Buscar cliente', message: 'Escribe el nombre, DNI o RUC en el buscador. También puedes filtrar por tipo (natural/jurídica) o por cantidad de compras.', mood: 'think' },
    { icon: '📋', title: 'Historial de compras', message: 'Al tocar un cliente ves todos sus documentos anteriores: boletas, facturas y guías. Ideal para saber el historial de relación comercial.', mood: 'celebrate' },
  ],

  '/crm/productos': [
    { icon: '🧽', title: 'Catálogo de productos', message: 'Aquí están todas las esponjas y productos que vende Maqui Mary. Cada uno tiene precio, stock actual y código interno.', mood: 'wave' },
    { icon: '📦', title: 'Stock en tiempo real', message: 'El número en naranja/rojo indica stock bajo (menos de 20 unidades). Avisa al equipo de almacén para reponer antes de quedarse en cero.', mood: 'warn' },
    { icon: '✏️', title: 'Editar producto', message: 'Toca el botón de editar para actualizar precio, descripción o foto. Los cambios se reflejan en el formulario de documentos al instante.', mood: 'point', roles: ['admin', 'vendedor'] },
    { icon: '➕', title: 'Agregar producto', message: 'El botón "+ Nuevo Producto" abre el formulario. Pon el nombre exacto como quieres que aparezca en las boletas y facturas SUNAT.', mood: 'celebrate', roles: ['admin'] },
    { icon: '🔍', title: 'Buscar producto', message: 'Usa el buscador para encontrar rápido. En el formulario de documentos también puedes buscar productos por nombre para agregarlos a la venta.', mood: 'think' },
  ],

  '/crm/inventario': [
    { icon: '📦', title: 'Control de inventario', message: 'Aquí controlas el stock de todos los productos. Los semáforos de color indican el nivel: verde = OK, naranja = bajo, rojo = agotado.', mood: 'wave' },
    { icon: '🟠', title: 'Resumen de alertas', message: 'Los 3 contadores muestran: stock normal (≥50), bajo (<50) y agotado (0). Si hay rojos, coordina reposición antes de confirmar pedidos del landing.', mood: 'warn', sectionId: 'resumen-stock' },
    { icon: '➕', title: 'Registrar entrada de lote', message: 'Toca el botón verde + en cualquier producto para registrar una entrada. Pon la cantidad que llegó y el motivo (ej: "Producción del 12/05"). El stock sube al instante.', mood: 'point', sectionId: 'lista-productos' },
    { icon: '📋', title: 'Historial del producto', message: 'El ícono 📋 muestra el historial de entradas de ese producto. Puedes deshacer entradas manuales si te equivocaste — pero no las vinculadas a ventas.', mood: 'think', sectionId: 'lista-productos' },
    { icon: '🤖', title: 'Salidas automáticas', message: 'No ves las salidas en esta lista porque se registran solas. Cada pedido web confirmado o documento SUNAT emitido descuenta el stock automáticamente.', mood: 'celebrate' },
  ],

  '/crm/transportistas': [
    { icon: '🚛', title: 'Registro de transportistas', message: 'Aquí guardas los datos de los conductores para emitir guías de remisión. Cada guía necesita un transportista registrado con placa y licencia.', mood: 'wave' },
    { icon: '➕', title: 'Agregar transportista', message: 'Toca "+ Nuevo Transportista". Necesitas: nombre completo, DNI, N° licencia, placa del vehículo y el tipo de transporte.', mood: 'point', roles: ['admin', 'vendedor'] },
    { icon: '🚗', title: 'Formato de placa', message: 'La placa peruana tiene 3 letras + 3 números (ej. ABC-123). El sistema valida el formato automáticamente al guardar el transportista.', mood: 'think' },
    { icon: '✅', title: 'Estado activo/inactivo', message: 'Usa el toggle de estado para activar o desactivar transportistas. Solo los activos aparecen en el selector al emitir guías de remisión.', mood: 'celebrate' },
  ],

  '/crm/configuracion': [
    { icon: '⚙️', title: 'Configuración del sistema', message: 'Aquí configuras los datos de la empresa que aparecen en todos los documentos SUNAT: razón social, RUC, dirección y series de comprobantes.', mood: 'wave', roles: ['admin'] },
    { icon: '🔢', title: 'Series de documentos', message: 'La serie define la numeración: B001 para boletas, F001 para facturas, T001 para guías. Cada serie tiene su propio correlativo que nunca se resetea.', mood: 'point', roles: ['admin'] },
    { icon: '🏢', title: 'Datos de empresa', message: 'Actualiza la dirección y teléfono si cambias de local. El RUC y razón social NUNCA deben cambiar sin coordinarlo con SUNAT primero.', mood: 'warn', roles: ['admin'] },
    { icon: '📱', title: 'Config de tienda web', message: 'Aquí también configuras los números de Yape/Plin y cuenta bancaria que aparecen en el landing page para que los clientes hagan sus pagos.', mood: 'think', roles: ['admin'] },
  ],
};

// Rutas públicas que NO requieren autenticación y NO usan este layout
const PUBLIC_ROUTES = ['/crm/login', '/crm/cambiar-contrasena'];

// ============================================
// ITEMS DE NAVEGACIÓN SIMPLIFICADOS
// ============================================

const menuItems = [
  { href: '/crm',              label: 'Dashboard',     icon: BarChart3     },
  { href: '/crm/documentos',   label: 'Documentos',    icon: FileText,     badge: 'BOL/FAC/GUI' },
  { href: '/crm/pedidos',      label: 'Pedidos web',   icon: ShoppingCart  },
  { href: '/crm/sunat',        label: 'Envío SUNAT',   icon: Send,         badge: 'ADMIN'       },
  { href: '/crm/clientes',     label: 'Clientes',      icon: Users         },
  { href: '/crm/transportistas', label: 'Transportistas', icon: Package    },
  { href: '/crm/productos',    label: 'Productos',     icon: ShoppingBag   },
  { href: '/crm/inventario',   label: 'Inventario',    icon: Boxes         },
  { href: '/crm/configuracion', label: 'Configuración', icon: Settings     },
  { href: '/crm/usuarios',     label: 'Usuarios',     icon: User,  badge: 'ADMIN'  },
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
  onLogout,
  pendingOrders,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  pendingOrders: number;
  userName: string;
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
                {/* Badge de pedidos pendientes */}
                {item.href === '/crm/pedidos' && pendingOrders > 0 && (
                  <span className={`
                    text-xs px-2 py-0.5 rounded-full font-bold animate-pulse
                    ${isActive ? 'bg-white/30 text-white' : 'bg-red-500 text-white'}
                  `}>
                    {pendingOrders}
                  </span>
                )}
                {item.badge && item.href !== '/crm/pedidos' && (
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
              <p className="text-sm font-medium text-ink-700 truncate">{userName || 'Empleado'}</p>
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
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState('');
  const [pendingOrders, setPendingOrders] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/crm/login');
          return;
        }

        setIsAuthenticated(true);
        setUserId(session.user.id);

        // Obtener rol y nombre del perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, alias')
          .eq('id', session.user.id)
          .single();

        setUserName(profile?.full_name || profile?.alias || '');
        if (profile?.role) {
          const rol = profile.role as string;
          if (rol === 'admin' || rol === 'superusuario') setUserRole('admin');
          else if (rol === 'almacen' || rol === 'visor') setUserRole('almacen');
          else setUserRole('vendedor');
        } else {
          setUserRole('vendedor');
        }

        // Conteo de pedidos web pendientes para el badge del sidebar
        const { count } = await supabase.from('facturas')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .or('origen.eq.web,payment_method.in.(yape,plin)');
        setPendingOrders(count || 0);
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

  // Steps dinámicos según página actual y rol del usuario
  const currentSteps = useMemo(() => {
    if (!userRole) return [];

    // Buscar la ruta más específica que coincida
    const sortedPaths = Object.keys(PAGE_STEPS).sort((a, b) => b.length - a.length);
    const matchedPath = sortedPaths.find(path =>
      pathname === path || pathname?.startsWith(path + '/')
    ) ?? '/crm';

    const steps = PAGE_STEPS[matchedPath] ?? PAGE_STEPS['/crm'];

    // Filtrar por rol si el step especifica roles
    return steps.filter(step => !step.roles || step.roles.includes(userRole));
  }, [pathname, userRole]);

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
        pendingOrders={pendingOrders}
        userName={userName}
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

      {/* Esponja guía dinámica por página */}
      {userRole && currentSteps.length > 0 && (
        <GuiaAnimada
          mode="crm"
          userId={userId}
          crmSteps={currentSteps}
        />
      )}
    </div>
  );
}
