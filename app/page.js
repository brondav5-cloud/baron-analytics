'use client';
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Store, Package, AlertTriangle, Award, Settings, XCircle, Search, Download, Filter, ChevronRight, ArrowUp, ArrowDown, Minus, Menu, X, Home, Bell, LogOut, User, Check, FileText } from 'lucide-react';
import STORES from './stores.json';
import PRODUCTS from './products.json';
import FILTERS from './filters.json';
import STORE_PRODUCTS from './store_products.json';
import PRODUCT_STORES from './product_stores.json';

const STATUS_CFG = {
  'צמיחה': { bg: 'bg-emerald-50', text: 'text-emerald-600', Icon: TrendingUp },
  'יציב': { bg: 'bg-blue-50', text: 'text-blue-600', Icon: Minus },
  'התאוששות': { bg: 'bg-amber-50', text: 'text-amber-600', Icon: TrendingUp },
  'ירידה מתונה': { bg: 'bg-orange-50', text: 'text-orange-600', Icon: TrendingDown },
  'התרסקות': { bg: 'bg-red-50', text: 'text-red-600', Icon: TrendingDown },
};
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];
const fmt = (n) => n != null ? new Intl.NumberFormat('he-IL').format(Math.round(n)) : '-';
const fmtPct = (n) => n != null ? `${n > 0 ? '+' : ''}${n.toFixed(1)}%` : '-';
const fmtMonth = (m) => { const s = String(m); return `${s.slice(4)}/${s.slice(2,4)}`; };
const fmtMonthHeb = (m) => { if (!m) return '-'; const ms = ['','ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ']; const s = String(m); return `${ms[parseInt(s.slice(4))]} ${s.slice(0,4)}`; };

const Badge = ({ status, sm }) => { const c = STATUS_CFG[status] || STATUS_CFG['יציב']; return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}><c.Icon size={sm ? 12 : 14} />{status}</span>; };

