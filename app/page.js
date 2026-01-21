'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Store, Package, AlertTriangle, Award, XCircle, Search, Download, Filter, ChevronRight, ArrowUp, ArrowDown, Minus, Menu, X, Home, Bell, LogOut, User, Check, FileText, ChevronDown, Settings, HelpCircle, MapPin, ChevronLeft, AlertCircle, Plus, Trash2, ToggleLeft, ToggleRight, Upload, BarChart3 } from 'lucide-react';
import STORES_RAW from './stores.json';
import PRODUCTS_RAW from './products.json';
import FILTERS from './filters.json';
import STORE_PRODUCTS from './store_products.json';
import PRODUCT_STORES from './product_stores.json';
import HOLIDAYS from './holidays.json';

// ============= RULE-BASED STATUS SYSTEM =============

// LONG TERM Status definitions (ordered from best to worst)
const STATUS_ORDER_LONG = ['עליה_חדה', 'צמיחה', 'יציב', 'ירידה', 'התרסקות'];
const STATUS_DISPLAY_LONG = {
  'עליה_חדה': 'עליה חדה',
  'צמיחה': 'צמיחה', 
  'יציב': 'יציב',
  'ירידה': 'ירידה',
  'התרסקות': 'התרסקות'
};

// SHORT TERM Status definitions (4 statuses, based on 2v2 only)
const STATUS_ORDER_SHORT = ['עליה_חדה', 'יציב', 'ירידה', 'אזעקה'];
const STATUS_DISPLAY_SHORT = {
  'עליה_חדה': 'עליה חדה',
  'יציב': 'יציב',
  'ירידה': 'ירידה',
  'אזעקה': 'אזעקה'
};

// Default rule for a single condition (long term)
const createDefaultRule = () => ({
  enabled: false,
  metric_12v12: { enabled: false, operator: '>=', value: 0 },
  metric_6v6: { enabled: false, operator: '>=', value: 0 },
  metric_3v3: { enabled: false, operator: '>=', value: 0 },
});

