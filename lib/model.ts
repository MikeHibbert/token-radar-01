export interface Protocol {
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvl_usd: number;
  change_7d: number;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

export interface ValuedProtocol {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  category: string;
  chains: string[];
  tvl_usd: number;
  change_7d: number;
  years_on_record: number;
  has_token: boolean;
  watchlist: boolean;
  symbol: string | null;
}

type UnrankedProtocol = Omit<ValuedProtocol, 'rank'>;

export function buildBoard(snapshot: Snapshot, targetRows = 100): { rows: ValuedProtocol[] } {
  const watchlist = new Set(snapshot.watchlist);
  const knownSlugs = new Set(snapshot.protocols.map((protocol) => protocol.slug));
  const missing = [...watchlist].filter((slug) => !knownSlugs.has(slug));
  if (missing.length > 0) throw new Error(`Watchlist slugs absent from protocols: ${missing.join(', ')}`);

  const valued = snapshot.protocols.map((protocol) => ({
    ...valueProtocol(protocol, snapshot),
    watchlist: watchlist.has(protocol.slug),
  }));
  const compare = (a: UnrankedProtocol, b: UnrankedProtocol): number =>
    Number(a.has_token) - Number(b.has_token) ||
    b.implied_value_usd - a.implied_value_usd ||
    a.slug.localeCompare(b.slug);

  const required = valued.filter((row) => watchlist.has(row.slug));
  const target = Math.max(targetRows, required.length + 60);
  const needed = target - required.length;
  const available = valued.filter((row) => !watchlist.has(row.slug)).sort(compare);
  const tradedTarget = Math.max(0, Math.floor(target * 0.1) - required.filter((row) => row.has_token).length);
  const traded = available.filter((row) => row.has_token).slice(0, tradedTarget);
  const tokenless = available.filter((row) => !row.has_token).slice(0, needed - traded.length);
  const chosen = new Set([...traded, ...tokenless].map((row) => row.slug));
  const optional = [...traded, ...tokenless, ...available.filter((row) => !chosen.has(row.slug)).slice(0, needed - chosen.size)];
  const rows = [...required, ...optional]
    .sort(compare)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  return { rows };
}

function valueProtocol(protocol: Protocol, snapshot: Snapshot): UnrankedProtocol {
  const floor = Math.max(1, snapshot.floor_usd);
  const tvl = Number.isFinite(protocol.tvl_usd) ? Math.max(0, protocol.tvl_usd) : 0;
  const change = Number.isFinite(protocol.change_7d) ? protocol.change_7d : 0;
  const years = yearsOnRecord(protocol.listed_at, snapshot.as_of);
  const hasToken = !(protocol.gecko_id === null && protocol.symbol === null);

  // Square-root TVL avoids letting one giant pool dominate. Tanh bounds the effect of
  // short-term momentum, while log-scaled age rewards a longer observable record.
  const scale = 0.55 + 0.7 * Math.sqrt(tvl / floor);
  const momentum = 1 + 0.28 * Math.tanh(Math.max(-80, Math.min(80, change)) / 24);
  const record = 0.9 + 0.22 * Math.log1p(years);
  const raw = floor * scale * momentum * record;

  // Tokenless projects receive a discovery premium and can never fall below the
  // floor. Traded tokens are deliberately compressed below that floor so every
  // pre-token opportunity ranks first without consulting a hardcoded name list.
  const implied = hasToken
    ? Math.min(floor * 0.95, 1 + raw * 0.06)
    : Math.max(floor, raw * 1.8);
  const impliedValue = Math.max(1, Math.min(1e14, Math.round(implied)));

  return {
    slug: protocol.slug,
    name: protocol.name,
    implied_value_usd: impliedValue,
    category: protocol.category,
    chains: protocol.chains,
    tvl_usd: Math.round(tvl),
    change_7d: change,
    years_on_record: Math.round(years * 100) / 100,
    has_token: hasToken,
    watchlist: false,
    symbol: protocol.symbol,
  };
}

function yearsOnRecord(listedAt: string | null, asOf: string): number {
  if (!listedAt) return 0;
  const start = Date.parse(`${listedAt}T00:00:00Z`);
  const end = Date.parse(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}