const Card = ({ title, value, sub, trend, icon: Icon, color = 'blue' }) => {
  const cols = { blue: 'from-blue-500 to-blue-600', green: 'from-emerald-500 to-emerald-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
  return (<div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100"><div className="flex items-start justify-between"><div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>{sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}</div><div className={`p-3 rounded-xl bg-gradient-to-br ${cols[color]} shadow-lg`}><Icon className="text-white" size={20} /></div></div>{trend !== undefined && <div className={`mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trend >= 0 ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}<span className="text-sm font-semibold">{fmtPct(trend)}</span></div>}</div>);
};

const MBox = ({ label, value, sub, pos }) => {
  const isPos = pos !== undefined ? pos : (typeof value === 'number' ? value >= 0 : true);
  return (<div className="bg-white rounded-xl shadow p-3 text-center border border-gray-100"><p className="text-xs text-gray-500">{label}</p><p className={`text-lg font-bold mt-1 ${typeof value === 'number' ? (isPos ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>{typeof value === 'number' ? fmtPct(value) : value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>);
};

const Filter2 = ({ opts, val, onChange }) => (<select value={val} onChange={e => onChange(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"><option value="">הכל</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>);

const MetricCell = ({ pct, from, to }) => (<div className="text-center"><span className={`font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(pct)}</span><p className="text-xs text-gray-400">{fmt(from)}→{fmt(to)}</p></div>);

const exportPDF = (title) => { const originalTitle = document.title; document.title = title; window.print(); document.title = originalTitle; };

const exportCSV = (data, columns, filename) => {
  const header = columns.map(c => c.l).join(',');
  const rows = data.map(r => columns.map(c => { const val = r[c.k]; return typeof val === 'string' && val.includes(',') ? `"${val}"` : val ?? ''; }).join(','));
  const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}.csv`; a.click();
};

const Table = ({ data, cols, onRow, name = 'data', compact = false }) => {
  const [sort, setSort] = useState({ k: null, d: 'desc' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = compact ? 15 : 25;
  const filtered = useMemo(() => {
    let r = data.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search.toLowerCase())));
    if (sort.k) r.sort((a, b) => { const av = a[sort.k], bv = b[sort.k]; return av < bv ? (sort.d === 'asc' ? -1 : 1) : av > bv ? (sort.d === 'asc' ? 1 : -1) : 0; });
    return r;
  }, [data, sort, search]);
  const pages = Math.ceil(filtered.length / perPage);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  return (<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"><div className="p-3 border-b flex flex-wrap gap-2 items-center justify-between print:hidden"><div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="חיפוש..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm" /></div><button onClick={() => exportCSV(filtered, cols, name)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button></div><div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>{cols.map(c => <th key={c.k} onClick={() => setSort(p => ({ k: c.k, d: p.k === c.k && p.d === 'desc' ? 'asc' : 'desc' }))} className="px-3 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap">{c.l}{sort.k === c.k && <span className="text-blue-500 mr-1">{sort.d === 'asc' ? '↑' : '↓'}</span>}</th>)}</tr></thead><tbody className="divide-y">{rows.map((r, i) => <tr key={r.id || i} onClick={() => onRow?.(r)} className={`hover:bg-blue-50 ${onRow ? 'cursor-pointer' : ''}`}>{cols.map(c => <td key={c.k} className={`px-3 py-3 text-sm whitespace-nowrap ${compact ? 'py-2' : ''}`}>{c.r ? c.r(r[c.k], r) : r[c.k]}</td>)}</tr>)}</tbody></table></div><div className="p-3 border-t bg-gray-50 flex items-center justify-between text-sm print:hidden"><span>{filtered.length} רשומות</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">הקודם</button><span>{page}/{pages || 1}</span><button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="px-3 py-1 border rounded disabled:opacity-50">הבא</button></div></div></div>);
};

const Overview = ({ stores, products, onNav }) => {
  const st = useMemo(() => {
    const active = stores.filter(s => !s.is_inactive);
    const q24 = stores.reduce((s, x) => s + (x.qty_2024 || 0), 0);
    const q25 = stores.reduce((s, x) => s + (x.qty_2025 || 0), 0);
    const yoy = q24 > 0 ? ((q25 - q24) / q24) * 100 : 0;
    const sc = {}; stores.forEach(s => { sc[s.status_long] = (sc[s.status_long] || 0) + 1; });
    const top = [...stores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 20);
    const bot = [...active].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0)).slice(0, 20);
    const alerts = stores.filter(s => !s.is_inactive && (s.status_long === 'התרסקות' || s.declining_months >= 3)).length;
    return { active: active.length, total: stores.length, q24, q25, yoy, sc, top, bot, alerts };
  }, [stores]);
  const pie = Object.entries(st.sc).map(([n, v], i) => ({ name: n, value: v, color: COLORS[i % COLORS.length] }));
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); }); return Object.entries(m).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">סקירה כללית</h2><button onClick={() => exportPDF('סקירה כללית - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Card title="סה״כ חנויות" value={fmt(st.total)} sub={`${st.active} פעילות`} icon={Store} color="blue" /><Card title="סה״כ כמות" value={fmt(st.q24 + st.q25)} trend={st.yoy} icon={TrendingUp} color="green" /><Card title="מוצרים פעילים" value={products.filter(p => !p.is_inactive).length} sub={`מתוך ${products.length}`} icon={Package} color="purple" /><Card title="התראות" value={st.alerts} sub="דורשות טיפול" icon={AlertTriangle} color="red" /></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">השוואה שנתית (כמויות)</h3><div className="grid grid-cols-3 gap-4"><div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">2024</p><p className="text-2xl font-bold text-blue-600">{fmt(st.q24)}</p></div><div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(st.q25)}</p></div><div className={`text-center p-4 rounded-xl ${st.yoy >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}><p className="text-sm text-gray-600">שינוי</p><p className={`text-2xl font-bold ${st.yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(st.yoy)}</p></div></div></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">התפלגות סטטוסים</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>{pie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={v => fmt(v)} /></PieChart></ResponsiveContainer></div><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={trend}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cg)" /></AreaChart></ResponsiveContainer></div></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">🏆 20 מובילות (כמות)</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.top.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-sm">{fmt(s.qty_total)}</p></div></div>)}</div></div><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">📉 20 בירידה</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.bot.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-red-600 text-sm">{fmtPct(s.metric_12v12)}</p><p className="text-xs text-gray-500">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</p></div></div>)}</div></div></div>
  </div>);
};

const StoresList = ({ stores, onSelect }) => {
  const [city, setCity] = useState('');
  const [net, setNet] = useState('');
  const [driver, setDriver] = useState('');
  const [agent, setAgent] = useState('');
  const [status, setStatus] = useState('');
  const [showF, setShowF] = useState(false);
  const filtered = useMemo(() => stores.filter(s => { if (city && s.city !== city) return false; if (net && s.network !== net) return false; if (driver && s.driver !== driver) return false; if (agent && s.agent !== agent) return false; if (status && s.status_long !== status) return false; return true; }), [stores, city, net, driver, agent, status]);
  const cols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'metric_12v12', l: '12/12', r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6/6', r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3/3', r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2/2', r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מהשיא', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'returns_pct_last6', l: 'חזרות', r: v => <span className={v > 15 ? 'text-red-600 font-bold' : ''}>{v?.toFixed(1)}%</span> },
    { k: 'status_long', l: 'ארוך', r: v => <Badge status={v} sm /> },
    { k: 'status_short', l: 'קצר', r: v => <Badge status={v} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
    { k: 'total_sales', l: 'מחזור', r: v => <span className="text-gray-600">₪{fmt(v)}</span> },
  ];
  return (<div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">חנויות ({filtered.length})</h2><div className="flex gap-2 print:hidden"><button onClick={() => exportPDF('חנויות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button><button onClick={() => setShowF(!showF)} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${showF ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}><Filter size={18}/>סינון</button></div></div>{showF && <div className="bg-white rounded-xl shadow p-4 grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden"><div><label className="text-xs text-gray-600">עיר</label><Filter2 opts={FILTERS.cities || []} val={city} onChange={setCity} /></div><div><label className="text-xs text-gray-600">רשת</label><Filter2 opts={FILTERS.networks || []} val={net} onChange={setNet} /></div><div><label className="text-xs text-gray-600">נהג</label><Filter2 opts={FILTERS.drivers || []} val={driver} onChange={setDriver} /></div><div><label className="text-xs text-gray-600">סוכן</label><Filter2 opts={FILTERS.agents || []} val={agent} onChange={setAgent} /></div><div><label className="text-xs text-gray-600">סטטוס</label><Filter2 opts={['צמיחה','יציב','התאוששות','ירידה מתונה','התרסקות']} val={status} onChange={setStatus} /></div></div>}<Table data={filtered} cols={cols} onRow={onSelect} name="stores" /></div>);
};

const StoreDetail = ({ store, onBack }) => {
  const chart = useMemo(() => { if (!store.monthly_qty) return []; return Object.entries(store.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [store]);
  const prods = STORE_PRODUCTS[store.id] || [];
  const prodCols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'metric_12v12', l: '12/12', r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6/6', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'metric_3v3', l: '3/3', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'status', l: 'סטטוס', r: v => <Badge status={v} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden"><button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button><button onClick={() => exportPDF(`${store.name} - Baron Analytics`)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><div className="flex justify-between items-start"><div><h1 className="text-2xl font-bold">{store.name}</h1><p className="text-gray-500 mt-1">{store.city} {store.network && `• ${store.network}`}</p><p className="text-sm text-gray-400 mt-1">נהג: {store.driver || '-'} | סוכן: {store.agent || '-'}</p></div><div className="flex gap-2"><Badge status={store.status_long} /><Badge status={store.status_short} /></div></div></div>
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3"><MBox label="12/12" value={store.metric_12v12} sub={`${fmt(store.qty_2024)}→${fmt(store.qty_2025)}`} /><MBox label="6/6" value={store.metric_6v6} sub={`${fmt(store.qty_prev6)}→${fmt(store.qty_last6)}`} /><MBox label="3/3" value={store.metric_3v3} sub={`${fmt(store.qty_prev3)}→${fmt(store.qty_last3)}`} /><MBox label="2/2" value={store.metric_2v2} sub={`${fmt(store.qty_prev2)}→${fmt(store.qty_last2)}`} /><MBox label="מהשיא" value={store.metric_peak_distance} /><MBox label="חזרות" value={`${store.returns_pct_last6?.toFixed(1)}%`} pos={store.returns_change <= 0} /></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(store.qty_2024)}</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(store.qty_2025)}</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2024</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2024)}</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2025</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2025)}</p></div></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v=>fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#3b82f6" fill="url(#sg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מוצרים בחנות ({prods.length})</h3>{prods.length > 0 ? <Table data={prods} cols={prodCols} name={`store_${store.id}_products`} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}</div>
  </div>);
};

const ProductsList = ({ products, onSelect }) => {
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const filtered = useMemo(() => products.filter(p => { if (cat && p.category !== cat) return false; if (status && p.status_long !== status) return false; return true; }), [products, cat, status]);
  const cols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'metric_12v12', l: '12/12', r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6/6', r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3/3', r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_3v3_yoy', l: '3/3 YoY', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'metric_2v2', l: '2/2', r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מהשיא', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'returns_pct_last6', l: 'חזרות', r: v => <span className={v > 15 ? 'text-red-600 font-bold' : ''}>{v?.toFixed(1)}%</span> },
    { k: 'status_long', l: 'סטטוס', r: v => <Badge status={v} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
    { k: 'total_sales', l: 'מחזור', r: v => <span className="text-gray-600">₪{fmt(v)}</span> },
  ];
  return (<div className="space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">מוצרים ({filtered.length})</h2><div className="flex gap-2 print:hidden"><button onClick={() => exportPDF('מוצרים - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button><Filter2 opts={FILTERS.categories || []} val={cat} onChange={setCat} /><Filter2 opts={['צמיחה','יציב','ירידה מתונה','התרסקות']} val={status} onChange={setStatus} /></div></div><Table data={filtered} cols={cols} onRow={onSelect} name="products" /></div>);
};

const ProductDetail = ({ product, onBack }) => {
  const chart = useMemo(() => { if (!product.monthly_qty) return []; return Object.entries(product.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [product]);
  const stores = PRODUCT_STORES[product.id] || [];
  const storeCols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'metric_12v12', l: '12/12', r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6/6', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'metric_3v3', l: '3/3', r: v => <span className={`font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(v)}</span> },
    { k: 'status', l: 'סטטוס', r: v => <Badge status={v} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden"><button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button><button onClick={() => exportPDF(`${product.name} - Baron Analytics`)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><div className="flex justify-between items-start"><div><h1 className="text-2xl font-bold">{product.name}</h1><p className="text-gray-500 mt-1">{product.category}</p></div><div className="flex gap-2"><Badge status={product.status_long} /><Badge status={product.status_short} /></div></div></div>
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3"><MBox label="12/12" value={product.metric_12v12} sub={`${fmt(product.qty_2024)}→${fmt(product.qty_2025)}`} /><MBox label="6/6" value={product.metric_6v6} sub={`${fmt(product.qty_prev6)}→${fmt(product.qty_last6)}`} /><MBox label="3/3 YoY" value={product.metric_3v3_yoy} /><MBox label="3/3" value={product.metric_3v3} sub={`${fmt(product.qty_prev3)}→${fmt(product.qty_last3)}`} /><MBox label="2/2" value={product.metric_2v2} sub={`${fmt(product.qty_prev2)}→${fmt(product.qty_last2)}`} /><MBox label="מהשיא" value={product.metric_peak_distance} /></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(product.qty_2024)}</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(product.qty_2025)}</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">חזרות</p><p className="text-xl font-bold text-gray-600">{product.returns_pct_last6?.toFixed(1)}%</p></div><div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור</p><p className="text-xl font-bold text-gray-600">₪{fmt(product.total_sales)}</p></div></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v=>fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v=>fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#8b5cf6" fill="url(#pg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">חנויות שמוכרות את המוצר ({stores.length})</h3>{stores.length > 0 ? <Table data={stores} cols={storeCols} name={`product_${product.id}_stores`} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}</div>
  </div>);
};

const Alerts = ({ stores, onSelect }) => {
  const alerts = useMemo(() => stores.filter(s => !s.is_inactive && (s.status_long === 'התרסקות' || s.declining_months >= 3)).sort((a,b) => a.metric_12v12 - b.metric_12v12), [stores]);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">התראות ({alerts.length})</h2><button onClick={() => exportPDF('התראות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>{alerts.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">אין התראות</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{alerts.map(s => <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow-lg p-5 border-2 border-red-200 hover:border-red-400 cursor-pointer"><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div><Badge status={s.status_long} sm /></div><div className="grid grid-cols-3 gap-3 text-center"><div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">12/12</p><p className="font-bold text-red-600">{fmtPct(s.metric_12v12)}</p></div><div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">ירידה</p><p className="font-bold text-red-600">{s.declining_months} חודשים</p></div><div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">מהשיא</p><p className="font-bold text-red-600">{fmtPct(s.metric_peak_distance)}</p></div></div></div>)}</div>}</div>);
};

