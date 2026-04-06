import { useAuth } from '../hooks/useAuth'

export function SettingsPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-800">設定</h1>

      <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-500">ログイン中</p>
        <p className="text-gray-800 mt-1">{user?.email}</p>
      </div>

      <button
        onClick={() => signOut()}
        className="mt-6 w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors"
      >
        ログアウト
      </button>
    </div>
  )
}
