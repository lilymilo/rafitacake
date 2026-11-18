import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createDemoProducts } from './demo'
import {
  defaultState,
  loadState,
  MAX_ACTIVITY,
  newId,
  saveState,
  type ActivityKind,
  type AppState,
  type Product,
  type Settings,
} from './storage'
import type { PlatformFee } from './types'

interface AppContextValue {
  state: AppState
  storageAvailable: boolean
  recovered: boolean
  saveFailed: boolean
  /** Muat ulang contoh produk simulasi (isDemo: true). */
  loadDemoProducts: () => void
  /** Hapus semua produk bertanda demo. */
  clearDemoProducts: () => void
  /** Reset seluruh data ke default awal. */
  resetAllData: () => void
  addProduct: (input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product
  updateProduct: (id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => void
  deleteProduct: (id: string) => void
  updatePlatform: (id: string, patch: Partial<Omit<PlatformFee, 'id' | 'builtIn'>>) => void
  addPlatform: (input: Omit<PlatformFee, 'id' | 'builtIn'>) => PlatformFee
  deletePlatform: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function withActivity(state: AppState, kind: ActivityKind, label: string): AppState {
  const entry = { id: newId('act'), at: new Date().toISOString(), kind, label }
  return { ...state, activity: [entry, ...state.activity].slice(0, MAX_ACTIVITY) }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [init] = useState(() => loadState())
  const [state, setState] = useState<AppState>(init.state)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    const ok = saveState(state)
    setSaveFailed(!ok && init.storageAvailable)
  }, [state, init.storageAvailable])

  const loadDemoProducts = useCallback(() => {
    setState((prev) => {
      const demos = createDemoProducts()
      const existingNonDemo = prev.products.filter((p) => !p.isDemo)
      return withActivity(
        { ...prev, products: [...demos, ...existingNonDemo] },
        'demo_loaded',
        `Memuat ${demos.length} produk simulasi (contoh)`,
      )
    })
  }, [])

  const clearDemoProducts = useCallback(() => {
    setState((prev) =>
      withActivity(
        { ...prev, products: prev.products.filter((p) => !p.isDemo) },
        'demo_cleared',
        'Menghapus semua produk simulasi',
      ),
    )
  }, [])

  const resetAllData = useCallback(() => {
    setState(withActivity(defaultState(), 'data_reset', 'Reset seluruh data ke kondisi awal'))
  }, [])

  const addProduct = useCallback((input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const created: Product = { ...input, id: newId('prd'), createdAt: now, updatedAt: now }
    setState((prev) =>
      withActivity({ ...prev, products: [created, ...prev.products] }, 'product_created', `Menambah produk "${created.name}"`),
    )
    return created
  }, [])

  const updateProduct = useCallback((id: string, patch: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    const now = new Date().toISOString()
    setState((prev) => {
      const target = prev.products.find((p) => p.id === id)
      if (!target) return prev
      const updated: Product = { ...target, ...patch, updatedAt: now }
      return withActivity(
        { ...prev, products: prev.products.map((p) => (p.id === id ? updated : p)) },
        'product_updated',
        `Memperbarui "${updated.name}"`,
      )
    })
  }, [])

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.products.find((p) => p.id === id)
      if (!target) return prev
      return withActivity(
        { ...prev, products: prev.products.filter((p) => p.id !== id) },
        'product_deleted',
        `Menghapus "${target.name}"`,
      )
    })
  }, [])

  const updatePlatform = useCallback((id: string, patch: Partial<Omit<PlatformFee, 'id' | 'builtIn'>>) => {
    setState((prev) => {
      const target = prev.platforms.find((p) => p.id === id)
      if (!target) return prev
      const updated = { ...target, ...patch }
      return withActivity(
        { ...prev, platforms: prev.platforms.map((p) => (p.id === id ? updated : p)) },
        'platform_updated',
        `Mengubah tarif platform ${updated.name}`,
      )
    })
  }, [])

  const addPlatform = useCallback((input: Omit<PlatformFee, 'id' | 'builtIn'>) => {
    const created: PlatformFee = { ...input, id: newId('plt'), builtIn: false }
    setState((prev) =>
      withActivity({ ...prev, platforms: [...prev.platforms, created] }, 'platform_created', `Menambah platform ${created.name}`),
    )
    return created
  }, [])

  const deletePlatform = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.platforms.find((p) => p.id === id)
      if (!target || target.builtIn) return prev
      const remaining = prev.platforms.filter((p) => p.id !== id)
      const fallbackId = remaining[0]?.id ?? 'gofood'
      return withActivity(
        {
          ...prev,
          platforms: remaining,
          products: prev.products.map((pr) => (pr.platformId === id ? { ...pr, platformId: fallbackId } : pr)),
        },
        'platform_deleted',
        `Menghapus platform ${target.name}`,
      )
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) =>
      withActivity(
        { ...prev, settings: { ...prev.settings, ...patch } },
        'settings_updated',
        'Memperbarui target margin & pembulatan',
      ),
    )
  }, [])

  return (
    <AppContext.Provider
      value={{
        state,
        storageAvailable: init.storageAvailable,
        recovered: init.recovered,
        saveFailed,
        loadDemoProducts,
        clearDemoProducts,
        resetAllData,
        addProduct,
        updateProduct,
        deleteProduct,
        updatePlatform,
        addPlatform,
        deletePlatform,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore harus digunakan di dalam AppProvider')
  return ctx
}
