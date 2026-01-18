# 🏥 VARIX MEDIAS - Sistema de Gestión

Sistema completo para gestión de inventario, ventas y control de efectivo para medias de compresión médica.

## ✨ Características Principales

### Para el Administrador (José Romero):
- ✅ Dashboard con métricas en tiempo real
- 💰 Control total de efectivo en caja
- 📦 Gestión completa de inventario
- 🔄 Aprobación/rechazo de devoluciones
- 🛒 Registro de compras y pedidos
- 💵 Sistema de recogida de efectivo
- 📊 Reportes y análisis
- 🔍 Auditoría completa de operaciones

### Para el Vendedor (Enfermera):
- 📸 Registro rápido de ventas con OCR
- 🔄 Procesamiento de devoluciones (con aprobación admin)
- 👥 Gestión de pacientes
- 💰 Cierre de caja diario
- 📦 Consulta de inventario disponible

## 🔒 Seguridad y Controles

- ✅ Ventas inmutables (no se pueden editar ni borrar)
- ✅ Todas las transacciones con foto de respaldo
- ✅ Trazabilidad completa (quién, cuándo, qué)
- ✅ Alertas automáticas de discrepancias
- ✅ Inventario separado para devoluciones
- ✅ Sistema de permisos por roles

## 🚀 Instalación y Configuración

### 1. Requisitos Previos
- Node.js 18+ instalado
- Cuenta en Supabase (gratis)
- Git (opcional)

### 2. Configurar Base de Datos

**Sigue las instrucciones detalladas en: [SETUP.md](./SETUP.md)**

Resumen:
1. Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase
2. Crear buckets de storage para fotos
3. Crear usuarios (admin + vendedor)
4. Verificar datos iniciales

### 3. Ejecutar el Proyecto

```bash
# Navegar a la carpeta del proyecto
cd c:\Users\Usuario\Proyectos\varix-medias

# Instalar dependencias (si es necesario)
npm install

# Ejecutar en modo desarrollo
npm run dev
```

Abrir: http://localhost:3000

## 📁 Estructura del Proyecto

```
varix-medias/
├── app/
│   ├── login/              # Página de login
│   ├── admin/              # Módulos del administrador
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── inventario/     # Gestión de inventario
│   │   ├── ventas/         # Historial de ventas
│   │   ├── devoluciones/   # Aprobar devoluciones
│   │   ├── compras/        # Registrar compras
│   │   ├── efectivo/       # Recogida de efectivo
│   │   └── reportes/       # Análisis y reportes
│   └── vendedor/           # Módulos del vendedor
│       ├── vender/         # Registrar ventas
│       ├── devolver/       # Procesar devoluciones
│       └── cierre-caja/    # Cierre diario
├── lib/
│   ├── supabase/           # Cliente de Supabase
│   └── ocr/                # Procesamiento OCR
├── types/
│   └── database.ts         # Tipos TypeScript
├── supabase/
│   └── schema.sql          # Schema de base de datos
└── .env.local              # Variables de entorno
```

## 📊 Flujo de Trabajo

### Venta de Media:
1. Enfermera hace recibo manual → Toma foto
2. Sube al sistema → OCR detecta datos automáticamente
3. Confirma y guarda → Inventario se descuenta
4. Sistema registra en efectivo/tarjeta

### Devolución:
1. Cliente trae media + recibo original
2. Enfermera busca venta → Sube foto firmada
3. Procesa devolución → Tú recibes notificación
4. Apruebas/rechazas → Media va a inventario separado

### Compra de Medias:
1. Llega factura del proveedor (THERAFIRM)
2. Tú o enfermera sube foto → OCR detecta productos
3. Selecciona forma de pago (efectivo caja / José Romero)
4. Confirma → Inventario se aumenta automáticamente

### Recogida de Efectivo:
1. Cada semana/15 días, entras al sistema
2. Ves total acumulado
3. Confirmas monto recogido → Opcional: foto del dinero
4. Sistema reinicia contador de caja

## 🎯 Inventario Inicial

El sistema viene con 11 tipos de medias pre-configuradas:

| Código | Tipo    | Talla | Precio Venta | Stock |
|--------|---------|-------|--------------|-------|
| 74113  | Muslo   | M     | $175.000     | 5     |
| 74114  | Muslo   | L     | $175.000     | 8     |
| 74115  | Muslo   | XL    | $175.000     | 0     |
| 74116  | Muslo   | XXL   | $175.000     | 0     |
| 75406  | Panty   | M     | $175.000     | 4     |
| 75407  | Panty   | L     | $175.000     | 6     |
| 75408  | Panty   | XL    | $175.000     | 0     |
| 75409  | Panty   | XXL   | $175.000     | 0     |
| 79321  | Rodilla | M     | $130.000     | 0     |
| 79322  | Rodilla | L     | $130.000     | 17    |
| 79323  | Rodilla | XL    | $130.000     | 0     |

## 🔧 Tecnologías Utilizadas

- **Frontend**: Next.js 15 + React 19
- **Backend**: Next.js API Routes
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage (fotos)
- **Estilos**: Tailwind CSS
- **OCR**: Google Vision API / Tesseract.js
- **Deploy**: Vercel (recomendado)

## 📝 Variables de Entorno

El archivo `.env.local` ya está configurado con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mrpxtfoykpagjgzeyyrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu_key]
SUPABASE_SERVICE_ROLE_KEY=[tu_key]
```

⚠️ **Importante**: Nunca subas `.env.local` a Git (ya está en `.gitignore`)

## 🚢 Despliegue a Producción

### Opción 1: Vercel (Recomendado)

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Conectar tu repositorio (o crear uno)
3. Configurar variables de entorno
4. Deploy automático con cada commit

### Opción 2: Otro hosting

El proyecto es un Next.js estándar, compatible con cualquier hosting que soporte Node.js.

## 📞 Soporte

Si tienes preguntas o problemas:
1. Revisa [SETUP.md](./SETUP.md)
2. Verifica la consola del navegador para errores
3. Revisa los logs de Supabase

## 📄 Licencia

Proyecto privado - Varix Center Bucaramanga

## 🎉 Estado del Desarrollo

✅ **Completado**:
- Estructura del proyecto
- Base de datos completa
- Sistema de autenticación
- Dashboard admin básico

🚧 **En Desarrollo**:
- OCR automático para recibos
- Módulos de inventario completo
- Sistema de ventas
- Sistema de devoluciones
- Sistema de compras
- Sistema de recogida de efectivo
- Reportes y análisis

---

**Desarrollado con ❤️ para Varix Center**
