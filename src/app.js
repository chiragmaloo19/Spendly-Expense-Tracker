// ---- CATEGORY COLOR MAP (Expenses) ----
const CATEGORY_COLORS = {
  Food:          '#ef4444',
  Transport:     '#3b82f6',
  Shopping:      '#f59e0b',
  Bills:         '#8b5cf6',
  Entertainment: '#f97316',
  Health:        '#10b981',
  Other:         '#94a3b8',
};

// ---- SOURCE COLOR MAP (Income) ----
const SOURCE_COLORS = {
  Salary:     '#16a34a',
  Freelance:  '#0ea5e9',
  Business:   '#7c3aed',
  Investment: '#0d9488',
  Gift:       '#ec4899',
  Other:      '#94a3b8',
};

// ---- STATE ----
let expenses = JSON.parse(localStorage.getItem('spendly_expenses')) || [];
let incomes  = JSON.parse(localStorage.getItem('spendly_incomes'))  || [];

// Chart instances
let categoryChartInstance = null;
let monthlyChartInstance  = null;

// ---- SAVE ----
function saveExpenses() { localStorage.setItem('spendly_expenses', JSON.stringify(expenses)); }
function saveIncomes()  { localStorage.setItem('spendly_incomes',  JSON.stringify(incomes));  }

// ---- FORMAT CURRENCY ----
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---- FORMAT DATE ----
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- INIT HEADER ----
function setHeaderDate() {
  const today = new Date();
  document.getElementById('currentDate').textContent =
    today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('currentMonth').textContent =
    today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const todayStr = today.toISOString().split('T')[0];
  document.getElementById('expenseDate').value = todayStr;
  document.getElementById('incomeDate').value  = todayStr;
}

// ---- UPDATE SUMMARY CARDS ----
function updateSummaryCards() {
  const totalExpense = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalIncome  = incomes.reduce((s, i)  => s + parseFloat(i.amount), 0);
  const netBalance   = totalIncome - totalExpense;

  const now   = new Date();
  const monthTotal = expenses
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  const biggest = expenses.length
    ? expenses.reduce((mx, e) => parseFloat(e.amount) > parseFloat(mx.amount) ? e : mx, expenses[0])
    : null;

  document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('totalSpent').textContent  = formatCurrency(totalExpense);
  document.getElementById('monthSpent').textContent  = formatCurrency(monthTotal);
  document.getElementById('txCount').textContent     = expenses.length + incomes.length;

  const balEl  = document.getElementById('netBalance');
  const statEl = document.getElementById('balanceStatus');
  balEl.textContent  = formatCurrency(Math.abs(netBalance));
  if (netBalance >= 0) {
    balEl.style.color  = '#16a34a';
    statEl.textContent = '▲ Surplus';
    statEl.style.color = '#16a34a';
  } else {
    balEl.style.color  = '#dc2626';
    statEl.textContent = '▼ Deficit';
    statEl.style.color = '#dc2626';
  }

  if (biggest) {
    document.getElementById('biggestExpense').textContent = formatCurrency(biggest.amount);
    document.getElementById('biggestLabel').textContent   = biggest.name;
  } else {
    document.getElementById('biggestExpense').textContent = formatCurrency(0);
    document.getElementById('biggestLabel').textContent   = '—';
  }
}

// ---- TAB SWITCH ----
let activeTab = 'expense';

function switchTab(tab) {
  activeTab = tab;
  const expForm   = document.getElementById('expenseForm');
  const incForm   = document.getElementById('incomeForm');
  const tabExp    = document.getElementById('tabExpense');
  const tabInc    = document.getElementById('tabIncome');

  if (tab === 'expense') {
    expForm.style.display = 'block';
    incForm.style.display = 'none';
    tabExp.classList.add('tab-btn--active');
    tabInc.classList.remove('tab-btn--income-active');
  } else {
    expForm.style.display = 'none';
    incForm.style.display = 'block';
    tabInc.classList.add('tab-btn--income-active');
    tabExp.classList.remove('tab-btn--active');
  }
}

