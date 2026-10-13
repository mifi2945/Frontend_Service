import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { addToCart, checkout, clearCart, getCart, getProducts, getRecommendations } from './api'
import './App.css'
import { getSessionUserId } from './session'
import type { CheckoutForm, CheckoutResponse, Product } from './types'

type View = 'catalog' | 'recommendations' | 'cart' | 'checkout'

const emptyCheckout: CheckoutForm = {
  cardno: '',
  securityCode: '',
  Expdate: '',
  Address: '',
  Street: '',
  Country: '',
}

const digitsOnly = (value: string) => value.replace(/\D/g, '')

const formatExpiration = (value: string) => {
  const digits = digitsOnly(value).slice(0, 4)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function ProductCard({
  product,
  onAdd,
  adding,
}: {
  product: Product
  onAdd: (product: Product) => void
  adding: boolean
}) {
  return (
    <article className="product-card">
      <div className="product-card__topline">
        <span className="product-card__category">
          {product.categories[0] || 'Product'}
        </span>
        <span className="product-card__price">
          ${product.price.toFixed(2)}
        </span>
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="product-card__footer">
        <div className="tag-list">
          {product.categories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
        <button type="button" onClick={() => onAdd(product)} disabled={adding}>
          {adding ? 'Adding...' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}

function App() {
  const [view, setView] = useState<View>('catalog')
  const [userId] = useState(getSessionUserId)
  const [products, setProducts] = useState<Product[]>([])
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [cart, setCart] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(emptyCheckout)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const loadCartAndRecommendations = async () => {
    const [cartResult, recommendationResult] = await Promise.allSettled([
      getCart(userId),
      getRecommendations(userId),
    ])

    if (cartResult.status === 'fulfilled') {
      setCart(cartResult.value)
    }

    if (recommendationResult.status === 'fulfilled') {
      setRecommendations(recommendationResult.value)
    }
  }

  useEffect(() => {
    void Promise.all([getProducts(), loadCartAndRecommendations()])
      .then(([catalog]) => setProducts(catalog))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the store'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async (event: SubmitEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      setProducts(await getProducts(search))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (product: Product) => {
    const productId = String(product.product_id)
    setAddingId(productId)
    setError('')

    try {
      await addToCart(userId, product)
      await loadCartAndRecommendations()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add product')
    } finally {
      setAddingId(null)
    }
  }

  const handleClearCart = async () => {
    setError('')

    try {
      await clearCart(userId)
      setCart([])
      setRecommendations([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to clear cart')
    }
  }

  const handleCheckout = async (event: SubmitEvent) => {
    event.preventDefault()
    setCheckoutLoading(true)
    setCheckoutError('')
    setCheckoutResult(null)

    try {
      const result = await checkout(userId, checkoutForm)
      setCheckoutResult(result)

      if (result.checkoutStatus === 1) {
        setCart([])
        setCheckoutForm(emptyCheckout)
      }
    } catch (reason) {
      setCheckoutError(reason instanceof Error ? reason.message : 'Checkout failed')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const setField = (field: keyof CheckoutForm, value: string) =>
    setCheckoutForm((current) => ({ ...current, [field]: value }))

  const productGrid = (items: Product[]) => (
    <div className="product-grid">
      {items.map((product) => (
        <ProductCard
          key={String(product.product_id)}
          product={product}
          onAdd={handleAdd}
          adding={addingId === String(product.product_id)}
        />
      ))}
    </div>
  )

  const renderView = () => {
    if (loading && view === 'catalog' && products.length === 0) {
      return <p className="status">Loading catalog...</p>
    }
    if (view === 'catalog') {
      return (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Browse collection</p>
              <h2>Find something useful.</h2>
            </div>
            <span>{products.length} products</span>
          </div>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or description"
              aria-label="Search products"
            />
            <button type="submit">Search</button>
          </form>
          {products.length ? productGrid(products) : <p className="status">No products found.</p>}
        </section>
      )
    }

    if (view === 'recommendations') {
      return (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Picked for you</p>
              <h2>Recommendations.</h2>
            </div>
            <span>Based on your cart</span>
          </div>
          {recommendations.length ? (
            productGrid(recommendations)
          ) : (
            <p className="status">Add a product to your cart to get recommendations.</p>
          )}
        </section>
      )
    }

    if (view === 'cart') {
      return (
        <section className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your selection</p>
              <h2>Shopping cart.</h2>
            </div>
            <span>{cart.length} items</span>
          </div>
          {cart.length ? (
            <>
              <div className="cart-list">
                {cart.map((product, index) => (
                  <div className="cart-row" key={`${product.product_id}-${index}`}>
                    <div>
                      <strong>{product.name}</strong>
                      <span>{product.description}</span>
                    </div>
                    <b>${product.price.toFixed(2)}</b>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <span>Subtotal</span>
                <strong>
                  ${cart.reduce((total, product) => total + product.price, 0).toFixed(2)}
                </strong>
              </div>
              <div className="action-row">
                <button type="button" className="button-secondary" onClick={handleClearCart}>
                  Clear cart
                </button>
                <button type="button" onClick={() => setView('checkout')}>
                  Continue to checkout
                </button>
              </div>
            </>
          ) : (
            <p className="status">Your cart is empty.</p>
          )}
        </section>
      )
    }

    return (
      <section className="content-section checkout-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Test transaction</p>
            <h2>Checkout.</h2>
          </div>
          <span>{cart.length} items</span>
        </div>
        <p className="form-note">
          Use fake details only. This form sends a test checkout request to the configured service.
        </p>
        <form className="checkout-form" onSubmit={handleCheckout}>
          <label>
            Card number
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={checkoutForm.cardno}
              onChange={(event) => setField('cardno', digitsOnly(event.target.value))}
            />
          </label>
          <label>
            Security code
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={checkoutForm.securityCode}
              onChange={(event) => setField('securityCode', digitsOnly(event.target.value))}
            />
          </label>
          <label>
            Expiration <span>MM/YY</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]{2}/[0-9]{2}"
              maxLength={5}
              value={checkoutForm.Expdate}
              onChange={(event) => setField('Expdate', formatExpiration(event.target.value))}
            />
          </label>
          <label>
            Address number
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={checkoutForm.Address}
              onChange={(event) => setField('Address', digitsOnly(event.target.value))}
            />
          </label>
          <label className="wide-field">
            Street
            <input
              required
              value={checkoutForm.Street}
              onChange={(event) => setField('Street', event.target.value)}
            />
          </label>
          <label>
            Country
            <input
              required
              value={checkoutForm.Country}
              onChange={(event) => setField('Country', event.target.value)}
            />
          </label>
          <button className="wide-field" type="submit" disabled={checkoutLoading || cart.length === 0}>
            {checkoutLoading ? 'Processing...' : 'Place test order'}
          </button>
        </form>
        {checkoutError && <p className="status status--error">{checkoutError}</p>}
        {checkoutResult && (
          <div
            className={`status ${
              checkoutResult.checkoutStatus === 1 ? 'status--success' : 'status--error'
            }`}
          >
            <strong>
              {checkoutResult.checkoutStatus === 1
                ? 'Order confirmed.'
                : 'Order could not be completed.'}
            </strong>
            {checkoutResult.Shippingid && (
              <span> Shipping ID: {checkoutResult.Shippingid}.</span>
            )}
            {checkoutResult.Chargedfor !== undefined && (
              <span> Charged: ${checkoutResult.Chargedfor.toFixed(2)}.</span>
            )}
          </div>
        )}
      </section>
    )
  }

  const navItems: [View, string][] = [
    ['catalog', 'Catalog'],
    ['recommendations', 'Recommendations'],
    ['cart', `Cart${cart.length ? ` · ${cart.length}` : ''}`],
    ['checkout', 'Checkout'],
  ]

  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <p className="brand-mark">THE BEST STORE</p>
          <h1>Useful things, chosen well.</h1>
        </div>
        <div className="session-pill">
          Session <strong>#{userId}</strong>
        </div>
      </header>
      <nav className="main-nav" aria-label="Store sections">
        {navItems.map(([key, label]) => (
          <button
            type="button"
            className={view === key ? 'active' : ''}
            onClick={() => setView(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div className="global-error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            x
          </button>
        </div>
      )}
      <main>{renderView()}</main>
      <footer>
        <span>THE BEST STORE</span>
        <span>Session data stays in this browser session.</span>
      </footer>
    </div>
  )
}

export default App
