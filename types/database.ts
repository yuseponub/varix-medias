export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Productos (Medias)
      productos: {
        Row: {
          id: string
          codigo: string // 74113, 74114, etc
          tipo: 'muslo' | 'panty' | 'rodilla'
          talla: 'M' | 'L' | 'XL' | 'XXL'
          precio_venta: number
          precio_compra: number
          stock_normal: number
          stock_devoluciones: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['productos']['Insert']>
      }

      // Pacientes
      pacientes: {
        Row: {
          id: string
          nombre_completo: string
          cedula: string | null
          telefono: string | null
          email: string | null
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pacientes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pacientes']['Insert']>
      }

      // Usuarios
      usuarios: {
        Row: {
          id: string
          auth_id: string
          nombre: string
          email: string
          rol: 'admin' | 'vendedor'
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }

      // Ventas
      ventas: {
        Row: {
          id: string
          fecha: string
          hora: string
          paciente_id: string | null
          paciente_nombre: string // texto libre si no tiene perfil
          producto_id: string
          cantidad: number
          precio_unitario: number
          total: number
          metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia'
          tipo_comprobante: 'credibanco' | 'redeban' | 'nequi' | 'bancolombia' | null
          num_factura: string
          foto_recibo_url: string
          foto_comprobante_url: string | null
          num_fotos_subidas: number
          vendedor_id: string
          observaciones: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ventas']['Row'], 'id' | 'created_at'>
        Update: never // Inmutable - no se puede editar
      }

      // Devoluciones
      devoluciones: {
        Row: {
          id: string
          fecha_devolucion: string
          hora: string
          venta_original_id: string
          paciente_id: string | null
          producto_id: string
          motivo: string
          estado_media: 'empaque_cerrado' | 'buen_estado' | 'danada'
          monto_devuelto: number
          metodo_devolucion: 'efectivo' | 'transferencia'
          foto_recibo_firmado_url: string
          foto_media_devuelta_url: string
          procesado_por: string // vendedor_id
          estado: 'pendiente' | 'aprobada' | 'rechazada'
          revisado_por: string | null // admin_id
          fecha_revision: string | null
          observaciones_admin: string | null
          destino_inventario: 'devoluciones' | 'normal' | 'descarte' | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['devoluciones']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<Database['public']['Tables']['devoluciones']['Row'], 'estado' | 'revisado_por' | 'fecha_revision' | 'observaciones_admin' | 'destino_inventario'>>
      }

      // Compras
      compras: {
        Row: {
          id: string
          fecha: string
          fecha_registro: string
          proveedor: string
          num_factura_proveedor: string | null
          subtotal: number
          iva: number
          total: number
          forma_pago: 'efectivo_caja' | 'jose_romero' | 'otro'
          foto_factura_url: string | null
          observaciones: string | null
          registrado_por: string // usuario_id
          estado: 'pendiente' | 'pagada' | 'parcial'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['compras']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<Database['public']['Tables']['compras']['Row'], 'estado' | 'observaciones'>>
      }

      // Compras Detalle
      compras_detalle: {
        Row: {
          id: string
          compra_id: string
          producto_id: string
          cantidad: number
          precio_unitario: number
          total: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['compras_detalle']['Row'], 'id' | 'created_at'>
        Update: never
      }

      // Recogidas de Efectivo
      recogidas_efectivo: {
        Row: {
          id: string
          fecha_recogida: string
          hora: string
          periodo_desde: string
          periodo_hasta: string
          efectivo_sistema: number
          efectivo_recogido: number
          diferencia: number
          foto_efectivo_url: string | null
          observaciones: string | null
          recogido_por: string // admin_id
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recogidas_efectivo']['Row'], 'id' | 'created_at'>
        Update: never
      }

      // Caja Efectivo (estado actual)
      caja_efectivo: {
        Row: {
          id: number // siempre 1
          saldo_actual: number
          ultima_recogida_id: string | null
          fecha_ultima_recogida: string | null
          ultima_actualizacion: string
        }
        Insert: Database['public']['Tables']['caja_efectivo']['Row']
        Update: Partial<Omit<Database['public']['Tables']['caja_efectivo']['Row'], 'id'>>
      }

      // Movimientos Inventario
      movimientos_inventario: {
        Row: {
          id: string
          fecha: string
          hora: string
          producto_id: string
          tipo: 'entrada' | 'salida' | 'ajuste' | 'devolucion'
          cantidad: number
          stock_anterior: number
          stock_nuevo: number
          referencia: string // 'venta_id', 'compra_id', etc
          usuario_id: string
          observaciones: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_inventario']['Row'], 'id' | 'created_at'>
        Update: never
      }

      // Movimientos Efectivo
      movimientos_efectivo: {
        Row: {
          id: string
          fecha: string
          hora: string
          tipo: 'venta' | 'devolucion' | 'compra' | 'recogida' | 'ajuste'
          monto: number
          saldo_anterior: number
          saldo_nuevo: number
          referencia_id: string
          responsable_id: string
          observaciones: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_efectivo']['Row'], 'id' | 'created_at'>
        Update: never
      }

      // Cierres de Caja
      cierres_caja: {
        Row: {
          id: string
          fecha: string
          vendedor_id: string
          efectivo_declarado: number
          efectivo_sistema: number
          tarjeta_sistema: number
          transferencias_sistema: number
          diferencia_efectivo: number
          observaciones: string | null
          estado: 'abierto' | 'cerrado'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cierres_caja']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<Database['public']['Tables']['cierres_caja']['Row'], 'efectivo_declarado' | 'observaciones' | 'estado'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
