const API_BASE = (() => {

  const port = window.location.port;
  if (port === '5173' || port === '3000' || window.location.protocol === 'file:') {
    return 'http://localhost:8000';
  }
  return '';
})();

const API = {
  async listProducts() {
    const r = await fetch(`${API_BASE}/api/products`);
    if (!r.ok) throw new Error('Failed to load products');
    return r.json();
  },
  async getProduct(id) {
    const r = await fetch(`${API_BASE}/api/products/${id}`);
    if (!r.ok) throw new Error('Failed to load product');
    return r.json();
  },
  async createOrder(payload) {
    const r = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: 'Unknown error' }));
      let message;
      if (Array.isArray(err.detail)) {
        message = err.detail.map(e => {
          const field = (e.loc || []).filter(p => p !== 'body').join('.');
          return field ? `${field}: ${e.msg}` : e.msg;
        }).join('; ');
      } else if (typeof err.detail === 'string') {
        message = err.detail;
      } else {
        message = `Server error ${r.status}`;
      }
      throw new Error(message);
    }
    return r.json();
  },
  async getOrder(orderUid) {
    const r = await fetch(`${API_BASE}/api/orders/${orderUid}`);
    if (!r.ok) throw new Error('Order not found');
    return r.json();
  },
};

const CART_KEY = 'daspowear_cart_v1';

const Cart = {
  load() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated'));
  },
  add(item) {
    const cart = Cart.load();
    const existing = cart.find(x => x.product_id === item.product_id && x.size === item.size);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }
    Cart.save(cart);
  },
  remove(productId, size) {
    const cart = Cart.load().filter(x => !(x.product_id === productId && x.size === size));
    Cart.save(cart);
  },
  clear() { Cart.save([]); },
  count() { return Cart.load().reduce((s, x) => s + x.quantity, 0); },
  total() { return Cart.load().reduce((s, x) => s + x.price * x.quantity, 0); },
};

const fmt = {
  rub(value) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
  },
};

window.DASPO = { API, Cart, fmt };