// Default config for LONG TERM (5 statuses, each with 3 rules)
const DEFAULT_LONG_CONFIG = {
  'עליה_חדה': {
    rules: [
      { enabled: true, metric_12v12: { enabled: true, operator: '>=', value: 20 }, metric_6v6: { enabled: false, operator: '>=', value: 0 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      { enabled: false, metric_12v12: { enabled: false, operator: '>=', value: 0 }, metric_6v6: { enabled: true, operator: '>=', value: 25 }, metric_3v3: { enabled: true, operator: '>=', value: 25 } },
      createDefaultRule(),
    ]
  },
  'צמיחה': {
    rules: [
      { enabled: true, metric_12v12: { enabled: true, operator: '>=', value: 10 }, metric_6v6: { enabled: false, operator: '>=', value: 0 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      { enabled: false, metric_12v12: { enabled: false, operator: '>=', value: 0 }, metric_6v6: { enabled: true, operator: '>=', value: 15 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      createDefaultRule(),
    ]
  },
  'יציב': {
    rules: [
      { enabled: true, metric_12v12: { enabled: true, operator: 'between', value: -10, value2: 10 }, metric_6v6: { enabled: false, operator: '>=', value: 0 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      createDefaultRule(),
      createDefaultRule(),
    ]
  },
  'ירידה': {
    rules: [
      { enabled: true, metric_12v12: { enabled: true, operator: '<', value: -10 }, metric_6v6: { enabled: false, operator: '>=', value: 0 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      { enabled: false, metric_12v12: { enabled: false, operator: '>=', value: 0 }, metric_6v6: { enabled: true, operator: '<', value: -15 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      createDefaultRule(),
    ]
  },
  'התרסקות': {
    rules: [
      { enabled: true, metric_12v12: { enabled: true, operator: '<', value: -30 }, metric_6v6: { enabled: false, operator: '>=', value: 0 }, metric_3v3: { enabled: false, operator: '>=', value: 0 } },
      { enabled: false, metric_12v12: { enabled: false, operator: '>=', value: 0 }, metric_6v6: { enabled: true, operator: '<', value: -30 }, metric_3v3: { enabled: true, operator: '<', value: -30 } },
      createDefaultRule(),
    ]
  },
};

// Default config for SHORT TERM (4 statuses, simple thresholds based on 2v2)
const DEFAULT_SHORT_CONFIG = {
  'עליה_חדה': { threshold: 15, operator: '>=' },  // 2v2 >= 15%
  'יציב': { threshold: -10, operator: '>=' },      // 2v2 >= -10%
  'ירידה': { threshold: -25, operator: '>=' },     // 2v2 >= -25%
  'אזעקה': { threshold: -Infinity, operator: '>=' } // Everything else (below -25%)
};

// Combined default config
const DEFAULT_RULES_CONFIG = {
  long: DEFAULT_LONG_CONFIG,
  short: DEFAULT_SHORT_CONFIG
};

// Default ALERT config - which stores show in alerts
const DEFAULT_ALERT_CONFIG = {
  includeStatus: ['התרסקות', 'ירידה'], // סטטוסים שמכניסים להתראות
  include12v12Below: { enabled: true, value: -15 }, // 12v12 < X
  includeDecliningMonths: { enabled: true, value: 3 }, // X חודשים רצופים ירידה
  customRules: [
    { enabled: false, metric: '6v6', operator: '<', value: -10 },
    { enabled: false, metric: '3v3', operator: '<', value: -5 },
  ]
};

// Check if a single metric condition is met
const checkMetricCondition = (metricValue, condition) => {
  if (!condition.enabled) return true;
  const val = metricValue || 0;
  switch (condition.operator) {
    case '>=': return val >= condition.value;
    case '>': return val > condition.value;
    case '<=': return val <= condition.value;
    case '<': return val < condition.value;
    case '=': return val === condition.value;
    case 'between': {
      const min = Math.min(condition.value, condition.value2 || condition.value);
      const max = Math.max(condition.value, condition.value2 || condition.value);
      return val >= min && val <= max;
    }
    default: return false;
  }
};

// Check if a rule matches an item (for long term)
const checkRule = (item, rule) => {
  if (!rule.enabled) return false;
  
  const conditions = [
    { key: 'metric_12v12', metric: item.metric_12v12, condition: rule.metric_12v12 },
    { key: 'metric_6v6', metric: item.metric_6v6, condition: rule.metric_6v6 },
    { key: 'metric_3v3', metric: item.metric_3v3, condition: rule.metric_3v3 },
  ];
  
  for (const { metric, condition } of conditions) {
    if (condition.enabled && !checkMetricCondition(metric, condition)) {
      return false;
    }
  }
  
  const hasEnabledCondition = conditions.some(c => c.condition.enabled);
  return hasEnabledCondition;
};

// Default FALLBACK rules (simple single-metric rules)
const DEFAULT_FALLBACK_CONFIG = {
  'התרסקות': { metric: '6v6', operator: '<', value: -15 },
  'ירידה': { metric: '6v6', operator: '<', value: -3 },
  'צמיחה': { metric: '6v6', operator: '>=', value: 5 },
  'עליה_חדה': { metric: '6v6', operator: '>=', value: 20 },
  // יציב is the final fallback - no rule needed
};

// Check a single fallback rule
const checkFallbackRule = (item, rule) => {
  if (!rule) return false;
  const val = item[`metric_${rule.metric}`] || 0;
  switch (rule.operator) {
    case '>=': return val >= rule.value;
    case '>': return val > rule.value;
    case '<=': return val <= rule.value;
    case '<': return val < rule.value;
    default: return false;
  }
};

// Format a rule condition for display
const formatRuleCondition = (rule) => {
  const parts = [];
  
  if (rule.metric_12v12?.enabled) {
    const c = rule.metric_12v12;
    if (c.min !== undefined && c.max !== undefined) {
      parts.push(`12v12 בין ${c.min}% ל-${c.max}%`);
    } else if (c.min !== undefined) {
      parts.push(`12v12 ≥ ${c.min}%`);
    } else if (c.max !== undefined) {
      parts.push(`12v12 ≤ ${c.max}%`);
    }
  }
  
  if (rule.metric_6v6?.enabled) {
    const c = rule.metric_6v6;
    if (c.min !== undefined && c.max !== undefined) {
      parts.push(`6v6 בין ${c.min}% ל-${c.max}%`);
    } else if (c.min !== undefined) {
      parts.push(`6v6 ≥ ${c.min}%`);
    } else if (c.max !== undefined) {
      parts.push(`6v6 ≤ ${c.max}%`);
    }
  }
  
  if (rule.metric_3v3?.enabled) {
    const c = rule.metric_3v3;
    if (c.min !== undefined && c.max !== undefined) {
      parts.push(`3v3 בין ${c.min}% ל-${c.max}%`);
    } else if (c.min !== undefined) {
      parts.push(`3v3 ≥ ${c.min}%`);
    } else if (c.max !== undefined) {
      parts.push(`3v3 ≤ ${c.max}%`);
    }
  }
  
  return parts.join(' + ');
};

// Metric labels and periods for display
const METRIC_INFO = {
  '12v12': { name: 'שנתי', period: 'ינו-דצמ 24 → ינו-דצמ 25' },
  '6v6': { name: 'חצי שנתי', period: 'ינו-יונ 25 → יול-דצמ 25' },
  '3v3': { name: 'רבעוני', period: 'אוק-דצמ 24 → אוק-דצמ 25' },
  '2v2': { name: 'חודשיים', period: 'ספט-אוק → נוב-דצמ 25' },
};

// Build detailed metrics comparison for display
const buildMetricsComparison = (item, rule) => {
  const comparisons = [];
  
  if (rule.metric_12v12?.enabled) {
    const c = rule.metric_12v12;
    const actual = item.metric_12v12;
    let ruleText = '';
    
    if (c.operator === 'between') {
      ruleText = `${c.value}% עד ${c.value2}%`;
    } else if (c.min !== undefined && c.max !== undefined) {
      ruleText = `${c.min}% עד ${c.max}%`;
    } else if (c.min !== undefined) {
      ruleText = `≥ ${c.min}%`;
    } else if (c.max !== undefined) {
      ruleText = `≤ ${c.max}%`;
    } else {
      ruleText = '-';
    }
    
    comparisons.push({
      metric: '12v12',
      name: METRIC_INFO['12v12'].name,
      period: METRIC_INFO['12v12'].period,
      rule: ruleText,
      actual: actual?.toFixed(1) + '%',
      actualValue: actual
    });
  }
  
  if (rule.metric_6v6?.enabled) {
    const c = rule.metric_6v6;
    const actual = item.metric_6v6;
    let ruleText = '';
    
    if (c.operator === 'between') {
      ruleText = `${c.value}% עד ${c.value2}%`;
    } else if (c.min !== undefined && c.max !== undefined) {
      ruleText = `${c.min}% עד ${c.max}%`;
    } else if (c.min !== undefined) {
      ruleText = `≥ ${c.min}%`;
    } else if (c.max !== undefined) {
      ruleText = `≤ ${c.max}%`;
    } else {
      ruleText = '-';
    }
    
    comparisons.push({
      metric: '6v6',
      name: METRIC_INFO['6v6'].name,
      period: METRIC_INFO['6v6'].period,
      rule: ruleText,
      actual: actual?.toFixed(1) + '%',
      actualValue: actual
    });
  }
  
  if (rule.metric_3v3?.enabled) {
    const c = rule.metric_3v3;
    const actual = item.metric_3v3;
    let ruleText = '';
    
    if (c.operator === 'between') {
      ruleText = `${c.value}% עד ${c.value2}%`;
    } else if (c.min !== undefined && c.max !== undefined) {
      ruleText = `${c.min}% עד ${c.max}%`;
    } else if (c.min !== undefined) {
      ruleText = `≥ ${c.min}%`;
    } else if (c.max !== undefined) {
      ruleText = `≤ ${c.max}%`;
    } else {
      ruleText = '-';
    }
    
    comparisons.push({
      metric: '3v3',
      name: METRIC_INFO['3v3'].name,
      period: METRIC_INFO['3v3'].period,
      rule: ruleText,
      actual: actual?.toFixed(1) + '%',
      actualValue: actual
    });
  }
  
  return comparisons;
};

// Build fallback comparison
const buildFallbackComparison = (item, rule) => {
  const opDisplay = { '>=': '≥', '>': '>', '<=': '≤', '<': '<' };
  const actual = item[`metric_${rule.metric}`] || 0;
  
  return [{
    metric: rule.metric,
    name: METRIC_INFO[rule.metric]?.name || rule.metric,
    period: METRIC_INFO[rule.metric]?.period || '',
    rule: `${opDisplay[rule.operator]} ${rule.value}%`,
    actual: actual.toFixed(1) + '%',
    actualValue: actual
  }];
};

// Calculate LONG TERM status based on rules (returns { status, isFallback, explanation, ruleIndex, metricsComparison })
const calcLongTermStatus = (item, longConfig, fallbackConfig) => {
  // First try main rules
  for (const statusKey of STATUS_ORDER_LONG) {
    const statusConfig = longConfig[statusKey];
    if (!statusConfig || !statusConfig.rules) continue;
    
    for (let i = 0; i < statusConfig.rules.length; i++) {
      const rule = statusConfig.rules[i];
      if (checkRule(item, rule)) {
        const metricsComparison = buildMetricsComparison(item, rule);
        return { 
          status: STATUS_DISPLAY_LONG[statusKey], 
          isFallback: false, 
          explanation: `עונה על חוק ${i + 1}`,
          ruleIndex: i + 1,
          metricsComparison
        };
      }
    }
  }
  
  // No main rule matched - try fallback rules
  const fbConfig = fallbackConfig || DEFAULT_FALLBACK_CONFIG;
  
  // Check fallback rules in order (worst to best for negative, best to worst for positive)
  // Order: התרסקות -> ירידה -> צמיחה -> עליה_חדה -> יציב
  const fallbackOrder = ['התרסקות', 'ירידה', 'עליה_חדה', 'צמיחה'];
  
  for (const statusKey of fallbackOrder) {
    const rule = fbConfig[statusKey];
    if (rule && checkFallbackRule(item, rule)) {
      const metricsComparison = buildFallbackComparison(item, rule);
      return { 
        status: STATUS_DISPLAY_LONG[statusKey], 
        isFallback: true, 
        explanation: 'חוק גיבוי',
        ruleIndex: 'גיבוי',
        metricsComparison
      };
    }
  }
  
  // Final fallback - יציב
  return { 
    status: 'יציב', 
    isFallback: true, 
    explanation: 'לא עונה על אף חוק - סטטוס ברירת מחדל',
    ruleIndex: 'ברירת מחדל',
    metricsComparison: []
  };
};

// Calculate SHORT TERM status based on simple thresholds (2v2 only)
const calcShortTermStatus = (item, shortConfig) => {
  const val = item.metric_2v2 || 0;
  
  // Check in order: עליה_חדה -> יציב -> ירידה -> אזעקה
  for (const statusKey of STATUS_ORDER_SHORT) {
    const config = shortConfig[statusKey];
    if (!config) continue;
    
    if (val >= config.threshold) {
      return STATUS_DISPLAY_SHORT[statusKey];
    }
  }
  return 'אזעקה';
};

// Apply config to items
const applyConfig = (items, rulesConfig) => items.map(item => {
  const longConfig = rulesConfig.long || rulesConfig; // Backward compatibility
  const shortConfig = rulesConfig.short || DEFAULT_SHORT_CONFIG;
  const fallbackConfig = rulesConfig.fallback || DEFAULT_FALLBACK_CONFIG;
  
  const { status: statusLong, isFallback, explanation, ruleIndex, metricsComparison } = calcLongTermStatus(item, longConfig, fallbackConfig);
  const statusShort = calcShortTermStatus(item, shortConfig);
  
  return {
    ...item,
    status_long: statusLong,
    status_short: statusShort,
    status: statusLong, // Default status is long term
    is_fallback: isFallback, // Mark if status came from fallback rule
    status_explanation: explanation, // Why this status was given
    status_rule_index: ruleIndex, // Which rule matched
    metrics_comparison: metricsComparison, // Detailed comparison table data
  };
});

// Status visual config - LONG TERM (5 statuses)
const STATUS_LONG_CFG = {
  'עליה חדה': { bg: 'bg-emerald-200', text: 'text-emerald-800', border: 'border-emerald-400', Icon: TrendingUp, emoji: '🚀' },
  'צמיחה': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', Icon: TrendingUp, emoji: '📈' },
  'יציב': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', Icon: Minus, emoji: '➡️' },
  'ירידה': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', Icon: TrendingDown, emoji: '📉' },
  'התרסקות': { bg: 'bg-red-200', text: 'text-red-800', border: 'border-red-400', Icon: AlertTriangle, emoji: '🔴' },
};

// Status visual config - SHORT TERM (4 statuses)
const STATUS_SHORT_CFG = {
  'עליה חדה': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', Icon: TrendingUp, emoji: '🚀' },
  'יציב': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', Icon: Minus, emoji: '✅' },
  'ירידה': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', Icon: TrendingDown, emoji: '⚠️' },
  'אזעקה': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', Icon: AlertCircle, emoji: '🚨' },
};

const STATUS_CFG = STATUS_LONG_CFG;

const Tip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex mr-1">
      <HelpCircle size={14} className="text-gray-400 hover:text-blue-500 cursor-help flex-shrink-0" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
      {show && <div className="fixed z-[9999] transform -translate-y-full -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-2xl whitespace-normal text-right" style={{ marginTop: '-8px' }}>{text}</div>}
    </div>
  );
};

const METRIC_TIPS = {
  '12v12': 'השוואת סך הכמות בכל 2024 מול כל 2025',
  '6v6': 'השוואת ינו-יונ 2025 מול יול-דצמ 2025',
  '3v3': 'השוואת אוק-דצמ 2024 מול אוק-דצמ 2025',
  '2v2': 'השוואת ספט-אוק מול נוב-דצמ 2025',
  'peak': 'מרחק מהשיא = דצמבר 2025 מול ממוצע 4 החודשים הגבוהים',
  'returns': 'אחוז החזרות מהאספקה',
  'long_term': 'מדד טווח ארוך = הנמוך מבין: 12v12, 6v6, 3v3',
  'short_term': 'מדד טווח קצר = 2v2 (נוב-דצמ מול ספט-אוק)',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// v1.10.8 - Period options for data tables
const PERIOD_OPTIONS = [
  { id: 'h2_2025', label: 'H2 2025 (יולי-דצמ)', months: ['202507', '202508', '202509', '202510', '202511', '202512'] },
  { id: 'q4_2025', label: 'Q4 2025 (אוק-דצמ)', months: ['202510', '202511', '202512'] },
  { id: 'last3', label: '3 חודשים אחרונים', months: ['202510', '202511', '202512'] },
  { id: 'last6', label: '6 חודשים אחרונים', months: ['202507', '202508', '202509', '202510', '202511', '202512'] },
  { id: 'h1_2025', label: 'H1 2025 (ינו-יונ)', months: ['202501', '202502', '202503', '202504', '202505', '202506'] },
  { id: 'year_2025', label: 'שנת 2025', months: ['202501', '202502', '202503', '202504', '202505', '202506', '202507', '202508', '202509', '202510', '202511', '202512'] },
  { id: 'year_2024', label: 'שנת 2024', months: ['202401', '202402', '202403', '202404', '202405', '202406', '202407', '202408', '202409', '202410', '202411', '202412'] },
];

// v1.10.8 - Period selector component
const PeriodSelector = ({ value, onChange, className = '' }) => (
  <select 
    value={value} 
    onChange={e => onChange(e.target.value)}
    className={`px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 ${className}`}
  >
    {PERIOD_OPTIONS.map(opt => (
      <option key={opt.id} value={opt.id}>{opt.label}</option>
    ))}
  </select>
);

// v1.10.8 - Calculate data for a store based on selected period
const calcStoreDataForPeriod = (store, periodId) => {
  const period = PERIOD_OPTIONS.find(p => p.id === periodId) || PERIOD_OPTIONS[0];
  const months = period.months;
  
  const gross = months.reduce((sum, m) => sum + ((store.monthly_gross || {})[m] || 0), 0);
  const net = months.reduce((sum, m) => sum + ((store.monthly_net || store.monthly_qty || {})[m] || 0), 0);
  const returns = months.reduce((sum, m) => sum + ((store.monthly_returns || {})[m] || 0), 0);
  const deliveries = months.reduce((sum, m) => sum + ((store.monthly_deliveries || {})[m] || 0), 0);
  const returnsPct = gross > 0 ? (returns / gross * 100) : 0;
  const avgPerDelivery = deliveries > 0 ? (net / deliveries) : 0;
  
  return {
    ...store,
    period_gross: gross,
    period_net: net,
    period_returns: returns,
    period_deliveries: deliveries,
    period_returns_pct: returnsPct,
    period_avg_per_delivery: avgPerDelivery
  };
};

// v1.10.8 - Get period label
const getPeriodLabel = (periodId) => {
  const period = PERIOD_OPTIONS.find(p => p.id === periodId);
  return period ? period.label : 'H2 2025';
};

// v1.10.9 - Calculate data for a product based on selected period (similar to stores)
const calcProductDataForPeriod = (product, periodId) => {
  const period = PERIOD_OPTIONS.find(p => p.id === periodId) || PERIOD_OPTIONS[0];
  const months = period.months;
  
  const gross = months.reduce((sum, m) => sum + ((product.monthly_gross || {})[m] || 0), 0);
  const net = months.reduce((sum, m) => sum + ((product.monthly_net || product.monthly_qty || {})[m] || 0), 0);
  const returns = months.reduce((sum, m) => sum + ((product.monthly_returns || {})[m] || 0), 0);
  const sales = months.reduce((sum, m) => sum + ((product.monthly_sales || {})[m] || 0), 0);
  const returnsPct = gross > 0 ? (returns / gross * 100) : 0;
  
  return {
    ...product,
    period_gross: gross,
    period_net: net,
    period_returns: returns,
    period_sales: sales,
    period_returns_pct: returnsPct
  };
};

// v1.10.12 - Calculate data for store (in product detail) based on selected period  
// This function estimates gross/returns from net and returns percentage
// because stores in PRODUCT_STORES don't have detailed monthly_gross/monthly_returns data
const calcProductStoreDataForPeriod = (store, periodId) => {
  const period = PERIOD_OPTIONS.find(p => p.id === periodId) || PERIOD_OPTIONS[0];
  const months = period.months;
  
  // Net quantity (sold items)
  const net = months.reduce((sum, m) => sum + ((store.monthly_qty || {})[m] || 0), 0);
  
  // Use period-appropriate returns percentage
  const isH2 = periodId.includes('h2') || periodId.includes('last') || periodId.includes('q4') || periodId === 'year_2025';
  const returnsPct = isH2 ? (store.returns_pct_last6 || 0) : (store.returns_pct_prev6 || 0);
  
  // Estimate gross from net and returns percentage: net = gross * (1 - returns%)
  const gross = returnsPct < 100 ? Math.round(net / (1 - returnsPct / 100)) : net;
  const returns = gross - net;
  
  return {
    ...store,
    period_net: net,
    period_gross: gross,
    period_returns: returns,
    period_returns_pct: returnsPct
  };
};

// Month names for charts
const MONTH_NAMES_SHORT = {
  '01': 'ינו', '02': 'פבר', '03': 'מרץ', '04': 'אפר', '05': 'מאי', '06': 'יונ',
  '07': 'יול', '08': 'אוג', '09': 'ספט', '10': 'אוק', '11': 'נוב', '12': 'דצמ'
};

// Helper to get short-term status (for filters)
const getShortTermStatus = (item) => {
  return item.status_short || 'יציב';
};

// Helper to get long-term status (for filters)
const getLongTermStatus = (item) => {
  return item.status_long || 'יציב';
};

// Auth helpers
const DEFAULT_PASSWORD = 'baron148';
const getPassword = () => { if (typeof window === 'undefined') return DEFAULT_PASSWORD; return localStorage.getItem('baron_password') || DEFAULT_PASSWORD; };
const setPassword = (pwd) => { if (typeof window !== 'undefined') localStorage.setItem('baron_password', pwd); };
const isLoggedIn = () => { if (typeof window === 'undefined') return false; return localStorage.getItem('baron_logged_in') === 'true'; };
const setLoggedIn = (val) => { if (typeof window !== 'undefined') localStorage.setItem('baron_logged_in', val ? 'true' : 'false'); };

// Exclusions helpers
const getExclusions = () => { if (typeof window === 'undefined') return { stores: [], products: [] }; try { return JSON.parse(localStorage.getItem('baron_exclusions') || '{"stores":[],"products":[]}'); } catch { return { stores: [], products: [] }; } };
const setExclusions = (exc) => { if (typeof window !== 'undefined') localStorage.setItem('baron_exclusions', JSON.stringify(exc)); };

// Login Screen Component
const LoginScreen = ({ onLogin }) => {
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  
  const handleLogin = () => {
    if (password === getPassword()) {
      setLoggedIn(true);
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/baron-logo.png" alt="ברון" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">ברוכים הבאים</h1>
          <p className="text-gray-500 mt-2">מערכת ניתוח מכירות</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם משתמש</label>
            <input type="text" value="מנהל" disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמא</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPasswordInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleLogin()}
              placeholder="הזן סיסמא"
              className={'w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' + (error ? 'border-red-500 bg-red-50' : 'border-gray-200')}
            />
            {error && <p className="text-red-500 text-sm mt-1">סיסמא שגויה</p>}
          </div>
          <button onClick={handleLogin} className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-800 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg">
            כניסה למערכת
          </button>
        </div>
      </div>
    </div>
  );
};
const fmt = n => n != null ? new Intl.NumberFormat('he-IL').format(Math.round(n)) : '-';
const fmtPct = n => n != null ? (n > 0 ? '+' : '') + n.toFixed(1) + '%' : '-';
const fmtMonth = m => { const s = String(m); return s.slice(4) + '/' + s.slice(2,4); };
const fmtMonthHeb = m => { if (!m) return '-'; const ms = ['','ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ']; const s = String(m); return ms[parseInt(s.slice(4))] + ' ' + s.slice(0,4); };

const Badge = ({ status, sm, isFallback }) => { 
  const c = STATUS_LONG_CFG[status] || STATUS_LONG_CFG['יציב']; 
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} ${isFallback ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
      <c.Icon size={sm ? 12 : 14} />
      {status}
      {isFallback && <span title="סטטוס מחוק גיבוי">⚠️</span>}
    </span>
  ); 
};

// Long Term Status Badge
const LongTermBadge = ({ status, sm, isFallback }) => {
  const c = STATUS_LONG_CFG[status] || STATUS_LONG_CFG['יציב'];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} border ${c.border} ${sm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'} ${isFallback ? 'ring-2 ring-yellow-400' : ''}`}>
      <c.Icon size={12} />
      {status}
      {isFallback && <span title="סטטוס מחוק גיבוי" className="mr-0.5">⚠️</span>}
    </span>
  );
};

// Short Term Status Badge (with emoji for alerts)
const ShortTermBadge = ({ status, sm }) => {
  const c = STATUS_SHORT_CFG[status] || STATUS_SHORT_CFG['יציב'];
  return <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.bg} ${c.text} border ${c.border} ${sm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}>{c.emoji} {status}</span>;
};

const StatusBadge = ({ item, sm }) => {
  const longStatus = item?.status_long || 'יציב';
  const shortStatus = item?.status_short || 'יציב';
  const isFallback = item?.is_fallback || false;
  return (
    <div className="flex flex-col gap-1">
      <LongTermBadge status={longStatus} sm={sm} isFallback={isFallback} />
      <ShortTermBadge status={shortStatus} sm={sm} />
    </div>
  );
};

const LongTermCell = ({ value }) => {
  const color = value >= 10 ? 'text-emerald-600' : value >= 0 ? 'text-emerald-500' : value >= -10 ? 'text-orange-500' : 'text-red-600';
  const bg = value >= 10 ? 'bg-emerald-50' : value >= 0 ? 'bg-emerald-50' : value >= -10 ? 'bg-orange-50' : 'bg-red-50';
  return <div className={`text-center px-2 py-1 rounded-lg ${bg}`}><span className={`font-bold ${color}`}>{fmtPct(value)}</span></div>;
};

const ShortTermCell = ({ value, ok }) => {
  const isPositive = value >= 0 || ok;
  return <div className={`text-center px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}><span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(value)}</span></div>;
};

const Card = ({ title, value, sub, trend, icon: Icon, color = 'blue' }) => {
  const cols = { blue: 'from-blue-700 to-blue-800', green: 'from-emerald-500 to-emerald-600', red: 'from-red-500 to-red-600', purple: 'from-purple-500 to-purple-600' };
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

// Monthly Sales Table - shows last 12 months of sales and quantities
// v1.8.5 - Full table with gross/net/returns/deliveries
// Monthly Sales Table - shows last 12 months of sales and quantities
// v1.8.5 - Full table with gross/net/returns/deliveries
// v1.10.12 - Added product prop for full product data
const MonthlySalesChart = ({ data, store, product, title = "מכירות חודשיות" }) => {
  const [showYear, setShowYear] = useState('2025');
  const [hideHolidays, setHideHolidays] = useState(false);
  
  // מיפוי חגים לפי חודש - כולל תאריכים
  const holidaysPerMonth = useMemo(() => {
    const result = {};
    for (const [weekStart, holiday] of Object.entries(HOLIDAYS.weeks || {})) {
      const year = weekStart.slice(0, 4);
      const month = weekStart.slice(5, 7);
      const monthKey = year + month;
      if (!result[monthKey]) {
        result[monthKey] = [];
      }
      if (!result[monthKey].find(h => h.name === holiday.name)) {
        result[monthKey].push({
          name: holiday.name,
          type: holiday.type,
          dates: holiday.dates || ''
        });
      }
    }
    return result;
  }, []);
  
  const chartData = useMemo(() => {
    const months = showYear === '2025' 
      ? ['202501', '202502', '202503', '202504', '202505', '202506', '202507', '202508', '202509', '202510', '202511', '202512']
      : ['202401', '202402', '202403', '202404', '202405', '202406', '202407', '202408', '202409', '202410', '202411', '202412'];
    
    let result = [];
    
    // אם זה מערך של חנויות - סיכום כללי
    if (Array.isArray(data)) {
      result = months.map(month => {
        let gross = 0, net = 0, returns = 0, sales = 0, deliveries = 0;
        data.forEach(item => {
          gross += item.monthly_gross?.[month] || 0;
          net += item.monthly_net?.[month] || item.monthly_qty?.[month] || 0;
          returns += item.monthly_returns?.[month] || 0;
          sales += item.monthly_sales?.[month] || item.monthly?.[month] || 0;
          deliveries += item.monthly_deliveries?.[month] || 0;
        });
        if (sales === 0 && net > 0) sales = net * 7.5;
        const returnsPct = gross > 0 ? (returns / gross * 100) : 0;
        return {
          month: MONTH_NAMES_SHORT[month.slice(4)],
          monthKey: month,
          gross, net, returns, returnsPct, sales, deliveries,
          holidays: holidaysPerMonth[month] || []
        };
      });
    } 
    // אם יש store - לקחת נתונים מהחנות
    else if (store) {
      result = months.map(month => {
        const gross = store.monthly_gross?.[month] || 0;
        const net = store.monthly_net?.[month] || store.monthly_qty?.[month] || 0;
        const returns = store.monthly_returns?.[month] || 0;
        const sales = store.monthly_sales?.[month] || (Math.abs(net) * 7.5);
        const deliveries = store.monthly_deliveries?.[month] || 0;
        const returnsPct = gross > 0 ? (returns / gross * 100) : 0;
        return {
          month: MONTH_NAMES_SHORT[month.slice(4)],
          monthKey: month,
          gross, net, returns, returnsPct, sales, deliveries,
          holidays: holidaysPerMonth[month] || []
        };
      });
    }
    // v1.10.12 - אם יש product - לקחת נתונים מהמוצר עם חישוב ברוטו/חזרות
    else if (product) {
      // Use H1 returns for 2024, H2 returns for 2025
      const returnsPctH1 = product.returns_pct_prev6 || 0;
      const returnsPctH2 = product.returns_pct_last6 || 0;
      
      result = months.map(month => {
        let net = product.monthly_qty?.[month] || 0;
        const sales = product.monthly?.[month] || (net > 0 ? net * 7.5 : 0);
        
        // Use H1 returns for months 01-06, H2 for 07-12
        const monthNum = parseInt(month.slice(4));
        const returnsPct = monthNum <= 6 ? returnsPctH1 : returnsPctH2;
        
        // Estimate gross from net and returns %: gross = net / (1 - returns%)
        let gross = 0, returns = 0;
        if (net > 0 && returnsPct < 100) {
          gross = Math.round(net / (1 - returnsPct / 100));
          returns = gross - net;
        } else if (net < 0) {
          // Negative net means more returns than sales
          gross = 0;
          returns = Math.abs(net);
          net = net; // Keep negative for display
        }
        
        return {
          month: MONTH_NAMES_SHORT[month.slice(4)],
          monthKey: month,
          gross, net, returns, returnsPct: gross > 0 ? (returns / gross * 100) : 0, 
          sales, deliveries: 0,
          holidays: holidaysPerMonth[month] || []
        };
      });
    }
    // אם זה אובייקט monthly_qty בודד (למוצר - fallback)
    else if (data && typeof data === 'object') {
      result = months.map(month => {
        const net = data[month] || 0;
        return {
          month: MONTH_NAMES_SHORT[month.slice(4)],
          monthKey: month,
          gross: 0, net, returns: 0, returnsPct: 0, 
          sales: net * 7.5, deliveries: 0,
          holidays: holidaysPerMonth[month] || []
        };
      });
    }
    
    // סימון חודשי חג
    if (hideHolidays) {
      result = result.map(d => ({
        ...d,
        isHolidayMonth: d.holidays.some(h => h.type === 'closed' || h.type === 'pre_holiday')
      }));
    }
    
    return result;
  }, [data, store, product, showYear, holidaysPerMonth, hideHolidays]);
  
  const totals = useMemo(() => {
    const validData = hideHolidays ? chartData.filter(d => !d.isHolidayMonth) : chartData;
    const gross = validData.reduce((sum, d) => sum + d.gross, 0);
    const net = validData.reduce((sum, d) => sum + d.net, 0);
    const returns = validData.reduce((sum, d) => sum + d.returns, 0);
    const sales = validData.reduce((sum, d) => sum + d.sales, 0);
    const deliveries = validData.reduce((sum, d) => sum + d.deliveries, 0);
    const returnsPct = gross > 0 ? (returns / gross * 100) : 0;
    return { gross, net, returns, returnsPct, sales, deliveries };
  }, [chartData, hideHolidays]);
  
  if (chartData.every(d => d.net === 0 && d.gross === 0)) {
    return null;
  }
  
  const hasGross = totals.gross > 0;
  const hasDeliveries = totals.deliveries > 0;
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-bold">📊 {title} - {showYear}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg">
            <input 
              type="checkbox" 
              checked={hideHolidays} 
              onChange={(e) => setHideHolidays(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span>הסתר חודשי חג</span>
          </label>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowYear('2024')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showYear === '2024' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              2024
            </button>
            <button 
              onClick={() => setShowYear('2025')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showYear === '2025' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              2025
            </button>
          </div>
        </div>
      </div>
      
      {/* טבלה */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-100 to-slate-200">
              <th className="px-3 py-3 text-right font-bold text-gray-700 sticky right-0 bg-slate-100 min-w-[130px] border-l">מדד (לפי חודש)</th>
              {chartData.map(d => (
                <th key={d.monthKey} className={`px-3 py-3 text-center font-semibold min-w-[65px] ${d.isHolidayMonth ? 'opacity-40' : ''}`}>
                  {d.month}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold text-white bg-blue-600 min-w-[85px] border-r">סה"כ {showYear}</th>
            </tr>
          </thead>
          <tbody>
            {/* ברוטו */}
            {hasGross && (
              <tr className="border-t hover:bg-blue-50/50">
                <td className="px-3 py-2.5 font-semibold text-blue-700 sticky right-0 bg-white border-l">ברוטו</td>
                {chartData.map(d => (
                  <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''} ${d.gross < 0 ? 'text-red-600' : ''}`}>
                    {d.gross !== 0 ? fmt(d.gross) : '-'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-blue-700 bg-blue-50 border-r">{fmt(totals.gross)}</td>
              </tr>
            )}
            
            {/* נטו (פריטים) */}
            <tr className="border-t bg-emerald-50/30 hover:bg-emerald-50">
              <td className="px-3 py-2.5 font-semibold text-emerald-700 sticky right-0 bg-emerald-50/30 border-l">נטו (פריטים)</td>
              {chartData.map(d => (
                <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium ${d.net < 0 ? 'text-red-600' : 'text-emerald-600'} ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''}`}>
                  {d.net !== 0 ? fmt(d.net) : '-'}
                </td>
              ))}
              <td className={`px-4 py-2.5 text-center font-bold bg-blue-50 border-r ${totals.net < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(totals.net)}</td>
            </tr>
            
            {/* חזרות */}
            {hasGross && (
              <tr className="border-t hover:bg-red-50/50">
                <td className="px-3 py-2.5 font-semibold text-red-600 sticky right-0 bg-white border-l">חזרות</td>
                {chartData.map(d => (
                  <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium text-red-500 ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''}`}>
                    {d.returns !== 0 ? fmt(d.returns) : '-'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-red-600 bg-blue-50 border-r">{fmt(totals.returns)}</td>
              </tr>
            )}
            
            {/* חזרות % */}
            {hasGross && (
              <tr className="border-t bg-red-50/30 hover:bg-red-50">
                <td className="px-3 py-2.5 font-semibold text-red-600 sticky right-0 bg-red-50/30 border-l">חזרות %</td>
                {chartData.map(d => (
                  <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium ${d.returnsPct > 20 ? 'text-red-600' : d.returnsPct > 10 ? 'text-orange-500' : 'text-gray-500'} ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''}`}>
                    {d.gross !== 0 ? d.returnsPct.toFixed(0) + '%' : '-'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-red-600 bg-blue-50 border-r">{totals.returnsPct.toFixed(0)}%</td>
              </tr>
            )}
            
            {/* מחזור ₪ */}
            <tr className="border-t hover:bg-blue-50/50">
              <td className="px-3 py-2.5 font-semibold text-blue-700 sticky right-0 bg-white border-l">מחזור ₪</td>
              {chartData.map(d => (
                <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium text-blue-600 ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''}`}>
                  {d.sales >= 1000 ? (d.sales / 1000).toFixed(0) + 'K' : d.sales > 0 ? d.sales.toFixed(0) : '-'}
                </td>
              ))}
              <td className="px-4 py-2.5 text-center font-bold text-blue-700 bg-blue-50 border-r">
                ₪{totals.sales >= 1000000 ? (totals.sales / 1000000).toFixed(1) + 'M' : (totals.sales / 1000).toFixed(0) + 'K'}
              </td>
            </tr>
            
            {/* אספקות */}
            {hasDeliveries && (
              <tr className="border-t bg-purple-50/30 hover:bg-purple-50">
                <td className="px-3 py-2.5 font-semibold text-purple-700 sticky right-0 bg-purple-50/30 border-l">אספקות בחודש</td>
                {chartData.map(d => (
                  <td key={d.monthKey} className={`px-3 py-2.5 text-center font-medium text-purple-600 ${d.isHolidayMonth ? 'opacity-40 bg-gray-100' : ''}`}>
                    {d.deliveries > 0 ? d.deliveries : '-'}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-purple-700 bg-blue-50 border-r">{totals.deliveries}</td>
              </tr>
            )}
            
            {/* שורת חגים עם תאריכים */}
            <tr className="border-t bg-blue-50/50">
              <td className="px-3 py-2 font-semibold text-blue-700 sticky right-0 bg-blue-50/50 text-xs border-l">🕎 חגים</td>
              {chartData.map(d => (
                <td key={d.monthKey} className="px-1 py-2 text-center text-xs text-blue-700">
                  {d.holidays.length > 0 ? (
                    <div className="flex flex-col leading-tight">
                      <span className="font-semibold">{d.holidays.map(h => h.name).join(', ')}</span>
                      <span className="text-[10px] text-blue-600 mt-0.5">{d.holidays.map(h => h.dates).filter(Boolean).join(', ')}</span>
                    </div>
                  ) : '-'}
                </td>
              ))}
              <td className="px-4 py-2 text-center bg-blue-50 border-r">-</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* גרף - v1.10.7 improved for mobile */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={hideHolidays ? chartData.filter(d => !d.isHolidayMonth) : chartData} 
          margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} />
          <YAxis 
            yAxisId="left" 
            orientation="right" 
            tick={{ fontSize: 10 }} 
            tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}
            width={35}
          />
          <YAxis 
            yAxisId="right" 
            orientation="left" 
            tick={{ fontSize: 10 }}
            tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}
            width={35}
          />
          <Tooltip 
            formatter={(value, name) => [
              name === 'sales' ? '₪' + fmt(Math.round(value)) : fmt(value),
              name === 'gross' ? 'ברוטו' : name === 'net' ? 'נטו' : name === 'returns' ? 'חזרות' : 'מחזור'
            ]}
          />
          <Legend formatter={(value) => value === 'gross' ? 'ברוטו' : value === 'net' ? 'נטו' : 'חזרות'} />
          {hasGross && <Bar yAxisId="left" dataKey="gross" fill="#3b82f6" name="gross" radius={[4, 4, 0, 0]} barSize={20} />}
          <Bar yAxisId="left" dataKey="net" fill="#10b981" name="net" radius={[4, 4, 0, 0]} barSize={20} />
          {hasGross && <Bar yAxisId="left" dataKey="returns" fill="#ef4444" name="returns" radius={[4, 4, 0, 0]} barSize={20} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// v1.8.1 - Missing Products Table Component
const MissingProductsTable = ({ store, storeProducts, allStores }) => {
  const [sortBy, setSortBy] = useState('total'); // 'total' or 'city'
  const [minQty, setMinQty] = useState(100);
  const [showTable, setShowTable] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState(null); // Track which product's stores to show
  const expandedRef = React.useRef(null);
  
  const storeCity = (store.city || '').trim();
  
  // Count total stores in this city
  const totalStoresInCity = useMemo(() => {
    if (!allStores) return 0;
    return allStores.filter(s => (s.city || '').trim() === storeCity && s.id !== store.id && !s.is_inactive).length;
  }, [allStores, storeCity, store.id]);
  
  const missingProducts = useMemo(() => {
    // IDs של מוצרים שהחנות כבר מוכרת
    const storeProductIds = new Set(storeProducts.map(p => p.id));
    
    // כל המוצרים שהחנות לא מוכרת
    const missing = PRODUCTS_RAW.filter(p => !storeProductIds.has(p.id) && !p.is_inactive);
    
    return missing.map(product => {
      // כמות בעיר - מהחנויות שמוכרות את המוצר באותה עיר
      const productStores = PRODUCT_STORES[String(product.id)] || [];
      const cityStores = productStores.filter(s => (s.city || '').trim() === storeCity && s.id !== store.id);
      const cityQty = cityStores.reduce((sum, s) => sum + (s.qty_2025 || 0), 0);
      const cityStoreCount = cityStores.length;
      
      return {
        ...product,
        city_qty: cityQty,
        city_store_count: cityStoreCount,
        city_stores: cityStores, // Store the actual stores for display
        total_qty: product.qty_2025 || 0
      };
    }).filter(p => p.total_qty >= minQty || p.city_qty >= minQty);
  }, [store, storeProducts, minQty, storeCity]);
  
  const sortedProducts = useMemo(() => {
    return [...missingProducts].sort((a, b) => {
      if (sortBy === 'city') {
        return (b.city_qty || 0) - (a.city_qty || 0);
      }
      return (b.total_qty || 0) - (a.total_qty || 0);
    });
  }, [missingProducts, sortBy]);
  
  // Get expanded product data
  const expandedProductData = useMemo(() => {
    if (!expandedProduct) return null;
    return sortedProducts.find(p => p.id === expandedProduct);
  }, [expandedProduct, sortedProducts]);
  
  // Scroll to expanded section when it opens
  React.useEffect(() => {
    if (expandedProduct && expandedRef.current) {
      setTimeout(() => {
        expandedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [expandedProduct]);
  
  const cols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div className="min-w-[120px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'total_qty', l: 'כמות כללית\n(כל החברה)', r: v => <span className="font-bold text-blue-600">{fmt(v)}</span> },
    { k: 'city_qty', l: `כמות בעיר\n(${storeCity || 'לא ידוע'})`, r: (v, r) => (
      <div className="text-center">
        {r.city_store_count > 0 ? (
          <button 
            onClick={(e) => { e.stopPropagation(); setExpandedProduct(expandedProduct === r.id ? null : r.id); }}
            className="group cursor-pointer"
          >
            <span className="font-bold text-emerald-600 group-hover:underline">{fmt(v)}</span>
            <p className="text-xs text-gray-500">
              <span className="text-emerald-600 font-medium">{r.city_store_count}</span> מתוך {totalStoresInCity} חנויות 👆
            </p>
          </button>
        ) : (
          <span className="font-bold text-gray-400">{fmt(v)}</span>
        )}
      </div>
    )},
  ];
  
  if (missingProducts.length === 0) return null;
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-200">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔍</span>
          <h3 className="text-lg font-bold text-orange-700">מוצרים שהחנות לא מוכרת</h3>
          <span className="text-sm text-gray-500">({sortedProducts.length})</span>
        </div>
        <button 
          onClick={() => setShowTable(!showTable)} 
          className="text-sm text-orange-600 hover:text-orange-800 bg-orange-50 px-3 py-1.5 rounded-lg"
        >
          {showTable ? 'הסתר' : 'הצג'} טבלה
        </button>
      </div>
      
      {showTable && (
        <>
          <div className="flex flex-wrap gap-3 items-center mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">מיין לפי:</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)} 
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
                <option value="total">כמות כללית (כל החברה)</option>
                <option value="city">כמות בעיר ({store.city || 'לא ידוע'})</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">מינימום כמות:</label>
              <input 
                type="number" 
                value={minQty} 
                onChange={e => setMinQty(Number(e.target.value) || 0)} 
                className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" 
              />
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3 mb-4 text-sm text-orange-800">
            💡 <strong>הזדמנות למכירה:</strong> מוצרים אלו נמכרים טוב בחנויות אחרות אבל החנות הזו לא מקבלת אותם. לחץ על מספר הכמות בעיר לצפייה בחנויות.
          </div>
          
          <Table data={sortedProducts} cols={cols} name={'store_' + store.id + '_missing'} compact />
          
          {/* Expanded stores popup */}
          {expandedProductData && expandedProductData.city_stores && expandedProductData.city_stores.length > 0 && (
            <div ref={expandedRef} className="mt-4 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏪</span>
                  <h4 className="font-bold text-emerald-800">
                    חנויות ב{storeCity} שמוכרות "{expandedProductData.name}"
                  </h4>
                </div>
                <button 
                  onClick={() => setExpandedProduct(null)}
                  className="text-emerald-600 hover:text-emerald-800 text-sm bg-emerald-100 px-2 py-1 rounded"
                >
                  ✕ סגור
                </button>
              </div>
              
              {/* Summary stats */}
              <div className="bg-emerald-100 rounded-lg p-3 mb-4 flex flex-wrap gap-4 items-center text-sm">
                <div>
                  <span className="text-emerald-700">סה"כ חנויות בעיר: </span>
                  <span className="font-bold text-emerald-800">{totalStoresInCity}</span>
                </div>
                <div>
                  <span className="text-emerald-700">מוכרות את המוצר: </span>
                  <span className="font-bold text-emerald-800">{expandedProductData.city_store_count}</span>
                </div>
                <div>
                  <span className="text-emerald-700">סה"כ נמכר בעיר: </span>
                  <span className="font-bold text-emerald-800">{fmt(expandedProductData.city_qty)}</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-100 text-emerald-800">
                      <th className="text-right py-2 px-3 font-semibold">חנות</th>
                      <th className="text-center py-2 px-3 font-semibold">כמות שנתית 2025</th>
                      <th className="text-center py-2 px-3 font-semibold">ממוצע לחודש</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...expandedProductData.city_stores]
                      .sort((a, b) => (b.qty_2025 || 0) - (a.qty_2025 || 0))
                      .map((s, idx) => {
                        const monthlyAvg = (s.qty_2025 || 0) / 12;
                        return (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                            <td className="py-2 px-3 font-medium">{s.name}</td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-600">{fmt(s.qty_2025 || 0)}</td>
                            <td className="py-2 px-3 text-center text-gray-600">{fmt(Math.round(monthlyAvg))}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-200 font-bold">
                      <td className="py-2 px-3">סה"כ</td>
                      <td className="py-2 px-3 text-center text-emerald-700">{fmt(expandedProductData.city_qty)}</td>
                      <td className="py-2 px-3 text-center text-gray-700">{fmt(Math.round(expandedProductData.city_qty / 12))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
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
        {opts.map(o => <label key={o} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"><input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="rounded" /><span className="text-sm truncate">{o}</span></label>)}
      </div>}
    </div>
  );
};

const MetricCell = ({ pct, from, to }) => (<div className="text-center"><span className={`font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(pct)}</span><p className="text-xs text-gray-400">{fmt(from)}→{fmt(to)}</p></div>);
const ReturnsCell = ({ pctL6, pctP6, change }) => (<div className="text-center"><span className="text-sm">{(pctP6 || 0).toFixed(1)}%→{(pctL6 || 0).toFixed(1)}%</span><p className={`text-xs font-bold ${change > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{change > 0 ? '+' : ''}{(change || 0).toFixed(1)}%</p></div>);
const PeakCell = ({ pct, peak, current }) => (<div className="text-center"><span className={`font-bold ${pct >= -20 ? 'text-emerald-600' : pct >= -40 ? 'text-orange-500' : 'text-red-600'}`}>{fmtPct(pct)}</span><p className="text-xs text-gray-400">שיא(4): {fmt(peak)} | דצמ: {fmt(current)}</p></div>);

const exportPDF = title => { document.title = title; window.print(); };
const exportCSV = (data, columns, filename) => {
  const header = columns.map(c => c.l.replace(/\n/g, ' ')).join(',');
  const rows = data.map(r => columns.map(c => { const val = r[c.k]; return typeof val === 'string' && val.includes(',') ? '"' + val + '"' : (val ?? ''); }).join(','));
  const blob = new Blob(['\ufeff' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click();
};

// Table with sticky first column, 100 rows, and improved horizontal scroll
// v1.8.8 - Added support for controlled search/page from parent
const Table = ({ data, cols, onRow, name = 'data', compact = false, defaultSort = 'qty_total', search: controlledSearch, onSearchChange, page: controlledPage, onPageChange, summaryRow = null, periodSelector = null }) => {
  const [internalSort, setInternalSort] = useState({ k: defaultSort, d: 'desc' });
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const scrollRef = React.useRef(null);
  
  // Use controlled values if provided, otherwise use internal state
  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const page = controlledPage !== undefined ? controlledPage : internalPage;
  const sort = internalSort;
  
  const handleSearchChange = (value) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
      setInternalPage(1);
    }
  };
  
  const handlePageChange = (value) => {
    if (onPageChange) {
      onPageChange(value);
    } else {
      setInternalPage(value);
    }
  };
  
  const perPage = 100;
  const filtered = useMemo(() => {
    let r = data.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(search.toLowerCase())));
    if (sort.k) r.sort((a, b) => { const av = a[sort.k], bv = b[sort.k]; return av < bv ? (sort.d === 'asc' ? -1 : 1) : av > bv ? (sort.d === 'asc' ? 1 : -1) : 0; });
    return r;
  }, [data, sort, search]);
  const pages = Math.ceil(filtered.length / perPage);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);
  
  const scrollLeft = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' }); };
  const scrollRight = () => { if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' }); };
  
  return (<div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden w-full">
    <div className="p-3 border-b flex flex-wrap gap-2 items-center justify-between print:hidden">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative flex-1 min-w-48"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="חיפוש..." value={search} onChange={e => handleSearchChange(e.target.value)} className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm" /></div>
        {periodSelector && <div className="flex items-center gap-2"><span className="text-sm text-gray-600">תקופה:</span>{periodSelector}</div>}
      </div>
      <button onClick={() => exportCSV(filtered, cols, name)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button>
    </div>
    {/* Scroll arrows for mobile - outside the scroll container */}
    <div className="relative">
      <button onClick={scrollRight} className="lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-30 bg-blue-500 shadow-lg rounded-full p-2 hover:bg-blue-600">
        <ChevronLeft size={24} className="text-white" />
      </button>
      <button onClick={scrollLeft} className="lg:hidden absolute left-1 top-1/2 -translate-y-1/2 z-30 bg-blue-500 shadow-lg rounded-full p-2 hover:bg-blue-600">
        <ChevronRight size={24} className="text-white" />
      </button>
      <div ref={scrollRef} className="overflow-x-auto max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full min-w-max main-table">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>{cols.map((c, idx) => <th key={c.k} onClick={() => setInternalSort(p => ({ k: c.k, d: p.k === c.k && p.d === 'desc' ? 'asc' : 'desc' }))} className={`px-3 py-3 text-right text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-pre-line bg-gray-50 ${idx === 0 ? 'sticky right-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''}`}><span className="flex items-center gap-1">{c.t && <Tip text={c.t} />}{c.l}{sort.k === c.k && <span className="text-blue-500 mr-1">{sort.d === 'asc' ? '↑' : '↓'}</span>}</span></th>)}</tr>
            {/* Summary Row */}
            {summaryRow && (
              <tr className="bg-blue-50 border-b-2 border-blue-200">
                {summaryRow.map((cell, idx) => (
                  <td key={idx} className={`px-3 py-2 text-sm font-bold ${idx === 0 ? 'sticky right-0 z-30 bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''} ${cell.className || ''}`}>
                    {cell.value}
                  </td>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y">{rows.map((r, i) => <tr key={r.id || i} onClick={() => onRow && onRow(r)} className={'hover:bg-blue-50 ' + (onRow ? 'cursor-pointer' : '')}>{cols.map((c, idx) => <td key={c.k} className={`px-3 text-sm ${idx === 0 ? 'sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] max-w-[140px] sm:max-w-none' : 'whitespace-nowrap'} ${compact ? 'py-2' : 'py-3'}`}>{c.r ? c.r(r[c.k], r) : r[c.k]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-sm print:hidden">
      <span>{filtered.length} רשומות</span>
      <div className="flex gap-2"><button onClick={() => handlePageChange(Math.max(1, page-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">הקודם</button><span>{page}/{pages || 1}</span><button onClick={() => handlePageChange(Math.min(pages, page+1))} disabled={page === pages} className="px-3 py-1 border rounded disabled:opacity-50">הבא</button></div>
    </div>
  </div>)
};

const Overview = ({ stores, products, onNav, onDrillDown }) => {
  const [selectedCity, setSelectedCity] = useState(null);
  
  const st = useMemo(() => {
    // v1.8.9 - stores is already filtered for active only
    const active = stores;
    const q24 = stores.reduce((s, x) => s + (x.qty_2024 || 0), 0);
    const q25 = stores.reduce((s, x) => s + (x.qty_2025 || 0), 0);
    const ql6 = stores.reduce((s, x) => s + (x.qty_last6 || 0), 0);
    const qp6 = stores.reduce((s, x) => s + (x.qty_prev6 || 0), 0);
    const s24 = stores.reduce((s, x) => s + (x.sales_2024 || 0), 0);
    const s25 = stores.reduce((s, x) => s + (x.sales_2025 || 0), 0);
    
    // v1.8.9 - Calculate H1/H2 sales from monthly_sales
    const h1Months = ['202501', '202502', '202503', '202504', '202505', '202506'];
    const h2Months = ['202507', '202508', '202509', '202510', '202511', '202512'];
    let sl6 = 0, sp6 = 0;
    stores.forEach(x => {
      if (x.monthly_sales) {
        h1Months.forEach(m => { sp6 += x.monthly_sales[m] || 0; });
        h2Months.forEach(m => { sl6 += x.monthly_sales[m] || 0; });
      }
    });
    
    const yoy_qty = q24 > 0 ? ((q25 - q24) / q24) * 100 : 0;
    const yoy_sales = s24 > 0 ? ((s25 - s24) / s24) * 100 : 0;
    const hoh_qty = qp6 > 0 ? ((ql6 - qp6) / qp6) * 100 : 0;
    const hoh_sales = sp6 > 0 ? ((sl6 - sp6) / sp6) * 100 : 0;
    // Long term status counts
    const scLong = {}; stores.forEach(s => { const st = s.status_long || 'יציב'; scLong[st] = (scLong[st] || 0) + 1; });
    // Short term status counts
    const scShort = {}; stores.forEach(s => { const st = s.status_short || 'יציב'; scShort[st] = (scShort[st] || 0) + 1; });
    const top = [...stores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 20);
    const bot = [...active].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0)).slice(0, 20);
    const alerts = stores.filter(s => s.status_long === 'התרסקות' || s.status_long === 'ירידה').length;
    
    // v1.7 - Fallback count
    const fallbackCount = stores.filter(s => s.is_fallback).length;
    
    // v1.4 - City sales breakdown (H2 - last 6 months)
    const cityData = {};
    stores.forEach(s => {
      if (s.city) {
        if (!cityData[s.city]) cityData[s.city] = { name: s.city, qty_h2: 0, qty_h1: 0, count: 0 };
        cityData[s.city].qty_h2 += s.qty_last6 || 0;
        cityData[s.city].qty_h1 += s.qty_prev6 || 0;
        cityData[s.city].count++;
      }
    });
    const citySales = Object.values(cityData)
      .map(c => ({ ...c, change: c.qty_h1 > 0 ? ((c.qty_h2 - c.qty_h1) / c.qty_h1) * 100 : 0 }))
      .sort((a, b) => b.qty_h2 - a.qty_h2)
      .slice(0, 10);
    
    return { active: active.length, total: stores.length, q24, q25, ql6, qp6, s24, s25, sl6, sp6, yoy_qty, yoy_sales, hoh_qty, hoh_sales, scLong, scShort, top, bot, alerts, citySales, fallbackCount };
  }, [stores]);
  
  // Colors for 5 statuses - v1.10.7 more distinct colors
  const STATUS_COLORS = { 
    'עליה חדה': '#7c3aed',  // Purple - very distinct
    'צמיחה': '#10b981',      // Emerald green
    'יציב': '#3b82f6',       // Blue
    'ירידה': '#f59e0b',      // Amber/Orange
    'התרסקות': '#ef4444'     // Red
  };
  const pieLong = Object.entries(st.scLong).map(([n, v]) => ({ name: n, value: v, color: STATUS_COLORS[n] || '#6b7280' }));
  
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; }); }); return Object.entries(m).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  
  // Custom label for pie
  const renderLabel = ({ name, percent, cx, x, y }) => {
    return <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">{name} {(percent*100).toFixed(0)}%</text>;
  };
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">סקירה כללית</h2><button onClick={() => exportPDF('סקירה כללית - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card title="חנויות פעילות" value={fmt(st.total)} sub="מוצגות בנתונים" icon={Store} color="blue" />
      <Card title="סה״כ כמות (2024-2025)" value={fmt(st.q24 + st.q25)} trend={st.yoy_qty} icon={TrendingUp} color="green" />
      <Card title="מוצרים פעילים" value={products.filter(p => !p.is_inactive).length} sub={'מתוך ' + products.length} icon={Package} color="purple" />
      <div 
        onClick={() => onDrillDown && onDrillDown({ type: 'alerts' })}
        className="bg-white rounded-2xl shadow-lg p-4 border border-red-200 hover:border-red-400 cursor-pointer transition-colors"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm">התראות</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{st.alerts}</p>
            <p className="text-gray-400 text-xs mt-1">דורשות טיפול</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>
      <div 
        onClick={() => onDrillDown && onDrillDown({ type: 'fallback' })}
        className="bg-white rounded-2xl shadow-lg p-4 border border-yellow-200 hover:border-yellow-400 cursor-pointer transition-colors"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm">⚠️ סטטוס מגיבוי</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{st.fallbackCount}</p>
            <p className="text-gray-400 text-xs mt-1">חנויות</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה שנתית: 2024 ↔ 2025</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2024</p><p className="text-xl font-bold text-blue-600">{fmt(st.q24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות 2025</p><p className="text-xl font-bold text-emerald-600">{fmt(st.q25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2024</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.s24)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור 2025</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.s25)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.yoy_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.yoy_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.yoy_sales)}</p></div>
      </div>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">השוואה חצי שנתית: H1 ↔ H2 2025</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">כמות H1</p><p className="text-xl font-bold text-blue-600">{fmt(st.qp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">כמות H2</p><p className="text-xl font-bold text-emerald-600">{fmt(st.ql6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_qty >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_qty >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_qty)}</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H1</p><p className="text-xl font-bold text-blue-600">₪{fmt(st.sp6)}</p></div>
        <div className="text-center p-4 bg-emerald-50 rounded-xl"><p className="text-sm text-gray-600">מחזור H2</p><p className="text-xl font-bold text-emerald-600">₪{fmt(st.sl6)}</p></div>
        <div className={'text-center p-4 rounded-xl ' + (st.hoh_sales >= 0 ? 'bg-emerald-50' : 'bg-red-50')}><p className="text-sm text-gray-600">שינוי</p><p className={'text-xl font-bold ' + (st.hoh_sales >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtPct(st.hoh_sales)}</p></div>
      </div>
    </div>
    
    {/* Monthly Sales Table and Chart */}
    <MonthlySalesChart data={stores} title="מכירות חודשיות - כל החנויות" />
    
    {/* Single status pie chart with 5 statuses */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2">📊 התפלגות סטטוסים</h3>
      <p className="text-xs text-gray-500 mb-4">מבוסס על מערכת חוקים (12v12, 6v6, 3v3) - לחץ על חלק בעוגה לצפייה בחנויות</p>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie 
              data={pieLong} 
              cx="50%" 
              cy="50%" 
              innerRadius={50} 
              outerRadius={90} 
              dataKey="value" 
              label={renderLabel} 
              labelLine={true}
              style={{ cursor: 'pointer' }}
              onClick={(data) => onDrillDown && onDrillDown({ type: 'status_long', value: data.name })}
            >
              {pieLong.map((e, i) => <Cell key={i} fill={e.color} style={{ cursor: 'pointer' }} />)}
            </Pie>
            <Tooltip formatter={v => fmt(v) + ' חנויות'} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap lg:flex-col justify-center gap-2">
          {pieLong.map(p => (
            <div 
              key={p.name} 
              onClick={() => onDrillDown && onDrillDown({ type: 'status_long', value: p.name })} 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors border"
            >
              <div className="w-4 h-4 rounded-full" style={{backgroundColor: p.color}}></div>
              <span className="text-sm font-medium">{p.name}</span>
              <span className="text-sm text-gray-500">({p.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={trend}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => (v/1000).toFixed(0) + 'K'} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cg)" /></AreaChart></ResponsiveContainer></div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">🏆 20 מובילות</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.top.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-sm">{fmt(s.qty_total)}</p></div></div>)}</div></div>
      <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">📉 20 בירידה</h3><div className="space-y-2 max-h-80 overflow-y-auto">{st.bot.map((s, i) => <div key={s.id} onClick={() => onNav('store', s)} className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer"><div className="flex items-center gap-3"><span className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full text-xs font-bold">{i+1}</span><div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-500">{s.city}</p></div></div><div className="text-left"><p className="font-bold text-red-600 text-sm">{fmtPct(s.metric_12v12)}</p><p className="text-xs text-gray-500">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</p></div></div>)}</div></div>
    </div>
    
    {/* v1.4 - City Sales H2 */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2">🏙️ מכירות לפי ערים</h3>
      <p className="text-xs text-gray-500 mb-4">H2 2025 (יול-דצמ) | לחץ על עיר להשוואה מפורטת</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {st.citySales.map((city, i) => (
          <div 
            key={city.name} 
            onClick={() => setSelectedCity(city.name)}
            className="bg-gray-50 rounded-xl p-3 hover:bg-blue-50 cursor-pointer transition-colors border hover:border-blue-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 flex items-center justify-center bg-teal-500 text-white rounded text-xs font-bold">{i+1}</span>
              <span className="font-medium text-sm truncate">{city.name}</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{fmt(city.qty_h2)}</p>
            <p className={`text-xs font-medium ${city.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {city.change >= 0 ? '↑' : '↓'} {fmtPct(city.change)} מ-H1
            </p>
            <p className="text-xs text-gray-400">{city.count} חנויות</p>
          </div>
        ))}
      </div>
    </div>
    
    {/* City Comparison Modal */}
    {selectedCity && (
      <CityComparisonModal 
        city={selectedCity}
        stores={stores.filter(s => (s.city || '').trim() === selectedCity)}
        currentStoreId={null}
        onClose={() => setSelectedCity(null)}
        onSelectStore={(store) => { setSelectedCity(null); onNav('store', store); }}
      />
    )}
  </div>);
};

const StoresList = ({ stores, onSelect, filters, onFiltersChange }) => {
  // v1.8.8 - Use controlled filters from parent for history preservation
  const { cities, networks, drivers, agents, statusesLong, statusesShort, minQty, fallbackFilter, search: tableSearch, page: tablePage } = filters;
  const [showF, setShowF] = useState(cities.length > 0 || networks.length > 0 || drivers.length > 0 || agents.length > 0 || statusesLong.length > 0 || statusesShort.length > 0 || fallbackFilter !== 'all');
  
  // v1.10.7 - Table view tabs and comparison
  const [tableView, setTableView] = useState('metrics'); // 'metrics' or 'data'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [compSearchTerm, setCompSearchTerm] = useState('');
  
  // v1.10.8 - Period selection for data tables
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const [compDataPeriod, setCompDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  // Helper to update a single filter
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value, page: key !== 'page' ? 1 : value });
  };
  
  const filtered = useMemo(() => stores.filter(s => {
    if (cities.length && !cities.includes(s.city)) return false;
    if (networks.length && !networks.includes(s.network)) return false;
    if (drivers.length && !drivers.includes(s.driver)) return false;
    if (agents.length && !agents.includes(s.agent)) return false;
    if (statusesLong.length && !statusesLong.includes(s.status_long)) return false;
    if (statusesShort.length && !statusesShort.includes(s.status_short)) return false;
    if (minQty > 0 && (s.qty_2025 || 0) < minQty) return false;
    if (fallbackFilter === 'fallback' && !s.is_fallback) return false;
    if (fallbackFilter === 'regular' && s.is_fallback) return false;
    return true;
  }), [stores, cities, networks, drivers, agents, statusesLong, statusesShort, minQty, fallbackFilter]);
  
  // v1.10.8 - Calculate data for main table based on selected period
  const storesWithData = useMemo(() => filtered.map(s => calcStoreDataForPeriod(s, dataPeriod)), [filtered, dataPeriod]);
  
  // v1.10.8 - Calculate data for comparison modal based on its period
  const storesWithCompData = useMemo(() => stores.map(s => calcStoreDataForPeriod(s, compDataPeriod)), [stores, compDataPeriod]);
  
  // Calculate summary values
  const summaryData = useMemo(() => {
    const count = filtered.length;
    if (count === 0) return null;
    const avg12v12 = filtered.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / count;
    const avg3v3 = filtered.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / count;
    const avg6v6 = filtered.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / count;
    const avg2v2 = filtered.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / count;
    const avgPeak = filtered.reduce((s, x) => s + (x.metric_peak_distance || 0), 0) / count;
    const avgReturns = filtered.reduce((s, x) => s + (x.returns_pct_last6 || 0), 0) / count;
    const totalQty = filtered.reduce((s, x) => s + (x.qty_total || 0), 0);
    return { count, avg12v12, avg3v3, avg6v6, avg2v2, avgPeak, avgReturns, totalQty };
  }, [filtered]);
  
  // v1.10.8 - Data table summary
  const dataSummary = useMemo(() => {
    const count = storesWithData.length;
    if (count === 0) return null;
    const totalGross = storesWithData.reduce((s, x) => s + x.period_gross, 0);
    const totalNet = storesWithData.reduce((s, x) => s + x.period_net, 0);
    const totalReturns = storesWithData.reduce((s, x) => s + x.period_returns, 0);
    const totalDeliveries = storesWithData.reduce((s, x) => s + x.period_deliveries, 0);
    const avgReturnsPct = totalGross > 0 ? (totalReturns / totalGross * 100) : 0;
    const avgPerDelivery = totalDeliveries > 0 ? (totalNet / totalDeliveries) : 0;
    return { count, totalGross, totalNet, totalReturns, totalDeliveries, avgReturnsPct, avgPerDelivery };
  }, [storesWithData]);
  
  // Toggle store selection
  const toggleSelect = (id, e) => {
    e && e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Search for comparison
  const compSearchResults = compSearchTerm.length >= 2 
    ? stores.filter(s => s.name.toLowerCase().includes(compSearchTerm.toLowerCase()) || s.city?.toLowerCase().includes(compSearchTerm.toLowerCase())).slice(0, 15)
    : [];
  
  const selectedStores = stores.filter(s => selectedIds.has(s.id));
  
  // Metrics columns
  const metricsCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-blue-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'חנות', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'status_long', l: 'סטטוס\nארוך', r: (v, r) => <LongTermBadge status={r.status_long || 'יציב'} isFallback={r.is_fallback} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_3v3', l: '3 חודשים\n24→25', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_6v6', l: '6 חודשים\nH1→H2', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_2v2', l: '2 חודשים\nספט→נוב', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'status_short', l: 'סטטוס\nקצר', r: (v, r) => <ShortTermBadge status={r.status_short || 'יציב'} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  // Data columns (dynamic period)
  const dataCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-purple-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'חנות', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'period_gross', l: 'ברוטו', r: v => <span className="font-medium text-blue-700">{fmt(v)}</span> },
    { k: 'period_net', l: 'נטו', r: v => <span className="font-medium text-green-700">{fmt(v)}</span> },
    { k: 'period_returns', l: 'חזרות', r: v => <span className="font-medium text-red-600">{fmt(v)}</span> },
    { k: 'period_returns_pct', l: 'חזרות\n%', r: v => <span className={v > 20 ? 'text-red-600 font-bold' : v > 10 ? 'text-blue-600' : 'text-gray-600'}>{(v || 0).toFixed(1)}%</span> },
    { k: 'period_deliveries', l: 'אספקות', r: v => <span className="font-medium text-violet-700">{fmt(v)}</span> },
    { k: 'period_avg_per_delivery', l: 'ממוצע\nלאספקה', r: v => <span className="font-medium text-blue-700">{fmt(Math.round(v || 0))}</span> },
  ];
  
  // Build summary rows
  const metricsSummaryRow = summaryData ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-blue-700">Σ סה״כ {summaryData.count} חנויות</span>, className: 'text-right' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className={summaryData.avg12v12 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg12v12)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg3v3 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg3v3)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg6v6 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg6v6)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg2v2 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg2v2)}</span>, className: 'text-center' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className="text-red-600">{fmtPct(summaryData.avgPeak)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avgReturns > 15 ? 'text-red-600' : 'text-gray-700'}>{summaryData.avgReturns.toFixed(1)}%</span>, className: 'text-center' },
    { value: <span className="font-bold text-blue-700">{fmt(summaryData.totalQty)}</span>, className: 'text-center' },
  ] : null;
  
  const dataSummaryRow = dataSummary ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-blue-700">Σ סה״כ {dataSummary.count} חנויות</span>, className: 'text-right' },
    { value: <span className="font-bold text-blue-700">{fmt(dataSummary.totalGross)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-green-700">{fmt(dataSummary.totalNet)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-red-600">{fmt(dataSummary.totalReturns)}</span>, className: 'text-center' },
    { value: <span className={dataSummary.avgReturnsPct > 15 ? 'text-red-600 font-bold' : 'text-gray-700'}>{dataSummary.avgReturnsPct.toFixed(1)}%</span>, className: 'text-center' },
    { value: <span className="font-bold text-violet-700">{fmt(dataSummary.totalDeliveries)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-blue-700">{fmt(Math.round(dataSummary.avgPerDelivery))}</span>, className: 'text-center' },
  ] : null;
  
  // Export functions
  const exportMetricsCSV = () => {
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' }, { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'metric_12v12', l: 'שנתי %' }, { k: 'metric_3v3', l: '3 חודשים %' }, { k: 'metric_6v6', l: '6 חודשים %' }, { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' }, { k: 'metric_peak_distance', l: 'מרחק מהשיא %' }, { k: 'returns_pct_last6', l: 'חזרות %' }, { k: 'qty_total', l: 'כמות' },
    ];
    exportCSV(filtered, cols, 'חנויות_מדדים');
  };
  
  const exportDataCSV = () => {
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' },
      { k: 'period_gross', l: 'ברוטו' }, { k: 'period_net', l: 'נטו' }, { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' }, { k: 'period_deliveries', l: 'אספקות' }, { k: 'period_avg_per_delivery', l: 'ממוצע לאספקה' },
    ];
    exportCSV(storesWithData, cols, `חנויות_נתונים_${periodLabel}`);
  };
  
  return (<div className="space-y-4 w-full">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-xl font-bold">חנויות ({filtered.length})</h2>
      <div className="flex gap-2 print:hidden">
        {selectedIds.size > 0 && (
          <button onClick={() => setShowComparison(true)} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600">
            <BarChart3 size={16} />השווה ({selectedIds.size})
          </button>
        )}
        <button onClick={() => exportPDF('חנויות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
        <button onClick={tableView === 'metrics' ? exportMetricsCSV : exportDataCSV} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button>
        <button onClick={() => setShowF(!showF)} className={'flex items-center gap-2 px-4 py-2 rounded-xl ' + (showF ? 'bg-blue-500 text-white' : 'bg-gray-100')}><Filter size={18}/>סינון</button>
      </div>
    </div>
    
    {/* v1.10.7 - Table View Tabs */}
    <div className="flex gap-2 print:hidden">
      <button 
        onClick={() => setTableView('metrics')}
        className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'metrics' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
      >
        📊 מדדים
      </button>
      <button 
        onClick={() => setTableView('data')}
        className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'data' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
      >
        📈 נתונים (H2)
      </button>
      {selectedIds.size > 0 && (
        <button onClick={clearSelection} className="mr-auto text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
          <X size={14} /> נקה בחירה ({selectedIds.size})
        </button>
      )}
    </div>
    
    {showF && <div className="bg-white rounded-xl shadow p-4 print:hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MultiSelect label="עיר" opts={FILTERS.cities || []} selected={cities} onChange={(v) => updateFilter('cities', v)} />
        <MultiSelect label="רשת" opts={FILTERS.networks || []} selected={networks} onChange={(v) => updateFilter('networks', v)} />
        <MultiSelect label="נהג" opts={FILTERS.drivers || []} selected={drivers} onChange={(v) => updateFilter('drivers', v)} />
        <MultiSelect label="סוכן" opts={FILTERS.agents || []} selected={agents} onChange={(v) => updateFilter('agents', v)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MultiSelect label="סטטוס טווח ארוך" opts={['עליה חדה','צמיחה','יציב','ירידה','התרסקות']} selected={statusesLong} onChange={(v) => updateFilter('statusesLong', v)} />
        <MultiSelect label="סטטוס טווח קצר" opts={['עליה חדה','יציב','ירידה','אזעקה']} selected={statusesShort} onChange={(v) => updateFilter('statusesShort', v)} />
        <div>
          <label className="text-xs text-gray-600 block mb-1">סוג סטטוס</label>
          <select value={fallbackFilter} onChange={e => updateFilter('fallbackFilter', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="all">הכל</option>
            <option value="regular">רגיל בלבד</option>
            <option value="fallback">⚠️ גיבוי בלבד</option>
          </select>
        </div>
        <div><label className="text-xs text-gray-600 block mb-1">מינימום פריטים</label><input type="number" value={minQty || ''} onChange={e => updateFilter('minQty', Number(e.target.value) || 0)} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" /></div>
      </div>
    </div>}
    
    {/* Table based on view selection */}
    {tableView === 'metrics' ? (
      <Table data={filtered} cols={metricsCols} onRow={onSelect} name="stores_metrics" search={tableSearch} onSearchChange={(v) => updateFilter('search', v)} page={tablePage} onPageChange={(v) => updateFilter('page', v)} summaryRow={metricsSummaryRow} />
    ) : (
      <Table data={storesWithData} cols={dataCols} onRow={onSelect} name="stores_data" search={tableSearch} onSearchChange={(v) => updateFilter('search', v)} page={tablePage} onPageChange={(v) => updateFilter('page', v)} summaryRow={dataSummaryRow} periodSelector={<PeriodSelector value={dataPeriod} onChange={setDataPeriod} />} />
    )}
    
    {/* v1.10.8 - Comparison Modal - with period selector, PDF export, and numbers in metrics */}
    {showComparison && selectedIds.size > 0 && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={() => setShowComparison(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-3">
              <BarChart3 size={24} />
              <h2 className="text-lg md:text-xl font-bold">השוואת חנויות נבחרות</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} חנויות</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearSelection} className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30">נקה הכל</button>
              <button onClick={() => setShowComparison(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button>
            </div>
          </div>
          
          {/* Search to add more */}
          <div className="p-4 border-b bg-gray-50 print:hidden">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={compSearchTerm}
                  onChange={e => setCompSearchTerm(e.target.value)}
                  placeholder="הוסף חנויות... (הקלד 2 תווים לחיפוש)"
                  className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
                {compSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                    {compSearchResults.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { toggleSelect(s.id); setCompSearchTerm(''); }}
                        className={`w-full text-right px-3 py-2 hover:bg-emerald-50 flex justify-between border-b ${selectedIds.has(s.id) ? 'bg-emerald-100' : ''}`}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-gray-500">{s.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => {
                  const content = printRef.current;
                  if (!content) return;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html dir="rtl">
                    <head>
                      <title>השוואת חנויות נבחרות - Baron</title>
                      <style>
                        * { box-sizing: border-box; font-family: Arial, sans-serif; }
                        body { padding: 20px; direction: rtl; }
                        h2 { color: #1e40af; margin: 20px 0 10px; font-size: 18px; }
                        h3 { color: #6b21a8; margin: 20px 0 10px; font-size: 16px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
                        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
                        th { background: #f3f4f6; font-weight: bold; }
                        tr { page-break-inside: avoid; }
                        .text-right { text-align: right; }
                        .text-emerald { color: #059669; }
                        .text-red { color: #dc2626; }
                        .text-blue { color: #2563eb; }
                        .text-green { color: #16a34a; }
                        .text-purple { color: #7c3aed; }
                        .text-amber { color: #d97706; }
                        .summary-row { background: #dbeafe; font-weight: bold; }
                        .summary-row-data { background: #f3e8ff; font-weight: bold; }
                        .small { font-size: 9px; color: #666; }
                        @media print { 
                          @page { margin: 1cm; size: landscape; }
                          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                      </style>
                    </head>
                    <body>
                      <h1 style="text-align:center;color:#1f2937;">השוואת חנויות נבחרות - Baron</h1>
                      <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedStores.length} חנויות | ${new Date().toLocaleDateString('he-IL')}</p>
                      ${content.innerHTML}
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                }} className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                  <FileText size={16} />PDF
                </button>
                <button onClick={exportMetricsCSV} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Download size={16} />מדדים
                </button>
                <button onClick={exportDataCSV} className="flex items-center gap-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                  <Download size={16} />נתונים
                </button>
              </div>
            </div>
            {/* Selected chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedStores.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                  {s.name}
                  <button onClick={(e) => toggleSelect(s.id, e)} className="hover:text-red-600"><X size={14} /></button>
                </span>
              ))}
            </div>
          </div>
          
          {/* Tables */}
          <div ref={printRef} className="p-4 overflow-y-auto max-h-[calc(95vh-250px)] space-y-6">
            {/* Metrics Table */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2 print:text-black"><TrendingUp size={20} className="print:hidden" />מדדים</h3>
              <div className="overflow-x-auto border rounded-xl print:border-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="p-2 text-right border-b">#</th>
                      <th className="p-2 text-right border-b">חנות</th>
                      <th className="p-2 text-center border-b">סטטוס ארוך</th>
                      <th className="p-2 text-center border-b">שנתי<br/>24→25</th>
                      <th className="p-2 text-center border-b">3 חודשים<br/>24→25</th>
                      <th className="p-2 text-center border-b">6 חודשים<br/>H1→H2</th>
                      <th className="p-2 text-center border-b">2 חודשים<br/>ספט→נוב</th>
                      <th className="p-2 text-center border-b">סטטוס קצר</th>
                      <th className="p-2 text-center border-b">כמות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedStores].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((s, i) => (
                      <tr key={s.id} onClick={() => { setShowComparison(false); onSelect(s); }} className="hover:bg-blue-50 cursor-pointer border-b">
                        <td className="p-2 font-bold text-center">{i + 1}</td>
                        <td className="p-2 text-right"><div className="font-medium">{s.name}</div><div className="text-xs text-gray-500 small">{s.city}</div></td>
                        <td className="p-2 text-center"><LongTermBadge status={s.status_long || 'יציב'} sm /></td>
                        <td className="p-2 text-center">
                          <div className={`font-medium ${(s.metric_12v12 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_12v12)}</div>
                          <div className="text-xs text-gray-400 small">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</div>
                        </td>
                        <td className="p-2 text-center">
                          <div className={`${(s.metric_3v3 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_3v3)}</div>
                          <div className="text-xs text-gray-400 small">{fmt(s.qty_prev3)}→{fmt(s.qty_last3)}</div>
                        </td>
                        <td className="p-2 text-center">
                          <div className={`${(s.metric_6v6 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_6v6)}</div>
                          <div className="text-xs text-gray-400 small">{fmt(s.qty_prev6)}→{fmt(s.qty_last6)}</div>
                        </td>
                        <td className="p-2 text-center">
                          <div className={`${(s.metric_2v2 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_2v2)}</div>
                          <div className="text-xs text-gray-400 small">{fmt(s.qty_prev2)}→{fmt(s.qty_last2)}</div>
                        </td>
                        <td className="p-2 text-center"><ShortTermBadge status={s.status_short || 'יציב'} sm /></td>
                        <td className="p-2 text-center font-bold">{fmt(s.qty_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Data Table */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2 print:text-black"><BarChart3 size={20} className="print:hidden" />נתונים</h3>
                <PeriodSelector value={compDataPeriod} onChange={setCompDataPeriod} className="print:hidden" />
                <span className="hidden print:inline text-sm text-gray-500">({getPeriodLabel(compDataPeriod)})</span>
              </div>
              <div className="overflow-x-auto border rounded-xl print:border-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50">
                      <th className="p-2 text-right border-b">#</th>
                      <th className="p-2 text-right border-b">חנות</th>
                      <th className="p-2 text-center border-b bg-blue-50">ברוטו</th>
                      <th className="p-2 text-center border-b bg-green-50">נטו</th>
                      <th className="p-2 text-center border-b bg-red-50">חזרות</th>
                      <th className="p-2 text-center border-b bg-red-50">חזרות %</th>
                      <th className="p-2 text-center border-b bg-violet-50">אספקות</th>
                      <th className="p-2 text-center border-b bg-blue-50">ממוצע/אספקה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStores.map((s, idx) => {
                      const data = storesWithCompData.find(x => x.id === s.id) || s;
                      const returnsPctColor = (data.period_returns_pct || 0) > 20 ? 'text-red-600 font-bold' : (data.period_returns_pct || 0) > 10 ? 'text-blue-600' : 'text-gray-600';
                      return (
                        <tr key={s.id} onClick={() => { setShowComparison(false); onSelect(s); }} className="hover:bg-purple-50 cursor-pointer border-b">
                          <td className="p-2 font-bold text-center">{idx + 1}</td>
                          <td className="p-2 text-right"><div className="font-medium">{s.name}</div><div className="text-xs text-gray-500 small">{s.city}</div></td>
                          <td className="p-2 text-center text-blue text-blue-700 font-medium">{fmt(data.period_gross || 0)}</td>
                          <td className="p-2 text-center text-green text-green-700 font-medium">{fmt(data.period_net || 0)}</td>
                          <td className="p-2 text-center text-red text-red-600 font-medium">{fmt(data.period_returns || 0)}</td>
                          <td className={`p-2 text-center ${returnsPctColor}`}>{(data.period_returns_pct || 0).toFixed(1)}%</td>
                          <td className="p-2 text-center text-purple text-violet-700 font-medium">{fmt(data.period_deliveries || 0)}</td>
                          <td className="p-2 text-center text-amber text-blue-700 font-medium">{fmt(Math.round(data.period_avg_per_delivery || 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>);
};

// City Comparison Modal - reusable component
// v1.10.8 - City Comparison Modal - updated with period selector, PDF, and numbers in metrics
const CityComparisonModal = ({ city, stores, currentStoreId, onClose, onSelectStore }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  if (!stores || stores.length === 0) return null;
  
  // Calculate data for each store based on selected period
  const storesWithData = useMemo(() => stores.map(s => calcStoreDataForPeriod(s, dataPeriod)), [stores, dataPeriod]);
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const removeSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Filter stores by search term
  const filteredStores = storesWithData.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Check if a store should be visible based on selection
  const isVisible = (id) => selectedIds.size === 0 || selectedIds.has(id);
  
  // Filtered stores for display in tables
  const visibleStores = storesWithData.filter(s => isVisible(s.id));
  
  // Get selected stores for display
  const selectedStores = storesWithData.filter(s => selectedIds.has(s.id));
  
  // v1.10.8 - PDF export
  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת חנויות ב${city} - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #1e40af; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #6b21a8; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .text-amber { color: #d97706; }
          .summary-row { background: #dbeafe; font-weight: bold; }
          .summary-row-data { background: #f3e8ff; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          .current-store { background: #eff6ff; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת חנויות ב${city} - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${visibleStores.length} חנויות | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export functions
  const exportCityMetricsToCSV = () => {
    const cols = [
      { k: 'name', l: 'חנות' },
      { k: 'city', l: 'עיר' },
      { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' },
      { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' },
      { k: 'qty_prev3', l: '3 חודשים קודם' },
      { k: 'qty_last3', l: '3 חודשים אחרון' },
      { k: 'metric_3v3', l: '3 חודשים %' },
      { k: 'metric_6v6', l: '6 חודשים %' },
      { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(visibleStores, cols, `השוואת_${city}_מדדים`);
  };
  
  const exportCityDataToCSV = () => {
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'חנות' },
      { k: 'city', l: 'עיר' },
      { k: 'period_gross', l: 'ברוטו' },
      { k: 'period_net', l: 'נטו' },
      { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
      { k: 'period_deliveries', l: 'אספקות' },
      { k: 'period_avg_per_delivery', l: 'ממוצע לאספקה' },
    ];
    exportCSV(visibleStores, cols, `השוואת_${city}_${periodLabel}`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <MapPin size={24} />
            <h2 className="text-lg md:text-xl font-bold">השוואת חנויות ב{city}</h2>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{stores.length} חנויות</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="overflow-auto max-h-[calc(95vh-80px)] p-3 md:p-5 space-y-6">
          {/* Collapsible Selection Panel */}
          <div className="bg-gray-50 rounded-xl border print:hidden">
            {/* Panel Header - Always Visible */}
            <button 
              onClick={() => setPanelOpen(!panelOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-blue-600" />
                <span className="font-bold text-gray-700">בחר חנויות להשוואה</span>
                {selectedIds.size > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{selectedIds.size} נבחרו</span>
                )}
              </div>
              <ChevronDown size={20} className={`text-gray-500 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Selected Stores Display - Always visible when there are selections */}
            {selectedIds.size > 0 && !panelOpen && (
              <div className="px-4 pb-3 flex flex-wrap gap-2 border-t pt-3">
                {selectedStores.map(s => (
                  <span 
                    key={s.id}
                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-sm flex items-center gap-1"
                  >
                    {s.name}
                    <button onClick={(e) => { e.stopPropagation(); removeSelected(s.id); }} className="hover:bg-blue-200 rounded p-0.5">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                <button 
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  className="text-red-500 hover:text-red-700 text-sm px-2"
                >
                  נקה הכל
                </button>
              </div>
            )}
            
            {/* Expandable Content */}
            {panelOpen && (
              <div className="p-4 border-t space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש חנות..."
                    className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Store Buttons */}
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredStores.map(s => {
                    const isSelected = selectedIds.has(s.id);
                    const isCurrentStore = s.id === currentStoreId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSelect(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${
                          isSelected 
                            ? 'bg-blue-500 text-white border-blue-500' 
                            : isCurrentStore
                              ? 'bg-blue-50 text-blue-700 border-blue-300 hover:border-blue-500'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {isSelected && <Check size={14} className="inline ml-1" />}
                        {s.name}
                        {isCurrentStore && !isSelected && <span className="text-xs mr-1">(אתה)</span>}
                      </button>
                    );
                  })}
                  {filteredStores.length === 0 && (
                    <p className="text-gray-500 text-sm">לא נמצאו חנויות</p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    {selectedIds.size === 0 ? 'לא נבחרו חנויות - מוצגות כולן' : `נבחרו ${selectedIds.size} חנויות`}
                  </p>
                  {selectedIds.size > 0 && (
                    <button 
                      onClick={clearSelection}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                    >
                      <X size={14} />
                      נקה בחירה
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Printable content */}
          <div ref={printRef}>
            {/* Table 1: Metrics Comparison */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3 print:hidden">
                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-700">
                  <TrendingUp size={20} />
                  השוואת מדדים
                  {selectedIds.size > 0 && <span className="text-sm font-normal text-blue-500">({selectedIds.size} חנויות נבחרו)</span>}
                </h3>
                <div className="flex gap-2">
                  <button onClick={handlePrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                    <FileText size={16} />PDF
                  </button>
                  <button onClick={exportCityMetricsToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                    <Download size={16} />Excel
                  </button>
                </div>
              </div>
              <h2 className="hidden print:block">השוואת מדדים - {city}</h2>
              <div className="overflow-x-auto border rounded-xl print:border-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                      <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px] md:min-w-[150px]">חנות</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים<br/>24→25</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים<br/>H1→H2</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים<br/>ספט→נוב</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold">מחזור ₪</th>
                    </tr>
                    {/* Summary Row */}
                    <tr className="bg-blue-50 font-bold text-blue-800 border-b-2 border-blue-300 summary-row">
                      <td className="p-2 text-center">Σ</td>
                      <td className="p-2 text-right">סה״כ {visibleStores.length} חנויות</td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">
                        <span className={(visibleStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / visibleStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                          {fmtPct(visibleStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / visibleStores.length)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={(visibleStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / visibleStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                          {fmtPct(visibleStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / visibleStores.length)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={(visibleStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / visibleStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                          {fmtPct(visibleStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / visibleStores.length)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={(visibleStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / visibleStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                          {fmtPct(visibleStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / visibleStores.length)}
                        </span>
                      </td>
                      <td className="p-2 text-center">-</td>
                      <td className="p-2 text-center">{fmt(visibleStores.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                      <td className="p-2 text-center">₪{fmt(visibleStores.reduce((s, x) => s + (x.sales_2025 || 0), 0))}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {[...visibleStores].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((s, i) => {
                      const isCurrentStore = s.id === currentStoreId;
                      const isSelected = selectedIds.has(s.id);
                      const statusLongCfg = STATUS_CFG[s.status_long] || STATUS_CFG['יציב'];
                      const statusShortCfg = STATUS_CFG[s.status_short] || STATUS_CFG['יציב'];
                      return (
                        <tr 
                          key={s.id} 
                          onClick={() => onSelectStore && onSelectStore(s)}
                          className={`${isCurrentStore ? 'bg-blue-50 current-store' : isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'} border-b cursor-pointer hover:bg-blue-100 transition-colors`}
                        >
                          <td className="p-2 text-center font-bold">{i + 1}</td>
                          <td className="p-2 text-right">
                            <div className={`font-medium ${isCurrentStore ? 'text-blue-700' : ''}`}>{s.name}</div>
                            {isCurrentStore && <span className="text-xs text-blue-500 bg-blue-100 px-1 rounded">אתה כאן</span>}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_long || 'יציב'}</span>
                          </td>
                          <td className="p-2 text-center">
                            <div className={`font-medium ${(s.metric_12v12 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_12v12)}</div>
                            <div className="text-xs text-gray-400 small">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</div>
                          </td>
                          <td className="p-2 text-center">
                            <div className={`font-medium ${(s.metric_3v3 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_3v3)}</div>
                            <div className="text-xs text-gray-400 small">{fmt(s.qty_prev3)}→{fmt(s.qty_last3)}</div>
                          </td>
                          <td className="p-2 text-center">
                            <div className={`font-medium ${(s.metric_6v6 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_6v6)}</div>
                            <div className="text-xs text-gray-400 small">{fmt(s.qty_prev6)}→{fmt(s.qty_last6)}</div>
                          </td>
                          <td className="p-2 text-center">
                            <div className={`font-medium ${(s.metric_2v2 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_2v2)}</div>
                            <div className="text-xs text-gray-400 small">{fmt(s.qty_prev2)}→{fmt(s.qty_last2)}</div>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_short || 'יציב'}</span>
                          </td>
                          <td className="p-2 text-center font-medium">{fmt(s.qty_2025)}</td>
                          <td className="p-2 text-center">₪{fmt(s.sales_2025)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Table 2: Data */}
            <div>
              <div className="flex justify-between items-center mb-3 print:hidden">
                <h3 className="text-lg font-bold flex items-center gap-2 text-purple-700">
                  <BarChart3 size={20} />
                  נתונים חודשיים
                  <PeriodSelector value={dataPeriod} onChange={setDataPeriod} />
                </h3>
                <button onClick={exportCityDataToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                  <Download size={16} />Excel
                </button>
              </div>
              <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(dataPeriod)})</h3>
              <div className="overflow-x-auto border rounded-xl print:border-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-purple-50 text-gray-700">
                      <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                      <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px] md:min-w-[150px]">חנות</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-violet-50">אספקות</th>
                      <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ממוצע<br/>לאספקה</th>
                    </tr>
                    {/* Summary Row */}
                    <tr className="bg-purple-100 font-bold text-purple-800 border-b-2 border-purple-300 summary-row-data">
                      <td className="p-2 text-center">Σ</td>
                      <td className="p-2 text-right">סה״כ {visibleStores.length} חנויות</td>
                      <td className="p-2 text-center text-blue text-blue-700">{fmt(visibleStores.reduce((s, x) => s + x.period_gross, 0))}</td>
                      <td className="p-2 text-center text-green text-green-700">{fmt(visibleStores.reduce((s, x) => s + x.period_net, 0))}</td>
                      <td className="p-2 text-center text-red text-red-600">{fmt(visibleStores.reduce((s, x) => s + x.period_returns, 0))}</td>
                      <td className="p-2 text-center text-red text-red-600">
                        {(visibleStores.reduce((s, x) => s + x.period_gross, 0) > 0 
                          ? (visibleStores.reduce((s, x) => s + x.period_returns, 0) / visibleStores.reduce((s, x) => s + x.period_gross, 0) * 100) 
                          : 0).toFixed(1)}%
                      </td>
                      <td className="p-2 text-center text-purple text-violet-700">{fmt(visibleStores.reduce((s, x) => s + x.period_deliveries, 0))}</td>
                      <td className="p-2 text-center text-amber text-blue-700">
                        {visibleStores.reduce((s, x) => s + x.period_deliveries, 0) > 0 
                          ? fmt(Math.round(visibleStores.reduce((s, x) => s + x.period_net, 0) / visibleStores.reduce((s, x) => s + x.period_deliveries, 0)))
                          : '-'}
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {[...visibleStores].sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((s, i) => {
                      const isCurrentStore = s.id === currentStoreId;
                      const isSelected = selectedIds.has(s.id);
                      const returnsPctColor = s.period_returns_pct > 20 ? 'text-red-600 font-bold' : s.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                      return (
                        <tr 
                          key={s.id} 
                          onClick={() => onSelectStore && onSelectStore(s)}
                          className={`${isCurrentStore ? 'bg-purple-50 current-store' : isSelected ? 'bg-purple-50/50' : 'hover:bg-gray-50'} border-b cursor-pointer hover:bg-purple-100 transition-colors`}
                        >
                          <td className="p-2 text-center font-bold">{i + 1}</td>
                          <td className="p-2 text-right">
                            <div className={`font-medium ${isCurrentStore ? 'text-purple-700' : ''}`}>{s.name}</div>
                            {isCurrentStore && <span className="text-xs text-purple-500 bg-purple-100 px-1 rounded">אתה כאן</span>}
                          </td>
                          <td className="p-2 text-center bg-blue-50/30 font-medium text-blue text-blue-700">{fmt(s.period_gross)}</td>
                          <td className="p-2 text-center bg-green-50/30 font-medium text-green text-green-700">{fmt(s.period_net)}</td>
                          <td className="p-2 text-center bg-red-50/30 font-medium text-red text-red-600">{fmt(s.period_returns)}</td>
                          <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{s.period_returns_pct.toFixed(1)}%</td>
                          <td className="p-2 text-center bg-violet-50/30 font-medium text-purple text-violet-700">{fmt(s.period_deliveries)}</td>
                          <td className="p-2 text-center bg-blue-50/30 font-medium text-amber text-blue-700">{fmt(Math.round(s.period_avg_per_delivery))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// v1.10.7 - Global Store Comparison Modal - compare any stores
// v1.10.8 - Added period selector, improved PDF, added numbers to metrics
const GlobalStoreComparisonModal = ({ stores, onClose, onSelectStore }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  if (!stores || stores.length === 0) return null;
  
  // Calculate data for each store based on selected period
  const storesWithData = useMemo(() => stores.map(s => calcStoreDataForPeriod(s, dataPeriod)), [stores, dataPeriod]);
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const removeSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Filter stores by search term
  const searchResults = searchTerm.length >= 2 
    ? storesWithData.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.city?.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  
  // Selected stores for tables
  const selectedStores = storesWithData.filter(s => selectedIds.has(s.id));
  
  // v1.10.8 - Improved PDF export that captures both tables
  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת חנויות - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #1e40af; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #6b21a8; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .text-amber { color: #d97706; }
          .summary-row { background: #dbeafe; font-weight: bold; }
          .summary-row-data { background: #f3e8ff; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת חנויות - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedStores.length} חנויות | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export functions
  const exportMetricsToCSV = () => {
    if (selectedStores.length === 0) return;
    const cols = [
      { k: 'name', l: 'חנות' },
      { k: 'city', l: 'עיר' },
      { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' },
      { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' },
      { k: 'qty_prev3', l: '3 חודשים קודם' },
      { k: 'qty_last3', l: '3 חודשים אחרון' },
      { k: 'metric_3v3', l: '3 חודשים %' },
      { k: 'qty_prev6', l: '6 חודשים קודם' },
      { k: 'qty_last6', l: '6 חודשים אחרון' },
      { k: 'metric_6v6', l: '6 חודשים %' },
      { k: 'qty_prev2', l: '2 חודשים קודם' },
      { k: 'qty_last2', l: '2 חודשים אחרון' },
      { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(selectedStores, cols, 'השוואת_חנויות_מדדים');
  };
  
  const exportDataToCSV = () => {
    if (selectedStores.length === 0) return;
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'חנות' },
      { k: 'city', l: 'עיר' },
      { k: 'period_gross', l: 'ברוטו' },
      { k: 'period_net', l: 'נטו' },
      { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
      { k: 'period_deliveries', l: 'אספקות' },
      { k: 'period_avg_per_delivery', l: 'ממוצע לאספקה' },
    ];
    exportCSV(selectedStores, cols, `השוואת_חנויות_${periodLabel}`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} />
            <h2 className="text-lg md:text-xl font-bold">השוואת חנויות</h2>
            {selectedIds.size > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} נבחרו</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-80px)] space-y-6">
          
          {/* Search & Selection Panel */}
          <div className="bg-gray-50 rounded-xl p-4 border print:hidden">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">חיפוש חנויות להוספה</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="הקלד לפחות 2 תווים..."
                    className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg bg-white">
                    {searchResults.slice(0, 20).map(s => (
                      <button
                        key={s.id}
                        onClick={() => { toggleSelect(s.id); setSearchTerm(''); }}
                        className={`w-full text-right px-3 py-2 hover:bg-emerald-50 flex justify-between items-center border-b last:border-b-0 ${selectedIds.has(s.id) ? 'bg-emerald-100' : ''}`}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-gray-500">{s.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Stores */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">חנויות שנבחרו ({selectedIds.size})</label>
                  {selectedIds.size > 0 && (
                    <button onClick={clearSelection} className="text-xs text-red-600 hover:text-red-800">נקה הכל</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {selectedStores.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                      {s.name}
                      <button onClick={() => removeSelected(s.id)} className="hover:text-red-600">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {selectedIds.size === 0 && <p className="text-gray-400 text-sm">חפש והוסף חנויות להשוואה</p>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tables - only show if stores selected */}
          {selectedStores.length > 0 && (
            <div ref={printRef}>
              {/* Table 1: Metrics Comparison */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-blue-700">
                    <TrendingUp size={20} />
                    השוואת מדדים
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handlePrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                      <FileText size={16} />PDF
                    </button>
                    <button onClick={exportMetricsToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h2 className="hidden print:block">השוואת מדדים</h2>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">חנות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים<br/>H1→H2</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים<br/>ספט→נוב</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">מחזור ₪</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-blue-50 font-bold text-blue-800 border-b-2 border-blue-300 summary-row">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedStores.length} חנויות</td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">{fmt(selectedStores.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                        <td className="p-2 text-center">₪{fmt(selectedStores.reduce((s, x) => s + (x.sales_2025 || 0), 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedStores].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((s, i) => {
                        const statusLongCfg = STATUS_CFG[s.status_long] || STATUS_CFG['יציב'];
                        const statusShortCfg = STATUS_CFG[s.status_short] || STATUS_CFG['יציב'];
                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => onSelectStore && onSelectStore(s)}
                            className="hover:bg-blue-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500 small">{s.city}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_long || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_12v12 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_12v12)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_3v3 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_3v3)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev3)}→{fmt(s.qty_last3)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_6v6 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_6v6)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev6)}→{fmt(s.qty_last6)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_2v2 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(s.metric_2v2)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev2)}→{fmt(s.qty_last2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_short || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center font-medium">{fmt(s.qty_2025)}</td>
                            <td className="p-2 text-center">₪{fmt(s.sales_2025)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Table 2: Data */}
              <div>
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-purple-700">
                    <BarChart3 size={20} />
                    נתונים חודשיים
                    <PeriodSelector value={dataPeriod} onChange={setDataPeriod} />
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={exportDataToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(dataPeriod)})</h3>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-50 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">חנות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-violet-50">אספקות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ממוצע<br/>לאספקה</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-purple-100 font-bold text-purple-800 border-b-2 border-purple-300 summary-row-data">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedStores.length} חנויות</td>
                        <td className="p-2 text-center text-blue text-blue-700">{fmt(selectedStores.reduce((s, x) => s + x.period_gross, 0))}</td>
                        <td className="p-2 text-center text-green text-green-700">{fmt(selectedStores.reduce((s, x) => s + x.period_net, 0))}</td>
                        <td className="p-2 text-center text-red text-red-600">{fmt(selectedStores.reduce((s, x) => s + x.period_returns, 0))}</td>
                        <td className="p-2 text-center text-red text-red-600">
                          {(selectedStores.reduce((s, x) => s + x.period_gross, 0) > 0 
                            ? (selectedStores.reduce((s, x) => s + x.period_returns, 0) / selectedStores.reduce((s, x) => s + x.period_gross, 0) * 100) 
                            : 0).toFixed(1)}%
                        </td>
                        <td className="p-2 text-center text-purple text-violet-700">{fmt(selectedStores.reduce((s, x) => s + x.period_deliveries, 0))}</td>
                        <td className="p-2 text-center text-amber text-blue-700">
                          {selectedStores.reduce((s, x) => s + x.period_deliveries, 0) > 0 
                            ? fmt(Math.round(selectedStores.reduce((s, x) => s + x.period_net, 0) / selectedStores.reduce((s, x) => s + x.period_deliveries, 0)))
                            : '-'}
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedStores].sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((s, i) => {
                        const returnsPctColor = s.period_returns_pct > 20 ? 'text-red-600 font-bold' : s.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => onSelectStore && onSelectStore(s)}
                            className="hover:bg-purple-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500 small">{s.city}</div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-blue text-blue-700">{fmt(s.period_gross)}</td>
                            <td className="p-2 text-center bg-green-50/30 font-medium text-green text-green-700">{fmt(s.period_net)}</td>
                            <td className="p-2 text-center bg-red-50/30 font-medium text-red text-red-600">{fmt(s.period_returns)}</td>
                            <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{s.period_returns_pct.toFixed(1)}%</td>
                            <td className="p-2 text-center bg-violet-50/30 font-medium text-purple text-violet-700">{fmt(s.period_deliveries)}</td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-amber text-blue-700">{fmt(Math.round(s.period_avg_per_delivery))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {selectedStores.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <p>בחר חנויות להשוואה</p>
              <p className="text-sm">חפש בשם או עיר והוסף חנויות</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// v1.10.9 - Global Product Comparison Modal (similar to GlobalStoreComparisonModal)
const GlobalProductComparisonModal = ({ products, onClose, onSelectProduct }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  if (!products || products.length === 0) return null;
  
  // Calculate data for each product based on selected period
  const productsWithData = useMemo(() => products.map(p => calcProductDataForPeriod(p, dataPeriod)), [products, dataPeriod]);
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const removeSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Filter products by search term
  const searchResults = searchTerm.length >= 2 
    ? productsWithData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  
  // Selected products for tables
  const selectedProducts = productsWithData.filter(p => selectedIds.has(p.id));
  
  // PDF export
  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת מוצרים - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #7c3aed; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #0891b2; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .text-amber { color: #d97706; }
          .summary-row { background: #ede9fe; font-weight: bold; }
          .summary-row-data { background: #cffafe; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת מוצרים - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedProducts.length} מוצרים | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export functions
  const exportMetricsToCSV = () => {
    if (selectedProducts.length === 0) return;
    const cols = [
      { k: 'name', l: 'מוצר' },
      { k: 'category', l: 'קטגוריה' },
      { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' },
      { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' },
      { k: 'qty_prev3', l: '3 חודשים קודם' },
      { k: 'qty_last3', l: '3 חודשים אחרון' },
      { k: 'metric_3v3', l: '3 חודשים %' },
      { k: 'qty_prev6', l: '6 חודשים קודם' },
      { k: 'qty_last6', l: '6 חודשים אחרון' },
      { k: 'metric_6v6', l: '6 חודשים %' },
      { k: 'qty_prev2', l: '2 חודשים קודם' },
      { k: 'qty_last2', l: '2 חודשים אחרון' },
      { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(selectedProducts, cols, 'השוואת_מוצרים_מדדים');
  };
  
  const exportDataToCSV = () => {
    if (selectedProducts.length === 0) return;
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'מוצר' },
      { k: 'category', l: 'קטגוריה' },
      { k: 'period_gross', l: 'ברוטו' },
      { k: 'period_net', l: 'נטו' },
      { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
      { k: 'period_sales', l: 'מחזור ₪' },
    ];
    exportCSV(selectedProducts, cols, `השוואת_מוצרים_${periodLabel}`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <Package size={24} />
            <h2 className="text-lg md:text-xl font-bold">השוואת מוצרים</h2>
            {selectedIds.size > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} נבחרו</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-80px)] space-y-6">
          
          {/* Search & Selection Panel */}
          <div className="bg-gray-50 rounded-xl p-4 border print:hidden">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">חיפוש מוצרים להוספה</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="הקלד לפחות 2 תווים..."
                    className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg bg-white">
                    {searchResults.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { toggleSelect(p.id); setSearchTerm(''); }}
                        className={`w-full text-right px-3 py-2 hover:bg-violet-50 flex justify-between items-center border-b last:border-b-0 ${selectedIds.has(p.id) ? 'bg-violet-100' : ''}`}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-sm text-gray-500">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Products */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">מוצרים שנבחרו ({selectedIds.size})</label>
                  {selectedIds.size > 0 && (
                    <button onClick={clearSelection} className="text-xs text-red-600 hover:text-red-800">נקה הכל</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {selectedProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-800 rounded-full text-sm">
                      {p.name}
                      <button onClick={() => removeSelected(p.id)} className="hover:text-red-600">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {selectedIds.size === 0 && <p className="text-gray-400 text-sm">חפש והוסף מוצרים להשוואה</p>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tables - only show if products selected */}
          {selectedProducts.length > 0 && (
            <div ref={printRef}>
              {/* Table 1: Metrics Comparison */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-violet-700">
                    <TrendingUp size={20} />
                    השוואת מדדים
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handlePrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                      <FileText size={16} />PDF
                    </button>
                    <button onClick={exportMetricsToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h2 className="hidden print:block">השוואת מדדים</h2>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים<br/>H1→H2</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים<br/>ספט→נוב</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">מחזור ₪</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-violet-50 font-bold text-violet-800 border-b-2 border-violet-300 summary-row">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0) / selectedProducts.length, 0))}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">{fmt(selectedProducts.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                        <td className="p-2 text-center">₪{fmt(selectedProducts.reduce((s, x) => s + (x.sales_2025 || 0), 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedProducts].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((p, i) => {
                        const statusLongCfg = STATUS_CFG[p.status_long] || STATUS_CFG['יציב'];
                        const statusShortCfg = STATUS_CFG[p.status_short] || STATUS_CFG['יציב'];
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => onSelectProduct && onSelectProduct(p)}
                            className="hover:bg-violet-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_long || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_12v12 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(p.metric_12v12)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_2024)}→{fmt(p.qty_2025)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_3v3 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(p.metric_3v3)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev3)}→{fmt(p.qty_last3)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_6v6 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(p.metric_6v6)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev6)}→{fmt(p.qty_last6)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_2v2 || 0) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}`}>{fmtPct(p.metric_2v2)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev2)}→{fmt(p.qty_last2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_short || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center font-medium">{fmt(p.qty_2025)}</td>
                            <td className="p-2 text-center">₪{fmt(p.sales_2025)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Table 2: Data */}
              <div>
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-cyan-700">
                    <BarChart3 size={20} />
                    נתונים חודשיים
                    <PeriodSelector value={dataPeriod} onChange={setDataPeriod} />
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={exportDataToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(dataPeriod)})</h3>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-cyan-50 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-amber-50">מחזור ₪</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-cyan-100 font-bold text-cyan-800 border-b-2 border-cyan-300 summary-row-data">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                        <td className="p-2 text-center text-blue text-blue-700">{fmt(selectedProducts.reduce((s, x) => s + x.period_gross, 0))}</td>
                        <td className="p-2 text-center text-green text-green-700">{fmt(selectedProducts.reduce((s, x) => s + x.period_net, 0))}</td>
                        <td className="p-2 text-center text-red text-red-600">{fmt(selectedProducts.reduce((s, x) => s + x.period_returns, 0))}</td>
                        <td className="p-2 text-center text-red text-red-600">
                          {(selectedProducts.reduce((s, x) => s + x.period_gross, 0) > 0 
                            ? (selectedProducts.reduce((s, x) => s + x.period_returns, 0) / selectedProducts.reduce((s, x) => s + x.period_gross, 0) * 100) 
                            : 0).toFixed(1)}%
                        </td>
                        <td className="p-2 text-center text-amber text-amber-700">₪{fmt(selectedProducts.reduce((s, x) => s + x.period_sales, 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedProducts].sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((p, i) => {
                        const returnsPctColor = p.period_returns_pct > 20 ? 'text-red-600 font-bold' : p.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => onSelectProduct && onSelectProduct(p)}
                            className="hover:bg-cyan-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-blue text-blue-700">{fmt(p.period_gross)}</td>
                            <td className="p-2 text-center bg-green-50/30 font-medium text-green text-green-700">{fmt(p.period_net)}</td>
                            <td className="p-2 text-center bg-red-50/30 font-medium text-red text-red-600">{fmt(p.period_returns)}</td>
                            <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{p.period_returns_pct.toFixed(1)}%</td>
                            <td className="p-2 text-center bg-amber-50/30 font-medium text-amber text-amber-700">₪{fmt(Math.round(p.period_sales))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {selectedProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>בחר מוצרים להשוואה</p>
              <p className="text-sm">חפש בשם או קטגוריה והוסף מוצרים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// v1.10.9 - Store Product Comparison Modal (for comparing products within a specific store)
const StoreProductComparisonModal = ({ products, storeName, onClose, onSelectProduct }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  if (!products || products.length === 0) return null;
  
  // Calculate data for each product based on selected period
  const productsWithData = useMemo(() => products.map(p => calcProductDataForPeriod(p, dataPeriod)), [products, dataPeriod]);
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const removeSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Filter products by search term
  const searchResults = searchTerm.length >= 2 
    ? productsWithData.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];
  
  // Selected products for tables
  const selectedProducts = productsWithData.filter(p => selectedIds.has(p.id));
  
  // PDF export
  const handlePrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת מוצרים ב${storeName} - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #7c3aed; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #0891b2; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .text-amber { color: #d97706; }
          .summary-row { background: #ede9fe; font-weight: bold; }
          .summary-row-data { background: #cffafe; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת מוצרים ב${storeName} - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedProducts.length} מוצרים | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export functions
  const exportMetricsToCSV = () => {
    if (selectedProducts.length === 0) return;
    const cols = [
      { k: 'name', l: 'מוצר' },
      { k: 'category', l: 'קטגוריה' },
      { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' },
      { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' },
      { k: 'metric_3v3', l: '3 חודשים %' },
      { k: 'metric_6v6', l: '6 חודשים %' },
      { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(selectedProducts, cols, `השוואת_מוצרים_${storeName}_מדדים`);
  };
  
  const exportDataToCSV = () => {
    if (selectedProducts.length === 0) return;
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'מוצר' },
      { k: 'category', l: 'קטגוריה' },
      { k: 'period_gross', l: 'ברוטו' },
      { k: 'period_net', l: 'נטו' },
      { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
    ];
    exportCSV(selectedProducts, cols, `השוואת_מוצרים_${storeName}_${periodLabel}`);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white p-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <Package size={24} />
            <h2 className="text-lg md:text-xl font-bold">השוואת מוצרים ב{storeName}</h2>
            {selectedIds.size > 0 && <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} נבחרו</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-80px)] space-y-6">
          
          {/* Search & Selection Panel */}
          <div className="bg-gray-50 rounded-xl p-4 border print:hidden">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-2">חיפוש מוצרים להוספה</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="הקלד לפחות 2 תווים..."
                    className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                  />
                </div>
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg bg-white">
                    {searchResults.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { toggleSelect(p.id); setSearchTerm(''); }}
                        className={`w-full text-right px-3 py-2 hover:bg-fuchsia-50 flex justify-between items-center border-b last:border-b-0 ${selectedIds.has(p.id) ? 'bg-fuchsia-100' : ''}`}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-sm text-gray-500">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected Products */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">מוצרים שנבחרו ({selectedIds.size})</label>
                  {selectedIds.size > 0 && (
                    <button onClick={clearSelection} className="text-xs text-red-600 hover:text-red-800">נקה הכל</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {selectedProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-fuchsia-100 text-fuchsia-800 rounded-full text-sm">
                      {p.name}
                      <button onClick={() => removeSelected(p.id)} className="hover:text-red-600">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {selectedIds.size === 0 && <p className="text-gray-400 text-sm">חפש והוסף מוצרים להשוואה</p>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tables - only show if products selected */}
          {selectedProducts.length > 0 && (
            <div ref={printRef}>
              {/* Table 1: Metrics Comparison */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-fuchsia-700">
                    <TrendingUp size={20} />
                    השוואת מדדים
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handlePrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                      <FileText size={16} />PDF
                    </button>
                    <button onClick={exportMetricsToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-fuchsia-500 text-white rounded-lg text-sm hover:bg-fuchsia-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h2 className="hidden print:block">השוואת מדדים</h2>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-fuchsia-50 font-bold text-fuchsia-800 border-b-2 border-fuchsia-300 summary-row">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">{fmt(selectedProducts.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedProducts].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((p, i) => {
                        const statusLongCfg = STATUS_CFG[p.status_long] || STATUS_CFG['יציב'];
                        const statusShortCfg = STATUS_CFG[p.status_short] || STATUS_CFG['יציב'];
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => onSelectProduct && onSelectProduct(p)}
                            className="hover:bg-fuchsia-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_long || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_12v12 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_12v12)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_2024)}→{fmt(p.qty_2025)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_3v3 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_3v3)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev3)}→{fmt(p.qty_last3)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_6v6 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_6v6)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev6)}→{fmt(p.qty_last6)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_2v2 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_2v2)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev2)}→{fmt(p.qty_last2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_short || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center font-medium">{fmt(p.qty_2025)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Table 2: Data */}
              <div>
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-pink-700">
                    <BarChart3 size={20} />
                    נתונים חודשיים
                    <PeriodSelector value={dataPeriod} onChange={setDataPeriod} />
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={exportDataToCSV} className="flex items-center gap-1 px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(dataPeriod)})</h3>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-pink-50 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-pink-100 font-bold text-pink-800 border-b-2 border-pink-300 summary-row-data">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                        <td className="p-2 text-center text-blue-700">{fmt(selectedProducts.reduce((s, x) => s + x.period_gross, 0))}</td>
                        <td className="p-2 text-center text-green-700">{fmt(selectedProducts.reduce((s, x) => s + x.period_net, 0))}</td>
                        <td className="p-2 text-center text-red-600">{fmt(selectedProducts.reduce((s, x) => s + x.period_returns, 0))}</td>
                        <td className="p-2 text-center text-red-600">
                          {(selectedProducts.reduce((s, x) => s + x.period_gross, 0) > 0 
                            ? (selectedProducts.reduce((s, x) => s + x.period_returns, 0) / selectedProducts.reduce((s, x) => s + x.period_gross, 0) * 100) 
                            : 0).toFixed(1)}%
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedProducts].sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((p, i) => {
                        const returnsPctColor = p.period_returns_pct > 20 ? 'text-red-600 font-bold' : p.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => onSelectProduct && onSelectProduct(p)}
                            className="hover:bg-pink-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-blue-700">{fmt(p.period_gross)}</td>
                            <td className="p-2 text-center bg-green-50/30 font-medium text-green-700">{fmt(p.period_net)}</td>
                            <td className="p-2 text-center bg-red-50/30 font-medium text-red-600">{fmt(p.period_returns)}</td>
                            <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{p.period_returns_pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {selectedProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>בחר מוצרים להשוואה</p>
              <p className="text-sm">חפש בשם או קטגוריה והוסף מוצרים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// City Indicator - not shown in PDF
const CityIndicator = ({ store, allStores, onSelectStore }) => {
  const [showModal, setShowModal] = useState(false);
  
  const cityData = useMemo(() => {
    const storeCity = (store.city || '').trim();
    if (!storeCity) return null;
    const cityStores = allStores.filter(s => (s.city || '').trim() === storeCity && !s.is_inactive);
    if (cityStores.length < 2) return null;
    const statusCounts = {};
    cityStores.forEach(s => { statusCounts[s.status] = (statusCounts[s.status] || 0) + 1; });
    
    // Sort for rankings
    const byLongTerm = [...cityStores].sort((a, b) => (b.metric_long_term || 0) - (a.metric_long_term || 0));
    const byShortTerm = [...cityStores].sort((a, b) => (b.metric_short_term || 0) - (a.metric_short_term || 0));
    const byQty = [...cityStores].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0));
    
    // Calculate averages
    const avgLongTerm = cityStores.reduce((s, x) => s + (x.metric_long_term || 0), 0) / cityStores.length;
    const avgShortTerm = cityStores.reduce((s, x) => s + (x.metric_short_term || 0), 0) / cityStores.length;
    const avgQty = cityStores.reduce((s, x) => s + (x.qty_total || 0), 0) / cityStores.length;
    
    // Get ranks
    const longTermRank = byLongTerm.findIndex(s => s.id === store.id) + 1;
    const shortTermRank = byShortTerm.findIndex(s => s.id === store.id) + 1;
    const qtyRank = byQty.findIndex(s => s.id === store.id) + 1;
    
    // Calculate percentiles (how many stores this one beats)
    const longTermPct = Math.round(((cityStores.length - longTermRank) / cityStores.length) * 100);
    const shortTermPct = Math.round(((cityStores.length - shortTermRank) / cityStores.length) * 100);
    const qtyPct = Math.round(((cityStores.length - qtyRank) / cityStores.length) * 100);
    
    return {
      city: storeCity,
      total: cityStores.length,
      stores: cityStores,
      statusCounts,
      longTermRank, shortTermRank, qtyRank,
      longTermPct, shortTermPct, qtyPct,
      avgLongTerm, avgShortTerm, avgQty,
      storeLongTerm: store.metric_long_term || 0,
      storeShortTerm: store.metric_short_term || 0,
      storeQty: store.qty_total || 0
    };
  }, [store, allStores]);
  
  if (!cityData) return null;
  
  const RankingCard = ({ title, icon, rank, total, value, avg, pct, color, formatValue }) => {
    const isAboveAvg = formatValue === 'pct' ? value >= avg : value >= avg;
    const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-red-500';
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{icon}</span>
          <h4 className="font-bold text-gray-700 text-sm">{title}</h4>
        </div>
        
        <div className="text-center mb-3">
          <span className={`text-3xl font-bold ${color}`}>#{rank}</span>
          <p className="text-xs text-gray-500">מתוך {total} חנויות בעיר</p>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">הערך שלך:</span>
            <span className={`font-bold ${isAboveAvg ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatValue === 'pct' ? fmtPct(value) : fmt(value)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">ממוצע עיר:</span>
            <span className="font-medium text-gray-700">
              {formatValue === 'pct' ? fmtPct(avg) : fmt(avg)}
            </span>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>אחוזון</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {pct >= 50 ? `טוב יותר מ-${pct}% מהחנויות` : `נמוך מ-${100-pct}% מהחנויות`}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200 print:hidden">
      <div 
        className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={() => setShowModal(true)}
      >
        <MapPin className="text-blue-600" size={22} />
        <h3 className="text-lg font-bold text-blue-800 hover:underline">השוואה לחנויות ב{cityData.city}</h3>
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium">{cityData.total} חנויות</span>
        <ChevronLeft size={18} className="text-blue-500" />
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(cityData.statusCounts).map(([status, count]) => {
          const cfg = STATUS_CFG[status] || STATUS_CFG['יציב'];
          return <span key={status} className={`${cfg.bg} ${cfg.text} px-2 py-1 rounded-full text-xs font-medium`}>{status}: {count}</span>;
        })}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankingCard 
          title="דירוג טווח ארוך" 
          icon="📈" 
          rank={cityData.longTermRank} 
          total={cityData.total}
          value={cityData.storeLongTerm}
          avg={cityData.avgLongTerm}
          pct={cityData.longTermPct}
          color="text-blue-600"
          formatValue="pct"
        />
        <RankingCard 
          title="דירוג טווח קצר" 
          icon="⚡" 
          rank={cityData.shortTermRank} 
          total={cityData.total}
          value={cityData.storeShortTerm}
          avg={cityData.avgShortTerm}
          pct={cityData.shortTermPct}
          color="text-emerald-600"
          formatValue="pct"
        />
        <RankingCard 
          title="דירוג כמות פריטים" 
          icon="📦" 
          rank={cityData.qtyRank} 
          total={cityData.total}
          value={cityData.storeQty}
          avg={cityData.avgQty}
          pct={cityData.qtyPct}
          color="text-purple-600"
          formatValue="num"
        />
      </div>
      
      {/* City Comparison Modal */}
      {showModal && (
        <CityComparisonModal 
          city={cityData.city}
          stores={cityData.stores}
          currentStoreId={store.id}
          onClose={() => setShowModal(false)}
          onSelectStore={(s) => { setShowModal(false); onSelectStore && onSelectStore(s); }}
        />
      )}
    </div>
  );
};

const StoreDetail = ({ store, onBack, allStores, excludedProducts = [], sourceWindow, rulesConfig, onSelectStore }) => {
  const chart = useMemo(() => { if (!store.monthly_qty) return []; return Object.entries(store.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [store]);
  const [showProductComparison, setShowProductComparison] = useState(false);
  
  // Filter out excluded products AND apply rules config
  const allProds = STORE_PRODUCTS[String(store.id)] || [];
  const prods = useMemo(() => {
    const filtered = allProds.filter(p => !excludedProducts.includes(p.id));
    // Apply rules config to calculate status
    return applyConfig(filtered, rulesConfig || DEFAULT_RULES_CONFIG);
  }, [allProds, excludedProducts, rulesConfig]);
  
  // Pie chart data - filtered
  const pieData = useMemo(() => {
    if (!prods.length) return [];
    const sorted = [...prods].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0));
    const top10 = sorted.slice(0, 10);
    const totalQty = prods.reduce((s, p) => s + (p.qty_total || 0), 0);
    return top10.map((p, i) => ({
      name: p.name,
      shortName: p.name.length > 18 ? p.name.slice(0, 16) + '...' : p.name,
      fullName: p.name,
      value: p.qty_total || 0,
      pct: totalQty > 0 ? ((p.qty_total || 0) / totalQty * 100).toFixed(1) : 0,
      color: COLORS[i % COLORS.length]
    }));
  }, [prods]);
  
  // Line chart - top 5 products trend (filtered)
  const top5Products = useMemo(() => [...prods].sort((a, b) => (b.qty_total || 0) - (a.qty_total || 0)).slice(0, 5), [prods]);
  const productTrendData = useMemo(() => {
    if (!top5Products.length) return [];
    const months = new Set();
    top5Products.forEach(p => { if (p.monthly_qty) Object.keys(p.monthly_qty).forEach(m => months.add(m)); });
    return [...months].sort((a, b) => Number(a) - Number(b)).map(m => {
      const point = { month: fmtMonth(m) };
      top5Products.forEach((p, i) => { point[`p${i}`] = p.monthly_qty?.[m] || 0; });
      return point;
    });
  }, [top5Products]);
  
  // Custom label renderer for line chart - adds name at end of line
  const renderLineLabel = (props) => {
    const { x, y, index, dataKey } = props;
    if (index !== productTrendData.length - 1) return null;
    const idx = parseInt(dataKey.replace('p', ''));
    const name = top5Products[idx]?.name || '';
    const shortName = name.length > 12 ? name.slice(0, 12) + '...' : name;
    return <text x={x + 5} y={y} fill={COLORS[idx]} fontSize={10} dominantBaseline="middle">{shortName}</text>;
  };
  
  const prodCols = [
    { k: 'name', l: 'מוצר', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'status_long', l: 'סטטוס', r: (v, r) => <StatusBadge item={r} sm /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => {
      const pctL6 = r.returns_pct_last6 ?? v ?? 0;
      const pctP6 = r.returns_pct_prev6 ?? 0;
      const change = r.returns_change ?? (pctL6 - pctP6);
      return <ReturnsCell pctL6={pctL6} pctP6={pctP6} change={change} />;
    }},
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-xl"><ChevronRight className="rotate-180" size={20}/>חזרה{sourceWindow && ` ל${sourceWindow}`}</button>
      <button onClick={() => exportPDF(store.name + ' - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{store.name}</h1><p className="text-gray-500 mt-1">{store.city} {store.network && '• ' + store.network}</p><p className="text-sm text-gray-400 mt-1">נהג: {store.driver || '-'} | סוכן: {store.agent || '-'}</p></div>
        <StatusBadge item={store} />
      </div>
      {/* Status Explanation Table */}
      {store.status_explanation && (
        <div className={`mt-4 p-4 rounded-xl border-2 ${store.is_fallback ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-300'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{store.is_fallback ? '⚠️' : '📋'}</span>
            <span className="font-bold text-base text-gray-800">{store.status_explanation}</span>
          </div>
          {store.metrics_comparison && store.metrics_comparison.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-right py-2 px-2 font-bold text-gray-700">מדד</th>
                    <th className="text-right py-2 px-2 font-bold text-gray-700">תקופה</th>
                    <th className="text-center py-2 px-2 font-bold text-gray-700">חוק</th>
                    <th className="text-center py-2 px-2 font-bold text-gray-700">בפועל</th>
                  </tr>
                </thead>
                <tbody>
                  {store.metrics_comparison.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-2 font-medium text-gray-800">{row.name}</td>
                      <td className="py-2 px-2 text-gray-600 text-xs">{row.period}</td>
                      <td className="py-2 px-2 text-center font-medium text-gray-700">{row.rule || '-'}</td>
                      <td className={`py-2 px-2 text-center font-bold text-lg ${(row.actualValue || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    <CityIndicator store={store} allStores={allStores} onSelectStore={onSelectStore} />
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (24→25)" value={store.metric_12v12} sub={fmt(store.qty_2024) + '→' + fmt(store.qty_2025)} />
      <MBox label="6 חודשים (H1→H2)" value={store.metric_6v6} sub={fmt(store.qty_prev6) + '→' + fmt(store.qty_last6)} />
      <MBox label="3 חודשים (24→25)" value={store.metric_3v3} sub={fmt(store.qty_prev3) + '→' + fmt(store.qty_last3)} />
      <MBox label="2 חודשים (ספט→נוב)" value={store.metric_2v2} sub={fmt(store.qty_prev2) + '→' + fmt(store.qty_last2)} />
      <MBox label="מרחק מהשיא" value={store.metric_peak_distance} extra={'שיא: ' + fmt(store.peak_value) + ' | דצמ: ' + fmt(store.current_value)} />
      <MBox label="חזרות %" value={(store.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (store.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (store.returns_change > 0 ? '+' : '') + (store.returns_change?.toFixed(1) || 0) + '%'} pos={store.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(store.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(store.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2024</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור 2025</p><p className="text-xl font-bold text-gray-600">₪{fmt(store.sales_2025)}</p></div>
    </div>
    {/* v1.8.1 - Monthly Sales Chart (Table + Graph combined) */}
    <MonthlySalesChart data={store.monthly_qty} store={store} title={`מכירות חודשיות - ${store.name}`} />
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות (כל התקופה)</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#3b82f6" fill="url(#sg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    {pieData.length > 0 && <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">🥧 חלוקת מוצרים (TOP 10) {excludedProducts.length > 0 && <span className="text-sm font-normal text-orange-600">({excludedProducts.length} מוצרים מוחרגים)</span>}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ pct }) => `${pct}%`}>{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={(v, n, props) => [fmt(v), props.payload.fullName]} /></PieChart></ResponsiveContainer>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">{pieData.map((p, i) => <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg" title={p.fullName}><div className="flex items-center gap-2 min-w-0 flex-1"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }}></div><span className="text-sm truncate">{p.fullName}</span></div><div className="text-left flex-shrink-0 mr-2"><span className="font-bold text-sm">{fmt(p.value)}</span><span className="text-xs text-gray-500 mr-1">({p.pct}%)</span></div></div>)}</div>
      </div>
    </div>}
    {productTrendData.length > 0 && top5Products.length > 0 && <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">📈 מגמת 5 מוצרים מובילים {excludedProducts.length > 0 && <span className="text-sm font-normal text-orange-600">(ללא מוחרגים)</span>}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={productTrendData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{fontSize:10}} />
          <YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-white p-3 rounded-lg shadow-lg border text-right">
                  <p className="font-bold text-gray-700 mb-2">{label}</p>
                  {payload.map((p, i) => {
                    const idx = parseInt(p.dataKey.replace('p', ''));
                    const product = top5Products[idx];
                    return (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="font-medium text-sm" style={{ color: p.color }}>{product?.name}</span>
                        <span className="font-bold mr-auto">{fmt(p.value)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          {top5Products.map((p, i) => (
            <Line 
              key={i} 
              type="monotone" 
              dataKey={`p${i}`} 
              stroke={COLORS[i]} 
              strokeWidth={2} 
              dot={{ r: 3 }} 
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name={`p${i}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Legend at bottom */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t">
        {top5Products.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
            <span className="text-sm font-medium">{p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name}</span>
          </div>
        ))}
      </div>
    </div>}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">מוצרים בחנות ({prods.length}{excludedProducts.length > 0 ? ` מתוך ${allProds.length}` : ''})</h3>
        {prods.length > 1 && (
          <button onClick={() => setShowProductComparison(true)} className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500 text-white rounded-lg text-sm hover:bg-fuchsia-600 print:hidden">
            <BarChart3 size={16}/>
            <span className="hidden sm:inline">השוואת מוצרים</span>
          </button>
        )}
      </div>
      {prods.length > 0 ? <Table data={prods} cols={prodCols} name={'store_' + store.id + '_products'} compact /> : <p className="text-gray-500 text-center py-8">אין נתונים</p>}
    </div>
    
    {/* Product Comparison Modal for this store */}
    {showProductComparison && (
      <StoreProductComparisonModal 
        products={prods}
        storeName={store.name}
        onClose={() => setShowProductComparison(false)}
      />
    )}
    
    {/* v1.8.1 - Missing Products Table */}
    <MissingProductsTable store={store} storeProducts={prods} allStores={allStores} />
  </div>);
};

// Fixed ProductsList with proper filter alignment
const ProductsList = ({ products, onSelect, filters, onFiltersChange }) => {
  // v1.8.8 - Use controlled filters from parent for history preservation
  const { cats, statusesLong, statusesShort, minQty, fallbackFilter, search: tableSearch, page: tablePage } = filters;
  
  // v1.10.9 - Table view tabs and comparison (like StoresList)
  const [tableView, setTableView] = useState('metrics'); // 'metrics' or 'data'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [compSearchTerm, setCompSearchTerm] = useState('');
  
  // v1.10.9 - Period selection for data tables
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const [compDataPeriod, setCompDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  // Helper to update a single filter
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value, page: key !== 'page' ? 1 : value });
  };
  
  const filtered = useMemo(() => products.filter(p => { 
    if (cats.length && !cats.includes(p.category)) return false; 
    if (statusesLong.length && !statusesLong.includes(p.status_long)) return false;
    if (statusesShort.length && !statusesShort.includes(p.status_short)) return false;
    if (minQty > 0 && (p.qty_2025 || 0) < minQty) return false;
    if (fallbackFilter === 'fallback' && !p.is_fallback) return false;
    if (fallbackFilter === 'regular' && p.is_fallback) return false;
    return true; 
  }), [products, cats, statusesLong, statusesShort, minQty, fallbackFilter]);
  
  // v1.10.9 - Calculate data for main table based on selected period
  const productsWithData = useMemo(() => filtered.map(p => calcProductDataForPeriod(p, dataPeriod)), [filtered, dataPeriod]);
  
  // v1.10.9 - Calculate data for comparison modal based on its period
  const productsWithCompData = useMemo(() => products.map(p => calcProductDataForPeriod(p, compDataPeriod)), [products, compDataPeriod]);
  
  // Calculate summary values for metrics table
  const summaryData = useMemo(() => {
    const count = filtered.length;
    if (count === 0) return null;
    const avg12v12 = filtered.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / count;
    const avg3v3 = filtered.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / count;
    const avg6v6 = filtered.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / count;
    const avg2v2 = filtered.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / count;
    const avgPeak = filtered.reduce((s, x) => s + (x.metric_peak_distance || 0), 0) / count;
    const avgReturns = filtered.reduce((s, x) => s + (x.returns_pct_last6 || 0), 0) / count;
    const totalQty = filtered.reduce((s, x) => s + (x.qty_total || 0), 0);
    const totalSales = filtered.reduce((s, x) => s + (x.total_sales || 0), 0);
    return { count, avg12v12, avg3v3, avg6v6, avg2v2, avgPeak, avgReturns, totalQty, totalSales };
  }, [filtered]);
  
  // v1.10.9 - Data table summary
  const dataSummary = useMemo(() => {
    const count = productsWithData.length;
    if (count === 0) return null;
    const totalGross = productsWithData.reduce((s, x) => s + x.period_gross, 0);
    const totalNet = productsWithData.reduce((s, x) => s + x.period_net, 0);
    const totalReturns = productsWithData.reduce((s, x) => s + x.period_returns, 0);
    const totalSales = productsWithData.reduce((s, x) => s + (x.period_sales || 0), 0);
    const avgReturnsPct = totalGross > 0 ? (totalReturns / totalGross * 100) : 0;
    return { count, totalGross, totalNet, totalReturns, totalSales, avgReturnsPct };
  }, [productsWithData]);
  
  // Toggle product selection
  const toggleSelect = (id, e) => {
    e && e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Search for comparison
  const compSearchResults = compSearchTerm.length >= 2 
    ? products.filter(p => p.name.toLowerCase().includes(compSearchTerm.toLowerCase()) || p.category?.toLowerCase().includes(compSearchTerm.toLowerCase())).slice(0, 15)
    : [];
  
  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  
  // Metrics columns with checkbox
  const metricsCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-violet-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'מוצר', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'status_long', l: 'סטטוס\nארוך', r: (v, r) => <LongTermBadge status={r.status_long || 'יציב'} isFallback={r.is_fallback} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'status_short', l: 'סטטוס\nקצר', r: (v, r) => <ShortTermBadge status={r.status_short || 'יציב'} /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => <ReturnsCell pctL6={v} pctP6={r.returns_pct_prev6} change={r.returns_change} /> },
    { k: 'total_sales', l: 'מחזור', r: v => <span className="font-bold text-gray-600">₪{fmt(v)}</span> },
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  // Data columns (dynamic period)
  const dataCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-cyan-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'מוצר', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.category}</p></div> },
    { k: 'period_gross', l: 'ברוטו', r: v => <span className="font-medium text-blue-700">{fmt(v)}</span> },
    { k: 'period_net', l: 'נטו', r: v => <span className="font-medium text-green-700">{fmt(v)}</span> },
    { k: 'period_returns', l: 'חזרות', r: v => <span className="font-medium text-red-600">{fmt(v)}</span> },
    { k: 'period_returns_pct', l: 'חזרות\n%', r: v => <span className={v > 20 ? 'text-red-600 font-bold' : v > 10 ? 'text-blue-600' : 'text-gray-600'}>{(v || 0).toFixed(1)}%</span> },
    { k: 'period_sales', l: 'מחזור ₪', r: v => <span className="font-medium text-amber-700">₪{fmt(Math.round(v || 0))}</span> },
  ];
  
  // Build summary rows
  const metricsSummaryRow = summaryData ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-violet-700">Σ סה״כ {summaryData.count} מוצרים</span>, className: 'text-right' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className={summaryData.avg12v12 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg12v12)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg3v3 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg3v3)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg6v6 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg6v6)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg2v2 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg2v2)}</span>, className: 'text-center' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className="text-red-600">{fmtPct(summaryData.avgPeak)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avgReturns > 15 ? 'text-red-600' : 'text-gray-700'}>{summaryData.avgReturns.toFixed(1)}%</span>, className: 'text-center' },
    { value: <span className="font-bold text-gray-600">₪{fmt(summaryData.totalSales)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-violet-700">{fmt(summaryData.totalQty)}</span>, className: 'text-center' },
  ] : null;
  
  const dataSummaryRow = dataSummary ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-cyan-700">Σ סה״כ {dataSummary.count} מוצרים</span>, className: 'text-right' },
    { value: <span className="font-bold text-blue-700">{fmt(dataSummary.totalGross)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-green-700">{fmt(dataSummary.totalNet)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-red-600">{fmt(dataSummary.totalReturns)}</span>, className: 'text-center' },
    { value: <span className={dataSummary.avgReturnsPct > 15 ? 'text-red-600 font-bold' : 'text-gray-700'}>{dataSummary.avgReturnsPct.toFixed(1)}%</span>, className: 'text-center' },
    { value: <span className="font-bold text-amber-700">₪{fmt(dataSummary.totalSales)}</span>, className: 'text-center' },
  ] : null;
  
  // Export functions
  const exportMetricsCSV = () => {
    const cols = [
      { k: 'name', l: 'מוצר' }, { k: 'category', l: 'קטגוריה' }, { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'metric_12v12', l: 'שנתי %' }, { k: 'metric_3v3', l: '3 חודשים %' }, { k: 'metric_6v6', l: '6 חודשים %' }, { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' }, { k: 'metric_peak_distance', l: 'מרחק מהשיא %' }, { k: 'returns_pct_last6', l: 'חזרות %' }, 
      { k: 'total_sales', l: 'מחזור' }, { k: 'qty_total', l: 'כמות' },
    ];
    exportCSV(filtered, cols, 'מוצרים_מדדים');
  };
  
  const exportDataCSV = () => {
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'מוצר' }, { k: 'category', l: 'קטגוריה' },
      { k: 'period_gross', l: 'ברוטו' }, { k: 'period_net', l: 'נטו' }, { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' }, { k: 'period_sales', l: 'מחזור' },
    ];
    exportCSV(productsWithData, cols, `מוצרים_נתונים_${periodLabel}`);
  };
  
  // Comparison PDF export
  const handleCompPrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת מוצרים - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #7c3aed; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #0891b2; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .text-amber { color: #d97706; }
          .summary-row { background: #ede9fe; font-weight: bold; }
          .summary-row-data { background: #cffafe; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת מוצרים נבחרים - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedProducts.length} מוצרים | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export comparison to CSV
  const exportCompMetricsCSV = () => {
    if (selectedProducts.length === 0) return;
    const cols = [
      { k: 'name', l: 'מוצר' }, { k: 'category', l: 'קטגוריה' }, { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' }, { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' }, { k: 'metric_3v3', l: '3 חודשים %' }, { k: 'metric_6v6', l: '6 חודשים %' }, { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(selectedProducts, cols, 'השוואת_מוצרים_מדדים');
  };
  
  const exportCompDataCSV = () => {
    if (selectedProducts.length === 0) return;
    const periodLabel = getPeriodLabel(compDataPeriod).replace(/[()]/g, '');
    const selectedWithData = selectedProducts.map(p => calcProductDataForPeriod(p, compDataPeriod));
    const cols = [
      { k: 'name', l: 'מוצר' }, { k: 'category', l: 'קטגוריה' },
      { k: 'period_gross', l: 'ברוטו' }, { k: 'period_net', l: 'נטו' }, { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' }, { k: 'period_sales', l: 'מחזור' },
    ];
    exportCSV(selectedWithData, cols, `השוואת_מוצרים_${periodLabel}`);
  };
  
  return (<div className="space-y-4 w-full">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h2 className="text-xl font-bold">מוצרים ({filtered.length})</h2>
      <div className="flex gap-2 print:hidden">
        {selectedIds.size > 0 && (
          <button onClick={() => setShowComparison(true)} className="flex items-center gap-1 px-3 py-2 bg-violet-500 text-white rounded-xl text-sm hover:bg-violet-600">
            <BarChart3 size={16} />השווה ({selectedIds.size})
          </button>
        )}
        <button onClick={() => exportPDF('מוצרים - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
        <button onClick={tableView === 'metrics' ? exportMetricsCSV : exportDataCSV} className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm"><Download size={16}/>Excel</button>
      </div>
    </div>
    
    {/* v1.10.9 - Table View Tabs */}
    <div className="flex gap-2 print:hidden">
      <button 
        onClick={() => setTableView('metrics')}
        className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'metrics' ? 'bg-violet-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
      >
        📊 מדדים
      </button>
      <button 
        onClick={() => setTableView('data')}
        className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'data' ? 'bg-cyan-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
      >
        📈 נתונים
      </button>
      {selectedIds.size > 0 && (
        <button onClick={clearSelection} className="mr-auto text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
          <X size={14} /> נקה בחירה ({selectedIds.size})
        </button>
      )}
    </div>
    
    <div className="flex flex-wrap gap-3 items-center print:hidden">
      <MultiSelect opts={FILTERS.categories || []} selected={cats} onChange={(v) => updateFilter('cats', v)} placeholder="קטגוריה" />
      <MultiSelect opts={['עליה חדה','צמיחה','יציב','ירידה','התרסקות']} selected={statusesLong} onChange={(v) => updateFilter('statusesLong', v)} placeholder="סטטוס ארוך" />
      <MultiSelect opts={['עליה חדה','יציב','ירידה','אזעקה']} selected={statusesShort} onChange={(v) => updateFilter('statusesShort', v)} placeholder="סטטוס קצר" />
      <select value={fallbackFilter} onChange={e => updateFilter('fallbackFilter', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
        <option value="all">סוג סטטוס</option>
        <option value="regular">רגיל בלבד</option>
        <option value="fallback">⚠️ גיבוי בלבד</option>
      </select>
      <input type="number" value={minQty || ''} onChange={e => updateFilter('minQty', Number(e.target.value) || 0)} placeholder="מינ׳ 2025" className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
    </div>
    
    {/* Table based on view selection */}
    {tableView === 'metrics' ? (
      <Table data={filtered} cols={metricsCols} onRow={onSelect} name="products_metrics" search={tableSearch} onSearchChange={(v) => updateFilter('search', v)} page={tablePage} onPageChange={(v) => updateFilter('page', v)} summaryRow={metricsSummaryRow} />
    ) : (
      <Table data={productsWithData} cols={dataCols} onRow={onSelect} name="products_data" search={tableSearch} onSearchChange={(v) => updateFilter('search', v)} page={tablePage} onPageChange={(v) => updateFilter('page', v)} summaryRow={dataSummaryRow} periodSelector={<PeriodSelector value={dataPeriod} onChange={setDataPeriod} />} />
    )}
    
    {/* v1.10.9 - Comparison Modal */}
    {showComparison && selectedIds.size > 0 && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={() => setShowComparison(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-3">
              <Package size={24} />
              <h2 className="text-lg md:text-xl font-bold">השוואת מוצרים נבחרים</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} נבחרו</span>
            </div>
            <button onClick={() => setShowComparison(false)} className="p-2 hover:bg-white/20 rounded-full">
              <X size={24} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-80px)] space-y-6">
            
            {/* Search to add more */}
            <div className="bg-gray-50 rounded-xl p-4 border print:hidden">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">הוסף מוצרים נוספים</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={compSearchTerm}
                      onChange={e => setCompSearchTerm(e.target.value)}
                      placeholder="חפש מוצר..."
                      className="w-full pr-10 pl-4 py-2 border rounded-xl"
                    />
                  </div>
                  {compSearchResults.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg bg-white">
                      {compSearchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { toggleSelect(p.id); setCompSearchTerm(''); }}
                          className={`w-full text-right px-3 py-2 hover:bg-violet-50 flex justify-between items-center border-b last:border-b-0 ${selectedIds.has(p.id) ? 'bg-violet-100' : ''}`}
                        >
                          <span>{p.name}</span>
                          <span className="text-sm text-gray-500">{p.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">מוצרים נבחרים ({selectedIds.size})</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {selectedProducts.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-800 rounded-full text-sm">
                        {p.name}
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }} className="hover:text-red-600">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tables */}
            <div ref={printRef}>
              {/* Table 1: Metrics */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-violet-700">
                    <TrendingUp size={20} />
                    השוואת מדדים
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleCompPrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                      <FileText size={16} />PDF
                    </button>
                    <button onClick={exportCompMetricsCSV} className="flex items-center gap-1 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h2 className="hidden print:block">השוואת מדדים</h2>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">מחזור ₪</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-violet-50 font-bold text-violet-800 border-b-2 border-violet-300 summary-row">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald text-emerald-600' : 'text-red text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedProducts.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedProducts.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">{fmt(selectedProducts.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                        <td className="p-2 text-center">₪{fmt(selectedProducts.reduce((s, x) => s + (x.sales_2025 || 0), 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedProducts].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((p, i) => {
                        const statusLongCfg = STATUS_CFG[p.status_long] || STATUS_CFG['יציב'];
                        const statusShortCfg = STATUS_CFG[p.status_short] || STATUS_CFG['יציב'];
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => { setShowComparison(false); onSelect(p); }}
                            className="hover:bg-violet-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_long || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_12v12 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_12v12)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_2024)}→{fmt(p.qty_2025)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_3v3 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_3v3)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev3)}→{fmt(p.qty_last3)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_6v6 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_6v6)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev6)}→{fmt(p.qty_last6)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(p.metric_2v2 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(p.metric_2v2)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(p.qty_prev2)}→{fmt(p.qty_last2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{p.status_short || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center font-medium">{fmt(p.qty_2025)}</td>
                            <td className="p-2 text-center">₪{fmt(p.sales_2025)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Table 2: Data */}
              <div>
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-cyan-700">
                    <BarChart3 size={20} />
                    נתונים חודשיים
                    <PeriodSelector value={compDataPeriod} onChange={setCompDataPeriod} className="print:hidden" />
                    <span className="hidden print:inline text-sm text-gray-500">({getPeriodLabel(compDataPeriod)})</span>
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={exportCompDataCSV} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(compDataPeriod)})</h3>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-cyan-50 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">מוצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-amber-50">מחזור ₪</th>
                      </tr>
                      {/* Summary Row */}
                      {(() => {
                        const compProducts = selectedProducts.map(p => calcProductDataForPeriod(p, compDataPeriod));
                        const totalGross = compProducts.reduce((s, x) => s + x.period_gross, 0);
                        const totalNet = compProducts.reduce((s, x) => s + x.period_net, 0);
                        const totalReturns = compProducts.reduce((s, x) => s + x.period_returns, 0);
                        const totalSales = compProducts.reduce((s, x) => s + (x.period_sales || 0), 0);
                        const avgReturnsPct = totalGross > 0 ? (totalReturns / totalGross * 100) : 0;
                        return (
                          <tr className="bg-cyan-100 font-bold text-cyan-800 border-b-2 border-cyan-300 summary-row-data">
                            <td className="p-2 text-center">Σ</td>
                            <td className="p-2 text-right">סה״כ {selectedProducts.length} מוצרים</td>
                            <td className="p-2 text-center text-blue-700">{fmt(totalGross)}</td>
                            <td className="p-2 text-center text-green-700">{fmt(totalNet)}</td>
                            <td className="p-2 text-center text-red-600">{fmt(totalReturns)}</td>
                            <td className="p-2 text-center text-red-600">{avgReturnsPct.toFixed(1)}%</td>
                            <td className="p-2 text-center text-amber-700">₪{fmt(totalSales)}</td>
                          </tr>
                        );
                      })()}
                    </thead>
                    <tbody>
                      {[...selectedProducts].map(p => calcProductDataForPeriod(p, compDataPeriod)).sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((p, i) => {
                        const returnsPctColor = p.period_returns_pct > 20 ? 'text-red-600 font-bold' : p.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                        return (
                          <tr 
                            key={p.id} 
                            onClick={() => { setShowComparison(false); onSelect(p); }}
                            className="hover:bg-cyan-50 border-b cursor-pointer transition-colors"
                          >
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-gray-500 small">{p.category}</div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-blue-700">{fmt(p.period_gross)}</td>
                            <td className="p-2 text-center bg-green-50/30 font-medium text-green-700">{fmt(p.period_net)}</td>
                            <td className="p-2 text-center bg-red-50/30 font-medium text-red-600">{fmt(p.period_returns)}</td>
                            <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{(p.period_returns_pct || 0).toFixed(1)}%</td>
                            <td className="p-2 text-center bg-amber-50/30 font-medium text-amber-700">₪{fmt(Math.round(p.period_sales || 0))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>)
};

// v1.10.11 - Added onSelectStore for clicking on stores
const ProductDetail = ({ product, onBack, rulesConfig, onSelectStore }) => {
  const [minQty, setMinQty] = useState(0);
  const chart = useMemo(() => { if (!product.monthly_qty) return []; return Object.entries(product.monthly_qty).sort(([a],[b]) => Number(a)-Number(b)).map(([m,v]) => ({ month: fmtMonth(m), qty: v })); }, [product]);
  const allStoresRaw = PRODUCT_STORES[String(product.id)] || [];
  // Apply rules config to calculate status
  const allStores = useMemo(() => applyConfig(allStoresRaw, rulesConfig || DEFAULT_RULES_CONFIG), [allStoresRaw, rulesConfig]);
  const stores = useMemo(() => minQty > 0 ? allStores.filter(s => (s.qty_2025 || 0) >= minQty) : allStores, [allStores, minQty]);
  
  // v1.10.9 - Table view tabs and comparison for stores (like StoresList)
  const [tableView, setTableView] = useState('metrics'); // 'metrics' or 'data'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [compSearchTerm, setCompSearchTerm] = useState('');
  
  // v1.10.9 - Period selection for data tables
  const [dataPeriod, setDataPeriod] = useState('h2_2025');
  const [compDataPeriod, setCompDataPeriod] = useState('h2_2025');
  const printRef = useRef(null);
  
  // v1.10.12 - Calculate data for stores based on selected period (using product store function)
  const storesWithData = useMemo(() => stores.map(s => calcProductStoreDataForPeriod(s, dataPeriod)), [stores, dataPeriod]);
  
  // Calculate summary values for metrics table
  const summaryData = useMemo(() => {
    const count = stores.length;
    if (count === 0) return null;
    const avg12v12 = stores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / count;
    const avg3v3 = stores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / count;
    const avg6v6 = stores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / count;
    const avg2v2 = stores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / count;
    const avgPeak = stores.reduce((s, x) => s + (x.metric_peak_distance || 0), 0) / count;
    const avgReturns = stores.reduce((s, x) => s + (x.returns_pct_last6 || 0), 0) / count;
    const totalQty = stores.reduce((s, x) => s + (x.qty_total || 0), 0);
    return { count, avg12v12, avg3v3, avg6v6, avg2v2, avgPeak, avgReturns, totalQty };
  }, [stores]);
  
  // v1.10.12 - Data table summary (no deliveries for product stores)
  const dataSummary = useMemo(() => {
    const count = storesWithData.length;
    if (count === 0) return null;
    const totalGross = storesWithData.reduce((s, x) => s + x.period_gross, 0);
    const totalNet = storesWithData.reduce((s, x) => s + x.period_net, 0);
    const totalReturns = storesWithData.reduce((s, x) => s + x.period_returns, 0);
    const avgReturnsPct = totalGross > 0 ? (totalReturns / totalGross * 100) : 0;
    return { count, totalGross, totalNet, totalReturns, avgReturnsPct };
  }, [storesWithData]);
  
  // Toggle store selection
  const toggleSelect = (id, e) => {
    e && e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  // Search for comparison
  const compSearchResults = compSearchTerm.length >= 2 
    ? stores.filter(s => s.name.toLowerCase().includes(compSearchTerm.toLowerCase()) || s.city?.toLowerCase().includes(compSearchTerm.toLowerCase())).slice(0, 15)
    : [];
  
  const selectedStores = stores.filter(s => selectedIds.has(s.id));
  
  // Metrics columns with checkbox
  const storeMetricsCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-emerald-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'חנות', r: (v, r) => <div className="min-w-[120px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'status_long', l: 'סטטוס\nארוך', r: (v, r) => <LongTermBadge status={r.status_long || 'יציב'} sm isFallback={r.is_fallback} /> },
    { k: 'metric_12v12', l: 'שנתי\n24→25', t: METRIC_TIPS['12v12'], r: (v, r) => <MetricCell pct={v} from={r.qty_2024} to={r.qty_2025} /> },
    { k: 'metric_3v3', l: '3 חודשים', t: METRIC_TIPS['3v3'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev3} to={r.qty_last3} /> },
    { k: 'metric_6v6', l: '6 חודשים', t: METRIC_TIPS['6v6'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev6} to={r.qty_last6} /> },
    { k: 'metric_2v2', l: '2 חודשים', t: METRIC_TIPS['2v2'], r: (v, r) => <MetricCell pct={v} from={r.qty_prev2} to={r.qty_last2} /> },
    { k: 'status_short', l: 'סטטוס\nקצר', r: (v, r) => <ShortTermBadge status={r.status_short || 'יציב'} sm /> },
    { k: 'metric_peak_distance', l: 'מרחק מהשיא', t: METRIC_TIPS['peak'], r: (v, r) => <PeakCell pct={v} peak={r.peak_value} current={r.current_value} /> },
    { k: 'returns_pct_last6', l: 'חזרות %', t: METRIC_TIPS['returns'], r: (v, r) => {
      const pctL6 = r.returns_pct_last6 ?? v ?? 0;
      const pctP6 = r.returns_pct_prev6 ?? 0;
      const change = r.returns_change ?? (pctL6 - pctP6);
      return <ReturnsCell pctL6={pctL6} pctP6={pctP6} change={change} />;
    }},
    { k: 'qty_total', l: 'כמות', r: v => <span className="font-bold">{fmt(v)}</span> },
  ];
  
  // Data columns (dynamic period) - v1.10.12 - no deliveries for product stores
  const storeDataCols = [
    { k: 'select', l: '☑', r: (v, r) => <div onClick={e => { e.stopPropagation(); toggleSelect(r.id); }} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-purple-100 rounded-lg -m-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => {}} className="w-5 h-5 cursor-pointer pointer-events-none" /></div> },
    { k: 'name', l: 'חנות', r: (v, r) => <div className="min-w-[100px]"><p className="font-medium text-sm leading-tight">{v}</p><p className="text-xs text-gray-500">{r.city}</p></div> },
    { k: 'period_gross', l: 'ברוטו', r: v => <span className="font-medium text-blue-700">{fmt(v)}</span> },
    { k: 'period_net', l: 'נטו', r: v => <span className="font-medium text-green-700">{fmt(v)}</span> },
    { k: 'period_returns', l: 'חזרות', r: v => <span className="font-medium text-red-600">{fmt(v)}</span> },
    { k: 'period_returns_pct', l: 'חזרות\n%', r: v => <span className={v > 20 ? 'text-red-600 font-bold' : v > 10 ? 'text-blue-600' : 'text-gray-600'}>{(v || 0).toFixed(1)}%</span> },
  ];
  
  // Build summary rows
  const metricsSummaryRow = summaryData ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-emerald-700">Σ סה״כ {summaryData.count} חנויות</span>, className: 'text-right' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className={summaryData.avg12v12 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg12v12)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg3v3 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg3v3)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg6v6 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg6v6)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avg2v2 >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmtPct(summaryData.avg2v2)}</span>, className: 'text-center' },
    { value: '-', className: 'text-center text-gray-400' },
    { value: <span className="text-red-600">{fmtPct(summaryData.avgPeak)}</span>, className: 'text-center' },
    { value: <span className={summaryData.avgReturns > 15 ? 'text-red-600' : 'text-gray-700'}>{summaryData.avgReturns.toFixed(1)}%</span>, className: 'text-center' },
    { value: <span className="font-bold text-emerald-700">{fmt(summaryData.totalQty)}</span>, className: 'text-center' },
  ] : null;
  
  const dataSummaryRow = dataSummary ? [
    { value: '', className: 'text-center' },
    { value: <span className="text-purple-700">Σ סה״כ {dataSummary.count} חנויות</span>, className: 'text-right' },
    { value: <span className="font-bold text-blue-700">{fmt(dataSummary.totalGross)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-green-700">{fmt(dataSummary.totalNet)}</span>, className: 'text-center' },
    { value: <span className="font-bold text-red-600">{fmt(dataSummary.totalReturns)}</span>, className: 'text-center' },
    { value: <span className={dataSummary.avgReturnsPct > 15 ? 'text-red-600 font-bold' : 'text-gray-700'}>{dataSummary.avgReturnsPct.toFixed(1)}%</span>, className: 'text-center' },
  ] : null;
  
  // Export functions
  const exportMetricsCSV = () => {
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' }, { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'metric_12v12', l: 'שנתי %' }, { k: 'metric_3v3', l: '3 חודשים %' }, { k: 'metric_6v6', l: '6 חודשים %' }, { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' }, { k: 'metric_peak_distance', l: 'מרחק מהשיא %' }, { k: 'returns_pct_last6', l: 'חזרות %' }, { k: 'qty_total', l: 'כמות' },
    ];
    exportCSV(stores, cols, `חנויות_${product.name}_מדדים`);
  };
  
  const exportDataCSV = () => {
    const periodLabel = getPeriodLabel(dataPeriod).replace(/[()]/g, '');
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' },
      { k: 'period_gross', l: 'ברוטו' }, { k: 'period_net', l: 'נטו' }, { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
    ];
    exportCSV(storesWithData, cols, `חנויות_${product.name}_נתונים_${periodLabel}`);
  };
  
  // Comparison PDF export
  const handleCompPrintPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>השוואת חנויות - ${product.name} - Baron</title>
        <style>
          * { box-sizing: border-box; font-family: Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h2 { color: #059669; margin: 20px 0 10px; font-size: 18px; }
          h3 { color: #7c3aed; margin: 20px 0 10px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
          th { background: #f3f4f6; font-weight: bold; }
          tr { page-break-inside: avoid; }
          .text-right { text-align: right; }
          .text-emerald { color: #059669; }
          .text-red { color: #dc2626; }
          .text-blue { color: #2563eb; }
          .text-green { color: #16a34a; }
          .text-purple { color: #7c3aed; }
          .summary-row { background: #d1fae5; font-weight: bold; }
          .summary-row-data { background: #ede9fe; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          @media print { 
            @page { margin: 1cm; size: landscape; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 style="text-align:center;color:#1f2937;">השוואת חנויות - ${product.name} - Baron</h1>
        <p style="text-align:center;color:#666;margin-bottom:20px;">${selectedStores.length} חנויות | ${new Date().toLocaleDateString('he-IL')}</p>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };
  
  // Export comparison to CSV
  const exportCompMetricsCSV = () => {
    if (selectedStores.length === 0) return;
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' }, { k: 'status_long', l: 'סטטוס ארוך' },
      { k: 'qty_2024', l: 'כמות 2024' }, { k: 'qty_2025', l: 'כמות 2025' },
      { k: 'metric_12v12', l: 'שנתי %' }, { k: 'metric_3v3', l: '3 חודשים %' }, { k: 'metric_6v6', l: '6 חודשים %' }, { k: 'metric_2v2', l: '2 חודשים %' },
      { k: 'status_short', l: 'סטטוס קצר' },
    ];
    exportCSV(selectedStores, cols, `השוואת_חנויות_${product.name}_מדדים`);
  };
  
  const exportCompDataCSV = () => {
    if (selectedStores.length === 0) return;
    const periodLabel = getPeriodLabel(compDataPeriod).replace(/[()]/g, '');
    const selectedWithData = selectedStores.map(s => calcProductStoreDataForPeriod(s, compDataPeriod));
    const cols = [
      { k: 'name', l: 'חנות' }, { k: 'city', l: 'עיר' },
      { k: 'period_gross', l: 'ברוטו' }, { k: 'period_net', l: 'נטו' }, { k: 'period_returns', l: 'חזרות' },
      { k: 'period_returns_pct', l: 'חזרות %' },
    ];
    exportCSV(selectedWithData, cols, `השוואת_חנויות_${product.name}_${periodLabel}`);
  };
  
  return (<div className="space-y-6">
    <div className="flex justify-between items-center print:hidden">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-800"><ChevronRight className="rotate-180" size={20}/>חזרה</button>
      <button onClick={() => exportPDF(product.name + ' - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm"><FileText size={16}/>PDF</button>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">{product.name}</h1><p className="text-gray-500 mt-1">{product.category}</p></div>
        <Badge status={product.status} />
      </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <MBox label="שנתי (24→25)" value={product.metric_12v12} sub={fmt(product.qty_2024) + '→' + fmt(product.qty_2025)} />
      <MBox label="6 חודשים" value={product.metric_6v6} sub={fmt(product.qty_prev6) + '→' + fmt(product.qty_last6)} />
      <MBox label="3 חודשים" value={product.metric_3v3} sub={fmt(product.qty_prev3) + '→' + fmt(product.qty_last3)} />
      <MBox label="2 חודשים" value={product.metric_2v2} sub={fmt(product.qty_prev2) + '→' + fmt(product.qty_last2)} />
      <MBox label="מרחק מהשיא" value={product.metric_peak_distance} extra={'שיא: ' + fmt(product.peak_value) + ' | דצמ: ' + fmt(product.current_value)} />
      <MBox label="חזרות %" value={(product.returns_pct_prev6?.toFixed(1) || 0) + '%→' + (product.returns_pct_last6?.toFixed(1) || 0) + '%'} sub={'שינוי: ' + (product.returns_change > 0 ? '+' : '') + (product.returns_change?.toFixed(1) || 0) + '%'} pos={product.returns_change <= 0} />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2024</p><p className="text-2xl font-bold text-blue-600">{fmt(product.qty_2024)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">כמות 2025</p><p className="text-2xl font-bold text-emerald-600">{fmt(product.qty_2025)}</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">חזרות % (H2)</p><p className="text-xl font-bold text-gray-600">{(product.returns_pct_last6 || 0).toFixed(1)}%</p></div>
      <div className="bg-white rounded-xl shadow p-4 text-center"><p className="text-sm text-gray-500">מחזור</p><p className="text-xl font-bold text-gray-600">₪{fmt(product.total_sales)}</p></div>
    </div>
    {/* v1.8.1 - Monthly Sales Chart (Table + Graph combined) */}
    <MonthlySalesChart product={product} title={`מכירות חודשיות - ${product.name}`} />
    <div className="bg-white rounded-2xl shadow-lg p-6 border"><h3 className="text-lg font-bold mb-4">מגמת כמויות (כל התקופה)</h3><ResponsiveContainer width="100%" height={250}><AreaChart data={chart}><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" tick={{fontSize:10}} /><YAxis tickFormatter={v => fmt(v)} tick={{fontSize:10}} /><Tooltip formatter={v => fmt(v)} /><Area type="monotone" dataKey="qty" stroke="#8b5cf6" fill="url(#pg)" name="כמות" /></AreaChart></ResponsiveContainer></div>
    
    {/* v1.10.9 - Stores Table with Tabs */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-bold">חנויות שמוכרות ({stores.length}{minQty > 0 ? ` מתוך ${allStores.length}` : ''})</h3>
        <div className="flex items-center gap-2 print:hidden">
          {selectedIds.size > 0 && (
            <button onClick={() => setShowComparison(true)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
              <BarChart3 size={16} />השווה ({selectedIds.size})
            </button>
          )}
          <button onClick={tableView === 'metrics' ? exportMetricsCSV : exportDataCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm"><Download size={16}/>Excel</button>
          <label className="text-sm text-gray-600">מינ׳:</label>
          <input type="number" value={minQty || ''} onChange={e => setMinQty(Number(e.target.value) || 0)} placeholder="0" className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm" />
        </div>
      </div>
      
      {/* v1.10.9 - Table View Tabs */}
      <div className="flex gap-2 mb-4 print:hidden">
        <button 
          onClick={() => setTableView('metrics')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'metrics' ? 'bg-emerald-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          📊 מדדים
        </button>
        <button 
          onClick={() => setTableView('data')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${tableView === 'data' ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          📈 נתונים
        </button>
        {selectedIds.size > 0 && (
          <button onClick={clearSelection} className="mr-auto text-sm text-red-600 hover:text-red-800 flex items-center gap-1">
            <X size={14} /> נקה בחירה ({selectedIds.size})
          </button>
        )}
      </div>
      
      {/* Table based on view selection */}
      {stores.length > 0 ? (
        tableView === 'metrics' ? (
          <Table data={stores} cols={storeMetricsCols} name={'product_' + product.id + '_stores_metrics'} compact summaryRow={metricsSummaryRow} onRow={onSelectStore} />
        ) : (
          <Table data={storesWithData} cols={storeDataCols} name={'product_' + product.id + '_stores_data'} compact summaryRow={dataSummaryRow} periodSelector={<PeriodSelector value={dataPeriod} onChange={setDataPeriod} />} onRow={onSelectStore} />
        )
      ) : <p className="text-gray-500 text-center py-8">אין נתונים</p>}
    </div>
    
    {/* v1.10.9 - Stores Comparison Modal */}
    {showComparison && selectedIds.size > 0 && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={() => setShowComparison(false)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-3">
              <Store size={24} />
              <h2 className="text-lg md:text-xl font-bold">השוואת חנויות - {product.name}</h2>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{selectedIds.size} נבחרו</span>
            </div>
            <button onClick={() => setShowComparison(false)} className="p-2 hover:bg-white/20 rounded-full">
              <X size={24} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-80px)] space-y-6">
            
            {/* Search to add more */}
            <div className="bg-gray-50 rounded-xl p-4 border print:hidden">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">הוסף חנויות נוספות</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={compSearchTerm}
                      onChange={e => setCompSearchTerm(e.target.value)}
                      placeholder="חפש חנות..."
                      className="w-full pr-10 pl-4 py-2 border rounded-xl"
                    />
                  </div>
                  {compSearchResults.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg bg-white">
                      {compSearchResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { toggleSelect(s.id); setCompSearchTerm(''); }}
                          className={`w-full text-right px-3 py-2 hover:bg-emerald-50 flex justify-between items-center border-b last:border-b-0 ${selectedIds.has(s.id) ? 'bg-emerald-100' : ''}`}
                        >
                          <span>{s.name}</span>
                          <span className="text-sm text-gray-500">{s.city}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 block mb-2">חנויות נבחרות ({selectedIds.size})</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {selectedStores.map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                        {s.name}
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }} className="hover:text-red-600">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tables */}
            <div ref={printRef}>
              {/* Table 1: Metrics */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-700">
                    <TrendingUp size={20} />
                    השוואת מדדים
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={handleCompPrintPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">
                      <FileText size={16} />PDF
                    </button>
                    <button onClick={exportCompMetricsCSV} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h2 className="hidden print:block">השוואת מדדים</h2>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">חנות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>ארוך</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">שנתי<br/>24→25</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">3 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">6 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">2 חודשים</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">סטטוס<br/>קצר</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold">כמות<br/>2025</th>
                      </tr>
                      {/* Summary Row */}
                      <tr className="bg-emerald-50 font-bold text-emerald-800 border-b-2 border-emerald-300 summary-row">
                        <td className="p-2 text-center">Σ</td>
                        <td className="p-2 text-right">סה״כ {selectedStores.length} חנויות</td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_12v12 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_3v3 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_6v6 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={(selectedStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedStores.length) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {fmtPct(selectedStores.reduce((s, x) => s + (x.metric_2v2 || 0), 0) / selectedStores.length)}
                          </span>
                        </td>
                        <td className="p-2 text-center">-</td>
                        <td className="p-2 text-center">{fmt(selectedStores.reduce((s, x) => s + (x.qty_2025 || 0), 0))}</td>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedStores].sort((a, b) => (b.metric_12v12 || 0) - (a.metric_12v12 || 0)).map((s, i) => {
                        const statusLongCfg = STATUS_CFG[s.status_long] || STATUS_CFG['יציב'];
                        const statusShortCfg = STATUS_CFG[s.status_short] || STATUS_CFG['יציב'];
                        return (
                          <tr key={s.id} className="hover:bg-emerald-50 border-b transition-colors">
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500 small">{s.city}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusLongCfg.bg} ${statusLongCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_long || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_12v12 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(s.metric_12v12)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_2024)}→{fmt(s.qty_2025)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_3v3 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(s.metric_3v3)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev3)}→{fmt(s.qty_last3)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_6v6 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(s.metric_6v6)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev6)}→{fmt(s.qty_last6)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className={`font-medium ${(s.metric_2v2 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(s.metric_2v2)}</div>
                              <div className="text-xs text-gray-400 small">{fmt(s.qty_prev2)}→{fmt(s.qty_last2)}</div>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`${statusShortCfg.bg} ${statusShortCfg.text} px-1.5 py-0.5 rounded text-xs whitespace-nowrap`}>{s.status_short || 'יציב'}</span>
                            </td>
                            <td className="p-2 text-center font-medium">{fmt(s.qty_2025)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Table 2: Data - v1.10.12 - no deliveries for product stores */}
              <div>
                <div className="flex justify-between items-center mb-3 print:hidden">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-purple-700">
                    <BarChart3 size={20} />
                    נתונים חודשיים
                    <PeriodSelector value={compDataPeriod} onChange={setCompDataPeriod} className="print:hidden" />
                    <span className="hidden print:inline text-sm text-gray-500">({getPeriodLabel(compDataPeriod)})</span>
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={exportCompDataCSV} className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                      <Download size={16} />Excel
                    </button>
                  </div>
                </div>
                <h3 className="hidden print:block">נתונים חודשיים ({getPeriodLabel(compDataPeriod)})</h3>
                <div className="overflow-x-auto border rounded-xl print:border-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-50 text-gray-700">
                        <th className="p-2 md:p-3 text-right border-b font-bold">#</th>
                        <th className="p-2 md:p-3 text-right border-b font-bold min-w-[120px]">חנות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-blue-50">ברוטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-green-50">נטו</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות</th>
                        <th className="p-2 md:p-3 text-center border-b font-bold bg-red-50">חזרות %</th>
                      </tr>
                      {/* Summary Row */}
                      {(() => {
                        const compStores = selectedStores.map(s => calcProductStoreDataForPeriod(s, compDataPeriod));
                        const totalGross = compStores.reduce((s, x) => s + x.period_gross, 0);
                        const totalNet = compStores.reduce((s, x) => s + x.period_net, 0);
                        const totalReturns = compStores.reduce((s, x) => s + x.period_returns, 0);
                        const avgReturnsPct = totalGross > 0 ? (totalReturns / totalGross * 100) : 0;
                        return (
                          <tr className="bg-purple-100 font-bold text-purple-800 border-b-2 border-purple-300 summary-row-data">
                            <td className="p-2 text-center">Σ</td>
                            <td className="p-2 text-right">סה״כ {selectedStores.length} חנויות</td>
                            <td className="p-2 text-center text-blue-700">{fmt(totalGross)}</td>
                            <td className="p-2 text-center text-green-700">{fmt(totalNet)}</td>
                            <td className="p-2 text-center text-red-600">{fmt(totalReturns)}</td>
                            <td className="p-2 text-center text-red-600">{avgReturnsPct.toFixed(1)}%</td>
                          </tr>
                        );
                      })()}
                    </thead>
                    <tbody>
                      {[...selectedStores].map(s => calcProductStoreDataForPeriod(s, compDataPeriod)).sort((a, b) => (b.period_net || 0) - (a.period_net || 0)).map((s, i) => {
                        const returnsPctColor = s.period_returns_pct > 20 ? 'text-red-600 font-bold' : s.period_returns_pct > 10 ? 'text-blue-600' : 'text-gray-600';
                        return (
                          <tr key={s.id} className="hover:bg-purple-50 border-b transition-colors">
                            <td className="p-2 text-center font-bold">{i + 1}</td>
                            <td className="p-2 text-right">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500 small">{s.city}</div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/30 font-medium text-blue-700">{fmt(s.period_gross)}</td>
                            <td className="p-2 text-center bg-green-50/30 font-medium text-green-700">{fmt(s.period_net)}</td>
                            <td className="p-2 text-center bg-red-50/30 font-medium text-red-600">{fmt(s.period_returns)}</td>
                            <td className={`p-2 text-center bg-red-50/30 ${returnsPctColor}`}>{(s.period_returns_pct || 0).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>);
};

const Alerts = ({ stores, onSelect }) => {
  const [alertConfig, setAlertConfigState] = useState(DEFAULT_ALERT_CONFIG);
  const [statusFilter, setStatusFilter] = useState([]);
  const [cityFilter, setCityFilter] = useState([]);
  const [driverFilter, setDriverFilter] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [minQty, setMinQty] = useState(0);
  const [sortBy, setSortBy] = useState('metric'); // 'metric' or 'qty'
  
  React.useEffect(() => { setAlertConfigState(getAlertConfig()); }, []);
  
  // v1.8.9 - stores is already filtered for active only
  const allAlerts = useMemo(() => {
    return stores.filter(s => isAlert(s, alertConfig))
      .map(s => ({ ...s, alertReason: getAlertReason(s, alertConfig) }));
  }, [stores, alertConfig]);
  
  // Get unique values for filters
  const uniqueStatuses = useMemo(() => [...new Set(allAlerts.map(s => s.status_long))], [allAlerts]);
  const uniqueCities = useMemo(() => [...new Set(allAlerts.map(s => s.city).filter(Boolean))].sort(), [allAlerts]);
  const uniqueDrivers = useMemo(() => [...new Set(allAlerts.map(s => s.driver).filter(Boolean))].sort(), [allAlerts]);
  
  // Calculate max qty for slider
  const maxQty = useMemo(() => Math.max(...allAlerts.map(s => s.qty_2025 || 0), 1000), [allAlerts]);
  
  // Apply filters and sorting
  const filtered = useMemo(() => {
    let result = allAlerts;
    if (statusFilter.length > 0) result = result.filter(s => statusFilter.includes(s.status_long));
    if (cityFilter.length > 0) result = result.filter(s => cityFilter.includes(s.city));
    if (driverFilter.length > 0) result = result.filter(s => driverFilter.includes(s.driver));
    if (searchTerm) result = result.filter(s => s.name.includes(searchTerm) || s.city?.includes(searchTerm));
    if (minQty > 0) result = result.filter(s => (s.qty_2025 || 0) >= minQty);
    
    // Sort
    if (sortBy === 'qty') {
      result = [...result].sort((a, b) => (b.qty_2025 || 0) - (a.qty_2025 || 0));
    } else {
      result = [...result].sort((a, b) => (a.metric_12v12 || 0) - (b.metric_12v12 || 0));
    }
    
    return result;
  }, [allAlerts, statusFilter, cityFilter, driverFilter, searchTerm, minQty, sortBy]);
  
  const hasFilters = statusFilter.length > 0 || cityFilter.length > 0 || driverFilter.length > 0 || searchTerm || minQty > 0;
  
  return (<div className="space-y-4">
    <div className="flex justify-between items-center flex-wrap gap-2">
      <h2 className="text-xl font-bold">🚨 התראות ({filtered.length}{filtered.length !== allAlerts.length ? ` מתוך ${allAlerts.length}` : ''})</h2>
      <button onClick={() => exportPDF('התראות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
    </div>
    
    {/* Filters */}
    <div className="bg-white rounded-xl shadow p-4 border print:hidden space-y-4">
      {/* Row 1: Basic filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <input type="text" placeholder="🔍 חיפוש..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        <select value={statusFilter[0] || ''} onChange={e => setStatusFilter(e.target.value ? [e.target.value] : [])} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">כל הסטטוסים</option>
          {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cityFilter[0] || ''} onChange={e => setCityFilter(e.target.value ? [e.target.value] : [])} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">כל הערים</option>
          {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={driverFilter[0] || ''} onChange={e => setDriverFilter(e.target.value ? [e.target.value] : [])} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">כל הנהגים</option>
          {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="metric">מיין: לפי ירידה</option>
          <option value="qty">מיין: לפי כמות 2025</option>
        </select>
      </div>
      
      {/* Row 2: Min qty slider and hide inactive */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-[250px]">
          <label className="text-sm text-gray-600 whitespace-nowrap">מינימום פריטים (2025):</label>
          <input type="range" min="0" max={maxQty} step="100" value={minQty} onChange={e => setMinQty(Number(e.target.value))} className="flex-1" />
          <span className="text-sm font-bold text-blue-600 w-16 text-left">{fmt(minQty)}</span>
        </div>
        {hasFilters && (
          <button onClick={() => { setStatusFilter([]); setCityFilter([]); setDriverFilter([]); setSearchTerm(''); setMinQty(0); }} className="px-3 py-1.5 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">נקה סינון</button>
        )}
      </div>
    </div>
    
    {filtered.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">אין התראות{allAlerts.length > 0 ? ' (לפי הסינון הנוכחי)' : ' - כל החנויות בסדר!'}</p></div> : 
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map(s => {
      const cfg = STATUS_LONG_CFG[s.status_long] || STATUS_LONG_CFG['ירידה'];
      return (
        <div key={s.id} onClick={() => onSelect(s)} className={`bg-white rounded-2xl shadow-lg p-5 border-2 ${cfg.border} hover:shadow-xl cursor-pointer transition-shadow`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg">{s.name}</h3>
              <p className="text-sm text-gray-500">{s.city}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${cfg.bg} ${cfg.text}`}>
              {cfg.emoji || ''} {s.status_long}
            </span>
          </div>
          {/* Alert Reason */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
            <p className="text-sm font-medium text-red-700">⚠️ סיבת התראה: {s.alertReason}</p>
          </div>
          {/* Status Explanation Table */}
          {s.metrics_comparison && s.metrics_comparison.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm font-bold text-gray-700 mb-2">{s.status_explanation}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-right py-1 px-1 font-medium text-gray-600">מדד</th>
                    <th className="text-right py-1 px-1 font-medium text-gray-600">תקופה</th>
                    <th className="text-center py-1 px-1 font-medium text-gray-600">חוק</th>
                    <th className="text-center py-1 px-1 font-medium text-gray-600">בפועל</th>
                  </tr>
                </thead>
                <tbody>
                  {s.metrics_comparison.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-1 px-1 font-medium text-gray-800">{row.name}</td>
                      <td className="py-1 px-1 text-gray-500 text-xs">{row.period}</td>
                      <td className="py-1 px-1 text-center text-gray-700">{row.rule || '-'}</td>
                      <td className={`py-1 px-1 text-center font-bold ${(row.actualValue || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{row.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-purple-50 rounded-lg p-2"><p className="text-xs text-gray-500">כמות 2025</p><p className="font-bold text-purple-600">{fmt(s.qty_2025)}</p></div>
            <div className="bg-red-50 rounded-lg p-2"><p className="text-xs text-gray-500">שנתי</p><p className={`font-bold ${(s.metric_12v12 || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(s.metric_12v12)}</p></div>
            <div className="bg-orange-50 rounded-lg p-2"><p className="text-xs text-gray-500">חצי שנתי</p><p className={`font-bold ${(s.metric_6v6 || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>{fmtPct(s.metric_6v6)}</p></div>
            <div className="bg-blue-50 rounded-lg p-2"><p className="text-xs text-gray-500">רבעוני</p><p className={`font-bold ${(s.metric_3v3 || 0) >= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>{fmtPct(s.metric_3v3)}</p></div>
            <div className="bg-cyan-50 rounded-lg p-2"><p className="text-xs text-gray-500">2 חודשים</p><p className={`font-bold ${(s.metric_2v2 || 0) >= 0 ? 'text-emerald-600' : 'text-cyan-600'}`}>{fmtPct(s.metric_2v2)}</p></div>
          </div>
        </div>
      );
    })}</div>}
  </div>);
};

const Rankings = ({ stores, onSelect }) => {
  // Recovery = stores with negative long-term but positive short-term (2 months)
  // v1.8.9 - stores is already filtered for active only
  const r = useMemo(() => ({
    qty: [...stores].sort((a,b) => (b.qty_total||0)-(a.qty_total||0)).slice(0,30),
    growth: [...stores].sort((a,b) => (b.metric_12v12||0)-(a.metric_12v12||0)).slice(0,30),
    recovery: [...stores].filter(s => s.is_recovering || (s.status_long === 'ירידה' || s.status_long === 'התרסקות') && s.status_short === 'עליה חדה').slice(0,30)
  }), [stores]);
  const List = ({ title, data, icon, bg, showGrowth, showRecovery }) => (
    <div className="bg-white rounded-2xl shadow-lg p-5 border">
      <h3 className="text-lg font-bold mb-4">{icon} {title} {data.length > 0 && <span className="text-sm font-normal text-gray-500">({data.length})</span>}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-8">אין נתונים</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.map((s,i) => (
            <div key={s.id} onClick={() => onSelect(s)} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className={'w-6 h-6 flex items-center justify-center text-white rounded-full text-xs font-bold ' + bg}>{i+1}</span>
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              {showRecovery ? (
                <div className="text-left">
                  <p className="text-xs text-gray-500">ארוך: <span className="text-red-600 font-bold">{fmtPct(s.metric_long_term || s.metric_12v12)}</span></p>
                  <p className="text-xs text-gray-500">קצר: <span className="text-emerald-600 font-bold">{fmtPct(s.metric_2v2 || s.metric_short_term)}</span></p>
                </div>
              ) : (
                <span className={'text-sm font-bold ' + (showGrowth ? (s.metric_12v12 >= 0 ? 'text-emerald-600' : 'text-red-600') : '')}>{showGrowth ? fmtPct(s.metric_12v12) : fmt(s.qty_total)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">דירוגים</h2>
        <button onClick={() => exportPDF('דירוגים - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <List title="לפי כמות כוללת" data={r.qty} icon="🏆" bg="bg-blue-500" />
        <List title="לפי צמיחה" data={r.growth} icon="📈" bg="bg-emerald-500" showGrowth />
        <List title="התאוששות" data={r.recovery} icon="💪" bg="bg-blue-500" showRecovery />
      </div>
    </div>
  );
};

const Inactive = ({ stores, onSelect }) => {
  // v1.8.9 - stores is already filtered for inactive, just sort
  const list = useMemo(() => [...stores].sort((a,b) => (b.last_active_month||0)-(a.last_active_month||0)), [stores]);
  return (<div className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-bold">לא פעילות ({list.length})</h2><button onClick={() => exportPDF('לא פעילות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>{list.length === 0 ? <div className="bg-white rounded-2xl shadow-lg p-12 text-center"><Check className="mx-auto text-emerald-500 mb-4" size={48}/><p className="text-gray-600">כל החנויות פעילות!</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map(s => <div key={s.id} onClick={() => onSelect(s)} className="bg-white rounded-2xl shadow p-5 border hover:border-gray-400 cursor-pointer"><div className="flex justify-between items-start mb-3"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-gray-500">{s.city}</p></div><XCircle className="text-red-400" size={20}/></div><div className="space-y-1 text-sm"><p className="text-gray-500">כמות כוללת: <span className="font-semibold">{fmt(s.qty_total)}</span></p><p className="text-gray-500">מחזור: <span className="font-semibold">₪{fmt(s.total_sales)}</span></p><p className="text-red-600 font-medium mt-2">פעילות אחרונה: {fmtMonthHeb(s.last_active_month)}</p></div></div>)}</div>}</div>);
};

const Trends = ({ stores, products, onDrillDown }) => {
  const trend = useMemo(() => { const m = {}; stores.forEach(s => { if (s.monthly_qty) Object.entries(s.monthly_qty).forEach(([k,v]) => { m[k] = (m[k]||0) + v; }); }); return Object.entries(m).sort(([a],[b]) => Number(a)-Number(b)).map(([k,v]) => ({ month: fmtMonth(k), value: v })); }, [stores]);
  
  // v1.10.7 - Returns trend (% per month)
  const returnsTrend = useMemo(() => {
    const months = {};
    stores.forEach(s => {
      if (s.monthly_gross && s.monthly_returns) {
        Object.entries(s.monthly_gross).forEach(([m, gross]) => {
          if (!months[m]) months[m] = { gross: 0, returns: 0 };
          months[m].gross += gross || 0;
          months[m].returns += s.monthly_returns[m] || 0;
        });
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([k, v]) => ({
        month: fmtMonth(k),
        returnsPct: v.gross > 0 ? (v.returns / v.gross * 100) : 0
      }));
  }, [stores]);
  
  // v1.10.7 - Deliveries trend
  const deliveriesTrend = useMemo(() => {
    const months = {};
    stores.forEach(s => {
      if (s.monthly_deliveries) {
        Object.entries(s.monthly_deliveries).forEach(([m, v]) => {
          months[m] = (months[m] || 0) + (v || 0);
        });
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([k, v]) => ({ month: fmtMonth(k), deliveries: v }));
  }, [stores]);
  
  // v1.10.7 - Gross vs Net comparison by month
  const grossNetTrend = useMemo(() => {
    const months = {};
    stores.forEach(s => {
      if (s.monthly_gross || s.monthly_net) {
        const grossData = s.monthly_gross || {};
        const netData = s.monthly_net || s.monthly_qty || {};
        Object.keys({ ...grossData, ...netData }).forEach(m => {
          if (!months[m]) months[m] = { gross: 0, net: 0 };
          months[m].gross += grossData[m] || 0;
          months[m].net += netData[m] || 0;
        });
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([k, v]) => ({ month: fmtMonth(k), gross: v.gross, net: v.net }));
  }, [stores]);
  
  // v1.10.7 - Returns by city (top 10 worst)
  const returnsByCity = useMemo(() => {
    const cities = {};
    stores.forEach(s => {
      if (s.city) {
        if (!cities[s.city]) cities[s.city] = { name: s.city, gross: 0, returns: 0, count: 0 };
        // Sum last 6 months
        if (s.monthly_gross && s.monthly_returns) {
          ['202507','202508','202509','202510','202511','202512'].forEach(m => {
            cities[s.city].gross += s.monthly_gross[m] || 0;
            cities[s.city].returns += s.monthly_returns[m] || 0;
          });
        }
        cities[s.city].count++;
      }
    });
    return Object.values(cities)
      .map(c => ({ ...c, returnsPct: c.gross > 0 ? (c.returns / c.gross * 100) : 0 }))
      .filter(c => c.gross > 100) // Only cities with meaningful data
      .sort((a, b) => b.returnsPct - a.returnsPct)
      .slice(0, 10);
  }, [stores]);
  
  // v1.4 - Driver performance with H1 vs H2 comparison
  const byDriverH = useMemo(() => { 
    const d = {}; 
    stores.forEach(s => { 
      if (s.driver) { 
        if (!d[s.driver]) d[s.driver] = { name: s.driver, qty_h1: 0, qty_h2: 0, count: 0 }; 
        d[s.driver].qty_h1 += s.qty_prev6 || 0; 
        d[s.driver].qty_h2 += s.qty_last6 || 0; 
        d[s.driver].count++; 
      } 
    }); 
    return Object.values(d).map(x => ({
      ...x,
      change: x.qty_h1 > 0 ? ((x.qty_h2 - x.qty_h1) / x.qty_h1) * 100 : 0
    })).sort((a,b) => b.qty_h2 - a.qty_h2).slice(0,15); 
  }, [stores]);
  
  // v1.4 - City performance with H1 vs H2 comparison
  const byCityH = useMemo(() => { 
    const d = {}; 
    stores.forEach(s => { 
      if (s.city) { 
        if (!d[s.city]) d[s.city] = { name: s.city, qty_h1: 0, qty_h2: 0, count: 0 }; 
        d[s.city].qty_h1 += s.qty_prev6 || 0; 
        d[s.city].qty_h2 += s.qty_last6 || 0; 
        d[s.city].count++; 
      } 
    }); 
    return Object.values(d).map(x => ({
      ...x,
      change: x.qty_h1 > 0 ? ((x.qty_h2 - x.qty_h1) / x.qty_h1) * 100 : 0
    })).sort((a,b) => b.qty_h2 - a.qty_h2).slice(0,15); 
  }, [stores]);

  return (<div className="space-y-6">
    <div className="flex justify-between items-center"><h2 className="text-xl font-bold">מגמות וניתוחים</h2><button onClick={() => exportPDF('מגמות - Baron')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm print:hidden"><FileText size={16}/>PDF</button></div>
    
    {/* Monthly Trend Chart - responsive */}
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
      <h3 className="text-lg font-bold mb-4">📈 מגמת כמויות חודשית</h3>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[300px]">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{fontSize:10}} interval="preserveStartEnd"/>
              <YAxis tickFormatter={v => (v/1000).toFixed(0)+'K'} tick={{fontSize:10}} width={40}/>
              <Tooltip formatter={v => fmt(v)}/>
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r:2}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    
    {/* Performance tables with clear headers - H1 vs H2 */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">🚚 ביצועים לפי נהג</h3>
        <p className="text-xs text-gray-500 mb-3">השוואת H1 (ינו-יונ) מול H2 (יול-דצמ) 2025</p>
        <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-600 border-b pb-2">
          <span className="w-8">#</span>
          <span className="flex-1 min-w-[80px]">נהג</span>
          <span className="w-14 md:w-16 text-center">H1</span>
          <span className="w-14 md:w-16 text-center">H2</span>
          <span className="w-14 md:w-16 text-center">שינוי</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {byDriverH.map((d, i) => (
            <div key={d.name} onClick={() => onDrillDown && onDrillDown({ type: 'driver', value: d.name })} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors text-sm">
              <span className="w-8 h-6 flex items-center justify-center bg-purple-500 text-white rounded text-xs font-bold flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{d.name}</p>
                <p className="text-xs text-gray-400">{d.count} חנויות</p>
              </div>
              <span className="w-14 md:w-16 text-center text-gray-600 text-xs md:text-sm flex-shrink-0">{fmt(d.qty_h1)}</span>
              <span className="w-14 md:w-16 text-center text-gray-600 text-xs md:text-sm flex-shrink-0">{fmt(d.qty_h2)}</span>
              <span className={`w-14 md:w-16 text-center font-bold text-xs md:text-sm flex-shrink-0 ${d.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(d.change)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">🏙️ ביצועים לפי עיר</h3>
        <p className="text-xs text-gray-500 mb-3">השוואת H1 (ינו-יונ) מול H2 (יול-דצמ) 2025</p>
        <div className="flex items-center gap-2 mb-3 text-xs font-medium text-gray-600 border-b pb-2">
          <span className="w-8">#</span>
          <span className="flex-1 min-w-[80px]">עיר</span>
          <span className="w-14 md:w-16 text-center">H1</span>
          <span className="w-14 md:w-16 text-center">H2</span>
          <span className="w-14 md:w-16 text-center">שינוי</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {byCityH.map((d, i) => (
            <div key={d.name} onClick={() => onDrillDown && onDrillDown({ type: 'city', value: d.name })} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-teal-50 transition-colors text-sm">
              <span className="w-8 h-6 flex items-center justify-center bg-teal-500 text-white rounded text-xs font-bold flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{d.name}</p>
                <p className="text-xs text-gray-400">{d.count} חנויות</p>
              </div>
              <span className="w-14 md:w-16 text-center text-gray-600 text-xs md:text-sm flex-shrink-0">{fmt(d.qty_h1)}</span>
              <span className="w-14 md:w-16 text-center text-gray-600 text-xs md:text-sm flex-shrink-0">{fmt(d.qty_h2)}</span>
              <span className={`w-14 md:w-16 text-center font-bold text-xs md:text-sm flex-shrink-0 ${d.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(d.change)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* v1.10.7 - New charts: Returns, Deliveries, Gross vs Net */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Returns % Trend */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">📉 מגמת אחוז חזרות</h3>
        <p className="text-xs text-gray-500 mb-3">אחוז החזרות מתוך הברוטו לפי חודש</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={returnsTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="month" tick={{fontSize:10}} interval="preserveStartEnd"/>
            <YAxis tickFormatter={v => v.toFixed(0) + '%'} tick={{fontSize:10}} width={40}/>
            <Tooltip formatter={v => v.toFixed(1) + '%'}/>
            <Line type="monotone" dataKey="returnsPct" stroke="#ef4444" strokeWidth={3} dot={{r:2}} name="חזרות %"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Deliveries Trend */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">🚚 מגמת אספקות</h3>
        <p className="text-xs text-gray-500 mb-3">מספר אספקות לפי חודש</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={deliveriesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="month" tick={{fontSize:10}} interval="preserveStartEnd"/>
            <YAxis tick={{fontSize:10}} width={40}/>
            <Tooltip formatter={v => fmt(v)}/>
            <Bar dataKey="deliveries" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="אספקות"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    
    {/* Gross vs Net & Returns by City */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gross vs Net */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">📊 ברוטו מול נטו</h3>
        <p className="text-xs text-gray-500 mb-3">השוואה חודשית</p>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={grossNetTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="month" tick={{fontSize:10}} interval="preserveStartEnd"/>
            <YAxis tickFormatter={v => (v/1000).toFixed(0) + 'K'} tick={{fontSize:10}} width={40}/>
            <Tooltip formatter={v => fmt(v)}/>
            <Legend formatter={v => v === 'gross' ? 'ברוטו' : 'נטו'}/>
            <Bar dataKey="gross" fill="#3b82f6" name="gross" radius={[4, 4, 0, 0]}/>
            <Bar dataKey="net" fill="#10b981" name="net" radius={[4, 4, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Returns by City */}
      <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border">
        <h3 className="text-lg font-bold mb-2">🏙️ חזרות לפי עיר</h3>
        <p className="text-xs text-gray-500 mb-3">10 הערים עם אחוז החזרות הגבוה ביותר (H2 2025)</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {returnsByCity.map((c, i) => (
            <div key={c.name} onClick={() => onDrillDown && onDrillDown({ type: 'city', value: c.name })} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors text-sm">
              <span className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded text-xs font-bold">{i+1}</span>
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="text-gray-500 text-xs">{c.count} חנויות</span>
              <span className="font-bold text-red-600">{c.returnsPct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>);
};

// Config storage functions
const getConfig = () => { 
  if (typeof window === 'undefined') return DEFAULT_RULES_CONFIG; 
  try { 
    const saved = localStorage.getItem('baron_rules_config'); 
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Check if it's the new format (has 'long' and 'short' keys)
      if (parsed.long) {
        // New format - deep merge long config
        const mergedLong = {};
        for (const statusKey of STATUS_ORDER_LONG) {
          mergedLong[statusKey] = {
            rules: (parsed.long[statusKey]?.rules || DEFAULT_LONG_CONFIG[statusKey].rules).map((rule, idx) => ({
              ...DEFAULT_LONG_CONFIG[statusKey].rules[idx],
              ...rule,
              metric_12v12: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_12v12, ...(rule?.metric_12v12 || {}) },
              metric_6v6: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_6v6, ...(rule?.metric_6v6 || {}) },
              metric_3v3: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_3v3, ...(rule?.metric_3v3 || {}) },
            }))
          };
        }
        
        // Merge short config
        const mergedShort = { ...DEFAULT_SHORT_CONFIG, ...parsed.short };
        
        return { long: mergedLong, short: mergedShort };
      } else {
        // Old format - migrate to new format
        const mergedLong = {};
        for (const statusKey of STATUS_ORDER_LONG) {
          mergedLong[statusKey] = {
            rules: (parsed[statusKey]?.rules || DEFAULT_LONG_CONFIG[statusKey].rules).map((rule, idx) => ({
              ...DEFAULT_LONG_CONFIG[statusKey].rules[idx],
              ...rule,
              metric_12v12: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_12v12, ...(rule?.metric_12v12 || {}) },
              metric_6v6: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_6v6, ...(rule?.metric_6v6 || {}) },
              metric_3v3: { ...DEFAULT_LONG_CONFIG[statusKey].rules[idx].metric_3v3, ...(rule?.metric_3v3 || {}) },
            }))
          };
        }
        return { long: mergedLong, short: DEFAULT_SHORT_CONFIG };
      }
    }
    return DEFAULT_RULES_CONFIG; 
  } catch (e) { 
    return DEFAULT_RULES_CONFIG; 
  } 
};

const saveConfig = (config) => { 
  if (typeof window !== 'undefined') {
    localStorage.setItem('baron_rules_config', JSON.stringify(config)); 
  }
};

// Alert config helpers
const getAlertConfig = () => {
  if (typeof window === 'undefined') return DEFAULT_ALERT_CONFIG;
  try {
    const saved = localStorage.getItem('baron_alert_config');
    if (saved) return { ...DEFAULT_ALERT_CONFIG, ...JSON.parse(saved) };
    return DEFAULT_ALERT_CONFIG;
  } catch { return DEFAULT_ALERT_CONFIG; }
};

const saveAlertConfig = (config) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('baron_alert_config', JSON.stringify(config));
  }
};

// Check if store matches alert criteria
const isAlert = (store, alertConfig) => {
  if (store.is_inactive) return false;
  
  // Check status
  if (alertConfig.includeStatus.includes(store.status_long)) return true;
  
  // Check 12v12 below threshold
  if (alertConfig.include12v12Below.enabled && (store.metric_12v12 || 0) < alertConfig.include12v12Below.value) return true;
  
  // Check declining months
  if (alertConfig.includeDecliningMonths.enabled && (store.declining_months || 0) >= alertConfig.includeDecliningMonths.value) return true;
  
  // Check custom rules
  if (alertConfig.customRules) {
    for (const rule of alertConfig.customRules) {
      if (rule.enabled) {
        const val = store[`metric_${rule.metric}`] || 0;
        let matches = false;
        switch (rule.operator) {
          case '<': matches = val < rule.value; break;
          case '<=': matches = val <= rule.value; break;
          case '>': matches = val > rule.value; break;
          case '>=': matches = val >= rule.value; break;
        }
        if (matches) return true;
      }
    }
  }
  
  return false;
};

// Get alert reason
const getAlertReason = (store, alertConfig) => {
  const reasons = [];
  
  if (alertConfig.includeStatus.includes(store.status_long)) {
    reasons.push(`סטטוס: ${store.status_long}`);
  }
  
  if (alertConfig.include12v12Below.enabled && (store.metric_12v12 || 0) < alertConfig.include12v12Below.value) {
    reasons.push(`ירידה שנתית: ${store.metric_12v12?.toFixed(1) || 0}%`);
  }
  
  if (alertConfig.includeDecliningMonths.enabled && (store.declining_months || 0) >= alertConfig.includeDecliningMonths.value) {
    reasons.push(`${store.declining_months} חודשי ירידה רצופים`);
  }
  
  // Check custom rules
  if (alertConfig.customRules) {
    const opLabels = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
    for (const rule of alertConfig.customRules) {
      if (rule.enabled) {
        const val = store[`metric_${rule.metric}`] || 0;
        let matches = false;
        switch (rule.operator) {
          case '<': matches = val < rule.value; break;
          case '<=': matches = val <= rule.value; break;
          case '>': matches = val > rule.value; break;
          case '>=': matches = val >= rule.value; break;
        }
        if (matches) {
          reasons.push(`${rule.metric} ${opLabels[rule.operator]} ${rule.value}% (בפועל: ${val.toFixed(1)}%)`);
        }
      }
    }
  }
  
  return reasons.join(' | ');
};

// Export config to JSON file
const exportConfig = (config) => {
  const dataStr = JSON.stringify(config, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', 'baron-settings.json');
  linkElement.click();
};

// Rule Editor Component
const RuleEditor = ({ rule, onChange, ruleIndex }) => {
  const metrics = [
    { key: 'metric_12v12', label: '12v12 (שנתי)' },
    { key: 'metric_6v6', label: '6v6 (חצי שנה)' },
    { key: 'metric_3v3', label: '3v3 (רבעון)' },
  ];
  
  const operators = [
    { value: '>=', label: '≥' },
    { value: '>', label: '>' },
    { value: '<=', label: '≤' },
    { value: '<', label: '<' },
    { value: 'between', label: 'בין' },
  ];
  
  return (
    <div className={`p-3 rounded-lg border ${rule.enabled ? 'bg-white border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">חוק {ruleIndex + 1}</span>
        <button 
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${rule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
        >
          {rule.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {rule.enabled ? 'פעיל' : 'כבוי'}
        </button>
      </div>
      
      {rule.enabled && (
        <div className="space-y-2">
          {metrics.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1">
                <input 
                  type="checkbox" 
                  checked={rule[key].enabled} 
                  onChange={e => onChange({ ...rule, [key]: { ...rule[key], enabled: e.target.checked } })}
                  className="rounded"
                />
                <span className="text-xs w-24">{label}</span>
              </label>
              {rule[key].enabled && (
                <>
                  <select 
                    value={rule[key].operator} 
                    onChange={e => onChange({ ...rule, [key]: { ...rule[key], operator: e.target.value } })}
                    className="px-2 py-1 border rounded text-xs"
                  >
                    {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <input 
                    type="number" 
                    value={rule[key].value} 
                    onChange={e => onChange({ ...rule, [key]: { ...rule[key], value: Number(e.target.value) } })}
                    className="w-16 px-2 py-1 border rounded text-xs"
                  />
                  {rule[key].operator === 'between' && (
                    <>
                      <span className="text-xs">עד</span>
                      <input 
                        type="number" 
                        value={rule[key].value2 || 0} 
                        onChange={e => onChange({ ...rule, [key]: { ...rule[key], value2: Number(e.target.value) } })}
                        className="w-16 px-2 py-1 border rounded text-xs"
                      />
                    </>
                  )}
                  <span className="text-xs text-gray-500">%</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Status Rules Editor Component
const StatusRulesEditor = ({ statusKey, statusConfig, onChange }) => {
  const statusColors = {
    'עליה_חדה': 'bg-emerald-100 border-emerald-300',
    'צמיחה': 'bg-emerald-50 border-emerald-200',
    'יציב': 'bg-blue-50 border-blue-200',
    'ירידה': 'bg-orange-50 border-orange-200',
    'התרסקות': 'bg-red-100 border-red-300',
  };
  
  const statusEmojis = {
    'עליה_חדה': '🚀',
    'צמיחה': '📈',
    'יציב': '➡️',
    'ירידה': '📉',
    'התרסקות': '🔴',
  };
  
  const updateRule = (ruleIndex, newRule) => {
    const newRules = [...(statusConfig?.rules || [])];
    newRules[ruleIndex] = newRule;
    onChange({ ...statusConfig, rules: newRules });
  };
  
  if (!statusConfig || !statusConfig.rules) return null;
  
  return (
    <div className={`p-4 rounded-xl border-2 ${statusColors[statusKey]}`}>
      <h4 className="font-bold mb-3 flex items-center gap-2">
        <span>{statusEmojis[statusKey]}</span>
        <span>{STATUS_DISPLAY_LONG[statusKey]}</span>
      </h4>
      <div className="space-y-3">
        {statusConfig.rules.map((rule, idx) => (
          <RuleEditor 
            key={idx} 
            rule={rule} 
            ruleIndex={idx}
            onChange={(newRule) => updateRule(idx, newRule)} 
          />
        ))}
      </div>
    </div>
  );
};

const SettingsPage = ({ onLogout }) => {
  const [rulesConfig, setRulesConfig] = useState(DEFAULT_RULES_CONFIG);
  const [alertConfig, setAlertConfig] = useState(DEFAULT_ALERT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ text: '', ok: false });
  const fileInputRef = useRef(null);
  
  React.useEffect(() => { 
    setRulesConfig(getConfig()); 
    setAlertConfig(getAlertConfig());
  }, []);
  
  const handleSave = () => { 
    saveConfig(rulesConfig);
    saveAlertConfig(alertConfig);
    setSaved(true); 
    setTimeout(() => { setSaved(false); window.location.reload(); }, 1000); 
  };
  
  const handleReset = () => { 
    setRulesConfig(DEFAULT_RULES_CONFIG);
    setAlertConfig(DEFAULT_ALERT_CONFIG);
    saveConfig(DEFAULT_RULES_CONFIG);
    saveAlertConfig(DEFAULT_ALERT_CONFIG);
    window.location.reload(); 
  };
  
  const handleExport = () => {
    exportConfig(rulesConfig);
  };
  
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setRulesConfig(imported);
        saveConfig(imported);
        alert('הגדרות יובאו בהצלחה!');
        window.location.reload();
      } catch (err) {
        alert('שגיאה בקריאת הקובץ');
      }
    };
    reader.readAsText(file);
  };
  
  const handlePasswordChange = () => {
    if (oldPwd !== getPassword()) {
      setPwdMsg({ text: 'סיסמא נוכחית שגויה', ok: false });
      return;
    }
    if (newPwd.length < 4) {
      setPwdMsg({ text: 'סיסמא חדשה קצרה מדי (מינימום 4 תווים)', ok: false });
      return;
    }
    setPassword(newPwd);
    setPwdMsg({ text: 'סיסמא שונתה בהצלחה!', ok: true });
    setOldPwd('');
    setNewPwd('');
    setTimeout(() => setPwdMsg({ text: '', ok: false }), 3000);
  };
  
  const updateLongStatusConfig = (statusKey, newConfig) => {
    setRulesConfig(prev => ({ 
      ...prev, 
      long: { ...prev.long, [statusKey]: newConfig }
    }));
  };
  
  const updateShortStatusConfig = (statusKey, threshold) => {
    setRulesConfig(prev => ({
      ...prev,
      short: { ...prev.short, [statusKey]: { ...prev.short[statusKey], threshold: Number(threshold) } }
    }));
  };
  
  const updateFallbackConfig = (statusKey, field, value) => {
    setRulesConfig(prev => ({
      ...prev,
      fallback: { 
        ...(prev.fallback || DEFAULT_FALLBACK_CONFIG), 
        [statusKey]: { 
          ...(prev.fallback?.[statusKey] || DEFAULT_FALLBACK_CONFIG[statusKey]), 
          [field]: field === 'value' ? Number(value) : value 
        } 
      }
    }));
  };
  
  const shortStatusEmojis = {
    'עליה_חדה': '🚀',
    'יציב': '✅',
    'ירידה': '⚠️',
    'אזעקה': '🚨',
  };
  
  const shortStatusColors = {
    'עליה_חדה': 'bg-emerald-50 border-emerald-200',
    'יציב': 'bg-gray-50 border-gray-200',
    'ירידה': 'bg-orange-50 border-orange-200',
    'אזעקה': 'bg-red-50 border-red-200',
  };
  
  return (<div className="space-y-6">
    <h2 className="text-xl font-bold">הגדרות</h2>
    
    {/* Password Change */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🔐 שינוי סיסמא</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-600 block mb-1">סיסמא נוכחית</label>
          <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="הזן סיסמא נוכחית" className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="text-xs text-gray-600 block mb-1">סיסמא חדשה</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="הזן סיסמא חדשה" className="w-full px-3 py-2 border rounded-lg" />
        </div>
      </div>
      {pwdMsg.text && <p className={`text-sm mt-2 ${pwdMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwdMsg.text}</p>}
      <button onClick={handlePasswordChange} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">שנה סיסמא</button>
    </div>
    
    {/* LONG TERM Status Config */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">📊 סטטוס טווח ארוך</h3>
      <p className="text-sm text-gray-500 mb-4">מבוסס על 12v12, 6v6, 3v3. לכל סטטוס עד 3 חוקים.</p>
      
      <div className="space-y-4">
        {STATUS_ORDER_LONG.map(statusKey => (
          <StatusRulesEditor 
            key={statusKey}
            statusKey={statusKey}
            statusConfig={rulesConfig.long?.[statusKey] || DEFAULT_LONG_CONFIG[statusKey]}
            onChange={(newConfig) => updateLongStatusConfig(statusKey, newConfig)}
          />
        ))}
      </div>
    </div>
    
    {/* SHORT TERM Status Config */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">⚡ סטטוס טווח קצר (אזעקות)</h3>
      <p className="text-sm text-gray-500 mb-4">מבוסס על 2v2 בלבד (2 חודשים אחרונים). סף אחד לכל סטטוס.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_ORDER_SHORT.filter(s => s !== 'אזעקה').map(statusKey => (
          <div key={statusKey} className={`p-4 rounded-xl border-2 ${shortStatusColors[statusKey]}`}>
            <div className="flex items-center gap-2 mb-3">
              <span>{shortStatusEmojis[statusKey]}</span>
              <span className="font-bold text-sm">{STATUS_DISPLAY_SHORT[statusKey]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">2v2 ≥</span>
              <input 
                type="number" 
                value={rulesConfig.short?.[statusKey]?.threshold ?? DEFAULT_SHORT_CONFIG[statusKey].threshold}
                onChange={e => updateShortStatusConfig(statusKey, e.target.value)}
                className="w-20 px-2 py-1 border rounded text-sm text-center"
              />
              <span className="text-xs text-gray-600">%</span>
            </div>
          </div>
        ))}
        <div className={`p-4 rounded-xl border-2 ${shortStatusColors['אזעקה']}`}>
          <div className="flex items-center gap-2 mb-3">
            <span>{shortStatusEmojis['אזעקה']}</span>
            <span className="font-bold text-sm">אזעקה</span>
          </div>
          <p className="text-xs text-gray-500">כל השאר (מתחת לסף ירידה)</p>
        </div>
      </div>
    </div>
    
    {/* FALLBACK Rules Config */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">⚠️ חוקי גיבוי (טווח ארוך)</h3>
      <p className="text-sm text-gray-500 mb-4">כשחנות לא עונה לאף חוק רגיל, המערכת בודקת את חוקי הגיבוי. סטטוס מגיבוי מסומן ב-⚠️</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['התרסקות', 'ירידה', 'צמיחה', 'עליה_חדה'].map(statusKey => {
          const fb = rulesConfig.fallback?.[statusKey] || DEFAULT_FALLBACK_CONFIG[statusKey];
          const colors = {
            'התרסקות': 'bg-red-50 border-red-200',
            'ירידה': 'bg-orange-50 border-orange-200',
            'צמיחה': 'bg-emerald-50 border-emerald-200',
            'עליה_חדה': 'bg-emerald-100 border-emerald-300',
          };
          const emojis = { 'התרסקות': '🔴', 'ירידה': '📉', 'צמיחה': '📈', 'עליה_חדה': '🚀' };
          return (
            <div key={statusKey} className={`p-4 rounded-xl border-2 ${colors[statusKey]}`}>
              <div className="flex items-center gap-2 mb-3">
                <span>{emojis[statusKey]}</span>
                <span className="font-bold text-sm">{STATUS_DISPLAY_LONG[statusKey]}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select 
                    value={fb?.metric || '6v6'}
                    onChange={e => updateFallbackConfig(statusKey, 'metric', e.target.value)}
                    className="px-2 py-1 border rounded text-xs"
                  >
                    <option value="12v12">12v12</option>
                    <option value="6v6">6v6</option>
                    <option value="3v3">3v3</option>
                  </select>
                  <select 
                    value={fb?.operator || '<'}
                    onChange={e => updateFallbackConfig(statusKey, 'operator', e.target.value)}
                    className="px-2 py-1 border rounded text-xs"
                  >
                    <option value=">=">≥</option>
                    <option value=">">{'>'}</option>
                    <option value="<">{'<'}</option>
                    <option value="<=">≤</option>
                  </select>
                  <input 
                    type="number" 
                    value={fb?.value ?? 0}
                    onChange={e => updateFallbackConfig(statusKey, 'value', e.target.value)}
                    className="w-16 px-2 py-1 border rounded text-xs text-center"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">יציב הוא ברירת מחדל סופית - אם שום חוק לא מתאים</p>
    </div>
    
    {/* ALERT Config */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">🚨 הגדרות התראות</h3>
      <p className="text-sm text-gray-500 mb-4">הגדר אילו חנויות יופיעו בדף ההתראות</p>
      
      <div className="space-y-4">
        {/* Status inclusion */}
        <div className="p-4 rounded-xl border-2 bg-red-50 border-red-200">
          <h4 className="font-bold mb-3">📊 סטטוסים שנכללים בהתראות</h4>
          <div className="flex flex-wrap gap-2">
            {['התרסקות', 'ירידה', 'יציב', 'צמיחה', 'עליה חדה'].map(status => (
              <label key={status} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  checked={alertConfig.includeStatus.includes(status)}
                  onChange={e => {
                    if (e.target.checked) {
                      setAlertConfig(prev => ({ ...prev, includeStatus: [...prev.includeStatus, status] }));
                    } else {
                      setAlertConfig(prev => ({ ...prev, includeStatus: prev.includeStatus.filter(s => s !== status) }));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{status}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 12v12 threshold */}
        <div className="p-4 rounded-xl border-2 bg-orange-50 border-orange-200">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={alertConfig.include12v12Below.enabled}
                onChange={e => setAlertConfig(prev => ({ ...prev, include12v12Below: { ...prev.include12v12Below, enabled: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="font-bold text-sm">📉 התראה כאשר 12v12 נמוך מ-</span>
            </label>
            <input 
              type="number" 
              value={alertConfig.include12v12Below.value}
              onChange={e => setAlertConfig(prev => ({ ...prev, include12v12Below: { ...prev.include12v12Below, value: Number(e.target.value) } }))}
              className="w-20 px-2 py-1 border rounded text-sm text-center"
              disabled={!alertConfig.include12v12Below.enabled}
            />
            <span className="text-sm">%</span>
          </div>
        </div>
        
        {/* Declining months */}
        <div className="p-4 rounded-xl border-2 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={alertConfig.includeDecliningMonths.enabled}
                onChange={e => setAlertConfig(prev => ({ ...prev, includeDecliningMonths: { ...prev.includeDecliningMonths, enabled: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="font-bold text-sm">📆 התראה כאשר יש לפחות</span>
            </label>
            <input 
              type="number" 
              value={alertConfig.includeDecliningMonths.value}
              onChange={e => setAlertConfig(prev => ({ ...prev, includeDecliningMonths: { ...prev.includeDecliningMonths, value: Number(e.target.value) } }))}
              className="w-16 px-2 py-1 border rounded text-sm text-center"
              disabled={!alertConfig.includeDecliningMonths.enabled}
            />
            <span className="text-sm">חודשי ירידה רצופים</span>
          </div>
        </div>
        
        {/* Custom Rules */}
        <div className="p-4 rounded-xl border-2 bg-purple-50 border-purple-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-sm">🔧 חוקים מותאמים אישית</h4>
            <button 
              onClick={() => setAlertConfig(prev => ({ 
                ...prev, 
                customRules: [...(prev.customRules || []), { enabled: true, metric: '6v6', operator: '<', value: -10 }] 
              }))}
              className="px-3 py-1 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600"
            >
              + הוסף חוק
            </button>
          </div>
          <div className="space-y-2">
            {(alertConfig.customRules || []).map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 flex-wrap bg-white p-2 rounded-lg border">
                <input 
                  type="checkbox" 
                  checked={rule.enabled}
                  onChange={e => {
                    const newRules = [...alertConfig.customRules];
                    newRules[idx] = { ...rule, enabled: e.target.checked };
                    setAlertConfig(prev => ({ ...prev, customRules: newRules }));
                  }}
                  className="w-4 h-4"
                />
                <select 
                  value={rule.metric}
                  onChange={e => {
                    const newRules = [...alertConfig.customRules];
                    newRules[idx] = { ...rule, metric: e.target.value };
                    setAlertConfig(prev => ({ ...prev, customRules: newRules }));
                  }}
                  className="px-2 py-1 border rounded text-sm"
                  disabled={!rule.enabled}
                >
                  <option value="12v12">12v12</option>
                  <option value="6v6">6v6</option>
                  <option value="3v3">3v3</option>
                  <option value="2v2">2v2</option>
                </select>
                <select 
                  value={rule.operator}
                  onChange={e => {
                    const newRules = [...alertConfig.customRules];
                    newRules[idx] = { ...rule, operator: e.target.value };
                    setAlertConfig(prev => ({ ...prev, customRules: newRules }));
                  }}
                  className="px-2 py-1 border rounded text-sm"
                  disabled={!rule.enabled}
                >
                  <option value="<">&lt;</option>
                  <option value="<=">≤</option>
                  <option value=">">{'>'}</option>
                  <option value=">=">≥</option>
                </select>
                <input 
                  type="number" 
                  value={rule.value}
                  onChange={e => {
                    const newRules = [...alertConfig.customRules];
                    newRules[idx] = { ...rule, value: Number(e.target.value) };
                    setAlertConfig(prev => ({ ...prev, customRules: newRules }));
                  }}
                  className="w-20 px-2 py-1 border rounded text-sm text-center"
                  disabled={!rule.enabled}
                />
                <span className="text-sm">%</span>
                <button 
                  onClick={() => {
                    const newRules = alertConfig.customRules.filter((_, i) => i !== idx);
                    setAlertConfig(prev => ({ ...prev, customRules: newRules }));
                  }}
                  className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                >
                  🗑️
                </button>
              </div>
            ))}
            {(!alertConfig.customRules || alertConfig.customRules.length === 0) && (
              <p className="text-xs text-gray-500 text-center py-2">אין חוקים מותאמים. לחץ "הוסף חוק" ליצירת חוק חדש.</p>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {/* Save / Reset / Export / Import */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">💾 שמירה וגיבוי</h3>
      <div className="flex flex-wrap gap-3">
        <button onClick={handleSave} className={'px-6 py-2 rounded-xl font-medium transition-all ' + (saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600')}>
          {saved ? <span className="flex items-center gap-2"><Check size={16}/>נשמר!</span> : 'שמור הגדרות'}
        </button>
        <button onClick={handleReset} className="px-6 py-2 rounded-xl font-medium bg-gray-200 hover:bg-gray-300">
          איפוס לברירת מחדל
        </button>
        <button onClick={handleExport} className="px-6 py-2 rounded-xl font-medium bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-2">
          <Download size={16}/>ייצוא הגדרות
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 rounded-xl font-medium bg-teal-500 text-white hover:bg-teal-600 flex items-center gap-2">
          <Upload size={16}/>ייבוא הגדרות
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-3">ייצא את ההגדרות לקובץ JSON לגיבוי או העברה למחשב אחר</p>
    </div>
    
    {/* System Info */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <h3 className="text-lg font-bold mb-4">ℹ️ מידע על המערכת</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{STORES_RAW.length}</p><p className="text-xs text-gray-500">חנויות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-purple-600">{PRODUCTS_RAW.length}</p><p className="text-xs text-gray-500">מוצרים</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{STORES_RAW.filter(s => !s.is_inactive).length}</p><p className="text-xs text-gray-500">חנויות פעילות</p></div>
        <div className="p-3 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-gray-600">v1.10.12</p><p className="text-xs text-gray-500">גרסה</p></div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-4">עדכון אחרון: ינואר 2026</p>
    </div>
    
    {/* Logout */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border">
      <button onClick={onLogout} className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 flex items-center justify-center gap-2">
        <LogOut size={20} />
        התנתק מהמערכת
      </button>
    </div>
  </div>);
};

// Baron Logo Component - using actual image
const BaronLogo = () => (
  <div className="flex items-center gap-3">
    <img src="/baron-logo.png" alt="ברון" className="h-10 w-auto" />
  </div>
);

// Exclusion Search Component
const ExclusionSearch = ({ type, items, excluded, onToggle }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  const isExcluded = (id) => excluded.includes(id);
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder={type === 'stores' ? 'חפש חנות...' : 'חפש מוצר...'} 
          className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
        />
      </div>
      {search && (
        <div className="max-h-48 overflow-y-auto border rounded-lg">
          {filtered.map(item => (
            <div 
              key={item.id} 
              onClick={() => onToggle(item.id)}
              className={'flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer ' + (isExcluded(item.id) ? 'bg-red-50' : '')}
            >
              <span className="text-sm">{item.name}</span>
              {isExcluded(item.id) ? 
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">מוחרג</span> : 
                <span className="text-xs text-gray-400">לחץ להחרגה</span>
              }
            </div>
          ))}
        </div>
      )}
      {excluded.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">מוחרגים ({excluded.length}):</p>
          <div className="flex flex-wrap gap-1">
            {excluded.map(id => {
              const item = items.find(i => i.id === id);
              return item ? (
                <span key={id} onClick={() => onToggle(id)} className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-red-200">
                  {item.name.slice(0, 15)}{item.name.length > 15 ? '...' : ''}
                  <X size={12} />
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Advanced Exclusion Search with temp/permanent options
const ExclusionSearchAdvanced = ({ type, items, excludedTemp, excludedPerm, onToggleTemp, onTogglePerm }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 20);
  const isExcludedTemp = (id) => excludedTemp.includes(id);
  const isExcludedPerm = (id) => excludedPerm.includes(id);
  const isExcluded = (id) => isExcludedTemp(id) || isExcludedPerm(id);
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder={type === 'stores' ? 'חפש חנות להחרגה...' : 'חפש מוצר להחרגה...'} 
          className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
        />
      </div>
      {search && (
        <div className="max-h-48 overflow-y-auto border rounded-lg bg-white">
          {filtered.map(item => (
            <div key={item.id} className={'flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-b-0 ' + (isExcluded(item.id) ? 'bg-red-50' : '')}>
              <span className="text-sm flex-1">{item.name}</span>
              <div className="flex gap-1">
                {isExcludedTemp(item.id) ? (
                  <button onClick={() => onToggleTemp(item.id)} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded hover:bg-orange-200">בטל זמני</button>
                ) : isExcludedPerm(item.id) ? (
                  <button onClick={() => onTogglePerm(item.id)} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200">בטל קבוע</button>
                ) : (
                  <>
                    <button onClick={() => onToggleTemp(item.id)} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded hover:bg-orange-100">זמני</button>
                    <button onClick={() => onTogglePerm(item.id)} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded hover:bg-red-100">קבוע</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Show excluded items */}
      {excludedTemp.length > 0 && (
        <div>
          <p className="text-xs text-orange-600 mb-1">זמניים ({excludedTemp.length}):</p>
          <div className="flex flex-wrap gap-1">
            {excludedTemp.map(id => {
              const item = items.find(i => i.id === id);
              return item ? (
                <span key={id} onClick={() => onToggleTemp(id)} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-orange-200">
                  {item.name.slice(0, 12)}{item.name.length > 12 ? '...' : ''}<X size={10} />
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
      {excludedPerm.length > 0 && (
        <div>
          <p className="text-xs text-red-600 mb-1">קבועים ({excludedPerm.length}):</p>
          <div className="flex flex-wrap gap-1">
            {excludedPerm.map(id => {
              const item = items.find(i => i.id === id);
              return item ? (
                <span key={id} onClick={() => onTogglePerm(id)} className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-red-200">
                  {item.name.slice(0, 12)}{item.name.length > 12 ? '...' : ''}<X size={10} />
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [loggedIn, setLoggedInState] = useState(false);
  const [tab, setTab] = useState('overview');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [menu, setMenu] = useState(false);
  const [rulesConfig, setRulesConfig] = useState(DEFAULT_RULES_CONFIG);
  const [excludedStores, setExcludedStores] = useState([]);
  const [excludedProducts, setExcludedProducts] = useState([]);
  const [permanentExcludedStores, setPermanentExcludedStores] = useState([]);
  const [permanentExcludedProducts, setPermanentExcludedProducts] = useState([]);
  const [showExclusions, setShowExclusions] = useState(false);
  // v1.3 - Navigation tracking
  const [sourceWindow, setSourceWindow] = useState(null);
  const [drillDownFilter, setDrillDownFilter] = useState(null);
  
  // v1.10.7 - Global store comparison modal
  const [showGlobalComparison, setShowGlobalComparison] = useState(false);
  const [showGlobalProductComparison, setShowGlobalProductComparison] = useState(false);
  
  // v1.8.8 - Stores list filters (lifted up for history preservation)
  const [storesFilters, setStoresFilters] = useState({
    cities: [], networks: [], drivers: [], agents: [],
    statusesLong: [], statusesShort: [], minQty: 0,
    fallbackFilter: 'all', search: '', page: 1
  });
  
  // v1.8.8 - Products list filters
  const [productsFilters, setProductsFilters] = useState({
    cats: [], statusesLong: [], statusesShort: [], minQty: 0,
    fallbackFilter: 'all', search: '', page: 1
  });
  
  // v1.9.0 - Simple navigation history stack (using ref for popstate compatibility)
  const navHistoryRef = useRef([]);
  const [, forceUpdate] = useState(0); // For re-render after popFromHistory
  
  // Push current state to history before navigating
  const pushToHistory = () => {
    const currentState = {
      tab,
      store,
      product,
      sourceWindow,
      drillDownFilter,
      storesFilters: { ...storesFilters },
      productsFilters: { ...productsFilters },
      scrollY: window.scrollY, // v1.10.11 - Save scroll position
      timestamp: Date.now()
    };
    navHistoryRef.current = [...navHistoryRef.current, currentState];
  };
  
  // Pop from history (go back)
  const popFromHistory = () => {
    if (navHistoryRef.current.length === 0) return false;
    
    const newHistory = [...navHistoryRef.current];
    const prevState = newHistory.pop();
    navHistoryRef.current = newHistory;
    
    // Restore state
    setTab(prevState.tab);
    setStore(prevState.store);
    setProduct(prevState.product);
    setSourceWindow(prevState.sourceWindow);
    setDrillDownFilter(prevState.drillDownFilter);
    setStoresFilters(prevState.storesFilters);
    setProductsFilters(prevState.productsFilters);
    
    // v1.10.11 - Restore scroll position after DOM updates
    if (prevState.scrollY !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, prevState.scrollY);
      }, 50);
    }
    
    return true;
  };
  
  // Clear history
  const clearHistory = () => {
    navHistoryRef.current = [];
  };
  
  // v1.10.7 - Browser back button support (improved for mobile)
  useEffect(() => {
    // Create large buffer of history entries to prevent exiting PWA
    const createBuffer = () => {
      for (let i = 0; i < 10; i++) {
        window.history.pushState({ app: 'baron', i }, '', window.location.pathname);
      }
    };
    
    window.history.replaceState({ app: 'baron', i: 0 }, '', window.location.pathname);
    createBuffer();
    
    const handlePopState = (event) => {
      // Immediately push new states to maintain buffer
      window.history.pushState({ app: 'baron', i: Date.now() }, '', window.location.pathname);
      window.history.pushState({ app: 'baron', i: Date.now() + 1 }, '', window.location.pathname);
      
      // Navigate back in our internal history
      popFromHistory();
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Update browser history when navigating to store/product
  useEffect(() => {
    if (store || product) {
      window.history.pushState({ app: 'baron', index: Date.now() }, '', window.location.pathname);
    }
  }, [store, product]);
  
  useEffect(() => { 
    setRulesConfig(getConfig()); 
    setLoggedInState(isLoggedIn());
    // Load permanent exclusions
    try {
      const savedExc = localStorage.getItem('baron_permanent_exclusions');
      if (savedExc) {
        const parsed = JSON.parse(savedExc);
        setPermanentExcludedStores(parsed.stores || []);
        setPermanentExcludedProducts(parsed.products || []);
      }
    } catch {}
  }, []);
  
  // Save permanent exclusions when they change
  const savePermanentExclusions = (stores, products) => {
    localStorage.setItem('baron_permanent_exclusions', JSON.stringify({ stores, products }));
  };
  
  const handleLogin = () => setLoggedInState(true);
  const handleLogout = () => { setLoggedIn(false); setLoggedInState(false); };
  
  const toggleExcludeStore = (id, permanent = false) => {
    if (permanent) {
      setPermanentExcludedStores(prev => {
        const newList = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        savePermanentExclusions(newList, permanentExcludedProducts);
        return newList;
      });
    } else {
      setExcludedStores(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };
  const toggleExcludeProduct = (id, permanent = false) => {
    if (permanent) {
      setPermanentExcludedProducts(prev => {
        const newList = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        savePermanentExclusions(permanentExcludedStores, newList);
        return newList;
      });
    } else {
      setExcludedProducts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };
  const clearTempExclusions = () => { setExcludedStores([]); setExcludedProducts([]); };
  const clearPermanentExclusions = () => { 
    setPermanentExcludedStores([]); 
    setPermanentExcludedProducts([]); 
    savePermanentExclusions([], []);
  };
  
  // Combine temporary and permanent exclusions
  const allExcludedStores = [...new Set([...excludedStores, ...permanentExcludedStores])];
  const allExcludedProducts = [...new Set([...excludedProducts, ...permanentExcludedProducts])];
  
  // Apply rules config and filter exclusions
  const STORES = useMemo(() => {
    const configured = applyConfig(STORES_RAW, rulesConfig);
    return configured.filter(s => !allExcludedStores.includes(s.id));
  }, [rulesConfig, allExcludedStores]);
  
  // v1.8.9 - Separate active and inactive stores
  const ACTIVE_STORES = useMemo(() => STORES.filter(s => !s.is_inactive), [STORES]);
  const INACTIVE_STORES = useMemo(() => STORES.filter(s => s.is_inactive), [STORES]);
  
  const PRODUCTS = useMemo(() => {
    const configured = applyConfig(PRODUCTS_RAW, rulesConfig);
    return configured.filter(p => !allExcludedProducts.includes(p.id));
  }, [rulesConfig, allExcludedProducts]);
  
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
  
  // v1.3 - Track source when navigating to detail
  // v1.9.0 - Updated with internal history stack
  const nav = (t, i) => { 
    pushToHistory(); // Save current state before navigating
    const newSourceWindow = tab;
    setSourceWindow(newSourceWindow);
    if (t === 'store') { 
      setStore(i); 
      setTab('stores');
    } else { 
      setProduct(i); 
      setTab('products');
    } 
  };
  
  // v1.3 - Handle drill-down from summary tables
  // v1.9.0 - Updated with internal history stack
  const handleDrillDown = (filter) => {
    pushToHistory(); // Save current state before navigating
    const newSourceWindow = tab;
    setDrillDownFilter(filter);
    setSourceWindow(newSourceWindow);
    
    // v1.10.7 - Navigate to alerts tab if type is alerts
    if (filter && filter.type === 'alerts') {
      setTab('alerts');
      return;
    }
    
    setTab('stores');
    // Apply filter to stores filters
    const newFilters = { ...storesFilters, cities: [], networks: [], drivers: [], agents: [], statusesLong: [], statusesShort: [] };
    if (filter) {
      if (filter.type === 'city') newFilters.cities = [filter.value];
      else if (filter.type === 'status_long') newFilters.statusesLong = [filter.value];
      else if (filter.type === 'status_short') newFilters.statusesShort = [filter.value];
      else if (filter.type === 'driver') newFilters.drivers = [filter.value];
      else if (filter.type === 'network') newFilters.networks = [filter.value];
      else if (filter.type === 'agent') newFilters.agents = [filter.value];
      else if (filter.type === 'fallback') newFilters.fallbackFilter = 'fallback';
    }
    setStoresFilters(newFilters);
  };
  
  // v1.3 - Handle back navigation
  // v1.9.0 - Use internal history stack
  const handleBack = () => {
    popFromHistory();
  };
  
  // v1.9.0 - Tab change (clears history to this point)
  const handleTabChange = (newTab) => {
    // Don't save history when changing tabs from menu - start fresh
    setTab(newTab);
    setStore(null);
    setProduct(null);
    setDrillDownFilter(null);
    clearHistory(); // Clear history when changing tabs
  };
  
  // v1.9.0 - Store select with history
  // v1.10.11 - Look up full store data if needed (for stores from PRODUCT_STORES)
  // v1.10.12 - Scroll to top when entering store
  const handleStoreSelect = (s) => {
    pushToHistory(); // Save current state before navigating
    const newSourceWindow = tab;
    setSourceWindow(newSourceWindow);
    // Look up full store data by id if needed
    const fullStore = STORES.find(st => st.id === s.id) || s;
    setStore(fullStore);
    window.scrollTo(0, 0); // Scroll to top
  };
  
  // v1.9.0 - Product select with history
  // v1.10.12 - Scroll to top when entering product
  const handleProductSelect = (p) => {
    pushToHistory(); // Save current state before navigating
    const newSourceWindow = tab;
    setSourceWindow(newSourceWindow);
    setProduct(p);
    window.scrollTo(0, 0); // Scroll to top
  };
  
  // v1.9.0 - Update stores filters (no history needed for filters)
  const updateStoresFilters = (newFilters) => {
    setStoresFilters(newFilters);
  };
  
  // v1.9.0 - Update products filters (no history needed for filters)
  const updateProductsFilters = (newFilters) => {
    setProductsFilters(newFilters);
  };
  
  // Get tab name for display
  const getTabName = (tabId) => {
    const t = tabs.find(t => t.id === tabId);
    return t ? t.l : '';
  };
  
  const content = () => {
    if (store) return <StoreDetail store={store} onBack={handleBack} allStores={STORES} excludedProducts={allExcludedProducts} sourceWindow={sourceWindow ? getTabName(sourceWindow) : null} rulesConfig={rulesConfig} onSelectStore={handleStoreSelect} />;
    if (product) return <ProductDetail product={product} onBack={handleBack} sourceWindow={sourceWindow ? getTabName(sourceWindow) : null} rulesConfig={rulesConfig} onSelectStore={handleStoreSelect} />;
    switch (tab) {
      case 'overview': return <Overview stores={ACTIVE_STORES} products={PRODUCTS} onNav={nav} onDrillDown={handleDrillDown} />;
      case 'stores': return <StoresList stores={ACTIVE_STORES} onSelect={handleStoreSelect} filters={storesFilters} onFiltersChange={updateStoresFilters} />;
      case 'products': return <ProductsList products={PRODUCTS} onSelect={handleProductSelect} filters={productsFilters} onFiltersChange={updateProductsFilters} />;
      case 'trends': return <Trends stores={ACTIVE_STORES} products={PRODUCTS} onDrillDown={handleDrillDown} />;
      case 'alerts': return <Alerts stores={ACTIVE_STORES} onSelect={handleStoreSelect} />;
      case 'rankings': return <Rankings stores={ACTIVE_STORES} onSelect={handleStoreSelect} />;
      case 'inactive': return <Inactive stores={INACTIVE_STORES} onSelect={handleStoreSelect} />;
      case 'settings': return <SettingsPage onLogout={handleLogout} />;
      default: return <Overview stores={STORES} products={PRODUCTS} onNav={nav} onDrillDown={handleDrillDown} />;
    }
  };
  
  // Show login screen if not logged in
  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  const totalTempExclusions = excludedStores.length + excludedProducts.length;
  const totalPermExclusions = permanentExcludedStores.length + permanentExcludedProducts.length;
  const totalExclusions = allExcludedStores.length + allExcludedProducts.length;
  
  return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-auto" dir="rtl">
    {/* v1.4 - PDF PRINT STYLES + MOBILE SCROLL FIX */}
    <style jsx global>{`
      @media print {
        .print\\:hidden { display: none !important; }
        body { background: white !important; }
        .bg-gradient-to-br { background: white !important; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        .rounded-2xl { border-radius: 0 !important; }
        .shadow-lg { box-shadow: none !important; }
        @page { margin: 1cm; }
        h2, h3 { page-break-after: avoid; }
        .bg-white { background: white !important; }
      }
      /* Mobile scroll fix */
      html, body {
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      /* Ensure main content scrolls */
      .main-content {
        -webkit-overflow-scrolling: touch;
        overflow-y: auto;
      }
    `}</style>
    
    <header className="bg-white shadow-sm border-b sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2 hover:bg-gray-100 rounded-xl">{menu ? <X size={24}/> : <Menu size={24}/>}</button>
          <BaronLogo />
          <span className="text-xs text-gray-400 hidden sm:inline">v1.10.12</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowGlobalComparison(true)} 
            className="flex items-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors"
          >
            <BarChart3 size={18} />
            <span className="hidden sm:inline">השוואת חנויות</span>
          </button>
          <button onClick={() => setShowExclusions(!showExclusions)} className={'relative p-2 rounded-xl transition-colors ' + (showExclusions ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-600')}>
            <Filter size={20} />
            {totalExclusions > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{totalExclusions}</span>}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600"><User size={18}/><span>מנהל</span></div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600"><LogOut size={20}/></button>
        </div>
      </div>
    </header>
    
    {/* Exclusions Panel */}
    {showExclusions && (
      <div className="bg-white border-b shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">🚫 החרגות</h3>
            <div className="flex gap-2">
              {totalTempExclusions > 0 && <button onClick={clearTempExclusions} className="text-sm text-orange-600 hover:text-orange-800 px-2 py-1 bg-orange-50 rounded">נקה זמניות ({totalTempExclusions})</button>}
              {totalPermExclusions > 0 && <button onClick={clearPermanentExclusions} className="text-sm text-red-600 hover:text-red-800 px-2 py-1 bg-red-50 rounded">נקה קבועות ({totalPermExclusions})</button>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stores Exclusion */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">🏪 חנויות</p>
              <ExclusionSearchAdvanced 
                type="stores" 
                items={applyConfig(STORES_RAW, rulesConfig)} 
                excludedTemp={excludedStores}
                excludedPerm={permanentExcludedStores}
                onToggleTemp={(id) => toggleExcludeStore(id, false)}
                onTogglePerm={(id) => toggleExcludeStore(id, true)}
              />
            </div>
            {/* Products Exclusion */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">📦 מוצרים</p>
              <ExclusionSearchAdvanced 
                type="products" 
                items={applyConfig(PRODUCTS_RAW, rulesConfig)} 
                excludedTemp={excludedProducts}
                excludedPerm={permanentExcludedProducts}
                onToggleTemp={(id) => toggleExcludeProduct(id, false)}
                onTogglePerm={(id) => toggleExcludeProduct(id, true)}
              />
            </div>
          </div>
          
          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>זמנית (מתאפס ברענון)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>קבועה (נשמר)</span>
          </div>
        </div>
      </div>
    )}
    
    <div className="flex">
      <aside className="hidden lg:block w-56 bg-white border-l fixed top-[60px] bottom-0 overflow-y-auto print:hidden">
        <nav className="p-4 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => handleTabChange(t.id)} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav>
      </aside>
      {menu && <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setMenu(false)}><div className="w-64 bg-white h-full" onClick={e => e.stopPropagation()}><nav className="p-4 space-y-1 mt-16">{tabs.map(t => <button key={t.id} onClick={() => { handleTabChange(t.id); setMenu(false); }} className={'w-full flex items-center gap-3 px-4 py-3 rounded-xl ' + (tab === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50')}><t.I size={20}/>{t.l}</button>)}</nav></div></div>}
      <main className="flex-1 p-4 lg:p-6 lg:mr-56 w-full">{content()}</main>
    </div>
    
    {/* Global Store Comparison Modal */}
    {showGlobalComparison && (
      <GlobalStoreComparisonModal 
        stores={ACTIVE_STORES}
        onClose={() => setShowGlobalComparison(false)}
        onSelectStore={(s) => { setShowGlobalComparison(false); handleStoreSelect(s); }}
      />
    )}
    
    {/* Global Product Comparison Modal */}
    {showGlobalProductComparison && (
      <GlobalProductComparisonModal 
        products={PRODUCTS}
        onClose={() => setShowGlobalProductComparison(false)}
        onSelectProduct={(p) => { setShowGlobalProductComparison(false); handleProductSelect(p); }}
      />
    )}
  </div>);
}