const Rankings = ({ stores, onSelect }) => {
  const r = useMemo(() => ({ qty: [...stores].sort((a,b) => (b.qty_total||0)-(a.qty_total||0)).slice(0,30), growth: [...stores].filter(s=>!s.is_inactive).sort((a,b) => (b.metric_12v12||0)-(a.metric_12v12||0)).slice(0,30), recovery: [...stores].filter(s=>s.status_short==='התאוששות').slice(0,30) }), [stores]);
  const List = ({ title, data, icon, bg, showGrowth }) => (<div className="bg-white rounded-2xl shadow-lg p-5 border"><h3 className="text-lg font-bold mb-4">{icon} {title}</h3><div className="space-y-2 max-h-96 overflow-y-auto">{data.map((s,i) => <div key={s.id} onClick={() => onSelect(s)} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-2"><span className={`w-6 h-6 flex items-center justify-center ${bg} text-white rounded-full text-xs font-bold`}>{i+1}</span><span className="text-sm font-medium">{s.name}</span></div><span className={`text-sm font-bold ${showGrowth ? (s.metric_12v12 >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>{showGrowth ? fmtPct(s.metric_12v12) : fmt(s.qty_total)}</span></div>)}</div></div>);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">דירוגים</h2><button onClick={() => exportPDF('דירוגים - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><List title="לפי כמות" data={r.qty} icon="🏆" bg="bg-blue-500" /><List title="לפי צמיחה" data={r.growth} icon="📈" bg="bg-emerald-500" showGrowth /><List title="התאוששות" data={r.recovery} icon="💪" bg="bg-amber-500" showGrowth /></div></div>);
};

const Inactive = ({ stores, onSelect }) => {
  const list = useMemo(() => stores.filter(s => s.is_inactive).sort((a,b) => (b.last_active_month||0)-(a.last_active_month||0)), [stores]);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">לא פעילות ({list.length})</h2><button onClick={() => exportPDF('לא פעילות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>{list.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">כל החנויות פעילות!</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map(s => <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow p-5 border hover:border-gray-400 cursor-pointer"><div className="flex justify-between items-start mb-3"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div><XCircle className="text-red-400" size={20}/></div><div className="space-y-1 text-sm"><p className="text-gray-500">כמות: <span className="font-semibold">{fmt(s.qty_total)}</span></p><p className="text-gray-500">מחזור: <span className="font-semibold">₪{fmt(s.total_sales)}</span></p><p className="text-red-600 font-medium mt-2">לא פעיל מ: {fmtMonthHeb(s.last_active_month)}</p></div></div>)}</div>}</div>);
};

const Trends = ({ stores, products }) => {
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k,v]) => { m[k] = (m[k]||0) + v; }); }); return Object.entries(m).sort(([a],[b]) => Number(a)-Number(b)).map(([k,v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  const cats = useMemo(() => { const c = {}; products.forEach(p => { if (p.category) c[p.category] = (c[p.category]||0) + (p.qty_total||0); }); return Object.entries(c).sort(([,a],[,b]) => b-a).slice(0,10).map(([n,v]) => ({ name: n, value: v })); }, [products]);
  return (<div className="space-y-6"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">מגמות</h2><button onClick={() => exportPDF('מגמות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={350}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tickFormatter={v=>`${(v/1000).toFixed(0)}K`} tick={{fontSize:10}}/><Tooltip formatter={v=>fmt(v)}/><Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">כמויות לפי קטגוריה</h3><ResponsiveContainer width="100%" height={350}><BarChart data={cats} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/><YAxis type="category" dataKey="name" width={120} tick={{fontSize:11}}/><Tooltip formatter={v=>fmt(v)}/><Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div></div>);
};

const SettingsTab = ({ th, setTh }) => (<div className="space-y-6"><h2 className="text-xl font-bold">הגדרות</h2><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20}/>ספי מדדים - טווח ארוך</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['growth_long','סף צמיחה'],['stable_high_long','סף יציב עליון'],['stable_low_long','סף יציב תחתון'],['crash_long','סף התרסקות']].map(([k,l])=><div key={k}><label className="block text-sm font-medium mb-1">{l} (%)</label><input type="number" value={th[k]} onChange={e=>setTh({...th,[k]:+e.target.value})} className="w-full px-4 py-2 border rounded-xl"/></div>)}</div></div><div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20}/>ספי מדדים - טווח קצר</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[['growth_short','סף צמיחה'],['stable_high_short','סף יציב עליון'],['stable_low_short','סף יציב תחתון'],['crash_short','סף התרסקות']].map(([k,l])=><div key={k}><label className="block text-sm font-medium mb-1">{l} (%)</label><input type="number" value={th[k]} onChange={e=>setTh({...th,[k]:+e.target.value})} className="w-full px-4 py-2 border rounded-xl"/></div>)}</div></div></div>);

