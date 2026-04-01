import { useAuth } from './hooks/useAuth'
import { AuthPage } from './pages/AuthPage'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-teal-600 mb-4">🌿 ログイン成功！</h1>
        <p className="text-gray-700 mb-6">{user.email}</p>
        <button
          onClick={() => signOut()}
          className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}

export default App
