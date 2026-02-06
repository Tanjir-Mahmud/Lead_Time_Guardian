'use client'

import { login, signup } from '../auth/actions'
import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Wrapper to handle server action with loading state
    const handleAction = async (formData: FormData, action: typeof login | typeof signup) => {
        setLoading(true)
        setError(null)
        try {
            const result = await action(formData)
            if (result?.error) {
                setError(result.error)
            }
        } catch (e) {
            setError('An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Lead-Time Guardian</h1>
                    <p className="text-gray-400">Secure Logistics Command Center</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                        <AlertTriangle size={18} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                            formAction={(formData) => handleAction(formData, login)}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Log In'}
                        </button>
                        <button
                            formAction={(formData) => handleAction(formData, signup)}
                            disabled={loading}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-4 rounded-lg border border-white/10 transition-colors flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign Up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
