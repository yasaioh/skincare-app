import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin]   = useState(true)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')
    const { error } = isLogin
      ? await signIn(email, password)
      : await signUp(email, password)

    if (error) {
      setMessage(error.message)
    } else if (!isLogin) {
      setMessage('確認メールを送信しました。メールをご確認ください。')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-teal-600 mb-6">
          🌿 スキンケアアプリ
        </h1>
        <h2 className="text-lg font-semibold text-center mb-6">
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          {message && (
            <p className="text-sm text-center text-red-500">{message}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-teal-500 text-white py-2 rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? '処理中...' : isLogin ? 'ログイン' : '登録する'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          {isLogin ? 'アカウントをお持ちでない方は' : 'すでにアカウントをお持ちの方は'}
          <button
            onClick={() => { setIsLogin(!isLogin); setMessage('') }}
            className="text-teal-500 underline ml-1"
          >
            {isLogin ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}
