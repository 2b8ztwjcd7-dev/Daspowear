function renderNav() {
  const el = document.getElementById('nav-mount');
  if (!el) return;
  el.innerHTML = `
    <nav class="nav">
      <div class="nav-left">
        <a href="/index.html">Магазин</a>
        <a href="/lookbook.html">Лукбук</a>
        <a href="/contact.html">Контакты</a>
      </div>
      <a href="/index.html" class="brand">DASPOWEAR</a>
      <div class="nav-right">
        <a href="#" onclick="alert('Поиск скоро появится'); return false;">Поиск</a>
        <a href="#" onclick="alert('Личный кабинет скоро появится'); return false;">Аккаунт</a>
        <a href="#" id="cart-trigger">Корзина <span class="cart-count" id="cart-count">0</span></a>
      </div>
    </nav>
  `;
  document.getElementById('cart-trigger').addEventListener('click', (e) => {
    e.preventDefault();
    openCart();
  });
  refreshCartCount();
}

function refreshCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = window.DASPO.Cart.count();
}

function renderCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const html = `
    <div class="cart-backdrop" id="cart-backdrop"></div>
    <aside class="cart-drawer" id="cart-drawer" aria-hidden="true">
      <div class="cart-header">
        <h3>Ваша корзина</h3>
        <button class="cart-close" id="cart-close">Закрыть</button>
      </div>
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-footer" id="cart-footer" style="display:none;">
        <div class="cart-total">
          <span>Итого</span>
          <span id="cart-total-value">—</span>
        </div>
        <button class="btn btn-block" id="checkout-btn">Оформить заказ</button>
        <p class="cart-foot-note">Безопасная оплата через ЮKassa</p>
      </div>
    </aside>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-backdrop').addEventListener('click', closeCart);
  document.getElementById('checkout-btn').addEventListener('click', () => {
    closeCart();
    openCheckout();
  });
}

function openCart() {
  renderCartItems();
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartItems() {
  const { Cart, fmt } = window.DASPO;
  const items = Cart.load();
  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');

  if (items.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-tag">— Пусто —</div>
        <div class="cart-empty-text">В вашей корзине пока ничего нет.</div>
      </div>
    `;
    footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = items.map(it => `
    <div class="cart-item">
      <img src="${it.image}" alt="${it.name}" />
      <div>
        <div class="cart-item-name">${it.name}</div>
        <div class="cart-item-meta">
          ${it.size ? `<span>Размер: ${it.size}</span>` : ''}
          <span>Кол-во: ${it.quantity}</span>
        </div>
        <button class="cart-item-remove" data-pid="${it.product_id}" data-size="${it.size || ''}">Удалить</button>
      </div>
      <div class="cart-item-price">${fmt.rub(it.price * it.quantity)}</div>
    </div>
  `).join('');

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = parseInt(btn.dataset.pid, 10);
      const size = btn.dataset.size || null;
      Cart.remove(pid, size);
      renderCartItems();
    });
  });

  document.getElementById('cart-total-value').textContent = fmt.rub(Cart.total());
  footerEl.style.display = 'flex';
}

