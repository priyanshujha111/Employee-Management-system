import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import api from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')

  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setForgotMessage('')
    setLoading(true)

    try {
      const result = await login(email, password)

      setLoading(false)

      if (!result.success) {
        setError(result.message)
        return
      }

      navigate(
        result.user.role === 'admin'
          ? '/admin/dashboard'
          : '/employee/dashboard'
      )
    } catch (err) {
      setLoading(false)
      setError('Unable to login. Please try again.')
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()

    setError('')
    setForgotMessage('')

    if (!email.trim()) {
      setError('Please enter your email address first.')
      return
    }

    setForgotLoading(true)

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim()
      })

      if (response.data.success) {
        setForgotMessage(
          response.data.message ||
          'Password reset instructions have been sent to your email.'
        )
      } else {
        setError(
          response.data.message ||
          'Unable to process password reset request.'
        )
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to process password reset request.'
      )
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[520px]">

        {/* Left brand panel */}
        <div className="w-full lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 flex flex-col justify-between relative overflow-hidden">

          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white" />
            <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-white" />
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>

            <div>
              <p className="text-white font-bold text-sm leading-tight">
                EMS
              </p>

              <p className="text-white/70 text-[10px]">
                Employee Management System
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-white font-extrabold text-2xl leading-tight mb-2">
              Employee Management System
            </h1>

            <div className="w-10 h-1 bg-emerald-400 rounded-full mb-3" />

            <p className="text-white/80 text-xs leading-relaxed max-w-xs">
              Manage your workforce efficiently and empower your team to
              achieve more.
            </p>
          </div>

          <div className="relative z-10 bg-white rounded-lg shadow-lg p-2.5 max-w-[220px]">
            <div className="flex gap-1 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                </svg>
              </div>

              <div className="flex-1 space-y-1 pt-0.5">
                <div className="h-1 bg-slate-200 rounded w-3/4" />
                <div className="h-1 bg-slate-100 rounded w-1/2" />
              </div>

              <div className="flex items-end gap-0.5 h-6">
                <span className="w-1 bg-indigo-300 rounded-sm h-2" />
                <span className="w-1 bg-indigo-400 rounded-sm h-4" />
                <span className="w-1 bg-indigo-600 rounded-sm h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto">
          <div className="mx-auto w-full max-w-sm">

            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                Welcome back
              </h2>

              <p className="text-slate-500 text-xs mt-0.5">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email address
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>

                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="text-indigo-600 font-medium hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading
                    ? 'Sending...'
                    : 'Forgot password?'}
                </button>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg px-3 py-2 text-xs">
                  {error}
                </div>
              )}

              {forgotMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-xs">
                  {forgotMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}