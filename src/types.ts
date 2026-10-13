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
  expDate: string
  address: string
  street: string
  country: string
}

export interface CheckoutResponse {
  checkoutStauts: number
  Shippingid?: number | string
  Chargedfor?: number
  [key: string]: unknown
}

export interface ShippingCost {
  "shippingCost": number
}

export type ApiService = 'catalog' | 'cart' | 'recommendations' | 'checkout' | 'shipping'
