'use client';

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Store, Package, AlertTriangle, Award, Settings, History, XCircle, Search, Download, Filter, ChevronRight, ChevronDown, ArrowUp, ArrowDown, Minus, Menu, X, Home, Bell, LogOut, User, Check } from 'lucide-react';

// Import data
import STORE_DATA from './stores.json';
import PRODUCT_DATA from './products.json';
import FILTERS from './filters.json';

// Constants
const STATUS_CONFIG = {
  'צמיחה': { bgLight: 'bg-emerald-50', textColor: 'text-emerald-600', Icon: TrendingUp },
  'יציב': { bgLight: 'bg-blue-50', textColor: 'text-blue-600', Icon: Minus },
  'התאוששות': { bgLight: 'bg-amber-50', textColor: 'text-amber-600', Icon: TrendingUp },
  'ירידה מתונה': { bgLight: 'bg-orange-50', textColor: 'text-orange-600', Icon: TrendingDown },
  'התרסקות': { bgLight: 'bg-red-50', textColor: 'text-red-600', Icon: TrendingDown },
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];

// Utilities
const formatNumber = (num) => num != null ? new Intl.NumberFormat('he-IL').format(Math.round(num)) : '-';
const formatPercent = (num, sign = true) => num != null ? `${sign && num > 0 ? '+' : ''}${num.toFixed(1)}%` : '-';
const formatMonth = (ym) => `${String(ym).slice(4)}/${String(ym).slice(2, 4)}`;

// Status Badge
const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['יציב'];
  const Icon = cfg.Icon;
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${cfg.bgLight} ${cfg.textColor} ${sz}`}>
      <Icon size={size === 'sm' ? 12 : 14} />{status}
    </span>
  );
};

// Metric Card
const MetricCard = ({ title, value, subtitle, trend, icon: Icon, color = 'blue' }) => {
  const colors = { blue: 'from-blue-500 to-blue-600', green: 'from-emerald-500 to-emerald-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs sm:text-sm font-medium truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg flex-shrink-0`}>
          <Icon className="text-white" size={18} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-2 sm:mt-3 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          <span className="text-sm font-semibold">{formatPercent(trend)}</span>
          <span className="text-gray-400 text-xs mr-1 hidden sm:inline">משנה שעברה</span>
        </div>
      )}
    </div>
  );
};

