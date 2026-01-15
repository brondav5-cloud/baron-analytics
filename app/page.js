'use client';
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Store, Package, AlertTriangle, Award, XCircle, Search, Download, Filter, ChevronRight, ArrowUp, ArrowDown, Minus, Menu, X, Home, Bell, LogOut, User, Check, FileText, ChevronDown, Settings, HelpCircle } from 'lucide-react';
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

const Tip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex mr-1">
      <HelpCircle 
        size={14} 
        className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <div className="fixed z-[9999] transform -translate-y-full -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl whitespace-normal text-right" 
             style={{ marginTop: '-8px' }}>
          {text}
        </div>
      )}
    </div>
  );
};

const METRIC_TIPS = {
  '12v12': 'השוואת סך הכמות בכל 2024 מול כל 2025',
  '6v6': 'השוואת ינו-יונ 2025 מול יול-דצמ 2025',
  '3v3': 'השוואת אוק-דצמ 2024 מול אוק-דצמ 2025 (אותם חודשים, שנה מול שנה)',
  '2v2': 'השוואת ספט-אוק מול נוב-דצמ 2025',
  'peak': 'מרחק מהשיא = כמות דצמבר 2025 מול ממוצע 4 החודשים הגבוהים ביותר',
  'returns': 'אחוז החזרות מהאספקה - השוואת חצי שנה ראשון מול שני',
  'long_term': 'מדד טווח ארוך = הערך הנמוך ביותר מבין: שנתי (12v12), חצי שנה (6v6), רבעון (3v3)',
  'short_term': 'מדד טווח קצר = 2 חודשים אחרונים (נוב-דצמ) מול 2 שלפניהם (ספט-אוק). ירוק = חיובי או מקסימום ירידה אחת בין החודשים',
};
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const fmt = n => n != null ? new Intl.NumberFormat('he-IL').format(Math.round(n)) : '-';
const fmtPct = n => n != null ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '-';
const fmtMonth = m => { const s = String(m); return s.slice(4) + '/' + s.slice(2,4); };
const fmtMonthHeb = m => { if (!m) return '-'; const ms = ['','ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ']; const s = String(m); return ms[parseInt(s.slice(4))] + ' ' + s.slice(0,4); };

const Badge = ({ status, sm }) => { 
  const c = STATUS_CFG[status] || STATUS_CFG['יציב']; 
  return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}><c.Icon size={sm ? 12 : 14} />{status}</span>; 
};

const StatusBadge = ({ status, recovery, sm }) => {
  const c = STATUS_CFG[status] || STATUS_CFG['יציב'];
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${sm ? 'px-2 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'}`}>
        <c.Icon size={12} />{status}
      </span>
      {recovery && (
        <span className="inline-flex items-center gap-1 rounded-full font-medium bg-amber-50 text-amber-600 px-2 py-0.5 text-xs">
          <TrendingUp size={10} />התאוששות
        </span>
      )}
    </div>
  );
};

const LongTermCell = ({ value }) => {
  const color = value >= 10 ? 'text-emerald-600' : value >= 0 ? 'text-emerald-500' : value >= -10 ? 'text-orange-500' : 'text-red-600';
  const bg = value >= 10 ? 'bg-emerald-50' : value >= 0 ? 'bg-emerald-50' : value >= -10 ? 'bg-orange-50' : 'bg-red-50';
  return (
    <div className={`text-center px-2 py-1 rounded-lg ${bg}`}>
      <span className={`font-bold ${color}`}>{fmtPct(value)}</span>
    </div>
  );
};

const ShortTermCell = ({ value, ok }) => {
  const isPositive = value >= 0 || ok;
  const color = isPositive ? 'text-emerald-600' : 'text-red-600';
  const bg = isPositive ? 'bg-emerald-50' : 'bg-red-50';
  return (
    <div className={`text-center px-2 py-1 rounded-lg ${bg}`}>
      <span className={`font-bold ${color}`}>{fmtPct(value)}</span>
    </div>
  );
};

const Card = ({ title, value, sub, trend, icon: Icon, color = 'blue' }) => {
  const cols = { blue: 'from-blue-500 to-blue-600', green: 'from-emerald-500 to-emerald-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
  return (<div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
    <div className="flex items-start justify-between">
      <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>{sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}</div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${cols[color]} shadow-lg`}><Icon className="text-white" size={20} /></div>
    </div>
    {trend !== undefined && <div className={`mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trend >= 0 ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}<span className="text-sm font-semibold">{fmtPct(trend)}</span></div>}
  </div>);
};

const MBox = ({ label, value, sub, pos, extra }) => {
  const isPos = pos !== undefined ? pos : (typeof value === 'number' ? value >= 0 : true);
  return (<div className="bg-white rounded-xl shadow p-3 text-center border border-gray-100">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-lg font-bold ${typeof value === 'number' ? (isPos ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>{typeof value === 'number' ? fmtPct(value) : value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    {extra && <p className="text-xs text-gray-500 mt-1 border-t pt-1">{extra}</p>}
  </div>);
};

const MultiSelect = ({ label, opts, selected, onChange, placeholder = 'הכל' }) => {
  const [open, setOpen] = useState(false);
  const toggle = val => selected.includes(val) ? onChange(selected.filter(v => v !== val)) : onChange([...selected, val]);
  return (
    <div className="relative">
      {label && <label className="text-xs text-gray-600 block mb-1">{label}</label>}
      <button onClick={() => setOpen(!open)} className="w-full min-w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white flex justify-between items-center gap-2">
        <span className="truncate">{selected.length ? selected.length + ' נבחרו' : placeholder}</span>
        <ChevronDown size={16} className={'transition-transform flex-shrink-0 ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && <div className="absolute z-50 mt-1 w-64 bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
        <button onClick={() => onChange([])} className="w-full px-3 py-2 text-right text-sm hover:bg-gray-50 border-b font-medium">נקה הכל</button>
        {opts.map(o => <label key={o} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="rounded" />
          <span className="text-sm truncate">{o}</span>
        </label>)}
      </div>}
    </div>
  );
};

const MetricCell = ({ pct, from, to, label }) => (
  <div className="text-center">
    <span className={`font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(pct)}</span>
    <p className="text-xs text-gray-400">{fmt(from)}→{fmt(to)}</p>
  </div>
);