function renderCheckoutOverlay() {
  if (document.getElementById('checkout-overlay')) return;
  const html = `
    <div class="checkout-overlay" id="checkout-overlay">
      <div class="checkout-wrap">
        <div class="checkout-header">
          <h2>Оформление заказа</h2>
          <button class="cart-close" id="checkout-close">Закрыть</button>
        </div>
        <div id="checkout-error" class="checkout-error" style="display:none;"></div>
        <div class="checkout-summary" id="checkout-summary"></div>
        <form id="checkout-form" novalidate>
          <div class="checkout-form-grid">
            <div class="field">
              <label>Имя</label>
              <input name="first_name" data-validate="name" required minlength="3" placeholder="Иван" />
              <small class="hint" data-for="first_name">Минимум 3 буквы, только буквы.</small>
            </div>
            <div class="field">
              <label>Фамилия</label>
              <input name="last_name" data-validate="name" required minlength="3" placeholder="Иванов" />
              <small class="hint" data-for="last_name">Минимум 3 буквы, только буквы.</small>
            </div>
            <div class="field full">
              <label>Email — для чека и подтверждения заказа *</label>
              <input name="email" type="email" data-validate="email" required placeholder="ваш@email.ru" />
              <small class="hint" data-for="email">На этот адрес придёт фискальный чек и детали заказа.</small>
            </div>
            <div class="field full">
              <label>Телефон</label>
              <input name="phone" type="tel" data-validate="phone" required placeholder="+7 925 034 77 19" value="+7 " />
              <small class="hint" data-for="phone">Российский номер: +7 и 10 цифр.</small>
            </div>
            <div class="field full">
              <label>Адрес доставки</label>
              <textarea name="address" rows="3" required placeholder="Город, улица, дом, квартира, индекс"></textarea>
            </div>
          </div>

          <label class="agree">
            <input type="checkbox" name="agree" id="agree-checkbox" required />
            <span>
              Я согласен(на) с <a href="/offer.html" target="_blank">условиями публичной оферты</a>,
              <a href="/privacy.html" target="_blank">политикой конфиденциальности</a>
              и даю согласие на обработку персональных данных.
            </span>
          </label>

          <button class="btn btn-block" id="checkout-submit" type="submit" disabled>Перейти к оплате</button>
          <p class="checkout-note">Перенаправим в ЮKassa · Тестовая карта 1111 1111 1111 1026</p>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('checkout-close').addEventListener('click', closeCheckout);
  document.getElementById('checkout-form').addEventListener('submit', submitCheckout);
  wireCheckoutValidation();
}

function wireCheckoutValidation() {
  const form = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('checkout-submit');
  const checkbox = document.getElementById('agree-checkbox');

  const phoneInput = form.querySelector('[name="phone"]');
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value;
    const digits = v.replace(/\D/g, '').replace(/^7?/, '').slice(0, 10);
    let formatted = '+7';
    if (digits.length > 0) formatted += ' ' + digits.slice(0, 3);
    if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
    if (digits.length > 6) formatted += ' ' + digits.slice(6, 8);
    if (digits.length > 8) formatted += ' ' + digits.slice(8, 10);
    e.target.value = formatted;
    validateAndUpdate();
  });
  phoneInput.addEventListener('keydown', (e) => {
    const pos = e.target.selectionStart;
    if ((e.key === 'Backspace' || e.key === 'Delete') && pos <= 3) {
      e.preventDefault();
    }
  });
  phoneInput.addEventListener('focus', (e) => {
    if (!e.target.value || e.target.value.length < 2) e.target.value = '+7 ';
    setTimeout(() => { e.target.setSelectionRange(e.target.value.length, e.target.value.length); }, 0);
  });

  const nameInputs = form.querySelectorAll('[data-validate="name"]');
  nameInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-zА-Яа-яЁё\s-]/g, '');
      validateAndUpdate();
    });
  });

  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', validateAndUpdate);
    el.addEventListener('blur', validateAndUpdate);
  });
  checkbox.addEventListener('change', validateAndUpdate);

  function validateAndUpdate() {
    const errors = validateForm();
    Object.entries(errors.byField).forEach(([name, msg]) => {
      const input = form.querySelector(`[name="${name}"]`);
      const hint = form.querySelector(`.hint[data-for="${name}"]`);
      if (input) input.classList.toggle('invalid', !!msg);
      if (hint && msg) {
        hint.textContent = msg;
        hint.classList.add('error');
      } else if (hint) {
        hint.classList.remove('error');
        hint.textContent = hint.dataset.default || hint.textContent;
      }
    });
    submitBtn.disabled = !errors.ok || !checkbox.checked;
  }

  form.querySelectorAll('.hint').forEach(h => h.dataset.default = h.textContent);
}

function validateForm() {
  const form = document.getElementById('checkout-form');
  const data = new FormData(form);
  const byField = {};
  const first = (data.get('first_name') || '').trim();
  const last  = (data.get('last_name') || '').trim();
  const email = (data.get('email') || '').trim();
  const phone = (data.get('phone') || '').trim();
  const addr  = (data.get('address') || '').trim();

  if (first.length > 0 && first.length < 3) byField.first_name = 'Имя — минимум 3 буквы.';
  else if (first && !/^[A-Za-zА-Яа-яЁё\s-]{3,}$/.test(first)) byField.first_name = 'Только буквы.';
  else byField.first_name = '';

  if (last.length > 0 && last.length < 3) byField.last_name = 'Фамилия — минимум 3 буквы.';
  else if (last && !/^[A-Za-zА-Яа-яЁё\s-]{3,}$/.test(last)) byField.last_name = 'Только буквы.';
  else byField.last_name = '';

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (email && !emailRegex.test(email)) byField.email = 'Введите корректный email (например, name@mail.ru).';
  else byField.email = '';

  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && phone !== '+7' && phoneDigits.length !== 11) byField.phone = 'Введите номер полностью: +7 и 10 цифр.';
  else if (phone && phoneDigits.length === 11 && !phoneDigits.startsWith('7')) byField.phone = 'Номер должен начинаться с +7.';
  else byField.phone = '';

  const allFilled =
    first.length >= 3 &&
    last.length >= 3 &&
    emailRegex.test(email) &&
    phoneDigits.length === 11 && phoneDigits.startsWith('7') &&
    addr.length > 0;
  const noErrors = Object.values(byField).every(v => !v);

  return { ok: allFilled && noErrors, byField };
}

function openCheckout() {
  const { Cart, fmt } = window.DASPO;
  const items = Cart.load();
  if (items.length === 0) return;
  const summary = document.getElementById('checkout-summary');
  summary.innerHTML = items.map(it => `
    <div class="row"><span>${it.name}${it.size ? ' · ' + it.size : ''} × ${it.quantity}</span><span>${fmt.rub(it.price * it.quantity)}</span></div>
  `).join('') + `<div class="row total"><span>Итого</span><span>${fmt.rub(Cart.total())}</span></div>`;
  document.getElementById('checkout-error').style.display = 'none';
  const form = document.getElementById('checkout-form');
  if (form) {
    form.reset();
    const phoneEl = form.querySelector('[name="phone"]');
    if (phoneEl) phoneEl.value = '+7 ';
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    form.querySelectorAll('.hint.error').forEach(h => {
      h.classList.remove('error');
      if (h.dataset.default) h.textContent = h.dataset.default;
    });
  }
  const submitBtn = document.getElementById('checkout-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Перейти к оплате';
  }
  document.getElementById('checkout-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function submitCheckout(e) {
  e.preventDefault();
  const { API, Cart } = window.DASPO;
  const form = e.target;
  const btn = document.getElementById('checkout-submit');
  const errEl = document.getElementById('checkout-error');

  const v = validateForm();
  if (!v.ok) {
    errEl.textContent = 'Заполните все поля корректно.';
    errEl.style.display = 'block';
    return;
  }
  if (!document.getElementById('agree-checkbox').checked) {
    errEl.textContent = 'Подтвердите согласие с офертой.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Создаём платёж…';

  const fd = new FormData(form);
  const rawPhone = (fd.get('phone') || '').replace(/\D/g, '');
  const cleanPhone = rawPhone ? '+' + rawPhone : null;

  const items = Cart.load().map(it => ({
    product_id: it.product_id,
    size: it.size,
    quantity: it.quantity,
  }));
  const payload = {
    customer_email: fd.get('email').trim(),
    customer_name: `${fd.get('first_name').trim()} ${fd.get('last_name').trim()}`.trim(),
    customer_phone: cleanPhone,
    shipping_address: (fd.get('address') || '').trim() || null,
    items,
  };

  try {
    const res = await API.createOrder(payload);
    localStorage.setItem('daspowear_last_order', res.order_uid);
    window.location.href = res.confirmation_url;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Перейти к оплате';
  }
}

function renderFooter() {
  const el = document.getElementById('footer-mount');
  if (!el) return;
  el.innerHTML = `
    <footer class="footer">
      <div class="footer-grid">
        <div>
          <h4>Daspowear</h4>
          <p class="footer-tag">
            Тихие объекты одежды. Сшито медленно, носится медленно.
          </p>
        </div>
        <div>
          <h4>Магазин</h4>
          <ul>
            <li><a href="/index.html#shop">Все вещи</a></li>
            <li><a href="/lookbook.html">Лукбук</a></li>
          </ul>
        </div>
        <div>
          <h4>Помощь</h4>
          <ul>
            <li><a href="/shipping.html">Доставка</a></li>
            <li><a href="/shipping.html#возврат">Возврат</a></li>
            <li><a href="/sizes.html">Размерная сетка</a></li>
            <li><a href="/contact.html">Контакты</a></li>
          </ul>
        </div>
        <div>
          <h4>Бренд</h4>
          <ul>
            <li><a href="/contact.html">О нас</a></li>
            <li><a href="/contact.html">Пресса</a></li>
            <li><a href="/offer.html">Публичная оферта</a></li>
            <li><a href="/privacy.html">Конфиденциальность</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-meta">
        <span>© ${new Date().getFullYear()} Daspowear</span>
        <span>Оплата через ЮKassa · Тестовый режим</span>
      </div>
    </footer>
  `;
}

function bootShell() {
  renderNav();
  renderCartDrawer();
  renderCheckoutOverlay();
  renderFooter();
  window.addEventListener('cart:updated', () => {
    refreshCartCount();
    const drawer = document.getElementById('cart-drawer');
    if (drawer && drawer.classList.contains('open')) renderCartItems();
  });
}

document.addEventListener('DOMContentLoaded', bootShell);

window.DASPO.openCart = openCart;
window.DASPO.openCheckout = openCheckout;