// ---- RENDER TRANSACTION LIST ----
function renderExpenseList() {
  const list           = document.getElementById('expenseList');
  const filterType     = document.getElementById('filterType').value;
  const filterCategory = document.getElementById('filterCategory').value;

  let all = [
    ...expenses.map(e => ({ ...e, _type: 'expense' })),
    ...incomes.map(i  => ({ ...i, _type: 'income'  })),
  ];

  if (filterType !== 'All')     all = all.filter(t => t._type === filterType);
  if (filterCategory !== 'All') all = all.filter(t => (t.category || t.source) === filterCategory);

  if (all.length === 0) {
    list.innerHTML = `<li class="empty-state">No transactions found.</li>`;
    return;
  }

  const sorted = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = sorted.map(tx => {
    const isIncome   = tx._type === 'income';
    const tag        = isIncome ? tx.source : tx.category;
    const dotColor   = isIncome ? (SOURCE_COLORS[tx.source] || '#94a3b8') : (CATEGORY_COLORS[tx.category] || '#94a3b8');
    const amtClass   = isIncome ? 'expense-amount--income' : 'expense-amount--expense';
    const sign       = isIncome ? '+' : '−';
    const badge      = isIncome
      ? `<span class="type-badge type-badge--income">Income</span>`
      : `<span class="type-badge type-badge--expense">Expense</span>`;

    return `
      <li class="expense-item">
        <span class="cat-dot" style="background:${dotColor}"></span>
        <div class="expense-info">
          <div class="expense-name">${escapeHTML(tx.name)} ${badge}</div>
          <div class="expense-meta">${tag} · ${formatDate(tx.date)}</div>
        </div>
        <span class="expense-amount ${amtClass}">${sign}${formatCurrency(tx.amount)}</span>
        <button class="btn-delete" onclick="deleteTransaction('${tx.id}','${tx._type}')" title="Delete">✕</button>
      </li>`;
  }).join('');
}