// Metric Box
const MetricBox = ({ label, value, subValue, positive }) => {
  const isPos = positive !== undefined ? positive : value >= 0;
  return (
    <div className="bg-white rounded-xl shadow p-3 sm:p-4 text-center border border-gray-100">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-lg sm:text-xl font-bold mt-1 ${typeof value === 'number' ? (isPos ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900'}`}>
        {typeof value === 'number' ? formatPercent(value) : value}
      </p>
      {subValue && <p className="text-xs text-gray-400 mt-1 hidden sm:block">{subValue}</p>}
    </div>
  );
};

// Filter Dropdown
const FilterDropdown = ({ label, options, value, onChange }) => (
  <div className="relative">
    {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
      <option value="">הכל</option>
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} style={{ marginTop: label ? '12px' : '0' }} />
  </div>
);

// Data Table
const DataTable = ({ data, columns, onRowClick, itemsPerPage = 25, exportName = 'data' }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, sortConfig, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const csv = [columns.map(c => c.label).join(','), ...filtered.map(row => columns.map(c => {
      const val = row[c.key];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${exportName}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="חיפוש..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 text-sm font-medium">
          <Download size={16} /><span className="hidden sm:inline">Excel</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} onClick={() => setSortConfig(prev => ({ key: col.key, direction: prev.key === col.key && prev.direction === 'desc' ? 'asc' : 'desc' }))}
                  className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                  <div className="flex items-center gap-1">{col.label}
                    {sortConfig.key === col.key && <span className="text-blue-500">{sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((row, idx) => (
              <tr key={row.id || idx} onClick={() => onRowClick?.(row)}
                className={`hover:bg-blue-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${row.is_inactive ? 'opacity-60' : ''}`}>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 sm:px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-600">מציג {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} מתוך {filtered.length}</p>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 text-xs sm:text-sm disabled:opacity-50 hover:bg-gray-100">הקודם</button>
          <span className="text-xs sm:text-sm text-gray-600">{currentPage}/{totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-200 text-xs sm:text-sm disabled:opacity-50 hover:bg-gray-100">הבא</button>
        </div>
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ stores, products, onNavigate }) => {
  const stats = useMemo(() => {
    const active = stores.filter(s => !s.is_inactive);
    const total = stores.reduce((sum, s) => sum + (s.total_sales || 0), 0);
    const s24 = stores.reduce((sum, s) => sum + (s.sales_2024 || 0), 0);
    const s25 = stores.reduce((sum, s) => sum + (s.sales_2025 || 0), 0);
    const yoy = s24 > 0 ? ((s25 - s24) / s24) * 100 : 0;
    const statusCounts = {};
    stores.forEach(s => { statusCounts[s.status_long] = (statusCounts[s.status_long] || 0) + 1; });
    const top20 = [...stores].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 20);
    const bottom20 = [...active].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0)).slice(0, 20);
    const alerts = stores.filter(s => s.status_long === 'התרסקות' || s.declining_months >= 3).length;
    return { activeCount: active.length, totalCount: stores.length, inactiveCount: stores.length - active.length, total, s24, s25, yoy, statusCounts, top20, bottom20, alerts };
  }, [stores]);

  const pieData = Object.entries(stats.statusCounts).map(([name, value], idx) => ({ name, value, color: CHART_COLORS[idx % CHART_COLORS.length] }));

  const monthlyTrend = useMemo(() => {
    const months = {};
    stores.forEach(s => { if (s.monthly_data) Object.entries(s.monthly_data).forEach(([m, v]) => { months[m] = (months[m] || 0) + v; }); });
    return Object.entries(months).sort(([a], [b]) => Number(a) - Number(b)).map(([m, v]) => ({ month: formatMonth(m), value: v }));
  }, [stores]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="סה״כ חנויות" value={formatNumber(stats.totalCount)} subtitle={`${stats.activeCount} פעילות | ${stats.inactiveCount} לא פעילות`} icon={Store} color="blue" />
        <MetricCard title="מחזור כולל" value={`₪${formatNumber(stats.total)}`} trend={stats.yoy} icon={TrendingUp} color="green" />
        <MetricCard title="מוצרים" value={products.filter(p => !p.is_inactive).length} subtitle={`מתוך ${products.length}`} icon={Package} color="purple" />
        <MetricCard title="התראות" value={stats.alerts} subtitle="דורשות טיפול" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">התפלגות סטטוסים</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(val) => formatNumber(val)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">מגמת מכירות</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyTrend}>
              <defs><linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `₪${formatNumber(v)}`} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">השוואה שנתית</h3>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl">
            <p className="text-xs sm:text-sm text-gray-600">2024</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">₪{formatNumber(stats.s24)}</p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-xl">
            <p className="text-xs sm:text-sm text-gray-600">2025</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 mt-1">₪{formatNumber(stats.s25)}</p>
          </div>
          <div className={`text-center p-3 sm:p-4 rounded-xl ${stats.yoy >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-xs sm:text-sm text-gray-600">שינוי</p>
            <p className={`text-lg sm:text-2xl font-bold mt-1 ${stats.yoy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(stats.yoy)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">🏆 20 חנויות מובילות</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {stats.top20.map((store, idx) => (
              <div key={store.id} onClick={() => onNavigate('store', store)}
                className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold flex-shrink-0">{idx + 1}</span>
                  <div className="min-w-0"><p className="font-medium text-gray-900 text-sm truncate">{store.name}</p><p className="text-xs text-gray-500 truncate">{store.city}</p></div>
                </div>
                <p className="font-bold text-gray-900 text-sm flex-shrink-0">₪{formatNumber(store.total_sales)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">📉 20 חנויות בירידה</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {stats.bottom20.map((store, idx) => (
              <div key={store.id} onClick={() => onNavigate('store', store)}
                className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer transition-colors">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold flex-shrink-0">{idx + 1}</span>
                  <div className="min-w-0"><p className="font-medium text-gray-900 text-sm truncate">{store.name}</p><p className="text-xs text-gray-500 truncate">{store.city}</p></div>
                </div>
                <div className="text-left flex-shrink-0"><p className="font-bold text-red-600 text-sm">{formatPercent(store.metric_12v12)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stores Tab
const StoresTab = ({ stores, filters, onSelectStore }) => {
  const [cityFilter, setCityFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredStores = useMemo(() => stores.filter(s => {
    if (cityFilter && s.city !== cityFilter) return false;
    if (networkFilter && s.network !== networkFilter) return false;
    if (agentFilter && s.agent !== agentFilter) return false;
    if (statusFilter && s.status_long !== statusFilter) return false;
    return true;
  }), [stores, cityFilter, networkFilter, agentFilter, statusFilter]);

  const columns = [
    { key: 'name', label: 'חנות', render: (val, row) => <div className="min-w-32"><p className="font-medium truncate">{val}</p><p className="text-xs text-gray-500 truncate">{row.city} {row.network && `• ${row.network}`}</p></div> },
    { key: 'metric_12v12', label: '12/12', render: (val, row) => <div className="text-center"><span className={`font-bold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_2024)}→{formatNumber(row.qty_2025)}</p></div> },
    { key: 'metric_6v6', label: '6/6', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev6)}→{formatNumber(row.qty_last6)}</p></div> },
    { key: 'metric_3v3', label: '3/3', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev3)}→{formatNumber(row.qty_last3)}</p></div> },
    { key: 'metric_2v2', label: '2/2', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev2)}→{formatNumber(row.qty_last2)}</p></div> },
    { key: 'metric_peak_distance', label: 'מהשיא', render: (val) => <span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span> },
    { key: 'returns_pct_last6', label: 'חזרות', render: (val, row) => <div><span className={val > 15 ? 'text-red-600 font-bold' : ''}>{val?.toFixed(1)}%</span><p className="text-xs text-gray-400">Δ{row.returns_change > 0 ? '+' : ''}{row.returns_change?.toFixed(1)}%</p></div> },
    { key: 'status_long', label: 'ארוך', render: (val) => <StatusBadge status={val} size="sm" /> },
    { key: 'status_short', label: 'קצר', render: (val) => <StatusBadge status={val} size="sm" /> },
    { key: 'qty_total', label: 'כמות', render: (val) => <span className="font-bold">{formatNumber(val)}</span> },
    { key: 'total_sales', label: 'מחזור', render: (val) => <span className="text-gray-600">₪{formatNumber(val)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold">חנויות ({filteredStores.length})</h2>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm ${showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
          <Filter size={18} />סינון
        </button>
      </div>
      {showFilters && (
        <div className="bg-white rounded-xl shadow p-3 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <FilterDropdown label="עיר" options={filters.cities} value={cityFilter} onChange={setCityFilter} />
          <FilterDropdown label="רשת" options={filters.networks} value={networkFilter} onChange={setNetworkFilter} />
          <FilterDropdown label="סוכן" options={filters.agents} value={agentFilter} onChange={setAgentFilter} />
          <FilterDropdown label="סטטוס" options={['צמיחה', 'יציב', 'התאוששות', 'ירידה מתונה', 'התרסקות']} value={statusFilter} onChange={setStatusFilter} />
        </div>
      )}
      <DataTable data={filteredStores} columns={columns} onRowClick={onSelectStore} exportName="stores" />
    </div>
  );
};

// Store Detail
const StoreDetailPage = ({ store, onBack }) => {
  const chartData = useMemo(() => {
    if (!store.monthly_data) return [];
    return Object.entries(store.monthly_data).sort(([a], [b]) => Number(a) - Number(b)).map(([m, v]) => ({ month: formatMonth(m), value: v }));
  }, [store]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
        <ChevronRight size={20} className="rotate-180" />חזרה
      </button>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{store.name}</h1>
            <p className="text-gray-500 mt-1 truncate">{store.city} {store.network && `• ${store.network}`}</p>
            <p className="text-sm text-gray-400 mt-1">נהג: {store.driver || '-'} | סוכן: {store.agent || '-'}</p>
          </div>
          <div className="flex gap-2 flex-wrap"><StatusBadge status={store.status_long} /><StatusBadge status={store.status_short} /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricBox label="12/12" value={store.metric_12v12} subValue={`${formatNumber(store.qty_2024)}→${formatNumber(store.qty_2025)}`} />
        <MetricBox label="6/6" value={store.metric_6v6} subValue={`${formatNumber(store.qty_prev6)}→${formatNumber(store.qty_last6)}`} />
        <MetricBox label="3/3" value={store.metric_3v3} subValue={`${formatNumber(store.qty_prev3)}→${formatNumber(store.qty_last3)}`} />
        <MetricBox label="2/2" value={store.metric_2v2} subValue={`${formatNumber(store.qty_prev2)}→${formatNumber(store.qty_last2)}`} />
        <MetricBox label="מהשיא" value={store.metric_peak_distance} />
        <MetricBox label="חזרות" value={`${store.returns_pct_last6?.toFixed(1)}%`} subValue={`שינוי: ${store.returns_change > 0 ? '+' : ''}${store.returns_change?.toFixed(1)}%`} positive={store.returns_change <= 0} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl shadow p-3 sm:p-5 text-center"><p className="text-xs sm:text-sm text-gray-500">כמות 2024</p><p className="text-lg sm:text-2xl font-bold text-blue-600">{formatNumber(store.qty_2024)}</p></div>
        <div className="bg-white rounded-xl shadow p-3 sm:p-5 text-center"><p className="text-xs sm:text-sm text-gray-500">כמות 2025</p><p className="text-lg sm:text-2xl font-bold text-emerald-600">{formatNumber(store.qty_2025)}</p></div>
        <div className="bg-white rounded-xl shadow p-3 sm:p-5 text-center"><p className="text-xs sm:text-sm text-gray-500">מחזור 2024</p><p className="text-lg sm:text-xl font-bold text-gray-600">₪{formatNumber(store.sales_2024)}</p></div>
        <div className="bg-white rounded-xl shadow p-3 sm:p-5 text-center"><p className="text-xs sm:text-sm text-gray-500">מחזור 2025</p><p className="text-lg sm:text-xl font-bold text-gray-600">₪{formatNumber(store.sales_2025)}</p></div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold mb-4">מגמת כמויות</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => formatNumber(v)} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#sg)" name="כמות" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Products Tab
const ProductsTab = ({ products, filters, onSelectProduct }) => {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filteredProducts = useMemo(() => products.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (statusFilter && p.status_long !== statusFilter) return false;
    return true;
  }), [products, categoryFilter, statusFilter]);

  const columns = [
    { key: 'name', label: 'מוצר', render: (val, row) => <div className="min-w-32"><p className="font-medium truncate">{val}</p><p className="text-xs text-gray-500 truncate">{row.category}</p></div> },
    { key: 'metric_12v12', label: '12/12', render: (val, row) => <div className="text-center"><span className={`font-bold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_2024)}→{formatNumber(row.qty_2025)}</p></div> },
    { key: 'metric_6v6', label: '6/6', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev6)}→{formatNumber(row.qty_last6)}</p></div> },
    { key: 'metric_3v3', label: '3/3', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev3)}→{formatNumber(row.qty_last3)}</p></div> },
    { key: 'metric_3v3_yoy', label: '3/3 YoY', render: (val) => <span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span> },
    { key: 'metric_2v2', label: '2/2', render: (val, row) => <div className="text-center"><span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span><p className="text-xs text-gray-400">{formatNumber(row.qty_prev2)}→{formatNumber(row.qty_last2)}</p></div> },
    { key: 'metric_peak_distance', label: 'מהשיא', render: (val) => <span className={`font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(val)}</span> },
    { key: 'returns_pct_last6', label: 'חזרות', render: (val) => <span className={val > 15 ? 'text-red-600 font-bold' : ''}>{val?.toFixed(1)}%</span> },
    { key: 'status_long', label: 'סטטוס', render: (val) => <StatusBadge status={val} size="sm" /> },
    { key: 'qty_total', label: 'כמות', render: (val) => <span className="font-bold">{formatNumber(val)}</span> },
    { key: 'total_sales', label: 'מחזור', render: (val) => <span className="text-gray-600">₪{formatNumber(val)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold">מוצרים ({filteredProducts.length})</h2>
        <div className="flex gap-2">
          <div className="w-36 sm:w-44"><FilterDropdown options={filters.categories} value={categoryFilter} onChange={setCategoryFilter} /></div>
          <div className="w-28 sm:w-36"><FilterDropdown options={['צמיחה', 'יציב', 'ירידה מתונה', 'התרסקות']} value={statusFilter} onChange={setStatusFilter} /></div>
        </div>
      </div>
      <DataTable data={filteredProducts} columns={columns} onRowClick={onSelectProduct} exportName="products" />
    </div>
  );
};

// Product Detail
const ProductDetailPage = ({ product, onBack }) => {
  const chartData = useMemo(() => {
    if (!product.monthly_data) return [];
    return Object.entries(product.monthly_data).sort(([a], [b]) => Number(a) - Number(b)).map(([m, v]) => ({ month: formatMonth(m), value: v }));
  }, [product]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
        <ChevronRight size={20} className="rotate-180" />חזרה
      </button>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">{product.name}</h1><p className="text-gray-500 mt-1">{product.category}</p></div>
          <div className="flex gap-2"><StatusBadge status={product.status_long} /><StatusBadge status={product.status_short} /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <MetricBox label="12/12" value={product.metric_12v12} />
        <MetricBox label="6/6" value={product.metric_6v6} />
        <MetricBox label="3/3 YoY" value={product.metric_3v3_yoy} />
        <MetricBox label="3/3" value={product.metric_3v3} />
        <MetricBox label="מהשיא" value={product.metric_peak_distance} />
        <MetricBox label="חזרות" value={`${product.returns_last6?.toFixed(1)}%`} positive={product.returns_change <= 0} />
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold mb-4">מגמת מכירות</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `₪${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => `₪${formatNumber(v)}`} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#pg)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Trends Tab
const TrendsTab = ({ stores, products }) => {
  const monthlyTrend = useMemo(() => {
    const months = {};
    stores.forEach(s => { if (s.monthly_data) Object.entries(s.monthly_data).forEach(([m, v]) => { months[m] = (months[m] || 0) + v; }); });
    return Object.entries(months).sort(([a], [b]) => Number(a) - Number(b)).map(([m, v]) => ({ month: formatMonth(m), value: v }));
  }, [stores]);

  const categoryData = useMemo(() => {
    const cats = {};
    products.forEach(p => { if (p.category) cats[p.category] = (cats[p.category] || 0) + (p.total_sales || 0); });
    return Object.entries(cats).sort(([,a], [,b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [products]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-bold">מגמות</h2>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold mb-4">מגמת מכירות (01/24 - 12/25)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `₪${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => `₪${formatNumber(v)}`} />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <h3 className="text-base sm:text-lg font-bold mb-4">מכירות לפי קטגוריה (Top 10)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => `₪${(v / 1000000).toFixed(1)}M`} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `₪${formatNumber(v)}`} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Alerts Tab
const AlertsTab = ({ stores, onSelectStore }) => {
  const alerts = useMemo(() => stores.filter(s => !s.is_inactive && (s.status_long === 'התרסקות' || s.declining_months >= 3 || s.metric_12v12 < -30)).sort((a, b) => a.metric_12v12 - b.metric_12v12), [stores]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-bold">התראות ({alerts.length})</h2>
      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48} /><p className="text-gray-600">אין התראות 🎉</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {alerts.map(store => (
            <div key={store.id} onClick={() => onSelectStore(store)}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border-2 border-red-200 hover:border-red-400 cursor-pointer">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="min-w-0"><h3 className="font-bold truncate">{store.name}</h3><p className="text-sm text-gray-500 truncate">{store.city}</p></div>
                <StatusBadge status={store.status_long} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">שנתי</p><p className="text-sm sm:text-lg font-bold text-red-600">{formatPercent(store.metric_12v12)}</p></div>
                <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">ירידה</p><p className="text-sm sm:text-lg font-bold text-red-600">{store.declining_months} חודשים</p></div>
                <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">מהשיא</p><p className="text-sm sm:text-lg font-bold text-red-600">{formatPercent(store.metric_peak_distance)}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Rankings Tab
const RankingsTab = ({ stores, onSelectStore }) => {
  const rankings = useMemo(() => {
    const active = stores.filter(s => !s.is_inactive);
    return {
      bySales: [...stores].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 30),
      byGrowth: [...active].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).slice(0, 30),
      byStability: [...active].sort((a, b) => Math.abs(a.metric_12v12 || 0) - Math.abs(b.metric_12v12 || 0)).slice(0, 30),
    };
  }, [stores]);

  const RankList = ({ title, data, metric, icon, bgColor }) => (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold mb-4">{icon} {title}</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.map((store, idx) => (
          <div key={store.id} onClick={() => onSelectStore(store)}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-6 h-6 flex items-center justify-center ${bgColor} text-white rounded-full text-xs font-bold flex-shrink-0`}>{idx + 1}</span>
              <span className="text-sm font-medium truncate">{store.name}</span>
            </div>
            <span className={`text-sm font-bold flex-shrink-0 ${metric === 'sales' ? 'text-gray-900' : (store.metric_12v12 >= 0 ? 'text-emerald-600' : 'text-red-600')}`}>
              {metric === 'sales' ? `₪${formatNumber(store.total_sales)}` : metric === 'growth' ? formatPercent(store.metric_12v12) : `±${Math.abs(store.metric_12v12).toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-bold">דירוגים</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <RankList title="לפי מחזור" data={rankings.bySales} metric="sales" icon="🏆" bgColor="bg-blue-500" />
        <RankList title="לפי צמיחה" data={rankings.byGrowth} metric="growth" icon="📈" bgColor="bg-emerald-500" />
        <RankList title="לפי יציבות" data={rankings.byStability} metric="stability" icon="⚖️" bgColor="bg-amber-500" />
      </div>
    </div>
  );
};

// Inactive Tab
const InactiveTab = ({ stores, onSelectStore }) => {
  const formatMonthHeb = (ym) => {
    if (!ym) return '-';
    const months = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const s = String(ym);
    return `${months[parseInt(s.slice(4))]} ${s.slice(0,4)}`;
  };
  const inactive = useMemo(() => stores.filter(s => s.is_inactive).sort((a,b) => (b.last_active_month || 0) - (a.last_active_month || 0)), [stores]);
  return (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-bold">לא פעילות ({inactive.length})</h2>
      {inactive.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48} /><p className="text-gray-600">כל החנויות פעילות! 🎉</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {inactive.map(store => (
            <div key={store.id} onClick={() => onSelectStore(store)}
              className="bg-white rounded-2xl shadow p-4 sm:p-5 border border-gray-200 hover:border-gray-400 cursor-pointer">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0"><h3 className="font-bold truncate">{store.name}</h3><p className="text-sm text-gray-500 truncate">{store.city}</p></div>
                <XCircle className="text-red-400 flex-shrink-0" size={20} />
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-500">כמות היסטורית: <span className="font-semibold">{formatNumber(store.qty_total)}</span></p>
                <p className="text-gray-500">מחזור היסטורי: <span className="font-semibold">₪{formatNumber(store.total_sales)}</span></p>
                <p className="text-red-600 font-medium mt-2">לא פעיל מ: {formatMonthHeb(store.last_active_month)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// History Tab
const HistoryTab = () => (
  <div className="space-y-4">
    <h2 className="text-lg sm:text-xl font-bold">היסטוריה</h2>
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center border border-gray-100">
      <History className="mx-auto text-gray-300 mb-4" size={64} />
      <h3 className="text-lg font-medium text-gray-700 mb-2">היסטוריית מדדים</h3>
      <p className="text-gray-500">לאחר עדכונים חודשיים, כאן יופיעו 6 הסיכומים האחרונים</p>
    </div>
  </div>
);

// Settings Tab
const SettingsTab = ({ thresholds, setThresholds }) => (
  <div className="space-y-4 sm:space-y-6">
    <h2 className="text-lg sm:text-xl font-bold">הגדרות</h2>
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20} />ספי מדדים - טווח ארוך (12/12, 6/6)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף צמיחה (%)</label><input type="number" value={thresholds.growth_long} onChange={(e) => setThresholds({...thresholds, growth_long: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף יציב עליון (%)</label><input type="number" value={thresholds.stable_high_long} onChange={(e) => setThresholds({...thresholds, stable_high_long: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף יציב תחתון (%)</label><input type="number" value={thresholds.stable_low_long} onChange={(e) => setThresholds({...thresholds, stable_low_long: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף התרסקות (%)</label><input type="number" value={thresholds.crash_long} onChange={(e) => setThresholds({...thresholds, crash_long: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2"><Settings size={20} />ספי מדדים - טווח קצר (3/3, 2/2)</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף צמיחה (%)</label><input type="number" value={thresholds.growth_short} onChange={(e) => setThresholds({...thresholds, growth_short: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף יציב עליון (%)</label><input type="number" value={thresholds.stable_high_short} onChange={(e) => setThresholds({...thresholds, stable_high_short: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף יציב תחתון (%)</label><input type="number" value={thresholds.stable_low_short} onChange={(e) => setThresholds({...thresholds, stable_low_short: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
        <div><label className="block text-xs sm:text-sm font-medium mb-1">סף התרסקות (%)</label><input type="number" value={thresholds.crash_short} onChange={(e) => setThresholds({...thresholds, crash_short: +e.target.value})} className="w-full px-3 sm:px-4 py-2 border rounded-xl text-sm" /></div>
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold mb-4">העלאת נתונים</h3>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center">
        <Download className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-600 mb-4 text-sm sm:text-base">גרור קובץ Excel או לחץ לבחירה</p>
        <input type="file" accept=".xlsx" className="hidden" id="upload" />
        <label htmlFor="upload" className="cursor-pointer px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 inline-block text-sm sm:text-base">בחר קובץ</label>
      </div>
    </div>
  </div>
);

// Main App
export default function BaronAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [thresholds, setThresholds] = useState({ growth_long: 10, stable_high_long: -5, stable_low_long: -15, crash_long: -30, growth_short: 10, stable_high_short: -5, stable_low_short: -15, crash_short: -30 });

  const tabs = [
    { id: 'overview', label: 'סקירה', Icon: Home },
    { id: 'stores', label: 'חנויות', Icon: Store },
    { id: 'products', label: 'מוצרים', Icon: Package },
    { id: 'trends', label: 'מגמות', Icon: TrendingUp },
    { id: 'alerts', label: 'התראות', Icon: Bell },
    { id: 'rankings', label: 'דירוגים', Icon: Award },
    { id: 'inactive', label: 'לא פעילות', Icon: XCircle },
    { id: 'history', label: 'היסטוריה', Icon: History },
    { id: 'settings', label: 'הגדרות', Icon: Settings },
  ];

  const handleNavigate = (type, item) => {
    if (type === 'store') { setSelectedStore(item); setActiveTab('stores'); }
    else if (type === 'product') { setSelectedProduct(item); setActiveTab('products'); }
  };

  const renderContent = () => {
    if (selectedStore) return <StoreDetailPage store={selectedStore} onBack={() => setSelectedStore(null)} />;
    if (selectedProduct) return <ProductDetailPage product={selectedProduct} onBack={() => setSelectedProduct(null)} />;
    
    switch (activeTab) {
      case 'overview': return <OverviewTab stores={STORE_DATA} products={PRODUCT_DATA} onNavigate={handleNavigate} />;
      case 'stores': return <StoresTab stores={STORE_DATA} filters={FILTERS} onSelectStore={setSelectedStore} />;
      case 'products': return <ProductsTab products={PRODUCT_DATA} filters={FILTERS} onSelectProduct={setSelectedProduct} />;
      case 'trends': return <TrendsTab stores={STORE_DATA} products={PRODUCT_DATA} />;
      case 'alerts': return <AlertsTab stores={STORE_DATA} onSelectStore={setSelectedStore} />;
      case 'rankings': return <RankingsTab stores={STORE_DATA} onSelectStore={setSelectedStore} />;
      case 'inactive': return <InactiveTab stores={STORE_DATA} onSelectStore={setSelectedStore} />;
      case 'history': return <HistoryTab />;
      case 'settings': return <SettingsTab thresholds={thresholds} setThresholds={setThresholds} />;
      default: return <OverviewTab stores={STORE_DATA} products={PRODUCT_DATA} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Baron Analytics</h1>
              <p className="text-xs text-gray-500 hidden sm:block">מערכת ניתוח מכירות</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600"><User size={18} /><span>מנהל</span></div>
            <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-56 bg-white border-l border-gray-100 min-h-screen sticky top-16">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedStore(null); setSelectedProduct(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <tab.Icon size={20} />{tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-64 bg-white h-full" onClick={(e) => e.stopPropagation()}>
              <nav className="p-4 space-y-1 mt-16">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedStore(null); setSelectedProduct(null); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <tab.Icon size={20} />{tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">{renderContent()}</main>
      </div>
    </div>
  );
}
