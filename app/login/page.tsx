'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Login con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Obtener datos del usuario con permisos
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select(`
          *,
          permisos_usuario (*)
        `)
        .eq('auth_id', authData.user.id)
        .single()

      console.log('Auth ID:', authData.user.id)
      console.log('Usuario encontrado:', usuario)
      console.log('Error usuario:', usuarioError)

      if (usuarioError || !usuario) {
        throw new Error(`Usuario no encontrado en el sistema. Auth ID: ${authData.user.id}`)
      }

      // Extraer permisos
      const permisos = usuario.permisos_usuario?.[0]

      // Guardar datos en localStorage
      localStorage.setItem('user_role', usuario.rol)
      localStorage.setItem('user_name', usuario.nombre)
      localStorage.setItem('user_id', usuario.id)

      // Redirigir según rol y permisos
      // Si es admin, siempre va al dashboard de admin
      if (usuario.rol === 'admin') {
        router.push('/admin/dashboard')
      }
      // Si es vendedor pero tiene permisos de ver dashboard, compras, historial o gestionar usuarios, va a admin
      else if (permisos && (
        permisos.puede_ver_dashboard === true ||
        permisos.puede_ver_compras === true ||
        permisos.puede_ver_historial === true ||
        permisos.puede_gestionar_usuarios === true
      )) {
        router.push('/admin/dashboard')
      }
      // Vendedor normal va a su panel de ventas
      else {
        router.push('/vendedor/vender')
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">VARIX MEDIAS</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestión</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Sistema de gestión de medias de compresión</p>
          <p className="mt-1">Varix Center - Bucaramanga</p>
        </div>
      </div>
    </div>
  )
}
