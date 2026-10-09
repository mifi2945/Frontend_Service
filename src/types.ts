export type ProductId = string

export interface Product {
  product_id: ProductId | number
  name: string
  description: string
  price: number
  categories: string[]
}

export interface CheckoutForm {
  cardno: string
  securityCode: string
  Expdate: string
  Address: string
  Street: string
  Country: string
}

export interface CheckoutResponse {
  checkoutStatus: number
  Shippingid?: number | string
  Chargedfor?: number
  [key: string]: unknown
}

export type ApiService = 'catalog' | 'cart' | 'recommendations' | 'checkout'
