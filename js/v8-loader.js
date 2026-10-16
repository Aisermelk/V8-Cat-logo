/* V8 Loader — vitrine pública somente leitura.
   Uso recomendado: catalogo-v8.html?project=ID_DO_PROJETO&whatsapp=5551999999999
   Também aceita configuração por window.V8_CATALOG_CONFIG antes deste script:
   { apiBase:'https://v8adminuniversal.aisermelk.workers.dev', projectId:'...', whatsapp:'...', storeName:'...' }
*/
(() => {
  'use strict';
  const DEFAULT_API = 'https://v8adminuniversal.aisermelk.workers.dev';
  const params = new URLSearchParams(location.search);
  const config = Object.assign({
    apiBase: DEFAULT_API,
    projectId: params.get('project') || params.get('projectId') || document.body.dataset.projectId || '',
    whatsapp: params.get('whatsapp') || document.body.dataset.whatsapp || '',
    storeName: params.get('nome') || document.body.dataset.storeName || '',
    subtitle: 'Conheça nossos produtos',
    logo: '',
    currency: 'BRL',
    locale: 'pt-BR'
  }, window.V8_CATALOG_CONFIG || {});
  const $ = id => document.getElementById(id);
  const state = { products: [], categories: [], category: 'all', query: '' };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asText = value => String(value ?? '').trim();
  const money = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat(config.locale, {style:'currency',currency:config.currency}).format(n);
  };
  const imageUrl = value => {
    const s = asText(value);
    if (!s) return '';
    if (/^(https?:|data:image\/)/i.test(s)) return s;
    if (s.startsWith('/')) return config.apiBase.replace(/\/$/,'') + s;
    return s;
  };
  function setBrand() {
    const name = config.storeName || 'Catálogo';
    document.title = name + ' | Catálogo';
    $('store-name').textContent = name;
    $('footer-name').textContent = name;
    $('store-subtitle').textContent = config.subtitle || 'Conheça nossos produtos';
    if (config.logo) { $('store-logo').src = imageUrl(config.logo); $('store-logo').style.display = 'block'; }
    if (config.brandColor) document.documentElement.style.setProperty('--brand', config.brandColor);
    if (config.brandTextColor) document.documentElement.style.setProperty('--brand-ink', config.brandTextColor);
    if (config.heroText) $('hero-note').textContent = config.heroText;
    else $('hero-note').classList.add('hide');
  }
  function whatsappLink(product) {
    const number = String(config.whatsapp || '').replace(/\D/g, '');
    if (!number) return '';
    const msg = `Olá! Tenho interesse em ${product.name}${product.price !== null && product.price !== undefined && product.price !== '' ? ` (${money(product.price)})` : ''}.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }
  function productImage(p) {
    const source = p.cover || p.image || (Array.isArray(p.images) ? p.images[0] : '') || '';
    return imageUrl(source);
  }
  function renderCategories() {
    const cats = [{id:'all',name:'Todos'}].concat(state.categories.slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)));
    $('categories').innerHTML = cats.map(c => `<button class="chip ${String(c.id)===String(state.category)?'active':''}" data-category="${safe(c.id)}">${safe(c.name || 'Categoria')}</button>`).join('');
    $('categories').querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click', () => {
      state.category = btn.dataset.category; renderCategories(); renderProducts();
    }));
  }
  function renderProducts() {
    const q = state.query.toLocaleLowerCase(config.locale);
    const items = state.products.filter(p => {
      const matchesCat = state.category === 'all' || String(p.categoryId || '') === String(state.category);
      const hay = `${p.name||''} ${p.description||''} ${p.shortDescription||''} ${(p.tags||[]).join(' ')}`.toLocaleLowerCase(config.locale);
      return matchesCat && hay.includes(q);
    }).sort((a,b) => Number(!!b.featured)-Number(!!a.featured) || (Number(a.order)||0)-(Number(b.order)||0));
    $('count').textContent = `${items.length} ${items.length === 1 ? 'produto' : 'produtos'}`;
    if (!items.length) { $('products').innerHTML = '<div class="empty">Nenhum produto encontrado. Tente outra busca ou categoria.</div>'; return; }
    $('products').innerHTML = items.map(p => {
      const img = productImage(p); const price = p.price !== '' && p.price !== null && p.price !== undefined ? money(p.price) : '';
      const old = p.originalPrice !== '' && p.originalPrice !== null && p.originalPrice !== undefined && Number(p.originalPrice) > Number(p.price) ? money(p.originalPrice) : '';
      const sold = !!p.soldOut;
      const wa = whatsappLink(p);
      const action = sold ? '<span class="buy" style="opacity:.6;cursor:default">Indisponível</span>' : wa ? `<a class="buy" href="${safe(wa)}" target="_blank" rel="noopener noreferrer">Consultar pelo WhatsApp</a>` : '';
      return `<article class="card"><div class="photo">${img ? `<img src="${safe(img)}" alt="${safe(p.name)}" loading="lazy" onerror="this.style.display='none'">` : ''}${p.promotion ? '<span class="badge">Oferta</span>' : p.featured ? '<span class="badge" style="color:#166534">Destaque</span>' : ''}</div><div class="body"><h3 class="name">${safe(p.name || 'Produto')}</h3><p class="desc">${safe(p.shortDescription || p.description || '')}</p><div class="prices">${old ? `<div class="oldprice">${safe(old)}</div>` : ''}${price ? `<div class="price">${safe(price)}</div>` : ''}</div>${action}</div></article>`;
    }).join('');
  }
  async function load() {
    setBrand();
    if (!config.projectId) {
      $('products').innerHTML = '<div class="error"><strong>Falta configurar o catálogo.</strong><br>Informe o ID do projeto na URL usando <code>?project=ID_DO_PROJETO</code>.</div>';
      $('count').textContent = 'Configuração necessária'; return;
    }
    const endpoint = `${String(config.apiBase).replace(/\/$/,'')}/api/public/catalog/${encodeURIComponent(config.projectId)}`;
    try {
      const response = await fetch(endpoint, { method:'GET', headers:{'Accept':'application/json'} });
      let data; try { data = await response.json(); } catch { throw new Error('A API não retornou JSON válido.'); }
      if (!response.ok || data.success === false) throw new Error(data.error || `Falha ao carregar catálogo (${response.status}).`);
      state.products = Array.isArray(data.products) ? data.products : [];
      state.categories = Array.isArray(data.categories) ? data.categories : [];
      renderCategories(); renderProducts();
    } catch (err) {
      $('products').innerHTML = `<div class="error"><strong>Não foi possível carregar o catálogo.</strong><br>${safe(err.message || 'Verifique a conexão e a configuração da API.')}</div>`;
      $('count').textContent = 'Erro ao carregar';
    }
  }
  $('search').addEventListener('input', e => { state.query = e.target.value.trim(); renderProducts(); });
  load();
})();