// ---- ESCAPE HTML ----
function escapeHTML(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ---- ADD EXPENSE ----
function addExpense() {
  const name     = document.getElementById('expenseName').value.trim();
  const amount   = parseFloat(document.getElementById('expenseAmount').value);
  const date     = document.getElementById('expenseDate').value;
  const category = document.getElementById('expenseCategory').value;

  if (!name)           { showToast('Please enter a description.', 'error');  return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!date)           { showToast('Please select a date.', 'error');        return; }

  expenses.push({ id: crypto.randomUUID(), name, amount, date, category });
  saveExpenses();
  refreshUI();
  document.getElementById('expenseName').value   = '';
  document.getElementById('expenseAmount').value = '';
  showToast('Expense added!', 'success');
}

// ---- ADD INCOME ----
function addIncome() {
  const name   = document.getElementById('incomeName').value.trim();
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const date   = document.getElementById('incomeDate').value;
  const source = document.getElementById('incomeSource').value;

  if (!name)           { showToast('Please enter a description.', 'error');  return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!date)           { showToast('Please select a date.', 'error');        return; }

  incomes.push({ id: crypto.randomUUID(), name, amount, date, source });
  saveIncomes();
  refreshUI();
  document.getElementById('incomeName').value   = '';
  document.getElementById('incomeAmount').value = '';
  showToast('Income added!', 'success');
}

// ---- DELETE TRANSACTION ----
function deleteTransaction(id, type) {
  if (type === 'expense') { expenses = expenses.filter(e => e.id !== id); saveExpenses(); }
  else                    { incomes  = incomes.filter(i  => i.id !== id); saveIncomes();  }
  refreshUI();
  showToast('Removed.', 'info');
}

// ---- TOAST ----
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast toast--${type} toast--visible`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 2200);
}

// ---- PIE CHART: Expenses by Category Only ----
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  const totals = {};
  expenses.forEach(e => {
    totals[e.category] = (totals[e.category] || 0) + parseFloat(e.amount);
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#94a3b8');

  if (categoryChartInstance) categoryChartInstance.destroy();

  if (labels.length === 0) {
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No expenses yet'],
        datasets: [{ data: [1], backgroundColor: ['#e4e8ef'], borderColor: '#fff', borderWidth: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    });
    return;
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor:      '#fff',
        borderWidth:      3,
        hoverOffset:      10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:     '#64748b',
            font:      { family: 'Inter', size: 11, weight: '500' },
            padding:   14,
            boxWidth:  10,
            boxHeight: 10,
            borderRadius: 3,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          },
          backgroundColor: '#1e293b',
          borderColor:     '#334155',
          borderWidth:     1,
          titleColor:      '#f8fafc',
          bodyColor:       '#94a3b8',
          padding:         10,
          cornerRadius:    8,
        },
      },
    },
  });
}

// ---- BAR CHART: Monthly Income vs Expenses (Reference Style) ----
function renderMonthlyChart() {
  const ctx = document.getElementById('monthlyChart').getContext('2d');

  // Build last 6 months
  const months = [];
  const now    = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label:        d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      month:        d.getMonth(),
      year:         d.getFullYear(),
      totalExpense: 0,
      totalIncome:  0,
    });
  }

  expenses.forEach(e => {
    const d    = new Date(e.date + 'T00:00:00');
    const slot = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (slot) slot.totalExpense += parseFloat(e.amount);
  });

  incomes.forEach(i => {
    const d    = new Date(i.date + 'T00:00:00');
    const slot = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
    if (slot) slot.totalIncome += parseFloat(i.amount);
  });

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        {
          // Income — two-tone green like reference (lighter on top via stacked would need plugin;
          // instead we use a semi-transparent fill behind a solid darker bar)
          label:              'Income',
          data:               months.map(m => m.totalIncome),
          backgroundColor:    months.map(m =>
            m.totalIncome > 0 ? 'rgba(22,163,74,0.82)' : 'rgba(22,163,74,0.15)'
          ),
          borderColor:        '#15803d',
          borderWidth:        1.5,
          borderRadius:       5,
          borderSkipped:      false,
          barPercentage:      0.55,
          categoryPercentage: 0.8,
        },
        {
          label:              'Expenses',
          data:               months.map(m => m.totalExpense),
          backgroundColor:    months.map(m =>
            m.totalExpense > 0 ? 'rgba(220,38,38,0.82)' : 'rgba(220,38,38,0.15)'
          ),
          borderColor:        '#b91c1c',
          borderWidth:        1.5,
          borderRadius:       5,
          borderSkipped:      false,
          barPercentage:      0.55,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          },
          backgroundColor: '#1e293b',
          borderColor:     '#334155',
          borderWidth:     1,
          titleColor:      '#f8fafc',
          bodyColor:       '#94a3b8',
          padding:         10,
          cornerRadius:    8,
        },
      },
      scales: {
        x: {
          grid:   { color: '#f1f5f9', lineWidth: 1 },
          ticks:  { color: '#64748b', font: { family: 'Inter', size: 11, weight: '500' } },
          border: { color: '#e4e8ef' },
        },
        y: {
          grid:        { color: '#f1f5f9', lineWidth: 1 },
          ticks:       {
            color:    '#64748b',
            font:     { family: 'Inter', size: 11 },
            callback: val => '₹' + (val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val),
          },
          border:      { color: '#e4e8ef', dash: [4, 4] },
          beginAtZero: true,
        },
      },
    },
  });
}

// ---- REFRESH ----
function refreshUI() {
  updateSummaryCards();
  renderExpenseList();
  renderCategoryChart();
  renderMonthlyChart();
}

// ---- EXPORT CSV ----
function exportCSV() {
  const all = [
    ...expenses.map(e => ({ type: 'Expense', name: e.name, category: e.category, source: '', amount: e.amount, date: e.date })),
    ...incomes.map(i  => ({ type: 'Income',  name: i.name, category: '',           source: i.source, amount: i.amount, date: i.date })),
  ];

  if (all.length === 0) {
    showToast('No data to export.', 'error');
    return;
  }

  // Sort by date descending
  all.sort((a, b) => new Date(b.date) - new Date(a.date));

  const headers = ['Type', 'Description', 'Category', 'Source', 'Amount (INR)', 'Date'];
  const rows = all.map(tx => [
    tx.type,
    `"${tx.name.replace(/"/g, '""')}"`,   // escape quotes in description
    tx.category || '—',
    tx.source    || '—',
    Number(tx.amount).toFixed(2),
    tx.date,
  ]);

  // BOM + CSV string (BOM ensures ₹ and special chars render correctly in Excel)
  const bom    = '\uFEFF';
  const csv    = bom + [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const today  = new Date().toISOString().split('T')[0];

  const link = document.createElement('a');
  link.href     = url;
  link.download = `spendly-export-${today}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('CSV exported!', 'success');
}

// ---- EVENT LISTENERS ----
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
document.getElementById('addIncomeBtn').addEventListener('click', addIncome);
document.getElementById('expenseAmount').addEventListener('keydown', e => { if (e.key === 'Enter') addExpense(); });
document.getElementById('incomeAmount').addEventListener('keydown',  e => { if (e.key === 'Enter') addIncome(); });
document.getElementById('filterType').addEventListener('change', renderExpenseList);
document.getElementById('filterCategory').addEventListener('change', renderExpenseList);
document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

// ---- INIT ----
setHeaderDate();
refreshUI();
