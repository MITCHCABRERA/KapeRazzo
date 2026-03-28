(() => {
  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem("cart") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function summarize(cart) {
    return cart.reduce((acc, item) => {
      const qty = Number(item?.quantity ?? item?.qty ?? 1) || 0;
      const price = Number(item?.price ?? 0) || 0;
      acc.count += qty;
      acc.total += price * qty;
      return acc;
    }, { count: 0, total: 0 });
  }

  function updateIndicators(sourceCart) {
    const cart = Array.isArray(sourceCart) ? sourceCart : getCart();
    const { count, total } = summarize(cart);

    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(count);
      el.classList.toggle('is-empty', count === 0);
    });

    document.querySelectorAll('[data-cart-total]').forEach((el) => {
      el.textContent = `₱${total.toFixed(2)}`;
    });

    document.querySelectorAll('[data-cart-link]').forEach((el) => {
      el.classList.toggle('has-items', count > 0);
      el.setAttribute('aria-label', count > 0
        ? `View cart with ${count} item${count === 1 ? '' : 's'} totalling ₱${total.toFixed(2)}`
        : 'View cart'
      );
    });
  }

  document.addEventListener('DOMContentLoaded', () => updateIndicators());
  window.addEventListener('storage', (event) => {
    if (!event || event.key === 'cart') updateIndicators();
  });
  window.addEventListener('kaperazzo:cart-updated', (event) => {
    updateIndicators(event?.detail?.cart);
  });
})();
