const CURRENCY_CONFIG = {
  BRL: { symbol: 'R$', cc: 'br', rate: 5.75 },
  USD: { symbol: 'US$', cc: 'us', rate: 1.00 },
  EUR: { symbol: '€', cc: 'de', rate: 0.92 },
  GBP: { symbol: '£', cc: 'gb', rate: 0.79 },
  ARS: { symbol: 'ARS$', cc: 'ar', rate: 985.0 },
  JPY: { symbol: '¥', cc: 'jp', rate: 154.0 }
};

let currentCurrency = 'BRL';
let storesMap = {};
let savedGames = [];
let lastRenderedIds = [];

// DOM Elements
const currencySelect = document.getElementById('currencySelect');
const activeTabBanner = document.getElementById('activeTabBanner');
const activeTabText = document.getElementById('activeTabText');
const btnScanCurrentTab = document.getElementById('btnScanCurrentTab');
const searchInput = document.getElementById('searchInput');
const btnSearchName = document.getElementById('btnSearchName');
const linksInput = document.getElementById('linksInput');
const btnScanLinks = document.getElementById('btnScanLinks');
const onlyDiscounts = document.getElementById('onlyDiscounts');
const btnRefreshSaved = document.getElementById('btnRefreshSaved');
const savedCountEl = document.getElementById('savedCount');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const statusSpinner = document.getElementById('statusSpinner');
const resultsContainer = document.getElementById('resultsContainer');
const rateInfo = document.getElementById('rateInfo');

// Initialize Extension
document.addEventListener('DOMContentLoaded', async () => {
  await loadStorage();
  setupTabs();
  detectActiveSteamTab();
  await initStoresAndRates();
});

async function loadStorage() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['savedGames', 'currency'], (res) => {
        savedGames = res.savedGames || [];
        if (res.currency && CURRENCY_CONFIG[res.currency]) {
          currentCurrency = res.currency;
          currencySelect.value = currentCurrency;
        }
        updateSavedBadge();
        resolve();
      });
    } else {
      savedGames = JSON.parse(localStorage.getItem('dh_saved') || '[]');
      updateSavedBadge();
      resolve();
    }
  });
}

function saveState() {
  updateSavedBadge();
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ savedGames, currency: currentCurrency });
  } else {
    localStorage.setItem('dh_saved', JSON.stringify(savedGames));
  }
}

function updateSavedBadge() {
  savedCountEl.textContent = savedGames.length;
}

// Detect if user is currently viewing a Steam game page in Chrome
function detectActiveSteamTab() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) return;
    const match = activeTab.url.match(/store\.steampowered\.com\/app\/(\d+)/i);
    if (match && match[1]) {
      const detectedAppId = match[1];
      activeTabBanner.classList.remove('hidden');
      activeTabText.textContent = `App #${detectedAppId} aberto na Steam`;
      btnScanCurrentTab.onclick = () => {
        loadGamesByAppIds([detectedAppId]);
      };
      // Auto-scan the current Steam game immediately on open
      loadGamesByAppIds([detectedAppId]);
    }
  });
}

async function initStoresAndRates() {
  try {
    const [storesRes, ratesRes] = await Promise.allSettled([
      fetch('https://www.cheapshark.com/api/1.0/stores'),
      fetch('https://open.er-api.com/v6/latest/USD')
    ]);

    if (storesRes.status === 'fulfilled' && storesRes.value.ok) {
      const data = await storesRes.value.json();
      data.forEach(s => {
        storesMap[s.storeID] = s.storeName;
      });
    }

    if (ratesRes.status === 'fulfilled' && ratesRes.value.ok) {
      const rData = await ratesRes.value.json();
      if (rData && rData.rates) {
        Object.keys(CURRENCY_CONFIG).forEach(code => {
          if (rData.rates[code]) {
            CURRENCY_CONFIG[code].rate = rData.rates[code];
          }
        });
      }
    }
    rateInfo.textContent = `USD/BRL: R$ ${CURRENCY_CONFIG.BRL.rate.toFixed(2)}`;
  } catch (e) {
    rateInfo.textContent = `USD/BRL: ~R$ ${CURRENCY_CONFIG.BRL.rate.toFixed(2)}`;
  }
}

function setupTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));
      document.getElementById(`tab-${target}`).classList.remove('hidden');

      if (target === 'saved') {
        if (savedGames.length > 0) {
          loadGamesByAppIds(savedGames);
        } else {
          resultsContainer.innerHTML = `<div class="empty-state"><p>Nenhum jogo salvo ainda. Clique no coração ❤️ nos cards para monitorar.</p></div>`;
        }
      }
    });
  });
}

function setStatus(msg, loading = true) {
  statusBar.classList.remove('hidden');
  statusText.textContent = msg;
  statusSpinner.style.display = loading ? 'block' : 'none';
}

