import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

export function ProductsPage() {
  const { user } = useAuth()
  const {
    searchResults,
    userProducts,
    loading,
    userProductsLoading,
    error,
    searchProducts,
    addUserProduct,
    registeredProductIds,
  } = useProducts(user?.id)

  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleSearch = (value: string) => {
    setQuery(value)
    searchProducts(value)
  }

  const handleAdd = async (productId: string) => {
    setAddingId(productId)
    await addUserProduct(productId)
    setAddingId(null)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">製品ログ</h1>
        <p className="mt-1 text-sm text-gray-500">
          使用中のスキンケア製品を記録しましょう。
        </p>
      </div>

      {/* 登録済み製品 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          登録済みの製品
        </h2>
        {userProductsLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : userProducts.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだ製品が登録されていません。下の検索から追加してください。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {userProducts.map((up) => (
              <div
                key={up.id}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <p className="font-medium text-gray-800">
                  {up.products.name}
                </p>
                {up.products.brand && (
                  <p className="text-sm text-gray-500">{up.products.brand}</p>
                )}
                {up.products.category && (
                  <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {up.products.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 製品検索 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          製品を検索して追加
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="製品名・ブランド名で検索..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />

        {error && (
          <p className="mt-2 text-sm text-red-500">エラー: {error}</p>
        )}

        {loading && (
          <p className="mt-3 text-sm text-gray-400">検索中...</p>
        )}

        {!loading && query && searchResults.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">
            該当する製品が見つかりませんでした。
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {searchResults.map((product) => {
              const isRegistered = registeredProductIds.has(product.id)
              const isAdding = addingId === product.id

              return (
                <div
                  key={product.id}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <p className="font-medium text-gray-800">{product.name}</p>
                  {product.brand && (
                    <p className="text-sm text-gray-500">{product.brand}</p>
                  )}
                  {product.category && (
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {product.category}
                    </span>
                  )}
                  <div className="mt-2">
                    {isRegistered ? (
                      <span className="text-xs text-green-600 font-medium">
                        追加済み
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(product.id)}
                        disabled={isAdding}
                        className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                      >
                        {isAdding ? '追加中...' : '追加'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
