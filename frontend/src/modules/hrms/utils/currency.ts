import { useEffect } from 'react'
import { create } from 'zustand'
import type { CurrencyMap } from '../types'
import { makeHrmsResource, messageTransform, useHrmsResource } from '../stores/resource'

const companyCurrencyResource = makeHrmsResource<unknown>('hrms.api.get_company_currencies', 'hrms:company-currencies')
const currencySymbolsResource = makeHrmsResource<unknown>('hrms.api.get_currency_symbols', 'hrms:currency-symbols')

interface CurrencyState {
  companyCurrencies: CurrencyMap
  symbols: Record<string, string>
  setCompanyCurrencies: (value: CurrencyMap) => void
  setSymbols: (value: Record<string, string>) => void
}

export const useHrmsCurrencyStore = create<CurrencyState>((set) => ({
  companyCurrencies: {},
  symbols: {},
  setCompanyCurrencies: (companyCurrencies) => set({ companyCurrencies }),
  setSymbols: (symbols) => set({ symbols }),
}))

export function useHrmsCurrencies(enabled = true): CurrencyState {
  const companyResource = useHrmsResource(companyCurrencyResource, enabled)
  const symbolsResource = useHrmsResource(currencySymbolsResource, enabled)
  const store = useHrmsCurrencyStore()
  const companyCurrencies = companyResource.data ? messageTransform<CurrencyMap>(companyResource.data) : null
  const symbols = symbolsResource.data ? messageTransform<Record<string, string>>(symbolsResource.data) : null

  useEffect(() => {
    if (companyCurrencies && store.companyCurrencies !== companyCurrencies)
      store.setCompanyCurrencies(companyCurrencies)
  }, [companyCurrencies, store])
  useEffect(() => {
    if (symbols && store.symbols !== symbols) store.setSymbols(symbols)
  }, [store, symbols])
  return useHrmsCurrencyStore.getState()
}

export function getCompanyCurrency(
  company: string,
  value = useHrmsCurrencyStore.getState().companyCurrencies,
): string | undefined {
  return value[company]?.[0]
}

export function getCompanyCurrencySymbol(
  company: string,
  value = useHrmsCurrencyStore.getState().companyCurrencies,
): string | undefined {
  return value[company]?.[1]
}

export function getCurrencySymbol(
  currency: string,
  value = useHrmsCurrencyStore.getState().symbols,
): string | undefined {
  return value[currency]
}