// Direct Steam Store Search (Zero CORS inside Chrome Extension!)
async function searchByGameName() {
  const query = searchInput.value.trim();
  if (!query) return;

  const cfg = CURRENCY_CONFIG[currentCurrency];
  setStatus(`Buscando "${query}" direto no catálogo da Steam...`, true);

  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=portuguese&cc=${cfg.cc}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      setStatus('Nenhum jogo encontrado na Steam.', false);
      return;
    }

    const appIds = data.items.slice(0, 8).map(item => String(item.id));
    await loadGamesByAppIds(appIds);
  } catch (err) {
    setStatus('Erro ao consultar a busca da Steam.', false);
  }
}

// Extract AppIDs or Wishlist SteamID64
async function scanFromLinks() {
  const raw = linksInput.value.trim();
  if (!raw) return;

  setStatus('Extraindo AppIDs e verificando Wishlist...', true);
  const appIds = new Set();

  const appRegex = /store\.steampowered\.com\/app\/(\d+)/gi;
  let match;
  while ((match = appRegex.exec(raw)) !== null) {
    appIds.add(match[1]);
  }

  // Native Wishlist API call without CORS proxy!
  const steamIdRegex = /(7656\d{13})/g;
  while ((match = steamIdRegex.exec(raw)) !== null) {
    const steamId = match[1];
    try {
      const wRes = await fetch(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`);
      if (wRes.ok) {
        const wData = await wRes.json();
        const items = (wData.response && wData.response.items) ? wData.response.items : [];
        items.slice(0, 20).forEach(it => appIds.add(String(it.appid)));
      }
    } catch (_) {}
  }

  if (appIds.size === 0) {
    const numeric = raw.match(/\b\d{3,8}\b/g);
    if (numeric) numeric.forEach(id => appIds.add(id));
  }

  const finalIds = Array.from(appIds);
  if (finalIds.length === 0) {
    setStatus('Nenhum AppID válido encontrado.', false);
    return;
  }

  await loadGamesByAppIds(finalIds);
}

// Fetch Exact Regional Steam Price + Official Partner Keys
async function loadGamesByAppIds(appIds) {
  lastRenderedIds = appIds;
  resultsContainer.innerHTML = '';
  const cfg = CURRENCY_CONFIG[currentCurrency];

  setStatus(`Obtendo preços regionais exatos (${currentCurrency}) e chaves oficiais...`, true);

  try {
    // 1. CheapShark Official Partner Deals
    const dealsByApp = {};
    const idsParam = appIds.slice(0, 20).join(',');
    const csUrl = `https://www.cheapshark.com/api/1.0/deals?steamAppID=${idsParam}&steamworks=1&pageSize=60`;

    const csRes = await fetch(csUrl);
    if (csRes.ok) {
      const deals = await csRes.json();
      deals.forEach(d => {
        if (!d.steamAppID) return;
        if (!dealsByApp[d.steamAppID]) dealsByApp[d.steamAppID] = [];
        dealsByApp[d.steamAppID].push(d);
      });
    }

    // 2. Direct Steam Regional API (No CORS restrictions in Chrome Extension)
    const steamDetailsMap = {};
    await Promise.allSettled(
      appIds.slice(0, 12).map(async (appId) => {
        const stUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cfg.cc}&filters=basic,price_overview`;
        const stRes = await fetch(stUrl);
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData[appId] && stData[appId].success) {
            steamDetailsMap[appId] = stData[appId].data;
          }
        }
      })
    );

    renderCards(appIds.slice(0, 12), steamDetailsMap, dealsByApp);
    setStatus(`Exibindo preços verificados em ${currentCurrency}.`, false);
  } catch (err) {
    setStatus('Erro ao sincronizar ofertas.', false);
  }
}

function buildDirectStoreUrl(storeName, gameTitle, appId) {
  const q = encodeURIComponent(gameTitle);
  const s = (storeName || '').toLowerCase();
  if (s.includes('steam')) return `https://store.steampowered.com/app/${appId}/`;
  if (s.includes('greenman')) return `https://www.greenmangaming.com/search?query=${q}`;
  if (s.includes('fanatical')) return `https://www.fanatical.com/en/search?search=${q}`;
  if (s.includes('humble')) return `https://www.humblebundle.com/store/search?search=${q}`;
  if (s.includes('gamersgate')) return `https://www.gamersgate.com/games/?query=${q}`;
  return `https://www.nuuvem.com/br-pt/catalog/search/${q}`;
}

function openExternalTab(url) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function formatConvertedUsd(usdAmount) {
  const cfg = CURRENCY_CONFIG[currentCurrency];
  const val = usdAmount * cfg.rate;
  if (currentCurrency === 'JPY' || currentCurrency === 'ARS') {
    return `${cfg.symbol} ${Math.round(val).toLocaleString('pt-BR')}`;
  }
  return `${cfg.symbol} ${val.toFixed(2).replace('.', ',')}`;
}

function renderCards(appIds, steamDetailsMap, dealsByApp) {
  resultsContainer.innerHTML = '';

  appIds.forEach(appId => {
    const stData = steamDetailsMap[appId];
    let partnerDeals = (dealsByApp[appId] || []).filter(d => d.storeID !== '1');
    partnerDeals.sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice));

    const priceOverview = stData ? stData.price_overview : null;
    const hasSteamDiscount = priceOverview && priceOverview.discount_percent > 0;
    const hasPartnerDiscount = partnerDeals.some(d => parseFloat(d.savings) > 0);

    if (onlyDiscounts.checked && !hasSteamDiscount && !hasPartnerDiscount) {
      return;
    }

    const title = stData?.name || partnerDeals[0]?.title || `Steam App #${appId}`;
    const thumb = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
    const steamUrl = `https://store.steampowered.com/app/${appId}/`;
    const nuuvemUrl = `https://www.nuuvem.com/br-pt/catalog/search/${encodeURIComponent(title)}`;
    const isSaved = savedGames.includes(String(appId));

    // Exact Steam Price Display
    let steamPriceHtml = `<span class="price-main">Ver na Loja</span>`;
    if (stData?.is_free) {
      steamPriceHtml = `<span class="price-main" style="color:#34d399">Gratuito</span>`;
    } else if (priceOverview) {
      steamPriceHtml = `
        ${priceOverview.discount_percent > 0 ? `<span class="discount-pill">-${priceOverview.discount_percent}%</span>` : ''}
        <div>
          <span class="price-main">${priceOverview.final_formatted}</span>
          ${priceOverview.discount_percent > 0 ? `<span class="price-old">${priceOverview.initial_formatted}</span>` : ''}
        </div>
      `;
    }

    const card = document.createElement('div');
    card.className = 'game-card';

    let partnersHtml = '';
    partnerDeals.slice(0, 3).forEach(deal => {
      const sName = storesMap[deal.storeID] || 'Loja Oficial';
      const usdPrice = parseFloat(deal.salePrice);
      const savings = Math.round(parseFloat(deal.savings));
      const directUrl = buildDirectStoreUrl(sName, title, appId);

      partnersHtml += `
        <div class="partner-row" data-url="${directUrl}">
          <div>
            <strong>${sName}</strong>
            <span style="color:#94a3b8; font-size:10px; margin-left:4px;">Chave Steam Global</span>
          </div>
          <div class="price-box">
            ${savings > 0 ? `<span class="discount-pill">-${savings}%</span>` : ''}
            <span style="font-weight:700; color:#e2e8f0;">~${formatConvertedUsd(usdPrice)}</span>
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="card-top">
        <img src="${thumb}" class="card-thumb" alt="${title}" data-url="${steamUrl}">
        <div class="card-title-wrap">
          <div class="card-title" data-url="${steamUrl}" title="${title}">${title}</div>
          <div class="card-meta">AppID: ${appId} &bull; DRM: Steam Oficial</div>
        </div>
        <button class="btn-fav ${isSaved ? 'saved' : ''}" data-fav="${appId}" title="Salvar Jogo">♥</button>
      </div>

      <div class="steam-exact-row" data-url="${steamUrl}">
        <div class="store-badge">
          <div class="store-name">
            <span>Loja Oficial Steam (${currentCurrency})</span>
            <span class="tag-exact">EXATO</span>
          </div>
          <span class="store-sub">Preço regional direto da Steam</span>
        </div>
        <div class="price-box">
          ${steamPriceHtml}
        </div>
      </div>

      ${partnersHtml ? `<div class="partner-list">${partnersHtml}</div>` : ''}

      <div class="card-actions">
        <button class="btn-action steam-primary" data-url="${steamUrl}">Abrir na Steam &nearr;</button>
        <button class="btn-action" data-url="${nuuvemUrl}">Checar Nuuvem &nearr;</button>
      </div>
    `;

    // Bind Click Redirects via Chrome Tabs API
    card.querySelectorAll('[data-url]').forEach(el => {
      el.addEventListener('click', () => openExternalTab(el.getAttribute('data-url')));
    });

    // Bind Favorite Button
    const favBtn = card.querySelector('[data-fav]');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idStr = String(appId);
      if (savedGames.includes(idStr)) {
        savedGames = savedGames.filter(x => x !== idStr);
        favBtn.classList.remove('saved');
      } else {
        savedGames.push(idStr);
        favBtn.classList.add('saved');
      }
      saveState();
    });

    resultsContainer.appendChild(card);
  });
}

// Event Listeners
btnSearchName.addEventListener('click', searchByGameName);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchByGameName();
});
btnScanLinks.addEventListener('click', scanFromLinks);
btnRefreshSaved.addEventListener('click', () => {
  if (savedGames.length > 0) loadGamesByAppIds(savedGames);
});
currencySelect.addEventListener('change', () => {
  currentCurrency = currencySelect.value;
  saveState();
  if (lastRenderedIds.length > 0) {
    loadGamesByAppIds(lastRenderedIds);
  }
});
