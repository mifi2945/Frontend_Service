import type { ApiService, CheckoutForm, CheckoutResponse, Product, ShippingCost } from './types'
// import {Logging, Severity} from '@google-cloud/logging'

// const logging = new Logging()

const serviceVariables: Record<ApiService, string> = {
  catalog: 'VITE_CATALOG_API_URL',
  cart: 'VITE_CART_API_URL',
  recommendations: 'VITE_RECOMMENDATIONS_API_URL',
  checkout: 'VITE_CHECKOUT_API_URL',
  shipping: 'VITE_SHIPPING_API_URL'
}

function getBaseUrl(service: ApiService): string {
  const serviceUrl = import.meta.env[serviceVariables[service]] as string | undefined
  const sharedUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (serviceUrl || sharedUrl || '').replace(/\/$/, '')
}

function getUrl(service: ApiService, path: string): string {
  // will return '/checkout` for example, and nginx will route the proxy
  return `${getBaseUrl(service)}${path}`
}

function generateCorrelationId(): string {
  const id = crypto.randomUUID()
  return id
}

// async function generateLog(corr_id: string, msg: string, level: number) {
//   const log_text = `[${new Date()}, ${corr_id}, frontend]: ${msg}`
//   const log = logging.log('frontend-log')
//   const metadata = {
//     severity: level
//   }

//   const entry = log.entry(metadata, log_text)
//   await log.write(entry);
// }

async function request<T>(service: ApiService, path: string, options?: RequestInit): Promise<T> {
  const correlationId = generateCorrelationId()

  const response = await fetch(getUrl(service, path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Correlation-Id': correlationId,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const error = (await response.json()) as { error?: string }
      if (error.error) message = error.error
    } catch {
      // Keep the HTTP status when the service has no JSON error body.
    }
    // generateLog(correlationId, `outbound to ${service}/${path} ${message}`, Severity.error)
    throw new Error(message)
  }

  if (response.status === 204) {
    // generateLog(correlationId, `outbound to ${service}/${path}`, Severity.info)
    return undefined as T
  }
  // generateLog(correlationId, `outbound to ${service}/${path}`, Severity.info)
  return (await response.json()) as T
}

export function getProducts(search = ''): Promise<Product[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<Product[]>('catalog', `/products${query}`)
}

export function getCart(userId: number): Promise<Product[]> {
  return request<Product[]>('cart', `/cart/${userId}`)
}

export function addToCart(userId: number, product: Product): Promise<Product> {
  return request<Product>('cart', `/cart/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ ...product, product_id: Number(product.product_id) }),
  })
}

export function clearCart(userId: number): Promise<void> {
  return request<void>('cart', `/cart/${userId}`, { method: 'DELETE' })
}

export function getRecommendations(userId: number): Promise<Product[]> {
  return request<Product[]>('recommendations', `/recommendations/${userId}`)
}

export function getShippingCost(userId: number): Promise<ShippingCost> {
  return request<ShippingCost>('shipping', `/shipping/${userId}`)
}

export function checkout(userId: number, form: CheckoutForm): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('checkout', `/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      userid: userId,
      cardno: Number(form.cardno),
      securityCode: Number(form.securityCode),
      expDate: form.expDate,
      address: Number(form.address),
      street: form.street.trim(),
      country: form.country.trim(),
    }),
  })
}
