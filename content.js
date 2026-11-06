// Steam Deal Hunter - Content Script
// Injeta automaticamente um banner Obsidian Liquid Glass nas páginas de jogos da Steam (store.steampowered.com/app/*)

(async function injectDealHunterWidget() {
  const match = window.location.href.match(/store\.steampowered\.com\/app\/(\d+)/i);
  if (!match || !match[1]) return;

  const appId = match[1];
  const targetAnchor = document.getElementById('game_area_purchase');
  if (!targetAnchor) return;

  // Create Obsidian Liquid Glass Container
  const bar = document.createElement('div');
  bar.style.cssText = `
    background: linear-gradient(135deg, rgba(10, 10, 15, 0.92), rgba(22, 12, 24, 0.92));
    backdrop-filter: blur(18px);
    border: 1px solid rgba(225, 29, 72, 0.55);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 16px;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `;

  bar.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:10px; height:10px; border-radius:50%; background:#e11d48; box-shadow:0 0 10px #e11d48;"></div>
      <div>
        <div style="font-size:13px; font-weight:800; letter-spacing:0.3px;">
          STEAM DEAL <span style="color:#e11d48;">HUNTER</span> // CHAVES OFICIAIS
        </div>
        <div id="dh-status-line" style="font-size:11px; color:#94a3b8; margin-top:2px;">
          Verificando menor preço em lojas oficiais parceiras...
        </div>
      </div>
    </div>
    <div id="dh-actions" style="display:flex; align-items:center; gap:8px;"></div>
  `;

  targetAnchor.parentNode.insertBefore(bar, targetAnchor);

  const statusLine = bar.querySelector('#dh-status-line');
  const actionsBox = bar.querySelector('#dh-actions');

  try {
    const [dealsRes, rateRes] = await Promise.allSettled([
      fetch(`https://www.cheapshark.com/api/1.0/deals?steamAppID=${appId}&steamworks=1`),
      fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
    ]);

    let usdToBrl = 5.75;
    if (rateRes.status === 'fulfilled' && rateRes.value.ok) {
      const rData = await rateRes.value.json();
      if (rData.USDBRL?.bid) usdToBrl = parseFloat(rData.USDBRL.bid);
    }

    const gameTitle = document.getElementById('appHubAppName')?.textContent?.trim() || `Steam App ${appId}`;
    const nuuvemUrl = `https://www.nuuvem.com/br-pt/catalog/search/${encodeURIComponent(gameTitle)}`;

    let bestExternalDeal = null;
    if (dealsRes.status === 'fulfilled' && dealsRes.value.ok) {
      const deals = await dealsRes.value.json();
      const partnerDeals = deals.filter(d => d.storeID !== '1');
      partnerDeals.sort((a, b) => parseFloat(a.salePrice) - parseFloat(b.salePrice));
      if (partnerDeals.length > 0) bestExternalDeal = partnerDeals[0];
    }

    if (bestExternalDeal) {
      const usd = parseFloat(bestExternalDeal.salePrice);
      const brlEst = (usd * usdToBrl).toFixed(2).replace('.', ',');
      const savings = Math.round(parseFloat(bestExternalDeal.savings));
      statusLine.innerHTML = `Menor chave global detectada: <strong style="color:#fff;">~R$ ${brlEst}</strong> (US$ ${usd.toFixed(2)}) ${savings > 0 ? `<span style="color:#34d399; font-weight:700;">[-${savings}%]</span>` : ''}`;
    } else {
      statusLine.textContent = 'Nenhuma oferta externa mais baixa em USD agora. Confira o preço regional na Nuuvem:';
    }

    actionsBox.innerHTML = `
      <a href="${nuuvemUrl}" target="_blank" rel="noopener noreferrer"
         style="background:#e11d48; color:#fff; text-decoration:none; padding:7px 12px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid rgba(255,255,255,0.25);">
         Buscar na Nuuvem (BR) &nearr;
      </a>
    `;
  } catch (err) {
    statusLine.textContent = 'Erro ao consultar ofertas externas.';
  }
})();
