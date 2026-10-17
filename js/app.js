/* Catálogo virtual genérico — conectado ao V8 Admin Universal pelo V8 Loader.
   Etapa 1: catálogo real (categorias, variações, galeria, de/por, parcelas, Pix) + carrinho + pedido pelo WhatsApp. */
(() => {
  "use strict";
  const loaderScript = document.querySelector('script[src*="v8-loader"]');
  const projectKey = loaderScript?.dataset.projectId || location.pathname;
  const CART_KEY = "v8_catalog_cart_v1_" + projectKey;
  const state = { products: [], categories: [], tags: [], cfg: {}, category: "all", sub: "", search: "", cart: loadCart(), ready: false };
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
    renderCategories(); renderBanners(); renderProducts(); updateCart();
  }

  /* banners: produtos que têm imagem de banner no painel */
  function renderBanners() {
    const list = state.products.filter(p => p.banner && !p.soldOut);
    const wrap = $("#bannersWrap"); if (!wrap) return;
    const show = list.length && state.category === "all" && !state.search.trim();
    wrap.hidden = !show;
    $("#banners").innerHTML = show ? list.map(p => `<button class="banner" data-detail="${esc(p.id)}" aria-label="${esc(p.name)}"><img src="${esc(p.banner)}" alt="${esc(p.name)}" loading="lazy"></button>`).join("") : "";
  }

  /* ---------- categorias (do painel) ---------- */
  function renderCategories() {
    const btn = (id, label, cls = "") => `<button class="${cls} ${state.category === id && !cls.includes("sub") ? "active" : ""}" data-cat="${esc(id)}">${esc(label)}</button>`;
    let html = btn("all", "TODOS");
    for (const c of roots()) html += btn(c.id, c.name.toUpperCase());
    if (state.products.some(p => p.promotion || (priceInfo(p).old > 0))) html += btn("ofertas", "OFERTAS");
    const subs = state.category !== "all" && state.category !== "ofertas" ? kids(state.category) : [];
    if (subs.length) html += subs.map(c => `<button class="sub ${state.sub === c.id ? "active" : ""}" data-sub="${esc(c.id)}">${esc(c.name)}</button>`).join("");
    $("#categories").innerHTML = html;
  }
  function filtered() {
    const q = state.search.trim().toLowerCase();
    return state.products.filter(p => {
      if (state.category === "ofertas") { if (!(p.promotion || priceInfo(p).old > 0)) return false; }
      else if (state.category !== "all") {
        const ids = state.sub ? [state.sub] : [state.category, ...kids(state.category).map(k => k.id)];
        if (!ids.includes(p.categoryId)) return false;
      }
      if (!q) return true;
      const tn = (p.tags || []).map(id => state.tags.find(t => t.id === id)?.name || "").join(" ");
      return `${p.name} ${p.shortDescription || ""} ${p.sku || ""} ${catById(p.categoryId)?.name || ""} ${tn}`.toLowerCase().includes(q);
    });
  }

  /* ---------- vitrine de produtos ---------- */
  function renderProducts() {
    const list = filtered();
    $("#resultCount").textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
    $("#listTitle").textContent = state.category === "all" ? "Produtos" : state.category === "ofertas" ? "Ofertas" : (catById(state.sub || state.category)?.name || "Produtos");
    $("#products").innerHTML = list.length ? list.map(p => {
      const { price, old } = priceInfo(p), from = p.variations?.length > 1 ? "A partir de " : "";
      const inst = installText(price), pix = pixText(price);
      const img = coverOf(p);
      return `<article class="product ${p.soldOut ? "is-sold" : ""}">${img ? `<img class="product-img" src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="product-img"></div>`}<div class="product-body">
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
    saveCart(); updateCart(); openCart();
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
    $("#cartItems").innerHTML = items.length ? items.map(x => `<div class="cart-item"><img src="${esc(coverOf(x.p))}" alt=""><div><h4>${esc(x.p.name)}</h4>${x.v ? `<span class="var">${esc(x.v.name)}</span>` : ""}<p>${money(x.price)} · ${x.i.qty} un.</p><div class="qty"><button data-qty="${esc(x.i.key)}" data-d="-1" aria-label="Diminuir">−</button><span>${x.i.qty}</span><button data-qty="${esc(x.i.key)}" data-d="1" aria-label="Aumentar">+</button></div></div><strong>${money(x.price * x.i.qty)}</strong></div>`).join("") : `<div class="empty">Seu carrinho está vazio.</div>`;
    $("#cartNote").textContent = total ? "Valores e frete confirmados no atendimento." : "";
  }
  const openCart = () => { $("#overlay").hidden = false; $("#cartDrawer").hidden = false; };
  const closeCart = () => { $("#overlay").hidden = true; $("#cartDrawer").hidden = true; };

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
    const cat = e.target.closest("[data-cat]"); if (cat) { state.category = cat.dataset.cat; state.sub = ""; renderCategories(); renderBanners(); renderProducts(); return; }
    const sub = e.target.closest("[data-sub]"); if (sub) { state.sub = state.sub === sub.dataset.sub ? "" : sub.dataset.sub; renderCategories(); renderProducts(); return; }
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) { const wasOpen = $("#productDialog").open; if (addBtn.dataset.var !== undefined || !product(addBtn.dataset.add)?.variations?.length) { add(addBtn.dataset.add, addBtn.dataset.var || ""); if (wasOpen) $("#productDialog").close(); } else add(addBtn.dataset.add, ""); return; }
    const det = e.target.closest("[data-detail]"); if (det) { openDetail(det.dataset.detail); return; }
    const th = e.target.closest("[data-thumb]"); if (th) { detail.img = Number(th.dataset.thumb); paintDetail(); return; }
    const qty = e.target.closest("[data-qty]"); if (qty) updateQty(qty.dataset.qty, Number(qty.dataset.d));
  });
  document.addEventListener("change", e => { if (e.target.name === "var") { detail.vid = e.target.value; paintDetail(); } });
  $("#search").addEventListener("input", e => { state.search = e.target.value; renderBanners(); renderProducts(); });
  $("#searchBtn").addEventListener("click", () => $("#search").focus());
  $("#openCart").addEventListener("click", openCart); $("#closeCart").addEventListener("click", closeCart); $("#overlay").addEventListener("click", closeCart);
  $("#closeProduct").addEventListener("click", () => $("#productDialog").close()); $("#checkout").addEventListener("click", checkout);
  init();
})();
