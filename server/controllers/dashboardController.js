/**
 * Dashboard Controller - V3 ERP Analytics
 * Aggregates live statistics, charts data, Saree predictions, and AI-powered insights from Supabase
 */
const { supabase } = require('../config/supabase');

// Helper: parse JSON or return mock details for legacy stock history records
const getTransactionDetails = (entry) => {
  let details = null;
  try {
    if (entry.reason && (entry.reason.startsWith('{') || entry.reason.startsWith('['))) {
      details = JSON.parse(entry.reason);
    }
  } catch (e) {
    // Ignore
  }

  if (!details) {
    const qtyChanged = entry.new_stock - entry.old_stock;
    details = {
      sari_number: entry.sarees?.series_code || entry.series_code || 'UNKNOWN',
      beam_name: entry.beam_name || 'UNKNOWN',
      combination_name: entry.combination_name || 'Combination',
      action: entry.action === 'Increase' ? 'Stock Added' : entry.action === 'Decrease' ? 'Delivery' : 'Manual Edit',
      opening_stock: entry.old_stock,
      quantity_changed: qtyChanged,
      closing_stock: entry.new_stock,
      reason_category: entry.action,
      supplier_name: null,
      customer_name: null,
      invoice_number: null,
      delivery_notes: null,
      remarks: entry.reason || '',
      user_name: entry.changed_by_name || 'System'
    };
  }
  return details;
};

// Helper: Get Date Ranges (Current vs Previous)
const getDatePeriods = (range, customStart, customEnd) => {
  const endDate = new Date();
  let startDate = new Date();

  switch (range) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case '7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '3months':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case '12months':
      startDate.setMonth(endDate.getMonth() - 12);
      break;
    case 'custom':
      if (customStart) startDate = new Date(customStart);
      if (customEnd) endDate = new Date(customEnd);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30); // Default to 30 days
      break;
  }

  const duration = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - duration);
  const prevEndDate = new Date(startDate.getTime());

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    durationMs: duration
  };
};

// Helper: Calculate 12-bin sparkline data for KPIs
const getSparklineData = (historyEntries, startDate, endDate, actionType) => {
  const binsCount = 12;
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const step = Math.max(1000, (endMs - startMs) / binsCount);

  const bins = Array.from({ length: binsCount }, (_, idx) => {
    const binStart = startMs + idx * step;
    let label = '';
    if (endMs - startMs <= 24 * 60 * 60 * 1000) {
      label = new Date(binStart).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
    } else {
      label = new Date(binStart).toLocaleDateString('default', { month: 'short', day: 'numeric' });
    }
    return { label, value: 0 };
  });

  historyEntries.forEach(h => {
    const time = new Date(h.created_at).getTime();
    if (time >= startMs && time <= endMs) {
      const isMatch = actionType === 'Increase'
        ? (h.action === 'Increase' || h.details?.action === 'Stock Added')
        : (h.action === 'Decrease' || h.details?.action === 'Delivery');

      if (isMatch) {
        const binIndex = Math.min(binsCount - 1, Math.floor((time - startMs) / step));
        if (binIndex >= 0 && bins[binIndex]) {
          bins[binIndex].value += Math.abs(h.qty || 0);
        }
      }
    }
  });

  return bins;
};