const ReturnsCell = ({ pctL6, pctP6, change }) => (
  <div className="text-center">
    <span className="text-sm">{(pctP6 || 0).toFixed(1)}%→{(pctL6 || 0).toFixed(1)}%</span>
    <p className={`text-xs font-bold ${change > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
      {change > 0 ? '+' : ''}{(change || 0).toFixed(1)}%
    </p>
  </div>
);

const PeakCell = ({ pct, peak, current, currentMonth }) => (
  <div className="text-center">
    <span className={`font-bold ${pct >= -20 ? 'text-emerald-600' : pct >= -40 ? 'text-orange-500' : 'text-red-600'}`}>{fmtPct(pct)}</span>
    <p className="text-xs text-gray-400">שיא(4): {fmt(peak)} | דצמ: {fmt(current)}</p>
  </div>
);

const exportPDF = title => { document.title = title; window.print(); };
const exportCSV = (data, columns, filename) => {
  const header = columns.map(c => c.l.replace(/\n/g, ' ')).join(',');
  const rows = data.map(r => columns.map(c => { const val = r[c.k]; return typeof val === 'string' && val.includes(',') ? '"' + val + '"' : (val ?? ''); }).join(','));
  const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click();
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
  return (<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <div className="p-3 border-b flex flex-wrap gap-2 items-center justify-between print:hidden">
      <div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="חיפוש..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm" />
      </div>
      <button onClick={() => exportCSV(filtered, cols, name)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>{cols.map(c => <th key={c.k} onClick={() => setSort(p => ({ k: c.k, d: p.k === c.k && p.d === 'desc' ? 'asc' : 'desc' }))} className="px-3 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-pre-line">
            <span className="flex items-center gap-1">{c.t && <Tip text={c.t} />}{c.l}{sort.k === c.k && <span className="text-blue-500 mr-1">{sort.d === 'asc' ? '↑' : '↓'}</span>}</span>
          </th>)}</tr>
        </thead>
        <tbody className="divide-y">{rows.map((r, i) => <tr key={r.id || i} onClick={() => onRow && onRow(r)} className={'hover:bg-blue-50 ' + (onRow ? 'cursor-pointer' : '')}>{cols.map(c => <td key={c.k} className={'px-3 text-sm whitespace-nowrap ' + (compact ? 'py-2' : 'py-3')}>{c.r ? c.r(r[c.k], r) : r[c.k]}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-sm print:hidden">
      <span>{filtered.length} רשומות</span>
      <div className="flex gap-2">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">הקודם</button>
        <span>{page}/{pages || 1}</span>
        <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages} className="px-3 py-1 border rounded disabled:opacity-50">הבא</button>
      </div>
    </div>
  </div>);
};

const Overview = ({ stores, products, onNav }) => {
  const st = useMemo(() => {
    const active = stores.filter(s => !s.is_inactive);
    const q24 = stores.reduce((s, x) => s + (x.qty_2024 || 0), 0);
    const q25 = stores.reduce((s, x) => s + (x.qty_2025 || 0), 0);
    const ql6 = stores.reduce((s, x) => s + (x.qty_last6 || 0), 0);
    const qp6 = stores.reduce((s, x) => s + (x.qty_prev6 || 0), 0);
    const s24 = stores.reduce((s, x) => s + (x.sales_2024 || 0), 0);
    const s25 = stores.reduce((s, x) => s + (x.sales_2025 || 0), 0);
    const sl6 = stores.reduce((s, x) => s + (x.sales_last6 || 0), 0);
    const sp6 = stores.reduce((s, x) => s + (x.sales_prev6 || 0), 0);
    const yoy_qty = q24 > 0 ? ((q25 - q24) / q24) * 100 : 0;
    const yoy_sales = s24 > 0 ? ((s25 - s24) / s24) * 100 : 0;
    const hoh_qty = qp6 > 0 ? ((ql6 - qp6) / qp6) * 100 : 0;
    const hoh_sales = sp6 > 0 ? ((sl6 - sp6) / sp6) * 100 : 0;
    const sc = {}; stores.forEach(s => { sc[s.status] = (sc[s.status] || 0) + 1; });
    const top = [...stores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 20);
    const bot = [...active].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0)).slice(0, 20);
    const alerts = stores.filter(s => !s.is_inactive && (s.status === 'התרסקות' || s.declining_months >= 3)).length;
    return { active: active.length, total: stores.length, q24, q25, ql6, qp6, s24, s25, sl6, sp6, yoy_qty, yoy_sales, hoh_qty, hoh_sales, sc, top, bot, alerts };
  }, [stores]);
  const pie = Object.entries(st.sc).map(([n, v], i) => ({ name: n, value: v, color: COLORS[i % COLORS.length] }));
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); }); return Object.entries(m).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">סקירה כללית</h2><button onClick={() => exportPDF('סקירה כללית - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="סה״כ חנויות" value={fmt(st.total)} sub={st.active + ' פעילות'} icon={Store} color="blue" />
      <Card title="סה״כ כמות (2024-2025)" value={fmt(st.q24 + st.q25)} trend={st.yoy_qty} icon={TrendingUp} color="green" />
      <Card title="מוצרים פעילים" value={products.filter(p => !p.is_inactive).length} sub={'מתוך ' + products.length} icon={Package} color="purple" />
      <Card title="התראות" value={st.alerts} sub="דורשות טיפול" icon={AlertTriangle} color="red" />
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה שנתית: ינואר-דצמבר 2024 ↔ ינואר-דצמבר 2025</h3>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2024</p><p className="text-xl font-bold text-blue-600">{fmt(st.q24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2025</p><p className="text-xl font-bold text-emerald-600">{fmt(st.q25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2024</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.s24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2025</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.s25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_sales)}</p></div>
      </div>
    </div>

    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה חצי שנתית: ינו-יונ 2025 (H1) ↔ יול-דצמ 2025 (H2)</h3>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות H1</p><p className="text-xl font-bold text-blue-600">{fmt(st.qp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות H2</p><p className="text-xl font-bold text-emerald-600">{fmt(st.ql6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H1</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.sp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H2</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.sl6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_sales)}</p></div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">התפלגות סטטוסים</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, percent }) => name + ' ' + (percent*100).toFixed(0) + '%'}>{pie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={v => fmt(v)} /></PieChart></ResponsiveContainer></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות: ינואר 2024 - דצמבר 2025</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={trend}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => (v/1000).toFixed(0) + 'K'} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cg)" /></AreaChart></ResponsiveContainer></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">🏆 20 מובילות (כמות כוללת)</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.top.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-sm">{fmt(s.qty_total)}</p></div></div>)}</div></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">📉 20 בירידה (לפי 12/12)</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.bot.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-red-600 text-sm">{fmtPct(s.metric_12v12)}</p><p className="text-xs text-gray-500">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</p></div></div>)}</div></div>
    </div>
  </div>);
};

const StoresList = ({ stores, onSelect }) => {
  const [cities, setCities] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [minQty, setMinQty] = useState(0);
  const [showF, setShowF] = useState(false);
  
  const filtered = useMemo(() => stores.filter(s => {
    if (cities.length && !cities.includes(s.city)) return false;
    if (networks.length && !networks.includes(s.network)) return false;
    if (drivers.length && !drivers.includes(s.driver)) return false;
    if (agents.length && !agents.includes(s.agent)) return false;
    if (statuses.length && !statuses.includes(s.status)) return false;
    if (minQty > 0 && (s.qty_2025 || 0) < minQty) return false;
    return true;
  }), [stores, cities, networks, drivers, agents, statuses, minQty]);
  
  const cols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v, r) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים\nינו-יונ→יול-דצמ', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים\nאוק-דצמ 24→25', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים\nספט-אוק→נוב-דצמ', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-4">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-xl font-bold">חנויות ({filtered.length})</h2>
      <div className="flex gap-2 print:hidden">
        <button onClick={() => exportPDF('חנויות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
        <button onClick={() => setShowF(!showF)} className={'flex items-center gap-2 px-4 py-2 rounded-xl ' + (showF ? 'bg-blue-500 text-white' : 'bg-gray-100')}><Filter size={18}/>סינון</button>
      </div>
    </div>
    {showF && <div className="bg-white rounded-xl shadow p-4 print:hidden">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <MultiSelect label="עיר" opts={FILTERS.cities || []} selected={cities} onChange={setCities} />
        <MultiSelect label="רשת" opts={FILTERS.networks || []} selected={networks} onChange={setNetworks} />
        <MultiSelect label="נהג" opts={FILTERS.drivers || []} selected={drivers} onChange={setDrivers} />
        <MultiSelect label="סוכן" opts={FILTERS.agents || []} selected={agents} onChange={setAgents} />
        <MultiSelect label="סטטוס" opts={['צמיחה','יציב','התאוששות','ירידה מתונה','התרסקות']} selected={statuses} onChange={setStatuses} />
        <div>
          <label className="text-xs text-gray-600 block mb-1">מינימום פריטים (2025)</label>
          <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>
    </div>}
    <Table data={filtered} cols={cols} onRow={onSelect} name="stores" />
  </div>);
};

const StoreDetail = ({ store, onBack }) => {
  const chart = useMemo(() => { 
    if (!store.monthly_qty) return []; 
    return Object.entries(store.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); 
  }, [store]);
  const prods = STORE_PRODUCTS[String(store.id)] || [];
  
  const prodCols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v, r) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button>
      <button onClick={() => exportPDF(store.name + ' - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{store.name}</h1><p className="text-gray-500 mt-1">{store.city} {store.network && '• ' + store.network}</p><p className="text-sm text-gray-400 mt-1">נהג: {store.driver || '-'} | סוכן: {store.agent || '-'}</p></div>
        <Badge status={store.status} />
      </div>
    </div>
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (ינו-דצמ 24→25)" value={store.metric_12v12} sub={fmt(store.qty_2024) + '→' + fmt(store.qty_2025)} />
      <MBox label="6 חודשים (ינו-יונ→יול-דצמ)" value={store.metric_6v6} sub={fmt(store.qty_prev6) + '→' + fmt(store.qty_last6)} />
      <MBox label="3 חודשים (אוק-דצמ 24→25)" value={store.metric_3v3} sub={fmt(store.qty_prev3) + '→' + fmt(store.qty_last3)} />
      <MBox label="2 חודשים (ספט-אוק→נוב-דצמ)" value={store.metric_2v2} sub={fmt(store.qty_prev2) + '→' + fmt(store.qty_last2)} />
      <MBox label="מרחק מהשיא" value={store.metric_peak_distance} extra={'שיא (ממוצע 4): ' + fmt(store.peak_value) + ' | דצמ: ' + fmt(store.current_value)} />
      <MBox label="חזרות % (ינו-יונ→יול-דצמ)" value={(store.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (store.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (store.returns_change > 0 ? '+' : '') + (store.returns_change?.toFixed(1) || 0) + '%'} pos={store.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(store.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(store.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2024</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2025</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2025)}</p></div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות: ינו 2024 - דצמ 2025</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#3b82f6" fill="url(#sg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מוצרים בחנות ({prods.length})</h3>{prods.length > 0 ? <Table data={prods} cols={prodCols} name={'store_' + store.id + '_products'} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}</div>
  </div>);
};

const ProductsList = ({ products, onSelect }) => {
  const [cats, setCats] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [minQty, setMinQty] = useState(0);
  
  const filtered = useMemo(() => products.filter(p => { 
    if (cats.length && !cats.includes(p.category)) return false; 
    if (statuses.length && !statuses.includes(p.status)) return false;
    if (minQty > 0 && (p.qty_2025 || 0) < minQty) return false;
    return true; 
  }), [products, cats, statuses, minQty]);
  
  const cols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v, r) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים\nינו-יונ→יול-דצמ', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים\nאוק-דצמ 24→25', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים\nספט-אוק→נוב-דצמ', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} /> },
    { k: 'total_sales', l: 'מחזור', r: v => <span className="font-bold text-gray-600">₪{fmt(v)}</span> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 className="text-xl font-bold">מוצרים ({filtered.length})</h2>
      <div className="flex gap-2 print:hidden">
        <button onClick={() => exportPDF('מוצרים - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
        <MultiSelect opts={FILTERS.categories || []} selected={cats} onChange={setCats} placeholder="קטגוריה" />
        <MultiSelect opts={['צמיחה','יציב','התאוששות','ירידה מתונה','התרסקות']} selected={statuses} onChange={setStatuses} placeholder="סטטוס" />
        <div className="flex items-center gap-2">
          <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="מינ׳ 2025" className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>
    </div>
    <Table data={filtered} cols={cols} onRow={onSelect} name="products" />
  </div>);
};

const ProductDetail = ({ product, onBack }) => {
  const [minQty, setMinQty] = useState(0);
  const chart = useMemo(() => { if (!product.monthly_qty) return []; return Object.entries(product.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [product]);
  const allStores = PRODUCT_STORES[String(product.id)] || [];
  const stores = useMemo(() => minQty > 0 ? allStores.filter(s => (s.qty_2025 || 0) >= minQty) : allStores, [allStores, minQty]);
  
  const storeCols = [
    { k: 'name', l: 'חנות', r: (v, r) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'metric_long_term', l: 'טווח ארוך', t: METRIC_TIPS['long_term'], r: (v, r) => <LongTermCell value={v} /> },
    { k: 'metric_short_term', l: 'טווח קצר', t: METRIC_TIPS['short_term'], r: (v, r) => <ShortTermCell value={v} ok={r.short_term_ok} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'status', l: 'סטטוס', r: (v, r) => <StatusBadge status={v} recovery={r.is_recovering} sm /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button>
      <button onClick={() => exportPDF(product.name + ' - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{product.name}</h1><p className="text-gray-500 mt-1">{product.category}</p></div>
        <Badge status={product.status} />
      </div>
    </div>
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (ינו-דצמ 24→25)" value={product.metric_12v12} sub={fmt(product.qty_2024) + '→' + fmt(product.qty_2025)} />
      <MBox label="6 חודשים (ינו-יונ→יול-דצמ)" value={product.metric_6v6} sub={fmt(product.qty_prev6) + '→' + fmt(product.qty_last6)} />
      <MBox label="3 חודשים (אוק-דצמ 24→25)" value={product.metric_3v3} sub={fmt(product.qty_prev3) + '→' + fmt(product.qty_last3)} />
      <MBox label="2 חודשים (ספט-אוק→נוב-דצמ)" value={product.metric_2v2} sub={fmt(product.qty_prev2) + '→' + fmt(product.qty_last2)} />
      <MBox label="מרחק מהשיא" value={product.metric_peak_distance} extra={'שיא (ממוצע 4): ' + fmt(product.peak_value) + ' | דצמ: ' + fmt(product.current_value)} />
      <MBox label="חזרות % (ינו-יונ→יול-דצמ)" value={(product.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (product.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (product.returns_change > 0 ? '+' : '') + (product.returns_change?.toFixed(1) || 0) + '%'} pos={product.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(product.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(product.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">חזרות % (H2)</p><p className="text-xl font-bold text-gray-600">{(product.returns_pct_last6 || 0).toFixed(1)}%</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור</p><p className="text-xl font-bold text-gray-600">₪{fmt(product.total_sales)}</p></div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות: ינו 2024 - דצמ 2025</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#8b5cf6" fill="url(#pg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">חנויות שמוכרות ({stores.length}{minQty > 0 ? ` מתוך ${allStores.length}` : ''})</h3>
        <div className="flex items-center gap-2 print:hidden">
          <label className="text-sm text-gray-600">מינימום פריטים (2025):</label>
          <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="0" className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>
      {stores.length > 0 ? <Table data={stores} cols={storeCols} name={'product_' + product.id + '_stores'} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}
    </div>
  </div>);
};

const Alerts = ({ stores, onSelect }) => {
  const alerts = useMemo(() => stores.filter(s => !s.is_inactive && (s.status === 'התרסקות' || s.declining_months >= 3)).sort((a,b) => a.metric_12v12 - b.metric_12v12), [stores]);
  
  return (<div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold">התראות ({alerts.length})</h2>
      <button onClick={() => exportPDF('התראות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
    </div>
    {alerts.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">אין התראות</p></div> : 
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{alerts.map(s => 
      <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow-lg p-5 border-2 border-red-200 hover:border-red-400 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div>
          <Badge status={s.status} sm />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">שנתי (24→25)</p><p className="font-bold text-red-600">{fmtPct(s.metric_12v12)}</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">ירידה רצופה</p><p className="font-bold text-red-600">{s.declining_months || 0} חודשים</p>{s.declining_months_list && s.declining_months_list.length > 0 && <p className="text-xs text-gray-400 mt-1">{s.declining_months_list.slice(-3).reverse().map(m => fmtMonth(m)).join('→')}</p>}</div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">מרחק מהשיא</p><p className="font-bold text-red-600">{fmtPct(s.metric_peak_distance)}</p><p className="text-xs text-gray-400">שיא(4): {fmt(s.peak_value)} | דצמ: {fmt(s.current_value)}</p></div>
        </div>
      </div>
    )}</div>}
  </div>);
};

const Rankings = ({ stores, onSelect }) => {
  const r = useMemo(() => ({ 
    qty: [...stores].sort((a,b) => (b.qty_total||0)-(a.qty_total||0)).slice(0,30), 
    growth: [...stores].filter(s=>!s.is_inactive).sort((a,b) => (b.metric_12v12||0)-(a.metric_12v12||0)).slice(0,30), 
    recovery: [...stores].filter(s=>s.status==='התאוששות').slice(0,30) 
  }), [stores]);
  
  const List = ({ title, data, icon, bg, showGrowth }) => (
    <div className="bg-white rounded-2xl shadow-lg p-5 border">
      <h3 className="text-lg font-bold mb-4">{icon} {title}</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">{data.map((s,i) => 
        <div key={s.id} onClick={() => onSelect(s)} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className={'w-6 h-6 flex items-center justify-center text-white rounded-full text-xs font-bold ' + bg}>{i+1}</span>
            <span className="text-sm font-medium">{s.name}</span>
          </div>
          <span className={'text-sm font-bold ' + (showGrowth ? (s.metric_12v12 >= 0 ? 'text-emerald-600' : 'text-red-600') : '')}>{showGrowth ? fmtPct(s.metric_12v12) : fmt(s.qty_total)}</span>
        </div>
      )}</div>
    </div>
  );
  
  return (<div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold">דירוגים</h2>
      <button onClick={() => exportPDF('דירוגים - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <List title="לפי כמות כוללת" data={r.qty} icon="🏆" bg="bg-blue-500" />
      <List title="לפי צמיחה (12/12)" data={r.growth} icon="📈" bg="bg-emerald-500" showGrowth />
      <List title="התאוששות" data={r.recovery} icon="💪" bg="bg-amber-500" showGrowth />
    </div>
  </div>);
};

const Inactive = ({ stores, onSelect }) => {
  const list = useMemo(() => stores.filter(s => s.is_inactive).sort((a,b) => (b.last_active_month||0)-(a.last_active_month||0)), [stores]);
  
  return (<div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-bold">לא פעילות ({list.length})</h2>
      <button onClick={() => exportPDF('לא פעילות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
    </div>
    {list.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">כל החנויות פעילות!</p></div> : 
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map(s => 
      <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow p-5 border hover:border-gray-400 cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div>
          <XCircle className="text-red-400" size={20}/>
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-gray-500">כמות כוללת: <span className="font-semibold">{fmt(s.qty_total)}</span></p>
          <p className="text-gray-500">מחזור: <span className="font-semibold">₪{fmt(s.total_sales)}</span></p>
          <p className="text-red-600 font-medium mt-2">פעילות אחרונה: {fmtMonthHeb(s.last_active_month)}</p>
        </div>
      </div>
    )}</div>}
  </div>);
};

const Trends = ({ stores, products }) => {
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k,v]) => { m[k] = (m[k]||0) + v; }); }); return Object.entries(m).sort(([a],[b]) => Number(a)-Number(b)).map(([k,v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  const cats = useMemo(() => { const c = {}; products.forEach(p => { if (p.category) c[p.category] = (c[p.category]||0) + (p.qty_total||0); }); return Object.entries(c).sort(([,a],[,b]) => b-a).slice(0,10).map(([n,v]) => ({ name: n, value: v })); }, [products]);
  const byDriver = useMemo(() => { const d = {}; stores.forEach(s => { if (s.driver) { if (!d[s.driver]) d[s.driver] = { name: s.driver, qty_2024: 0, qty_2025: 0, count: 0 }; d[s.driver].qty_2024 += s.qty_2024 || 0; d[s.driver].qty_2025 += s.qty_2025 || 0; d[s.driver].count++; } }); return Object.values(d).sort((a,b) => b.qty_2025 - a.qty_2025).slice(0,15); }, [stores]);
  const byCity = useMemo(() => { const d = {}; stores.forEach(s => { if (s.city) { if (!d[s.city]) d[s.city] = { name: s.city, qty_2024: 0, qty_2025: 0, count: 0 }; d[s.city].qty_2024 += s.qty_2024 || 0; d[s.city].qty_2025 += s.qty_2025 || 0; d[s.city].count++; } }); return Object.values(d).sort((a,b) => b.qty_2025 - a.qty_2025).slice(0,15); }, [stores]);
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">מגמות וניתוחים</h2><button onClick={() => exportPDF('מגמות - Baron Analytics')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות כוללת: ינו 2024 - דצמ 2025</h3><ResponsiveContainer width="100%" height={300}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tickFormatter={v => (v/1000).toFixed(0)+'K'} tick={{fontSize:10}}/><Tooltip formatter={v => fmt(v)}/><Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">כמויות לפי קטגוריה (סה״כ 2024-2025)</h3><ResponsiveContainer width="100%" height={350}><BarChart data={cats} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" tickFormatter={v => (v/1000).toFixed(0)+'K'}/><YAxis type="category" dataKey="name" width={120} tick={{fontSize:11}}/><Tooltip formatter={v => fmt(v)}/><Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">ביצועים לפי נהג (2024 ↔ 2025)</h3><div className="space-y-2 max-h-96 overflow-y-auto">{byDriver.map((d, i) => { const change = d.qty_2024 > 0 ? ((d.qty_2025 - d.qty_2024) / d.qty_2024) * 100 : 0; return <div key={d.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-gray-500">{d.count} חנויות</p></div></div><div className="text-left"><p className={'font-bold text-sm ' + (change >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(change)}</p><p className="text-xs text-gray-400">{fmt(d.qty_2024)}→{fmt(d.qty_2025)}</p></div></div>; })}</div></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">ביצועים לפי עיר (2024 ↔ 2025)</h3><div className="space-y-2 max-h-96 overflow-y-auto">{byCity.map((d, i) => { const change = d.qty_2024 > 0 ? ((d.qty_2025 - d.qty_2024) / d.qty_2024) * 100 : 0; return <div key={d.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"><div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center bg-teal-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{d.name}</p><p className="text-xs text-gray-500">{d.count} חנויות</p></div></div><div className="text-left"><p className={'font-bold text-sm ' + (change >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(change)}</p><p className="text-xs text-gray-400">{fmt(d.qty_2024)}→{fmt(d.qty_2025)}</p></div></div>; })}</div></div>
    </div>
  </div>);
};

const DEFAULT_CONFIG = {
  recovery_threshold: 10,
  growth_12v12: 10,
  growth_short: 0,
  stable_min: -10,
  stable_max: 10,
  decline_12v12: -10,
  decline_months: 3,
  crash_12v12: -30,
  crash_peak: -50,
  crash_months: 6,
};

const getConfig = () => {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem('baron_config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
};

const saveConfig = (config) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('baron_config', JSON.stringify(config));
  }
};

const SettingsPage = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  
  React.useEffect(() => {
    setConfig(getConfig());
  }, []);
  
  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1000);
  };
  
  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
    window.location.reload();
  };
  
  return (<div className="space-y-6">
    <h2 className="text-xl font-bold">הגדרות</h2>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20}/>הגדרות סטטוסים</h3>
      <p className="text-sm text-gray-500 mb-6">הגדר את הסיפים לחישוב סטטוס כל חנות/מוצר</p>
      
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 rounded-xl">
          <h4 className="font-bold text-emerald-700 mb-3">🚀 צמיחה</h4>
          <p className="text-xs text-gray-600 mb-3">טווח ארוך ≥ X% AND טווח קצר ≥ Y%</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-600">טווח ארוך מינימום %</label><input type="number" value={config.growth_12v12} onChange={e => setConfig({...config, growth_12v12: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="text-xs text-gray-600">טווח קצר מינימום %</label><input type="number" value={config.growth_short} onChange={e => setConfig({...config, growth_short: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
          </div>
        </div>
        
        <div className="p-4 bg-amber-50 rounded-xl">
          <h4 className="font-bold text-amber-700 mb-3">📈 התאוששות (תג נוסף)</h4>
          <p className="text-xs text-gray-600 mb-3">יופיע כתג נוסף כאשר טווח ארוך שלילי אבל טווח קצר ≥ X%</p>
          <div>
            <label className="text-xs text-gray-600">טווח קצר מינימום %</label>
            <input type="number" value={config.recovery_threshold} onChange={e => setConfig({...config, recovery_threshold: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-xl">
          <h4 className="font-bold text-blue-700 mb-3">⚖️ יציב</h4>
          <p className="text-xs text-gray-600 mb-3">X% ≤ טווח ארוך ≤ Y%</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-600">טווח ארוך מינימום %</label><input type="number" value={config.stable_min} onChange={e => setConfig({...config, stable_min: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="text-xs text-gray-600">טווח ארוך מקסימום %</label><input type="number" value={config.stable_max} onChange={e => setConfig({...config, stable_max: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
          </div>
        </div>
        
        <div className="p-4 bg-orange-50 rounded-xl">
          <h4 className="font-bold text-orange-700 mb-3">📉 ירידה מתונה</h4>
          <p className="text-xs text-gray-600 mb-3">טווח ארוך &lt; X% OR ירידה רצופה ≥ Y חודשים</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-600">טווח ארוך מקסימום %</label><input type="number" value={config.decline_12v12} onChange={e => setConfig({...config, decline_12v12: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="text-xs text-gray-600">חודשי ירידה רצופה</label><input type="number" value={config.decline_months} onChange={e => setConfig({...config, decline_months: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
          </div>
        </div>
        
        <div className="p-4 bg-red-50 rounded-xl">
          <h4 className="font-bold text-red-700 mb-3">💥 התרסקות</h4>
          <p className="text-xs text-gray-600 mb-3">טווח ארוך &lt; X% OR מרחק מהשיא &lt; Y% OR ירידה ≥ Z חודשים</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-gray-600">טווח ארוך מקסימום %</label><input type="number" value={config.crash_12v12} onChange={e => setConfig({...config, crash_12v12: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="text-xs text-gray-600">מרחק מהשיא %</label><input type="number" value={config.crash_peak} onChange={e => setConfig({...config, crash_peak: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="text-xs text-gray-600">חודשי ירידה</label><input type="number" value={config.crash_months} onChange={e => setConfig({...config, crash_months: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg"/></div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className={'px-6 py-2 rounded-xl font-medium transition-all ' + (saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600')}>
          {saved ? <span className="flex items-center gap-2"><Check size={16}/>נשמר! מרענן...</span> : 'שמור הגדרות'}
        </button>
        <button onClick={handleReset} className="px-6 py-2 rounded-xl font-medium bg-gray-200 hover:bg-gray-300">
          איפוס לברירת מחדל
        </button>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">📤 העלאת קובץ נתונים</h3>
      <p className="text-sm text-gray-500 mb-4">העלה קובץ Excel חדש לעדכון הנתונים</p>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 cursor-pointer transition-colors">
        <Download className="mx-auto text-gray-400 mb-3" size={32}/>
        <p className="text-gray-600">גרור קובץ לכאן או לחץ לבחירה</p>
        <p className="text-xs text-gray-400 mt-2">פורמט: Excel (.xlsx)</p>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">ℹ️ מידע על המערכת</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{STORES.length}</p><p className="text-xs text-gray-500">חנויות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-purple-600">{PRODUCTS.length}</p><p className="text-xs text-gray-500">מוצרים</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{STORES.filter(s => !s.is_inactive).length}</p><p className="text-xs text-gray-500">חנויות פעילות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gray-600">v6.0</p><p className="text-xs text-gray-500">גרסה</p></div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-4">עדכון אחרון: ינואר 2026 | נתונים: ינו 2024 - דצמ 2025</p>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">📊 הסבר סטטוסים</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
          <Badge status="צמיחה" sm />
          <span>שנתי חיובי + מגמה חיובית</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Badge status="יציב" sm />
          <span>שינוי קטן בטווח -10% עד +10%</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
          <Badge status="התאוששות" sm />
          <span>שנתי שלילי אבל 3 חודשים / 2 חודשים חיובי (מעל {config.recovery_threshold}%)</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
          <Badge status="ירידה מתונה" sm />
          <span>ירידה שנתית בין -10% ל -30%</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
          <Badge status="התרסקות" sm />
          <span>ירידה שנתית מעל 30% או מרחק גדול מהשיא</span>
        </div>
      </div>
    </div>
  </div>);
};

export default function App() {
  const [tab, setTab] = useState('overview');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [menu, setMenu] = useState(false);
  
  const tabs = [
    { id: 'overview', l: 'סקירה', I: Home },
    { id: 'stores', l: 'חנויות', I: Store },
    { id: 'products', l: 'מוצרים', I: Package },
    { id: 'trends', l: 'מגמות', I: TrendingUp },
    { id: 'alerts', l: 'התראות', I: Bell },
    { id: 'rankings', l: 'דירוגים', I: Award },
    { id: 'inactive', l: 'לא פעילות', I: XCircle },
    { id: 'settings', l: 'הגדרות', I: Settings }
  ];
  
  const nav = (t, i) => { 
    if (t === 'store') { setStore(i); setTab('stores'); } 
    else { setProduct(i); setTab('products'); } 
  };
  
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
      case 'settings': return <SettingsPage />;
      default: return <Overview stores={STORES} products={PRODUCTS} onNav={nav} />;
    }
  };
  
  return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
    <header className="bg-white shadow-sm border-b sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">{menu ? <X size={24}/> : <Menu size={24}/>}</button>
          <div><h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Baron Analytics</h1><p className="text-xs text-gray-500">מערכת ניתוח מכירות</p></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600"><User size={18}/><span>מנהל</span></div>
          <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><LogOut size={20}/></button>
        </div>
      </div>
    </header>
    <div className="flex">
      <aside className="hidden lg:block w-56 bg-white border-l min-h-screen sticky top-16 print:hidden">
        <nav className="p-4 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); }} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav>
      </aside>
      {menu && <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setMenu(false)}><div className="w-64 bg-white h-full" onClick={e => e.stopPropagation()}><nav className="p-4 space-y-1 mt-16">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setStore(null); setProduct(null); setMenu(false); }} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav></div></div>}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">{content()}</main>
    </div>
  </div>);
}