export default function App() {
  const [tab, setTab] = useState('overview');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [menu, setMenu] = useState(false);
  const [th, setTh] = useState({ growth_long: 10, stable_high_long: -5, stable_low_long: -15, crash_long: -30, growth_short: 10, stable_high_short: -5, stable_low_short: -15, crash_short: -30 });
  const tabs = [{ id: 'overview', l: 'סקירה', I: Home },{ id: 'stores', l: 'חנויות', I: Store },{ id: 'products', l: 'מוצרים', I: Package },{ id: 'trends', l: 'מגמות', I: TrendingUp },{ id: 'alerts', l: 'התראות', I: Bell },{ id: 'rankings', l: 'דירוגים', I: Award },{ id: 'inactive', l: 'לא פעילות', I: XCircle },{ id: 'settings', l: 'הגדרות', I: Settings }];
  const nav = (t, i) => { if (t === 'store') { setStore(i); setTab('stores'); } else { setProduct(i); setTab('products'); } };
  const content = () => {
    if (store) return <StoreDetail store={store} onBack={() => setStore(null)} />;
    if (product) return <ProductDetail product={product} onBack={() => setProduct(null)} />;
    switch (tab) {
      case 'overview': return <Overview stores={STORES} products={PRODUCTS} onNav={nav} />;
      case 'stores': return <StoresList stores={STORES} onSelect={setStore} />;
      case 'products': return <ProductsList products={PRODUCTS} onSelect={setProduct} />;
      case 'trends': return <Trends stores={STORES} products={PRODUCTS} />;
      case 'alerts': return <Alerts stores={STORES} onSelect={setStore} />;
      case 'rankings': return <Rankings stores={STORES} onSelect={setStore} />;
      case 'inactive': return <Inactive stores={STORES} onSelect={setStore} />;
      case 'settings': return <SettingsTab th={th} setTh={setTh} />;
      default: return <Overview stores={STORES} products={PRODUCTS} onNav={nav} />;
    }
  };
  return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"><header className="bg-white shadow-sm border-b sticky top-0 z-50 print:hidden"><div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setMenu(!menu)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">{menu ? <X size={24}/> : <Menu size={24}/>}</button><div><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Baron Analytics</h1><p className="text-xs text-gray-500">מערכת ניתוח מכירות</p></div></div><div className="flex items-center gap-4"><div className="hidden sm:flex items-center gap-2 text-sm text-gray-600"><User size={18}/><span>מנהל</span></div><button className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><LogOut size={20}/></button></div></div></header><div className="flex"><aside className="hidden lg:block w-56 bg-white border-l min-h-screen sticky top-16 print:hidden"><nav className="p-4 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><t.I size={20}/>{t.l}</button>)}</nav></aside>{menu && <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setMenu(false)}><div className="w-64 bg-white h-full" onClick={e => e.stopPropagation()}><nav className="p-4 space-y-1 mt-16">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); setMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><t.I size={20}/>{t.l}</button>)}</nav></div></div>}<main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">{content()}</main></div></div>);
}
