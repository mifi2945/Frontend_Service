import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addToCart, checkout, clearCart, getProducts } from './api'
import type { CheckoutForm, Product } from './types'

const product: Product = {
  product_id: '7',
  name: 'Desk Lamp',
  description: 'A focused light',
  price: 24.5,
  categories: ['lighting'],
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

describe('API client', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_API_BASE_URL', 'https://shared.example/')
    vi.stubEnv('VITE_CATALOG_API_URL', 'https://shared.example/')
    vi.stubEnv('VITE_CHECKOUT_API_URL', 'https://shared.example/')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('loads products using the shared base URL and encoded search', async () => {
    vi.mocked(fetch).mockResolvedValue(response([product]))

    await expect(getProducts('desk lamp')).resolves.toEqual([product])
    expect(fetch).toHaveBeenCalledWith('https://shared.example/products?search=desk%20lamp', expect.anything())
  })

  it('uses a service-specific cart URL and converts product IDs to numbers', async () => {
    vi.stubEnv('VITE_CART_API_URL', 'https://cart.example/')
    vi.mocked(fetch).mockResolvedValue(response(product, 201))

    await addToCart(835974, product)
    expect(fetch).toHaveBeenCalledWith('https://cart.example/cart/835974', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"product_id":7'),
    }))
  })

  it('handles a successful no-content cart clear', async () => {
    vi.mocked(fetch).mockResolvedValue(response(null, 204))

    await expect(clearCart(835974)).resolves.toBeUndefined()
  })

  it('surfaces an API error body', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ error: 'cart service unavailable' }, 502))

    await expect(getProducts()).rejects.toThrow('cart service unavailable')
  })

  it('serializes the checkout contract with the session user ID', async () => {
    const form: CheckoutForm = {
      cardno: '123456',
      securityCode: '123',
      Expdate: '02/29',
      Address: '42',
      Street: 'Main Street',
      Country: 'US',
    }
    vi.mocked(fetch).mockResolvedValue(response({ checkoutStatus: 1 }))

    await checkout(835974, form)
    expect(fetch).toHaveBeenCalledWith('https://shared.example/checkout/835974', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        userid: 835974,
        cardno: 123456,
        securityCode: 123,
        Expdate: '02/29',
        Address: 42,
        Street: 'Main Street',
        Country: 'US',
      }),
    }))
  })
})
