import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useProducts } from '../hooks/useProducts'
import { useProductSearch, type ProductHit } from '../hooks/useProductSearch'
import { BarcodeScanner } from '../components/BarcodeScanner'

export function ProductsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const {
    userProducts,
    userProductsLoading,
    error: registerError,
    registerProduct,
    isRegistered,
  } = useProducts(user?.id)

  const {
    hits,
    loading: searching,
    error: searchError,
    searched,
    searchByKeyword,
    searchByJanCode,
  } = useProductSearch()

  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [addingKey, setAddingKey] = useState<string | null>(null)

  const handleQueryChange = (value: string) => {
    setQuery(value)
    searchByKeyword(value)
  }

  const handleDetected = (janCode: string) => {
    setScanning(false)
    setQuery(`JANコード: ${janCode}`)
    searchByJanCode(janCode)
  }

  const handleAdd = async (hit: ProductHit) => {
    const key = hit.janCode ?? hit.name
    setAddingKey(key)
    await registerProduct(hit)
    setAddingKey(null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">製品ログ</h1>
        <p className="mt-1 text-sm text-gray-500">
          使用中のスキンケア製品を記録しましょう。
        </p>
      </div>

      {/* 登録済み製品 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">登録済みの製品</h2>
        {userProductsLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : userProducts.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだ製品が登録されていません。下から検索して追加してください。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {userProducts.map((up) => (
              <div
                key={up.id}
                className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                {up.products.image_url && (
                  <img
                    src={up.products.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium text-gray-800">
                    {up.products.name}
                  </p>
                  {up.products.brand && (
                    <p className="text-sm text-gray-500">{up.products.brand}</p>
                  )}
                  <button
                    onClick={() => navigate(`/products/${up.product_id}/ingredients`)}
                    className="mt-2 rounded-md bg-teal-500 px-3 py-1 text-xs font-medium text-white hover:bg-teal-600"
                  >
                    成分を見る
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 製品を追加 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-700">製品を追加</h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="製品名・ブランド名で検索..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
          <button
            onClick={() => setScanning(true)}
            className="shrink-0 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            バーコード
          </button>
        </div>

        {registerError && (
          <p className="mt-2 text-sm text-red-500">登録エラー: {registerError}</p>
        )}
        {searchError && (
          <p className="mt-2 text-sm text-red-500">検索エラー: {searchError}</p>
        )}
        {searching && <p className="mt-3 text-sm text-gray-400">検索中...</p>}
        {!searching && searched && hits.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">
            該当する製品が見つかりませんでした。
          </p>
        )}

        {hits.length > 0 && (
          <div className="mt-3 space-y-2">
            {hits.map((hit, index) => {
              const key = hit.janCode ?? `${hit.name}-${index}`
              const registered = isRegistered(hit)
              return (
                <div
                  key={key}
                  className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  {hit.imageUrl && (
                    <img
                      src={hit.imageUrl}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-800">
                      {hit.name}
                    </p>
                    {hit.brand && (
                      <p className="text-xs text-gray-500">{hit.brand}</p>
                    )}
                    {hit.price !== null && (
                      <p className="text-xs text-gray-400">
                        参考価格 {hit.price.toLocaleString()}円
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 self-center">
                    {registered ? (
                      <span className="text-xs font-medium text-green-600">追加済み</span>
                    ) : (
                      <button
                        onClick={() => handleAdd(hit)}
                        disabled={addingKey !== null}
                        className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-600 disabled:opacity-50"
                      >
                        {addingKey === (hit.janCode ?? hit.name) ? '追加中...' : '追加'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {scanning && (
        <BarcodeScanner
          onDetected={handleDetected}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  )
}