// Helper: Running Inventory sparkline
const getRunningStockSparkline = (currentStock, historyEntries, startDate, endDate) => {
  const binsCount = 12;
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const step = Math.max(1000, (endMs - startMs) / binsCount);

  const bins = Array.from({ length: binsCount }, (_, idx) => {
    const binEnd = startMs + (idx + 1) * step;
    let label = '';
    if (endMs - startMs <= 24 * 60 * 60 * 1000) {
      label = new Date(binEnd).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
    } else {
      label = new Date(binEnd).toLocaleDateString('default', { month: 'short', day: 'numeric' });
    }
    return { label, value: currentStock, binEnd };
  });

  const sortedHistory = [...historyEntries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  bins.forEach(bin => {
    let netDiffAfterBin = 0;
    sortedHistory.forEach(h => {
      if (new Date(h.created_at).getTime() > bin.binEnd) {
        netDiffAfterBin += h.qtyDirectional;
      }
    });
    bin.value = Math.max(0, currentStock - netDiffAfterBin);
  });

  return bins.map(b => ({ label: b.label, value: b.value }));
};

// Helper: Group stock movement chart data
const getStockMovementData = (historyEntries, startDate, endDate, grouping) => {
  const dataMap = {};
  const current = new Date(startDate);

  while (current <= endDate) {
    let key = '';
    let label = '';

    if (grouping === 'daily') {
      key = current.toISOString().split('T')[0];
      label = current.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      current.setDate(current.getDate() + 1);
    } else if (grouping === 'weekly') {
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(current.setDate(diff));
      key = startOfWeek.toISOString().split('T')[0];
      label = `Wk of ${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
      current.setDate(current.getDate() + 7);
    } else { // monthly
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      label = current.toLocaleString('default', { month: 'short', year: '2-digit' });
      current.setMonth(current.getMonth() + 1);
    }

    dataMap[key] = { label, stockAdded: 0, stockDelivered: 0, netChange: 0 };
  }

  historyEntries.forEach(h => {
    const createdDate = new Date(h.created_at);
    if (createdDate >= startDate && createdDate <= endDate) {
      let key = '';
      if (grouping === 'daily') {
        key = createdDate.toISOString().split('T')[0];
      } else if (grouping === 'weekly') {
        const day = createdDate.getDay();
        const diff = createdDate.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(createdDate.setDate(diff));
        key = startOfWeek.toISOString().split('T')[0];
      } else {
        key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (dataMap[key]) {
        if (h.action === 'Increase' || h.details?.action === 'Stock Added') {
          dataMap[key].stockAdded += h.qty;
        } else if (h.action === 'Decrease' || h.details?.action === 'Delivery') {
          dataMap[key].stockDelivered += h.qty;
        }
      }
    }
  });

  return Object.values(dataMap).map(d => ({
    ...d,
    netChange: d.stockAdded - d.stockDelivered
  }));
};

// Helper: Standard Deviation for Volatility
const getStdDev = (arr) => {
  const n = arr.length;
  if (n <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const val = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  return Math.sqrt(val);
};

// Main getDashboard endpoint
const getDashboard = async (req, res) => {
  try {
    const { range = '30days', customStart, customEnd, grouping = 'daily' } = req.query;
    const periods = getDatePeriods(range, customStart, customEnd);

    const ownerId = req.user.owner_id;

    // 1. Core Counts & Dynamic details — all scoped to this owner
    // Execute all queries concurrently to optimize backend performance
    console.time(`getDashboard-Queries-${ownerId}`);
    const [
      totalSareesRes,
      ownerSareesRes,
      pendingRequestsRes,
      completedRequestsRes,
      rawHistoryRes
    ] = await Promise.all([
      supabase
        .from('sarees')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId),
      supabase
        .from('sarees')
        .select('id, series_code, price, beams(id, saree_id, beam_name, combinations(id, combination_name, current_stock, minimum_stock, brand, status))')
        .eq('owner_id', ownerId),
      supabase
        .from('stock_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Requested')
        .eq('owner_id', ownerId),
      supabase
        .from('stock_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Received')
        .eq('owner_id', ownerId),
      supabase
        .from('stock_history')
        .select('*, sarees(series_code, sari_name, price)')
        .eq('owner_id', ownerId)
        .gte('created_at', periods.prevStartDate.toISOString())
    ]);
    console.timeEnd(`getDashboard-Queries-${ownerId}`);

    if (totalSareesRes.error) throw totalSareesRes.error;
    if (ownerSareesRes.error) throw ownerSareesRes.error;
    if (pendingRequestsRes.error) throw pendingRequestsRes.error;
    if (completedRequestsRes.error) throw completedRequestsRes.error;
    if (rawHistoryRes.error) throw rawHistoryRes.error;

    const totalSarees = totalSareesRes.count;
    const ownerSarees = ownerSareesRes.data;
    const pendingRequests = pendingRequestsRes.count;
    const completedRequests = completedRequestsRes.count;
    const rawHistory = rawHistoryRes.data;

    // Flatten into a combos array that mirrors the old shape, strictly scoped to this owner
    const combos = [];
    (ownerSarees || []).forEach(saree => {
      (saree.beams || []).forEach(beam => {
        (beam.combinations || []).forEach(combo => {
          combos.push({
            ...combo,
            beams: {
              saree_id: saree.id,
              beam_name: beam.beam_name,
              sarees: { series_code: saree.series_code, price: saree.price, owner_id: ownerId }
            },
            image_url: combo.image_url || null
          });
        });
      });
    });

    // All combos are already owner-scoped — no further filtering needed
    const ownedCombos = combos;
    const totalStock = combos.reduce((sum, c) => sum + (c.current_stock || 0), 0);
    const lowStockCount = combos.filter(c => (c.current_stock ?? 0) <= (c.minimum_stock ?? 20)).length;
    const outOfStock = combos.filter(c => (c.current_stock ?? 0) === 0).length;

    const parsedHistory = (rawHistory || []).map(h => {
      const details = getTransactionDetails(h);
      const createdDate = new Date(h.created_at);
      const qty = Math.abs(details.quantity_changed);
      const qtyDirectional = details.quantity_changed;

      return {
        ...h,
        details,
        createdDate,
        qty,
        qtyDirectional
      };
    });

    // Bucket history by periods
    const currentPeriodHistory = parsedHistory.filter(h => h.createdDate >= periods.startDate && h.createdDate <= periods.endDate);
    const previousPeriodHistory = parsedHistory.filter(h => h.createdDate >= periods.prevStartDate && h.createdDate < periods.startDate);

    // Calculate Delivered and Added sums
    let currentDelivered = 0;
    let currentAdded = 0;
    currentPeriodHistory.forEach(h => {
      if (h.action === 'Decrease' || h.details?.action === 'Delivery') currentDelivered += h.qty;
      if (h.action === 'Increase' || h.details?.action === 'Stock Added') currentAdded += h.qty;
    });

    let prevDelivered = 0;
    let prevAdded = 0;
    previousPeriodHistory.forEach(h => {
      if (h.action === 'Decrease' || h.details?.action === 'Delivery') prevDelivered += h.qty;
      if (h.action === 'Increase' || h.details?.action === 'Stock Added') prevAdded += h.qty;
    });

    // Percentage changes
    const deliveredChange = prevDelivered > 0 ? Math.round(((currentDelivered - prevDelivered) / prevDelivered) * 1000) / 10 : 0;
    const addedChange = prevAdded > 0 ? Math.round(((currentAdded - prevAdded) / prevAdded) * 1000) / 10 : 0;

    // Generate Sparkline bins (12 bins)
    const deliveredSparkline = getSparklineData(parsedHistory, periods.startDate, periods.endDate, 'Decrease');
    const addedSparkline = getSparklineData(parsedHistory, periods.startDate, periods.endDate, 'Increase');
    const stockSparkline = getRunningStockSparkline(totalStock, parsedHistory, periods.startDate, periods.endDate);
    const sareesSparkline = Array.from({ length: 12 }, (_, i) => ({ label: `Pt ${i + 1}`, value: totalSarees }));

    // Stock Movement Chart Data
    const stockMovement = getStockMovementData(parsedHistory, periods.startDate, periods.endDate, grouping);

    // Saree Level aggregation for Rankings and Trends
    const sareeMetrics = {};
    parsedHistory.forEach(h => {
      const code = h.details?.sari_number || 'UNKNOWN';
      if (!sareeMetrics[code]) {
        sareeMetrics[code] = { code, currentDelivered: 0, prevDelivered: 0, currentAdded: 0 };
      }

      const inCurrent = h.createdDate >= periods.startDate && h.createdDate <= periods.endDate;
      const inPrev = h.createdDate >= periods.prevStartDate && h.createdDate < periods.startDate;

      if (h.action === 'Decrease' || h.details?.action === 'Delivery') {
        if (inCurrent) sareeMetrics[code].currentDelivered += h.qty;
        if (inPrev) sareeMetrics[code].prevDelivered += h.qty;
      } else if (h.action === 'Increase' || h.details?.action === 'Stock Added') {
        if (inCurrent) sareeMetrics[code].currentAdded += h.qty;
      }
    });

    // Match each Saree with current stock and calculate trend/days remaining
    const sareeStockLevels = {};
    (combos || []).forEach(c => {
      const code = c.beams?.sarees?.series_code || 'UNKNOWN';
      sareeStockLevels[code] = (sareeStockLevels[code] || 0) + (c.current_stock || 0);
    });

    const activeDays = Math.max(1, periods.durationMs / (1000 * 60 * 60 * 24));

    const topPerforming = Object.values(sareeMetrics)
      .map(sm => {
        const stock = sareeStockLevels[sm.code] ?? 0;
        const avgDailyDemand = sm.currentDelivered / activeDays;
        const daysRemaining = avgDailyDemand > 0 ? Math.round(stock / avgDailyDemand) : 999;

        let trendPercent = 0;
        if (sm.prevDelivered > 0) {
          trendPercent = Math.round(((sm.currentDelivered - sm.prevDelivered) / sm.prevDelivered) * 100);
        }

        return {
          code: sm.code,
          delivered: sm.currentDelivered,
          stock,
          trend: trendPercent,
          daysRemaining: daysRemaining === 999 ? '∞' : daysRemaining
        };
      })
      .sort((a, b) => b.delivered - a.delivered)
      .slice(0, 5);

    // Needs Attention & Opportunities lists
    const needsAttention = [];
    const opportunities = [];

    // Evaluate stockout risk and stagnant items
    const fortyFiveDaysAgo = new Date(); fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    // combos is already owner-scoped — iterate directly
    combos.forEach(c => {
      const seriesCode = c.beams?.sarees?.series_code || 'UNKNOWN';
      const name = `${seriesCode} - ${c.beams?.beam_name} (${c.combination_name || 'Combo'})`;
      const isLow = (c.current_stock ?? 0) <= (c.minimum_stock ?? 20);

      const hasRecentSales = parsedHistory.some(h =>
        h.combination_id === c.id &&
        h.createdDate >= fortyFiveDaysAgo &&
        (h.action === 'Decrease' || h.details?.action === 'Delivery')
      );

      if (c.current_stock === 0) {
        needsAttention.push({ id: c.id, name, type: 'Out of Stock', detail: '0 pcs available', severity: 'error', sareeId: c.beams?.saree_id, image_url: c.image_url || null });
      } else if (isLow) {
        needsAttention.push({ id: c.id, name, type: 'Low Stock', detail: `Under safety level (${c.current_stock} pcs)`, severity: 'warning', sareeId: c.beams?.saree_id, image_url: c.image_url || null });
      } else if (!hasRecentSales && c.current_stock > 50) {
        needsAttention.push({ id: c.id, name, type: 'Stagnant Stock', detail: `No movement for 45+ days (${c.current_stock} pcs)`, severity: 'info', sareeId: c.beams?.saree_id, image_url: c.image_url || null });
      }

      // Check Opportunities
      const recentSalesQty = parsedHistory
        .filter(h => h.combination_id === c.id && h.createdDate >= periods.startDate)
        .reduce((sum, h) => sum + (h.action === 'Decrease' || h.details?.action === 'Delivery' ? h.qty : 0), 0);

      const prevSalesQty = parsedHistory
        .filter(h => h.combination_id === c.id && h.createdDate >= periods.prevStartDate && h.createdDate < periods.startDate)
        .reduce((sum, h) => sum + (h.action === 'Decrease' || h.details?.action === 'Delivery' ? h.qty : 0), 0);

      if (recentSalesQty > 100) {
        opportunities.push({ id: c.id, name, type: 'High Velocity', detail: `${recentSalesQty} pcs delivered`, sareeId: c.beams?.saree_id, image_url: c.image_url || null });
      } else if (recentSalesQty > 0 && recentSalesQty > prevSalesQty * 1.3) {
        opportunities.push({ id: c.id, name, type: 'Growing Demand', detail: `Up +${prevSalesQty > 0 ? Math.round(((recentSalesQty - prevSalesQty) / prevSalesQty) * 100) : 100}%`, sareeId: c.beams?.saree_id, image_url: c.image_url || null });
      }
    });

    // Live AI Insights / Brief panel
    const aiBrief = [];
    if (topPerforming.length > 0) {
      aiBrief.push({
        id: 'top-perf',
        severity: 'info',
        title: 'High Sales Velocity',
        explanation: `${topPerforming[0].code} is moving extremely fast, with ${topPerforming[0].delivered} deliveries in the selected period.`,
        action: 'View Saree',
        route: `/sarees?search=${topPerforming[0].code}`
      });
    }

    if (lowStockCount > 0) {
      const lowC = combos.find(c => (c.current_stock ?? 0) <= (c.minimum_stock ?? 20));
      if (lowC) {
        aiBrief.push({
          id: 'safety-alert',
          severity: 'warning',
          title: 'Safety stock breached',
          explanation: `${lowC.beams?.sarees?.series_code} (${lowC.beams?.beam_name}) dropped to ${lowC.current_stock} pcs.`,
          action: 'Create Stock Request',
          route: `/sarees?search=${lowC.beams?.sarees?.series_code}`
        });
      }
    }

    const stagnantC = combos.find(c => {
      const hasRecent = parsedHistory.some(h => h.combination_id === c.id && h.createdDate >= fortyFiveDaysAgo);
      return !hasRecent && c.current_stock > 100;
    });
    if (stagnantC) {
      aiBrief.push({
        id: 'stagnant-alert',
        severity: 'info',
        title: 'Stagnant Stock Warning',
        explanation: `${stagnantC.beams?.sarees?.series_code} has not moved in 45 days. Consider promotions or discounts.`,
        action: 'View Saree',
        route: `/sarees?search=${stagnantC.beams?.sarees?.series_code}`
      });
    }

    // Additional dynamic logic
    const totalValuation = combos.reduce((acc, c) => acc + ((c.current_stock || 0) * (c.beams?.sarees?.price || 0)), 0);
    if (totalValuation > 0) {
      aiBrief.push({
        id: 'value-info',
        severity: 'success',
        title: 'Inventory Value High',
        explanation: `Total warehouse stock value has reached ₹${totalValuation.toLocaleString('en-IN')}.`,
        action: 'View Forecast',
        route: ''
      });
    }

    // Top suppliers and customers
    const supplierPurchases = {};
    const customerSales = {};
    currentPeriodHistory.forEach(h => {
      const supplier = h.details?.supplier_name;
      const customer = h.details?.customer_name;
      if (h.action === 'Increase' || h.details?.action === 'Stock Added') {
        if (supplier) supplierPurchases[supplier] = (supplierPurchases[supplier] || 0) + h.qty;
      } else if (h.action === 'Decrease' || h.details?.action === 'Delivery') {
        if (customer) customerSales[customer] = (customerSales[customer] || 0) + h.qty;
      }
    });

    const topSuppliers = Object.entries(supplierPurchases)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    const topCustomers = Object.entries(customerSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    // Recent stock activity
    const recentActivity = parsedHistory
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(h => ({
        id: h.id,
        action: h.action,
        sareeCode: h.details?.sari_number || 'UNKNOWN',
        combinationName: h.details?.combination_name || 'Combo',
        qty: h.qty,
        actionLabel: h.details?.action || h.action,
        user: h.details?.user_name || 'System',
        timestamp: h.created_at
      }));

    res.json({
      range,
      stats: {
        totalSarees,
        currentStock: totalStock,
        delivered: currentDelivered,
        added: currentAdded,
        comparison: {
          deliveredPercent: deliveredChange,
          addedPercent: addedChange,
          prevDelivered,
          prevAdded
        },
        lowStock: lowStockCount,
        outOfStock,
        pendingRequests,
        inDelivery: combos.filter(c => c.status === 'In Delivery').length
      },
      sparklines: {
        sarees: sareesSparkline,
        stock: stockSparkline,
        delivered: deliveredSparkline,
        added: addedSparkline
      },
      aiBrief,
      stockMovement,
      topPerforming,
      topSuppliers,
      topCustomers,
      needsAttention: needsAttention.slice(0, 6),
      opportunities: opportunities.slice(0, 6),
      recentActivity
    });
  } catch (error) {
    console.error('DashboardController error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// Secure server-side Gemini Analysis Call
const getGeminiAnalysis = async (metrics) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Generate beautiful, deterministic rule-based analysis when key is missing so dashboard remains fully functional
    const code = metrics.seriesCode || 'KS526D';
    const stock = metrics.currentStock || 0;
    const demand = metrics.avgDailyDemand || 0;
    const trend = metrics.trend || 'stable';
    const recQty = metrics.recommendedOrderQty || 0;
    const days = metrics.daysRemaining;

    let summary = "";
    const reasoning = [];
    const risks = [];
    const actions = [];

    if (stock === 0) {
      summary = `Saree ${code} is currently out of stock, causing immediate revenue loss. Restocking is required immediately to fulfill outstanding demand.`;
    } else if (days <= 7) {
      summary = `Saree ${code} is experiencing a critical stockout risk with only ${days} days of inventory remaining. Immediate replenishment is recommended.`;
    } else if (days <= 15) {
      summary = `Stock levels for Saree ${code} are running low relative to demand. Moderate replenishment is advised to avoid safety stock breaches.`;
    } else if (recQty > 0) {
      summary = `Inventory for Saree ${code} is currently stable but below the calculated optimal safety threshold. Consider ordering ${recQty} units to prepare for forecasted demand.`;
    } else if (trend === 'increasing') {
      summary = `Saree ${code} is showing positive sales traction with a ${metrics.trendPercent}% increase in average demand. Stock levels are currently adequate to cover this trend.`;
    } else {
      summary = `Saree ${code} maintains a healthy and stable inventory position. Current stock covers all forecasted demands with high safety margins.`;
    }

    reasoning.push(`Average daily outflow is currently ${demand} pcs/day, compared to a baseline of ${metrics.previousAvgDailyDemand} pcs/day.`);
    if (trend === 'increasing') {
      reasoning.push(`Demand trend has accelerated by ${metrics.trendPercent}%, indicating rising interest or customer delivery peaks.`);
    } else if (trend === 'decreasing') {
      reasoning.push(`Demand has decelerated by ${Math.abs(metrics.trendPercent)}%, suggesting temporary cooling or seasonal patterns.`);
    } else {
      reasoning.push(`Stable consumption rate observed over the active historical period.`);
    }
    reasoning.push(`Safety stock requirement is calculated at ${metrics.safetyStock} pcs to guard against lead time delays.`);

    if (stock === 0) {
      risks.push(`Immediate stockout: sales channel is dry, leading to lost customer orders.`);
    } else if (days <= 7) {
      risks.push(`Critical stockout risk: current supply is highly likely to deplete within ${days} days.`);
    } else if (days <= 15) {
      risks.push(`Low stock alert: inventory buffer is within the safety stock limit, exposing the system to supply chain delays.`);
    } else if (demand === 0) {
      risks.push(`Stagnant inventory: no sales transactions have been recorded in this period, risking high holding costs.`);
    } else {
      risks.push(`Low volatility risk: stable demand makes stockouts unlikely under normal lead times.`);
    }

    if (metrics.confidence < 60) {
      risks.push(`Low data confidence: forecast is based on limited historical transaction data, which may skew recommended quantities.`);
    }

    if (recQty > 0) {
      actions.push(`Schedule an immediate production order of at least ${recQty} pcs of Saree ${code}.`);
    } else {
      actions.push(`Maintain current inventory levels. No new orders are needed at this time.`);
    }

    if (stock === 0 || days <= 15) {
      actions.push(`Coordinate with the beam weaver for expedited delivery of active combinations.`);
    }

    if (demand === 0 && stock > 100) {
      actions.push(`Consider moving slow-moving combinations to active retail promotions or volume discounts.`);
    } else if (trend === 'increasing') {
      actions.push(`Prioritize raw material allocation (weaving loom threads) for Saree ${code} to support growing demand.`);
    }

    return {
      summary,
      reasoning,
      risks,
      actions
    };
  }

  const prompt = `You are an AI Inventory Intelligence Assistant for a premium saree manufacturing and stock management ERP.
You are given the following computed metrics for Saree "${metrics.seriesCode}":
- Current Stock: ${metrics.currentStock} pcs
- Average Daily Demand: ${metrics.avgDailyDemand} pcs/day
- Previous Average Daily Demand: ${metrics.previousAvgDailyDemand} pcs/day
- 30-Day Forecasted Demand: ${metrics.forecast30Days} pcs
- Safety Stock: ${metrics.safetyStock} pcs
- Recommended Order/Production Qty: ${metrics.recommendedOrderQty} pcs
- Days of Stock Remaining: ${metrics.daysRemaining} days
- Demand Trend: ${metrics.trend} (${metrics.trendPercent}% change)
- Forecast Confidence: ${metrics.confidence}%

Based on these metrics:
1. Explain why demand is changing and summarize the overall inventory state.
2. Outline key risks (e.g. stockout risk, stagnant inventory, supply lag).
3. Recommend specific business actions (e.g. order quantity, production priority, promotions).

Return a JSON object with exactly the following keys:
{
  "summary": "A concise 2-sentence summary of the inventory situation.",
  "reasoning": ["point 1", "point 2", ...],
  "risks": ["risk 1", "risk 2", ...],
  "actions": ["action 1", "action 2", ...]
}
Do not write markdown formatting in your response (like \`\`\`json). Return raw JSON only.`;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resData = await response.json();
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
      cleanedText = cleanedText.replace(/\s*```$/, '');
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    const isValid = parsed
      && typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      && Array.isArray(parsed.reasoning)
      && Array.isArray(parsed.risks)
      && Array.isArray(parsed.actions);

    if (!isValid) throw new Error("Gemini response failed shape validation");

    return parsed;
  } catch (err) {
    console.error("Gemini API error:", err.name === 'AbortError' ? 'Request timed out after 10s' : err);
    return {
      summary: "AI explanation temporarily unavailable.",
      reasoning: ["Failed to connect to AI server or parse response."],
      risks: ["Unable to fetch automated risk assessment."],
      actions: ["Please try again later. Numerical calculations remain fully active."]
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Hybrid Saree Prediction Endpoint
const getPrediction = async (req, res) => {
  try {
    const { sareeId, horizon = 30 } = req.query;
    if (!sareeId) return res.status(400).json({ error: 'Saree ID is required' });

    const hDays = parseInt(horizon) || 30;

    // Fetch Saree details with full hierarchy (scoped to owner)
    const { data: saree, error: sareeError } = await supabase
      .from('sarees')
      .select('*, beams(*, combinations(*, combination_colors(*)))')
      .eq('id', sareeId)
      .eq('owner_id', req.user.owner_id)
      .single();

    if (sareeError || !saree) {
      return res.status(404).json({ error: 'Saree not found' });
    }

    // Extract combination IDs
    const comboMap = {};
    const comboIds = [];
    (saree.beams || []).forEach(b => {
      (b.combinations || []).forEach(c => {
        comboIds.push(c.id);
        comboMap[c.id] = {
          beamName: b.beam_name,
          combinationName: c.combination_name,
          combination: c
        };
      });
    });

    let history = [];
    if (comboIds.length > 0) {
      const { data: rawHist } = await supabase
        .from('stock_history')
        .select('*')
        .in('combination_id', comboIds)
        .eq('owner_id', req.user.owner_id)
        .order('created_at', { ascending: true });
      history = rawHist || [];
    }

    // Get time limits for historical analysis (last 90 days)
    const now = new Date();
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const parsedHistory = history.map(h => {
      const details = getTransactionDetails(h);
      return {
        ...h,
        details,
        createdDate: new Date(h.created_at),
        qty: Math.abs(details.quantity_changed)
      };
    });

    const deliveries = parsedHistory.filter(h => h.action === 'Decrease' || h.details?.action === 'Delivery');

    // 1. Calculate general Saree level metrics
    const currentSareeStock = (saree.beams || []).reduce((sum, b) =>
      sum + (b.combinations || []).reduce((cs, c) => cs + (c.current_stock || 0), 0), 0
    );

    // Total deliveries in 90 days
    const del90Days = deliveries.filter(d => d.createdDate >= ninetyDaysAgo);
    const totalDeliveredQty = del90Days.reduce((sum, d) => sum + d.qty, 0);

    // Active sales days (days since first delivery, max 90)
    let firstDelDate = ninetyDaysAgo;
    if (deliveries.length > 0) {
      const firstEver = new Date(deliveries[0].created_at);
      if (firstEver > ninetyDaysAgo) firstDelDate = firstEver;
    }
    const activeDaysCount = Math.max(1, Math.ceil((now - firstDelDate) / (1000 * 60 * 60 * 24)));

    const averageDailyDemand = totalDeliveredQty / activeDaysCount;

    // Recent demand (last 14 days) vs prior
    const del14Days = del90Days.filter(d => d.createdDate >= fourteenDaysAgo);
    const recentDelQty = del14Days.reduce((sum, d) => sum + d.qty, 0);
    const avgDemand14 = recentDelQty / 14;

    const priorDelQty = totalDeliveredQty - recentDelQty;
    const priorDays = Math.max(1, activeDaysCount - 14);
    const avgDemandPrior = priorDelQty / priorDays;

    const weightedRecentDemand = (activeDaysCount > 14)
      ? (0.7 * avgDemand14 + 0.3 * avgDemandPrior)
      : averageDailyDemand;

    const trendPercent = avgDemandPrior > 0
      ? Math.round(((avgDemand14 - avgDemandPrior) / avgDemandPrior) * 100)
      : (avgDemand14 > 0 ? 100 : 0);

    const trend = trendPercent > 10 ? 'increasing' : (trendPercent < -10 ? 'decreasing' : 'stable');

    // Volatility calculation (Standard deviation of daily demand over 90 days)
    const dailySumMap = {};
    for (let i = 89; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailySumMap[key] = 0;
    }
    del90Days.forEach(d => {
      const key = d.createdDate.toISOString().split('T')[0];
      if (dailySumMap[key] !== undefined) dailySumMap[key] += d.qty;
    });
    const dailyDemandArray = Object.values(dailySumMap);
    const demandVolatility = getStdDev(dailyDemandArray);

    // Lead Time Demand & Safety Stock (Lead time = 7 days default)
    const leadTimeDays = 7;
    const leadTimeDemand = averageDailyDemand * leadTimeDays;
    let safetyStock = Math.round(1.65 * demandVolatility * Math.sqrt(leadTimeDays));
    if (safetyStock <= 0) {
      safetyStock = Math.max(10, Math.ceil(averageDailyDemand * 3));
    }

    const forecastDemand = averageDailyDemand * hDays;
    const recommendedStock = forecastDemand + safetyStock;
    const recommendedOrderQty = Math.max(0, Math.ceil(recommendedStock - currentSareeStock));
    const daysRemaining = averageDailyDemand > 0 ? currentSareeStock / averageDailyDemand : 999;

    let stockoutRisk = 'LOW';
    if (daysRemaining <= 7) stockoutRisk = 'CRITICAL';
    else if (daysRemaining <= 15) stockoutRisk = 'HIGH';
    else if (daysRemaining <= 30) stockoutRisk = 'MODERATE';

    // Confidence Calculation
    let confidence = 50;
    if (totalDeliveredQty > 0) {
      const cv = demandVolatility / (averageDailyDemand || 1); // Coefficient of Variation
      const volConfidenceReduction = Math.min(30, cv * 10);
      const dataVolumeFactor = Math.min(1.0, activeDaysCount / 90);
      confidence = Math.round((90 - volConfidenceReduction) * dataVolumeFactor + 10);
    }
    confidence = Math.max(50, Math.min(99, confidence));

    // Daily Demand Chart points (Historical 30 days + Forecast 30 days)
    const chartPoints = [];
    // Past 30 days daily sales
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const salesVal = dailySumMap[key] || 0;
      chartPoints.push({
        label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        historical: salesVal,
        forecast: null
      });
    }
    // Future forecast days
    let runningForecastStock = currentSareeStock;
    for (let i = 1; i <= hDays; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      runningForecastStock = Math.max(0, runningForecastStock - averageDailyDemand);
      chartPoints.push({
        label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        historical: null,
        forecast: Math.round(averageDailyDemand * 10) / 10,
        runningStock: Math.round(runningForecastStock)
      });
    }

    // 2. Hierarchical Breakdown (Beams and Combinations)
    const beamsBreakdown = (saree.beams || []).map(b => {
      const beamCombos = b.combinations || [];
      const beamComboIds = beamCombos.map(c => c.id);

      const beamDeliveries = deliveries.filter(d => beamComboIds.includes(d.combination_id));
      const beamTotalDelivered = beamDeliveries.reduce((sum, d) => sum + d.qty, 0);
      const beamAvgDemand = beamTotalDelivered / activeDaysCount;
      const beamCurrentStock = beamCombos.reduce((sum, c) => sum + (c.current_stock || 0), 0);
      const beamForecastDemand = beamAvgDemand * hDays;
      const beamRecommendedStock = beamForecastDemand + (safetyStock / (saree.beams.length || 1));
      const beamRecommendedOrderQty = Math.max(0, Math.ceil(beamRecommendedStock - beamCurrentStock));

      const comboBreakdown = beamCombos.map(c => {
        const cDeliveries = beamDeliveries.filter(d => d.combination_id === c.id);
        const cTotalDelivered = cDeliveries.reduce((sum, d) => sum + d.qty, 0);
        const cAvgDemand = cTotalDelivered / activeDaysCount;
        const cForecastDemand = cAvgDemand * hDays;
        const cRecommendedStock = cForecastDemand + (safetyStock / (beamComboIds.length || 1));
        const cRecommendedOrderQty = Math.max(0, Math.ceil(cRecommendedStock - (c.current_stock || 0)));

        return {
          id: c.id,
          name: c.combination_name || 'Unnamed Combo',
          brand: c.brand,
          status: c.status,
          currentStock: c.current_stock || 0,
          avgDailyDemand: Math.round(cAvgDemand * 100) / 100,
          forecastDemand: Math.round(cForecastDemand),
          recommendedOrderQty: Math.ceil(cRecommendedOrderQty)
        };
      });

      return {
        id: b.id,
        name: b.beam_name,
        currentStock: beamCurrentStock,
        avgDailyDemand: Math.round(beamAvgDemand * 100) / 100,
        forecastDemand: Math.round(beamForecastDemand),
        recommendedOrderQty: Math.ceil(beamRecommendedOrderQty),
        combinations: comboBreakdown
      };
    });

    // 3. Gemini explanation integration
    const apiInput = {
      seriesCode: saree.series_code,
      currentStock: currentSareeStock,
      avgDailyDemand: Math.round(averageDailyDemand * 10) / 10,
      previousAvgDailyDemand: Math.round(avgDemandPrior * 10) / 10,
      forecast30Days: Math.round(forecastDemand),
      safetyStock,
      recommendedOrderQty,
      daysRemaining: daysRemaining === 999 ? 999 : Math.round(daysRemaining * 10) / 10,
      trend,
      trendPercent: Math.round(trendPercent),
      confidence
    };

    const aiAnalysis = await getGeminiAnalysis(apiInput);

    res.json({
      saree: {
        id: saree.id,
        name: saree.sari_name,
        seriesCode: saree.series_code,
        price: saree.price,
        imageUrl: saree.image_url
      },
      forecast: {
        horizon: hDays,
        currentStock: currentSareeStock,
        avgDailyDemand: Math.round(averageDailyDemand * 10) / 10,
        forecastDemand: Math.round(forecastDemand),
        safetyStock,
        recommendedStock: Math.round(recommendedStock),
        recommendedOrderQty,
        daysRemaining: daysRemaining === 999 ? '∞' : Math.round(daysRemaining),
        stockoutRisk,
        confidence,
        trend,
        trendPercent: Math.round(trendPercent),
        dataQuality: activeDaysCount >= 60 ? 'HIGH' : (activeDaysCount >= 30 ? 'MEDIUM' : 'LOW')
      },
      chartPoints,
      beamsBreakdown,
      aiAnalysis
    });
  } catch (error) {
    console.error('getPrediction error:', error);
    res.status(500).json({ error: 'Failed to generate demand prediction' });
  }
};

module.exports = { getDashboard, getPrediction };
