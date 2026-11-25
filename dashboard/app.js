(() => {
  'use strict';
  const source = window.TOKEN_RADAR;
  if (!source) throw new Error('The local radar data bundle is missing.');
  const rows = source.rows.map((r) => ({
    slug: r[0], name: r[1], rank: r[2], value: r[3], category: r[4], chains: r[5],
    tvl: r[6], change: r[7], years: r[8], hasToken: Boolean(r[9]), watchlist: Boolean(r[10]),
    symbol: r[11],
  })).map((row) => ({ ...row, steps: farmSteps(row) }));
  const params = new URLSearchParams(location.search);
  const view = params.get('view') ?? 'board';
  const state = {
    q: params.get('q') ?? (view === 'filtered' ? 'Ethereum' : ''),
    status: params.get('status') ?? 'all',
    selected: params.get('slug') ?? (view === 'detail' ? rows[0]?.slug : null),
  };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: value >= 1e9 ? 2 : 1 }).format(value);
  const exactMoney = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const initials = (name) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const change = (value) => `<span class="change ${value >= 0 ? 'positive' : 'negative'}">${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%</span>`;
  function farmSteps(row) {
    const chain = row.chains[0] ?? 'its primary network';
    return [
      `Set up a fresh wallet for ${chain}; transfer in $60, keep $10 for gas, and allow 15 minutes for confirmation.`,
      `Swap $25 into an asset accepted by ${row.name}; expect 5 minutes and cap swap plus network costs at $6.`,
      `Deposit $25 into the ${row.category.toLowerCase()} strategy, then review it after 24 hours; keep $5 available to exit.`,
    ];
  }

  document.body.dataset.view = view;
  $('asOf').textContent = `AS OF ${source.asOf}`;
  $('footDate').textContent = source.asOf.slice(5);
  $('allCount').textContent = rows.length;
  $('search').value = state.q;
  $('status').value = state.status;
  $('trackedStat').textContent = rows.length;
  $('preTokenStat').textContent = rows.filter((row) => !row.hasToken).length;
  $('tvlStat').textContent = money(rows.reduce((sum, row) => sum + row.tvl, 0));
  $('watchStat').textContent = `${rows.filter((row) => row.watchlist).length}/40`;

  function filteredRows() {
    const query = state.q.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !query || [row.name, row.slug, row.category, ...row.chains].join(' ').toLowerCase().includes(query);
      const matchesStatus = state.status === 'all' ||
        (state.status === 'pretoken' && !row.hasToken) ||
        (state.status === 'traded' && row.hasToken) ||
        (state.status === 'watchlist' && row.watchlist);
      return matchesQuery && matchesStatus;
    });
  }

  function renderBoard() {
    const visible = filteredRows();
    $('resultCount').textContent = `${visible.length} of ${rows.length} signals${state.q ? ` · “${state.q}”` : ''}`;
    $('empty').hidden = visible.length > 0;
    $('boardRows').innerHTML = visible.map((row) => `
      <tr data-slug="${esc(row.slug)}" tabindex="0" aria-label="Open ${esc(row.name)} detail">
        <td><span class="rank ${row.rank <= 3 ? 'top' : ''}">${String(row.rank).padStart(2, '0')}</span></td>
        <td><div class="protocol"><span class="avatar">${esc(initials(row.name))}</span><div class="protocol-text"><div class="protocol-name">${esc(row.name)}${row.watchlist ? '<span class="watch" title="On watchlist">★</span>' : ''}</div><div class="protocol-meta">${esc(row.category)} · ${row.hasToken ? esc(row.symbol ?? 'TOKEN LIVE') : 'NO TOKEN YET'}</div></div></div></td>
        <td><span class="chain">${esc(row.chains.slice(0, 2).join(' + '))}${row.chains.length > 2 ? ` +${row.chains.length - 2}` : ''}</span></td>
        <td>${change(row.change)}</td>
        <td><span class="tvl">${money(row.tvl)}</span></td>
        <td><span class="value">${money(row.value)}</span><span class="value-label">${row.hasToken ? 'TOKEN LIVE' : 'PRE-TOKEN'}</span></td>
        <td><button class="row-open" tabindex="-1" aria-label="View ${esc(row.name)}">→</button></td>
      </tr>`).join('');
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.status === state.status));
    document.querySelectorAll('tr[data-slug]').forEach((tr) => {
      tr.addEventListener('click', () => openDetail(tr.dataset.slug));
      tr.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openDetail(tr.dataset.slug); });
    });
  }

  function openDetail(slug) {
    state.selected = slug;
    renderDetail();
  }

  function renderDetail() {
    const row = rows.find((item) => item.slug === state.selected);
    const panel = $('detail');
    if (!row) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      $('backdrop').hidden = true;
      return;
    }
    panel.innerHTML = `<div class="detail-inner">
      <div class="detail-top"><span>PROTOCOL DOSSIER / ${String(row.rank).padStart(2, '0')}</span><button class="close" id="closeDetail" aria-label="Close detail">✕</button></div>
      <div class="detail-identity"><span class="avatar">${esc(initials(row.name))}</span><div><h2>${esc(row.name)}</h2><p>${esc(row.category)} · ${esc(row.chains.slice(0, 6).join(' + '))}${row.chains.length > 6 ? ` +${row.chains.length - 6} more` : ''}</p></div></div>
      <span class="token-badge"><i class="live-dot"></i>${row.hasToken ? `TOKEN LIVE${row.symbol ? ` / ${esc(row.symbol)}` : ''}` : 'PRE-TOKEN OPPORTUNITY'}</span>
      <div class="detail-value"><label>IMPLIED PROTOCOL VALUE</label><strong>${exactMoney(row.value)}</strong><small>Rank #${row.rank} · derived from scale, momentum and record</small></div>
      <div class="detail-metrics"><div><label>TOTAL VALUE LOCKED</label><strong>${money(row.tvl)}</strong></div><div><label>7D CHANGE</label><strong>${change(row.change)}</strong></div><div><label>YEARS ON RECORD</label><strong>${row.years.toFixed(2)}</strong></div></div>
      <div class="farm-head"><h3>Concrete farm plan</h3><span>3 STEPS / 24H REVIEW</span></div>
      <div class="steps">${row.steps.map((step) => `<div class="step">${esc(step)}</div>`).join('')}</div>
      <p class="detail-note">Illustrative research workflow, not financial advice. Verify the protocol’s official app, supported assets, wallet network and current fees before committing funds.</p>
    </div>`;
    drawDetailTexture(panel);
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    $('backdrop').hidden = false;
    $('closeDetail').addEventListener('click', closeDetail);
  }

  function closeDetail() {
    state.selected = null;
    renderDetail();
  }

  function setStatus(status) {
    state.status = status;
    $('status').value = status;
    renderBoard();
  }

  $('search').addEventListener('input', (event) => { state.q = event.target.value; renderBoard(); });
  $('status').addEventListener('change', (event) => setStatus(event.target.value));
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => setStatus(button.dataset.status)));
  $('backdrop').addEventListener('click', closeDetail);
  $('clearFilters').addEventListener('click', () => { state.q = ''; state.status = 'all'; $('search').value = ''; $('status').value = 'all'; renderBoard(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
    if (event.key === '/' && document.activeElement !== $('search')) { event.preventDefault(); $('search').focus(); }
  });

  function drawDetailTexture(panel) {
    const tile = document.createElement('canvas');
    tile.width = 150;
    tile.height = 282;
    const tileCtx = tile.getContext('2d');
    const image = tileCtx.createImageData(tile.width, tile.height);
    let seed = 93173;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = (seed % 9) - 4;
      image.data[i] = 13 + n;
      image.data[i + 1] = 20 + n;
      image.data[i + 2] = 27 + n;
      image.data[i + 3] = 255;
    }
    tileCtx.putImageData(image, 0, 0);
    panel.style.backgroundImage = `url(${tile.toDataURL('image/png')})`;
    panel.style.backgroundSize = 'cover';
  }

  function drawAmbient() {
    const canvas = $('ambient');
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const ctx = canvas.getContext('2d');
    const tile = document.createElement('canvas');
    tile.width = 360;
    tile.height = 225;
    const tileCtx = tile.getContext('2d');
    const image = tileCtx.createImageData(tile.width, tile.height);
    let seed = 41721;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const n = (seed % 17) - 8;
      image.data[i] = 10 + n;
      image.data[i + 1] = 17 + n;
      image.data[i + 2] = 23 + n;
      image.data[i + 3] = 255;
    }
    tileCtx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tile, 0, 0, canvas.width, canvas.height);
    const glow = ctx.createRadialGradient(canvas.width * .72, 90, 0, canvas.width * .72, 90, 650);
    glow.addColorStop(0, 'rgba(63, 119, 99, .15)');
    glow.addColorStop(1, 'rgba(5, 10, 14, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawAmbient();
  renderBoard();
  renderDetail();
})();
