# 🏥 VARIX MEDIAS - Setup Instructions

## 📋 Pasos para Configurar la Base de Datos

### 1. Ir al SQL Editor de Supabase

1. Abre tu proyecto: https://supabase.com/dashboard/project/mrpxtfoykpagjgzeyyrt
2. En el menú lateral, click en **"SQL Editor"** (icono de base de datos con <>)
3. Click en **"New query"**

### 2. Ejecutar el Schema SQL

1. Abre el archivo: `supabase/schema.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Click en **"Run"** (botón verde abajo a la derecha)
5. Espera a que termine (debería decir "Success")

### 3. Configurar Storage para Fotos

1. En el menú lateral de Supabase, click en **"Storage"**
2. Click en **"Create a new bucket"**
3. Crear los siguientes buckets:

   **Bucket 1: recibos-ventas**
   - Name: `recibos-ventas`
   - Public: ☑️ SÍ (marcar como público)
   - Click "Create bucket"

   **Bucket 2: comprobantes-pago**
   - Name: `comprobantes-pago`
   - Public: ☑️ SÍ
   - Click "Create bucket"

   **Bucket 3: facturas-compras**
   - Name: `facturas-compras`
   - Public: ☑️ SÍ
   - Click "Create bucket"

   **Bucket 4: devoluciones**
   - Name: `devoluciones`
   - Public: ☑️ SÍ
   - Click "Create bucket"

   **Bucket 5: efectivo**
   - Name: `efectivo`
   - Public: ☑️ SÍ
   - Click "Create bucket"

### 4. Crear Usuario Admin (José Romero)

1. En el menú lateral, click en **"Authentication"**
2. Click en **"Users"**
3. Click en **"Add user"** → **"Create new user"**
4. Completar:
   - Email: `tu_email@gmail.com` (tu email personal)
   - Password: `[crear contraseña segura]`
   - Auto Confirm User: ☑️ SÍ
5. Click "Create user"
6. **COPIAR el User UID** que aparece (lo necesitarás)

### 5. Insertar Usuario Admin en la Tabla

1. Volver al **SQL Editor**
2. Ejecutar este query (reemplaza `[USER_UID]` y `[TU_EMAIL]`):

```sql
INSERT INTO usuarios (auth_id, nombre, email, rol, activo)
VALUES (
  '[USER_UID]',  -- Pegar el UID que copiaste
  'José Romero',
  '[TU_EMAIL]',  -- Tu email
  'admin',
  true
);
```

3. Click "Run"

### 6. Crear Usuario Vendedor (Enfermera)

Repetir pasos 4 y 5 pero con:
- Email de la enfermera
- Rol: `'vendedor'` (en lugar de 'admin')
- Nombre: Nombre de la enfermera

## ✅ Verificación

1. En SQL Editor, ejecutar:

```sql
SELECT * FROM usuarios;
SELECT * FROM productos;
SELECT * FROM caja_efectivo;
```

Deberías ver:
- 2 usuarios (tú como admin, enfermera como vendedor)
- 11 productos (las medias)
- 1 registro en caja_efectivo con saldo 0

## 🚀 Ejecutar el Proyecto

Una vez completado todo lo anterior:

```bash
cd c:\Users\Usuario\Proyectos\varix-medias
npm run dev
```

Abre: http://localhost:3000

## 📝 Credenciales

**Admin (José):**
- Email: [tu_email]
- Password: [tu_contraseña]

**Vendedor (Enfermera):**
- Email: [email_enfermera]
- Password: [su_contraseña]

## 🔧 Próximos Pasos

- [ ] Ejecutar schema.sql en Supabase
- [ ] Crear buckets de storage
- [ ] Crear usuarios (admin + vendedor)
- [ ] Verificar datos iniciales
- [ ] Probar login
