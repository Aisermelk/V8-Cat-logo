/* Catálogo virtual genérico — conectado ao V8 Admin Universal pelo V8 Loader.
   Etapa 1: catálogo real (categorias, variações, galeria, de/por, parcelas, Pix) + carrinho + pedido pelo WhatsApp. */
(() => {
  "use strict";
  const loaderScript = document.querySelector('script[src*="v8-loader"]');
  const projectKey = loaderScript?.dataset.projectId || location.pathname;
  const CART_KEY = "v8_catalog_cart_v1_" + projectKey;
  const FAVORITES_KEY = "v8_catalog_favorites_v1_" + projectKey;
  function loadFavorites() { try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; } }
  const state = { products: [], categories: [], tags: [], cfg: {}, category: "all", sub: "", search: "", minPrice: "", maxPrice: "", onlyAvailable: false, onlyOffers: false, sort: "relevance", cart: loadCart(), favorites: loadFavorites(), showFavorites: false, view: "catalog", ready: false };
  const $ = s => document.querySelector(s);
  const money = n => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch {} }

  /* ---------- dados ---------- */
  const catById = id => state.categories.find(c => c.id === id);
  const roots = () => state.categories.filter(c => !c.parentId);
  const kids = id => state.categories.filter(c => c.parentId === id);
  const product = id => state.products.find(p => p.id === id);
  const variationOf = (p, vid) => (p.variations || []).find(v => v.id === vid);
  const firstAvailable = p => (p.variations || []).find(v => !v.soldOut) || (p.variations || [])[0];
  /* preço vigente de um produto (considerando variação) */
  function priceInfo(p, v) {
    const src = v || (p.variations?.length ? firstAvailable(p) : p);
    const price = Number(src.price ?? p.price ?? 0), old = Number(src.originalPrice ?? 0);
    return { price, old: old > price ? old : 0 };
  }
  const display = () => state.cfg.ecommerce?.display || {};
  const coverOf = p => p.cover || (p.images && p.images[0]) || p.image || "";
  function videoHtml(url) {
    url = String(url || "").trim(); if (!/^https?:\/\//i.test(url)) return "";
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (yt) return `<iframe src="https://www.youtube.com/embed/${esc(yt[1])}" title="Vídeo" allowfullscreen loading="lazy"></iframe>`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vm) return `<iframe src="https://player.vimeo.com/video/${esc(vm[1])}" title="Vídeo" allowfullscreen loading="lazy"></iframe>`;
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) ? `<video src="${esc(url)}" controls playsinline preload="metadata"></video>` : "";
  }
  function installText(price) {
    const d = display(); let n = Math.min(12, Math.max(1, Number(d.maxInstallments) || 1));
    const min = Number(d.minInstallmentValue) || 0;
    while (n > 1 && min > 0 && price / n < min) n--;
    return n > 1 ? `${n}x de ${money(price / n)} sem juros` : "";
  }
  function pixText(price) {
    const pct = Number(display().pixDiscountPercent) || 0;
    return pct > 0 ? `${money(price * (1 - pct / 100))} no Pix (${pct}% off)` : "";
  }

  /* ---------- carga ---------- */
  function waitForV8(ms = 6000) {
    return new Promise(res => { const t0 = Date.now(); (function poll() { if (window.V8) return res(window.V8); if (Date.now() - t0 > ms) return res(null); setTimeout(poll, 40); })(); });
  }
  async function init() {
    $("#year").textContent = new Date().getFullYear();
    const v8 = await waitForV8();
    if (!v8) { $("#products").innerHTML = `<div class="empty" style="grid-column:1/-1">Loja indisponível: o V8 Loader não foi carregado.</div>`; return; }
    await v8.ready;
    const cat = window.V8.catalog;
    state.cfg = window.V8.config || {};
    if (!cat) { $("#products").innerHTML = `<div class="empty" style="grid-column:1/-1">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</div>`; return; }
    state.products = cat.products || []; state.categories = cat.categories || []; state.tags = cat.tags || [];
    state.ready = true;
    const pay = state.cfg.payments || {};
    if (pay.infinitePay?.enabled || pay.mercadoPago?.enabled) $("#payInfo").textContent = "Pix e cartão em até " + (display().maxInstallments || 1) + "x";
    renderCategories(); renderSideCategories(); renderBanners(); renderProducts(); updateCart(); renderView();
  }

  /* Banner promocional: usa banners cadastrados nos produtos do painel e gira automaticamente. */
  let bannerTimer = null;
  function renderBanners() {
    const list = state.products.filter(p => p.banner && !p.soldOut);
    const wrap = $("#bannersWrap"); if (!wrap) return;
    const show = list.length > 0 && state.category === "all" && !state.search.trim();
    wrap.hidden = !show;
    if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
    $("#banners").innerHTML = show ? list.map((p, i) => `<button class="banner" data-detail="${esc(p.id)}" data-slide="${i}" aria-label="Ver oferta: ${esc(p.name)}" style="${i ? 'display:none' : ''}"><img src="${esc(p.banner)}" alt="${esc(p.name)}" loading="lazy"></button>`).join("") : "";
    $("#bannerDots").innerHTML = show && list.length > 1 ? list.map((p, i) => `<button type="button" data-banner-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Mostrar banner ${i + 1}"></button>`).join("") : "";
    if (show && list.length > 1) {
      let current = 0;
      const activate = n => {
        const slides = [...$("#banners").querySelectorAll("[data-slide]")];
        if (!slides.length) return;
        current = (n + slides.length) % slides.length;
        slides.forEach((el, i) => { el.style.display = i === current ? "block" : "none"; });
        [...$("#bannerDots").querySelectorAll("button")].forEach((el, i) => el.classList.toggle("active", i === current));
      };
      $("#bannerDots").onclick = e => { const dot = e.target.closest("[data-banner-dot]"); if (dot) { activate(Number(dot.dataset.bannerDot)); start(); } };
      const start = () => { if (bannerTimer) clearInterval(bannerTimer); bannerTimer = setInterval(() => activate(current + 1), 4500); };
      start();
    }
  }

  /* ---------- categorias (do painel) ---------- */
  function renderCategories() {
    const btn = (id, label, cls = "") => `<button class="${cls} ${state.category === id && !cls.includes("sub") ? "active" : ""}" data-cat="${esc(id)}">${esc(label)}</button>`;
    let html = btn("all", "Todos");
    for (const c of roots()) html += btn(c.id, c.name.toUpperCase());
    if (state.products.some(p => p.promotion || (priceInfo(p).old > 0))) html += btn("ofertas", "OFERTAS");
    const subs = state.category !== "all" && state.category !== "ofertas" ? kids(state.category) : [];
    if (subs.length) html += subs.map(c => `<button class="sub ${state.sub === c.id ? "active" : ""}" data-sub="${esc(c.id)}">${esc(c.name)}</button>`).join("");
    $("#categories").innerHTML = html;
    const all = btn("all", "Todos os produtos");
    let menu = all; for (const c of roots()) menu += btn(c.id, c.name);
    if (state.products.some(p => p.promotion || priceInfo(p).old > 0)) menu += btn("ofertas", "Ofertas e promoções");
    $("#categoryMenu").innerHTML = menu;
  }
  function renderSideCategories() {
    const btn = (id, label) => `<button type="button" data-cat="${esc(id)}" class="${state.category === id ? "active" : ""}">${esc(label)}</button>`;
    let html = btn("all", "Todos os produtos");
    roots().forEach(c => { html += btn(c.id, c.name); });
    if (state.products.some(p => p.promotion || priceInfo(p).old > 0)) html += btn("ofertas", "Ofertas e promoções");
    $("#sideCategories").innerHTML = html;
  }
  function filtered() {
    const q = state.search.trim().toLowerCase();
    let list = state.products.filter(p => {
      if (state.showFavorites && !state.favorites.includes(String(p.id))) return false;
      const { price, old } = priceInfo(p);
      if (state.category === "ofertas") { if (!(p.promotion || old > 0)) return false; }
      else if (state.category !== "all") {
        const ids = state.sub ? [state.sub] : [state.category, ...kids(state.category).map(k => k.id)];
        if (!ids.includes(p.categoryId)) return false;
      }
      if (state.minPrice !== "" && price < Number(state.minPrice)) return false;
      if (state.maxPrice !== "" && price > Number(state.maxPrice)) return false;
      if (state.onlyAvailable && (p.soldOut || (p.variations?.length && !p.variations.some(v => !v.soldOut)))) return false;
      if (state.onlyOffers && !(p.promotion || old > 0)) return false;
      if (q) {
        const tn = (p.tags || []).map(id => state.tags.find(t => t.id === id)?.name || "").join(" ");
        if (!`${p.name} ${p.shortDescription || ""} ${p.sku || ""} ${catById(p.categoryId)?.name || ""} ${tn}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (state.sort === "price-asc") list.sort((a,b) => priceInfo(a).price - priceInfo(b).price);
    if (state.sort === "price-desc") list.sort((a,b) => priceInfo(b).price - priceInfo(a).price);
    if (state.sort === "name") list.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
    if (state.sort === "discount") list.sort((a,b) => discount(b) - discount(a));
    return list;
  }
  function discount(p) { const {price, old} = priceInfo(p); return old > price && old > 0 ? (old-price)/old : 0; }

  /* ---------- vitrine de produtos ---------- */
  function renderProducts() {
    const list = filtered();
    $("#resultCount").textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
    $("#listTitle").textContent = state.showFavorites ? "Meus favoritos" : state.category === "all" ? "Produtos em destaque" : state.category === "ofertas" ? "Ofertas" : (catById(state.sub || state.category)?.name || "Produtos");
    $("#products").innerHTML = list.length ? list.map(p => {
      const { price, old } = priceInfo(p), from = p.variations?.length > 1 ? "A partir de " : "";
      const inst = installText(price), pix = pixText(price);
      const img = coverOf(p);
      return `<article class="product ${p.soldOut ? "is-sold" : ""}"><button class="favorite-toggle ${state.favorites.includes(String(p.id)) ? "is-favorite" : ""}" data-favorite="${esc(p.id)}" aria-label="${state.favorites.includes(String(p.id)) ? "Remover dos favoritos" : "Adicionar aos favoritos"}">${state.favorites.includes(String(p.id)) ? "♥" : "♡"}</button>${img ? `<img class="product-img" src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="product-img"></div>`}<div class="product-body">
        ${p.soldOut ? '<span class="sold">ESGOTADO</span>' : (p.promotion || old ? '<span class="tag">OFERTA</span>' : "")}<h3>${esc(p.name)}</h3><p class="desc">${esc(p.shortDescription || "")}</p>
        ${old ? `<span class="old">${money(old)}</span>` : ""}<div class="price">${from}${money(price)}</div>
        ${inst ? `<div class="install">${esc(inst)}</div>` : ""}${pix ? `<div class="pix">${esc(pix)}</div>` : ""}
        <div class="product-actions"><button data-detail="${esc(p.id)}">Detalhes</button><button class="buy" data-add="${esc(p.id)}" ${p.soldOut ? "disabled" : ""}>${p.variations?.length ? "Escolher" : "Comprar"}</button></div></div></article>`;
    }).join("") : `<div class="empty" style="grid-column:1/-1">Nenhum produto encontrado.</div>`;
  }

  /* ---------- detalhe: galeria + variações ---------- */
  let detail = { id: "", vid: "", img: 0 };
  function openDetail(id) {
    const p = product(id); if (!p) return;
    detail = { id, vid: (firstAvailable(p) || {}).id || "", img: 0 };
    paintDetail(); $("#productDialog").showModal();
  }
  function paintDetail() {
    const p = product(detail.id); if (!p) return;
    const v = variationOf(p, detail.vid), { price, old } = priceInfo(p, v);
    const imgs = [...new Set([p.cover, ...(p.images || []), p.image].filter(Boolean))];
    const main = imgs[detail.img] || imgs[0] || "";
    const video = videoHtml(p.video);
    const soldOut = v ? v.soldOut : p.soldOut;
    const inst = installText(price), pix = pixText(price);
    $("#productDetail").innerHTML = `<div class="detail"><div class="detail-media">${main ? `<img src="${esc(main)}" alt="${esc(p.name)}">` : ""}
      ${video ? `<div class="detail-video">${video}</div>` : ""}
      ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button class="${i === detail.img ? "on" : ""}" data-thumb="${i}" aria-label="Foto ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}</div>
      <div class="detail-body"><span class="eyebrow">${esc(catById(p.categoryId)?.name || "")}</span><h2>${esc(p.name)}</h2>
      <p>${esc(p.shortDescription || "")}</p>${p.description && p.description !== p.shortDescription ? `<p class="full">${esc(p.description)}</p>` : ""}
      ${p.variations?.length ? `<div class="variations" role="radiogroup">${p.variations.map(x => `<label class="${x.id === detail.vid ? "on" : ""} ${x.soldOut ? "off" : ""}"><span><input type="radio" name="var" value="${esc(x.id)}" ${x.id === detail.vid ? "checked" : ""} ${x.soldOut ? "disabled" : ""}> ${esc(x.name)}${x.soldOut ? " (esgotado)" : ""}</span><b>${money(x.price)}</b></label>`).join("")}</div>` : ""}
      ${old ? `<span class="old">${money(old)}</span>` : ""}<div class="price">${money(price)}</div>
      ${inst ? `<div class="install">${esc(inst)}</div>` : ""}${pix ? `<div class="pix">${esc(pix)}</div>` : ""}
      ${soldOut ? '<span class="sold">ESGOTADO</span>' : `<button class="btn primary" data-add="${esc(p.id)}" data-var="${esc(detail.vid)}">Adicionar ao carrinho</button>`}</div></div>`;
  }

  /* ---------- carrinho ---------- */
  function add(id, vid) {
    const p = product(id); if (!p || p.soldOut) return;
    if (p.variations?.length && !vid) { openDetail(id); return; }        // exige escolher a variação
    const v = variationOf(p, vid); if (p.variations?.length && (!v || v.soldOut)) return;
    const key = p.id + "|" + (v?.id || ""), item = state.cart.find(i => i.key === key);
    if (item) item.qty++; else state.cart.push({ key, id: p.id, variationId: v?.id || "", qty: 1 });
    saveCart(); updateCart(); if (state.view === "cart") renderView(); showAddedNotice();
  }
  function updateQty(key, delta) { const i = state.cart.find(x => x.key === key); if (!i) return; i.qty += delta; if (i.qty < 1) state.cart = state.cart.filter(x => x !== i); saveCart(); updateCart(); }
  function cartDetails() {
    return state.cart.map(i => { const p = product(i.id), v = p && variationOf(p, i.variationId); return p && !(p.variations?.length && !v) ? { i, p, v, price: priceInfo(p, v).price } : null; }).filter(Boolean);
  }
  function updateCart() {
    const items = cartDetails(), total = items.reduce((s, x) => s + x.price * x.i.qty, 0);
    // remove do carrinho o que saiu do catálogo
    if (state.ready && items.length !== state.cart.length) { state.cart = state.cart.filter(c => items.some(x => x.i === c)); saveCart(); }
    $("#cartCount").textContent = state.cart.reduce((s, i) => s + i.qty, 0); $("#cartTotal").textContent = money(total);
    const itemMarkup = x => `<article class="cart-item"><img src="${esc(coverOf(x.p))}" alt="${esc(x.p.name)}"><div class="cart-item-info"><h4>${esc(x.p.name)}</h4>${x.v ? `<span class="var">${esc(x.v.name)}</span>` : ""}<p>${money(x.price)} por unidade</p><div class="qty"><button data-qty="${esc(x.i.key)}" data-d="-1" aria-label="Diminuir quantidade">−</button><span>${x.i.qty}</span><button data-qty="${esc(x.i.key)}" data-d="1" aria-label="Aumentar quantidade">+</button></div></div><div class="cart-item-end"><strong>${money(x.price * x.i.qty)}</strong><button class="remove-cart-item" data-remove-cart="${esc(x.i.key)}" type="button">Remover</button></div></article>`;
    const emptyMarkup = `<div class="empty"><div class="empty-icon">🛒</div><h3>Seu carrinho está vazio</h3><p>Explore o catálogo e adicione produtos ao seu pedido.</p><button class="btn primary" data-go-catalog type="button">Ver produtos</button></div>`;
    $("#cartItems").innerHTML = items.length ? items.map(itemMarkup).join("") : emptyMarkup;
    $("#cartPageItems").innerHTML = items.length ? items.map(itemMarkup).join("") : emptyMarkup;
    $("#cartPageSubtotal").textContent = money(total); $("#cartPageTotal").textContent = money(total);
    $("#cartNote").textContent = total ? "Valores e frete confirmados no atendimento." : "";
  }
  function renderView() {
    const cartView = state.view === "cart";
    $("#cartPage").hidden = !cartView;
    $(".catalog-layout").hidden = cartView;
    $("#bannersWrap").hidden = cartView || state.showFavorites;
    $("#openFavorites").classList.toggle("active", state.showFavorites);
    $("#backFromFavorites").hidden = !state.showFavorites;
    if (cartView) { $("#cartPage").scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  const openCart = () => { closeFilters(); closeCategories(); $("#cartDrawer").hidden = true; state.view = "cart"; state.showFavorites = false; renderView(); updateCart(); };
  const closeCart = () => { $("#cartDrawer").hidden = true; if (state.view === "cart") { state.view = "catalog"; renderView(); } if (!$("#filtersSidebar").classList.contains("mobile-open")) $("#overlay").hidden = true; };
  function showAddedNotice() {
    let notice = $("#addedNotice");
    if (!notice) { notice = document.createElement("div"); notice.id = "addedNotice"; notice.className = "added-notice"; notice.setAttribute("role", "status"); document.body.appendChild(notice); }
    notice.textContent = "✓ Produto adicionado ao carrinho"; notice.classList.add("visible"); clearTimeout(showAddedNotice.timer); showAddedNotice.timer = setTimeout(() => notice.classList.remove("visible"), 2400);
  }
  function showFavorites() { state.showFavorites = true; state.view = "favorites"; state.category = "all"; state.sub = ""; renderCategories(); renderProducts(); renderView(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function showCatalog() { state.showFavorites = false; state.view = "catalog"; renderCategories(); renderProducts(); renderBanners(); renderView(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  const openFilters = () => { closeCart(); closeCategories(); $("#filtersSidebar").classList.add("mobile-open"); $("#openFilters").setAttribute("aria-expanded", "true"); $("#overlay").hidden = false; };
  function closeFilters() { $("#filtersSidebar").classList.remove("mobile-open"); $("#openFilters").setAttribute("aria-expanded", "false"); if ($( "#cartDrawer").hidden && $("#categoryDrawer").hidden) $("#overlay").hidden = true; }
  function openCategories() { closeCart(); closeFilters(); $("#categoryDrawer").hidden = false; $("#openCategories").setAttribute("aria-expanded", "true"); $("#overlay").hidden = false; }
  function closeCategories() { $("#categoryDrawer").hidden = true; $("#openCategories").setAttribute("aria-expanded", "false"); if ($("#cartDrawer").hidden && !$("#filtersSidebar").classList.contains("mobile-open")) $("#overlay").hidden = true; }

  /* Etapa 1: pedido pelo WhatsApp (o pedido online com frete e pagamento entra na etapa 2). */
  function checkout() {
    const items = cartDetails(); if (!items.length) return;
    const phone = String(window.V8?.field?.("contact.whatsapp") || "").replace(/\D/g, "");
    if (!phone) { alert("O WhatsApp da loja ainda não foi configurado no painel."); return; }
    const num = phone.length <= 11 ? "55" + phone : phone;
    const lines = items.map(x => `• ${x.p.name}${x.v ? " (" + x.v.name + ")" : ""} x${x.i.qty} — ${money(x.price * x.i.qty)}`);
    const total = items.reduce((s, x) => s + x.price * x.i.qty, 0);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Olá! Quero fazer um pedido:\n\n${lines.join("\n")}\n\nTotal: ${money(total)}`)}`, "_blank", "noopener");
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", e => {
    const fav = e.target.closest("[data-favorite]"); if (fav) { const id = String(fav.dataset.favorite); state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id]; try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites)); } catch {} renderProducts(); return; }
    const removeCart = e.target.closest("[data-remove-cart]"); if (removeCart) { state.cart = state.cart.filter(i => i.key !== removeCart.dataset.removeCart); saveCart(); updateCart(); return; }
    if (e.target.closest("[data-go-catalog]")) { showCatalog(); return; }
    const cat = e.target.closest("[data-cat]"); if (cat) { state.category = cat.dataset.cat; state.sub = ""; state.showFavorites = false; state.view = "catalog"; renderCategories(); renderSideCategories(); renderBanners(); renderProducts(); renderView(); closeCategories(); return; }
    const sub = e.target.closest("[data-sub]"); if (sub) { state.sub = state.sub === sub.dataset.sub ? "" : sub.dataset.sub; renderCategories(); renderSideCategories(); renderProducts(); return; }
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) { const wasOpen = $("#productDialog").open; if (addBtn.dataset.var !== undefined || !product(addBtn.dataset.add)?.variations?.length) { add(addBtn.dataset.add, addBtn.dataset.var || ""); if (wasOpen) $("#productDialog").close(); } else add(addBtn.dataset.add, ""); return; }
    const det = e.target.closest("[data-detail]"); if (det) { openDetail(det.dataset.detail); return; }
    const th = e.target.closest("[data-thumb]"); if (th) { detail.img = Number(th.dataset.thumb); paintDetail(); return; }
    const qty = e.target.closest("[data-qty]"); if (qty) updateQty(qty.dataset.qty, Number(qty.dataset.d));
  });
  document.addEventListener("change", e => { if (e.target.name === "var") { detail.vid = e.target.value; paintDetail(); } });
  $("#search").addEventListener("input", e => { state.search = e.target.value; renderBanners(); renderProducts(); });
  $("#searchBtn").addEventListener("click", () => $("#search").focus());
  $("#minPrice").addEventListener("input", e => { state.minPrice = e.target.value; renderProducts(); });
  $("#maxPrice").addEventListener("input", e => { state.maxPrice = e.target.value; renderProducts(); });
  $("#onlyAvailable").addEventListener("change", e => { state.onlyAvailable = e.target.checked; renderProducts(); });
  $("#onlyOffers").addEventListener("change", e => { state.onlyOffers = e.target.checked; renderProducts(); });
  $("#sortProducts").addEventListener("change", e => { state.sort = e.target.value; renderProducts(); });
  $("#clearFilters").addEventListener("click", () => {
    state.category = "all"; state.sub = ""; state.minPrice = ""; state.maxPrice = ""; state.onlyAvailable = false; state.onlyOffers = false; state.sort = "relevance"; state.search = "";
    $("#minPrice").value = ""; $("#maxPrice").value = ""; $("#onlyAvailable").checked = false; $("#onlyOffers").checked = false; $("#sortProducts").value = "relevance"; $("#search").value = "";
    renderCategories(); renderSideCategories(); renderBanners(); renderProducts();
    if (window.matchMedia("(max-width: 700px)").matches) closeFilters();
  });
  $("#openCart").addEventListener("click", openCart); $("#closeCart").addEventListener("click", closeCart); $("#continueShopping").addEventListener("click", showCatalog); $("#backFromFavorites").addEventListener("click", showCatalog); $("#checkoutPage").addEventListener("click", checkout); $("#openFilters").addEventListener("click", openFilters); $("#closeFilters").addEventListener("click", closeFilters); $("#openCategories").addEventListener("click", openCategories); $("#closeCategories").addEventListener("click", closeCategories); $("#openFavorites").addEventListener("click", () => { if (state.view === "favorites") showCatalog(); else showFavorites(); }); $("#overlay").addEventListener("click", () => { closeCart(); closeFilters(); closeCategories(); });
  $("#closeProduct").addEventListener("click", () => $("#productDialog").close()); $("#checkout").addEventListener("click", checkout);
  init();
})();
