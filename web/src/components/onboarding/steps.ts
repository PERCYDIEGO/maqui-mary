export interface OnboardingStep {
  id: string
  page: string // pathname donde aparece
  title: string
  message: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  highlightSelector?: string // selector CSS para resaltar (opcional)
  action?: 'click' | 'type' | 'scroll' | 'none'
  actionTarget?: string
  roles: ('admin' | 'editor' | 'viewer')[]
  icon?: 'wave' | 'point' | 'think' | 'celebrate' | 'warn'
}

// PASOS POR ROL Y PÁGINA
export const onboardingSteps: OnboardingStep[] = [
  // ─── DASHBOARD (todos) ───
  {
    id: 'dash-welcome',
    page: '/crm',
    title: '¡Bienvenido a FactuMary! 🧽',
    message: 'Soy tu esponja guía. Te voy a acompañar para que uses el sistema como un crack. ¿Listo?',
    position: 'bottom-right',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'wave',
  },
  {
    id: 'dash-stats',
    page: '/crm',
    title: 'Tu panel de control',
    message: 'Aquí ves las estadísticas del día: ventas, productos más vendidos y alertas de stock bajo. Todo en una mirada.',
    position: 'top-left',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'point',
  },
  {
    id: 'dash-nav',
    page: '/crm',
    title: 'Navegación rápida',
    message: 'A tu izquierda tienes el menú. Desde ahí accedes a Productos, Clientes, Facturas y más. Toca cualquiera y te explico.',
    position: 'bottom-left',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'point',
  },

  // ─── PRODUCTOS (admin + editor) ───
  {
    id: 'prod-intro',
    page: '/crm/productos',
    title: 'Catálogo de Esponjas 🧼',
    message: 'Acá manejas todos tus productos. Puedes agregar nuevos esponjas, editar precios, stock y subir fotos.',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },
  {
    id: 'prod-new',
    page: '/crm/productos',
    title: 'Agregar producto nuevo',
    message: 'Haz clic en el botón "Nuevo Producto". Completa nombre, precio, categoría (Colores, Acero, Doble Uso, etc.) y sube una foto bonita.',
    position: 'top-right',
    highlightSelector: 'button:has-text("Nuevo")',
    roles: ['admin', 'editor'],
    icon: 'point',
  },
  {
    id: 'prod-stock',
    page: '/crm/productos',
    title: 'Control de stock',
    message: 'El número que ves es tu stock actual. Si baja de 20 unidades, te aviso con una alerta naranja. ¡Nunca te quedes sin esponjas!',
    position: 'center',
    roles: ['admin', 'editor'],
    icon: 'warn',
  },

  // ─── INVENTARIO (admin + editor) ───
  {
    id: 'inv-intro',
    page: '/crm/inventario',
    title: 'Movimientos de Stock 📦',
    message: 'Aquí registras entradas y salidas de productos. Cuando llega mercadería nueva, registra una ENTRADA. Si se daña o pierde, una SALIDA.',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },

  // ─── CLIENTES (admin + editor) ───
  {
    id: 'cli-intro',
    page: '/crm/clientes',
    title: 'Tu base de clientes 📇',
    message: 'Registra a cada cliente con nombre, RUC, dirección y teléfono. Así facturarles después es pan comido.',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },
  {
    id: 'cli-freq',
    page: '/crm/clientes',
    title: 'Clientes frecuentes',
    message: 'Los clientes guardados aparecen automáticamente cuando facturas. No necesitas volver a escribir sus datos. ¡Tiempo es dinero!',
    position: 'center',
    roles: ['admin', 'editor'],
    icon: 'think',
  },

  // ─── FACTURAS (admin + editor) ───
  {
    id: 'fac-intro',
    page: '/crm/facturas',
    title: 'Facturas electrónicas 📄',
    message: 'Este es tu historial de facturas. Cada una tiene número correlativo (F001-0001, F001-0002...). Puedes ver, descargar o reimprimir.',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },
  {
    id: 'fac-new',
    page: '/crm/facturas/nueva',
    title: 'Creando una factura ✍️',
    message: 'Paso 1: Busca al cliente o regístralo nuevo.\nPaso 2: Agrega productos del catálogo.\nPaso 3: El sistema calcula automático IGV (18%).\nPaso 4: ¡Emite y listo!',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },
  {
    id: 'fac-whatsapp',
    page: '/crm/facturas/nueva',
    title: 'Compartir por WhatsApp 📱',
    message: 'Una vez emitida, puedes enviar la factura directo al WhatsApp del cliente. Él la recibe como PDF. ¡Tecnología al servicio de tu negocio!',
    position: 'top-right',
    roles: ['admin', 'editor'],
    icon: 'celebrate',
  },

  // ─── PEDIDOS (admin + editor) ───
  {
    id: 'ped-intro',
    page: '/crm/pedidos',
    title: 'Pedidos de la web 🛒',
    message: 'Aquí llegan los pedidos que hacen los clientes desde tu página web maquimary.com.pe. Puedes ver quién pidió, qué, cuánto pagó y si ya subió comprobante.',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'point',
  },

  // ─── USUARIOS (admin only) ───
  {
    id: 'usr-intro',
    page: '/crm/usuarios',
    title: 'Gestión de usuarios 👥',
    message: 'Como administrador, aquí creas cuentas para tu equipo. Puedes dar acceso de Editor (vende y factura) o Visor (solo mira, no toca).',
    position: 'bottom-right',
    roles: ['admin'],
    icon: 'point',
  },
  {
    id: 'usr-roles',
    page: '/crm/usuarios',
    title: 'Roles de acceso',
    message: '• Admin: Control total\n• Editor: Productos, clientes, facturas, pedidos\n• Visor: Solo lectura, no puede crear ni editar\n\nAsigna según el puesto de cada trabajador.',
    position: 'center',
    roles: ['admin'],
    icon: 'think',
  },

  // ─── CONFIGURACIÓN (admin + editor) ───
  {
    id: 'cfg-intro',
    page: '/crm/configuracion',
    title: 'Datos de tu empresa 🏢',
    message: 'Aquí configuras el nombre de tu empresa, RUC, dirección, teléfono y serie de facturas. ¡Muy importante para que las facturas salgan bien!',
    position: 'bottom-right',
    roles: ['admin', 'editor'],
    icon: 'warn',
  },
  {
    id: 'cfg-series',
    page: '/crm/configuracion',
    title: 'Series y numeración',
    message: 'La serie (ej: F001) y el número siguiente se usan para la numeración correlativa. No los cambies a menos que SUNAT te diga.',
    position: 'center',
    roles: ['admin', 'editor'],
    icon: 'warn',
  },

  // ─── VIEWER (solo lectura) ───
  {
    id: 'view-intro',
    page: '/crm',
    title: 'Modo Visor 👀',
    message: 'Tienes acceso de solo lectura. Puedes ver productos, clientes, facturas y estadísticas, pero no crear ni editar. Si necesitas más permisos, habla con el administrador.',
    position: 'bottom-right',
    roles: ['viewer'],
    icon: 'think',
  },

  // ─── LANDING PAGE (público — todos los roles) ───
  {
    id: 'landing-welcome',
    page: '/',
    title: '¡Bienvenido a Maqui Mary! 🧽',
    message: 'Hola, soy tu esponja guía. Te muestro lo mejor de nuestra tienda de esponjas peruanas. ¡Vamos!',
    position: 'bottom-right',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'wave',
  },
  {
    id: 'landing-hero',
    page: '/',
    title: 'Hecho en Perú 🇵🇪',
    message: 'Somos fabricantes de esponjas en Lurigancho, Lima. Calidad peruana directo a tu hogar. Puedes cotizar por WhatsApp o comprar directo aquí.',
    position: 'bottom-right',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'point',
  },
  {
    id: 'landing-products',
    page: '/',
    title: 'Nuestros Productos 🧼',
    message: 'Desplázate hacia abajo para ver nuestro catálogo: Esponjas de colores, Acero, Doble Uso y Paquetes. Todos al por mayor y menor.',
    position: 'center',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'point',
  },
  {
    id: 'landing-cart',
    page: '/',
    title: 'Carrito de compras 🛒',
    message: 'Haz clic en el ícono del carrito arriba a la derecha para agregar productos y pagar con Yape o Plin. ¡Fácil y rápido!',
    position: 'top-right',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'celebrate',
  },
  {
    id: 'landing-crm',
    page: '/',
    title: '¿Eres del equipo? 🔐',
    message: 'Si trabajas con nosotros, haz clic en "Personal" o "Acceso Personal" arriba a la derecha para entrar al panel de gestión.',
    position: 'bottom-left',
    roles: ['admin', 'editor', 'viewer'],
    icon: 'think',
  },
]

// Pasos por página para facilitar lookups
export function getStepsForPage(page: string, role: string): OnboardingStep[] {
  return onboardingSteps.filter(
    step => step.page === page && step.roles.includes(role as any)
  )
}
