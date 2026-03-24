// Section Navigation
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelector(`[onclick="showSection('${name}')"]`).classList.add('active');
}

// Toast
function showToast(msg, color = '#6C63FF') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Modal
function openModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = 'Add Expense';
  document.getElementById('expTitle').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expNote').value = '';
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

function editExpense(data) {
  document.getElementById('editId').value = data.id;
  document.getElementById('modalTitle').textContent = 'Edit Expense';
  document.getElementById('expTitle').value = data.title;
  document.getElementById('expAmount').value = data.amount;
  document.getElementById('expDate').value = data.date;
  document.getElementById('expCategory').value = data.category.id;
  document.getElementById('expNote').value = data.note || '';
  document.getElementById('modalOverlay').classList.add('open');
}

async function saveExpense() {
  const id = document.getElementById('editId').value;
  const payload = {
    title: document.getElementById('expTitle').value.trim(),
    amount: document.getElementById('expAmount').value,
    category_id: document.getElementById('expCategory').value,
    date: document.getElementById('expDate').value,
    note: document.getElementById('expNote').value.trim(),
  };

  if (!payload.title || !payload.amount || !payload.date) {
    showToast('Please fill all required fields.', '#FF6B9D');
    return;
  }

  const url = id ? `/api/expenses/${id}` : '/api/expenses';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  if (data.success) {
    showToast(id ? '✅ Expense updated!' : '✅ Expense added!');
    closeModal();
    setTimeout(() => location.reload(), 800);
  } else {
    showToast('❌ Error: ' + data.error, '#FF6B9D');
  }
}

async function deleteExpense(id, btn) {
  if (!confirm('Delete this expense?')) return;
  const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.success) {
    const item = btn.closest('.tx-item');
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    item.style.transition = 'all 0.3s';
    setTimeout(() => { item.remove(); showToast('🗑️ Expense deleted.'); }, 300);
  }
}

// Search
function filterTransactions() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('.tx-item').forEach(item => {
    item.style.display = item.dataset.title.includes(q) ? '' : 'none';
  });
}

// Charts
function initCharts(dailyData, catData, catAmounts, catColors, trendLabels, trendTotals, daysInMonth) {
  Chart.defaults.color = '#7B82A8';
  Chart.defaults.font.family = 'DM Sans, sans-serif';

  // Daily Bar Chart
  const dailyCtx = document.getElementById('dailyChart');
  if (dailyCtx) {
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    new Chart(dailyCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: dailyData,
          backgroundColor: dailyData.map(v =>
            v > 0 ? 'rgba(108,99,255,0.7)' : 'rgba(108,99,255,0.1)'
          ),
          hoverBackgroundColor: '#FF6B9D',
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}` }
        }},
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false },
            ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) }
          }
        },
        animation: { duration: 800, easing: 'easeOutQuart' }
      }
    });
  }

  // Donut Chart
  const catCtx = document.getElementById('categoryChart');
  if (catCtx && catData.length > 0) {
    new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catData,
        datasets: [{
          data: catAmounts,
          backgroundColor: catColors.map(c => c + 'CC'),
          hoverBackgroundColor: catColors,
          borderWidth: 2,
          borderColor: '#131728',
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}` } }
        },
        animation: { animateRotate: true, duration: 1000 }
      }
    });
  }

  // Trend Line Chart
  const trendCtx = document.getElementById('trendChart');
  if (trendCtx) {
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Monthly Spend',
          data: trendTotals,
          borderColor: '#6C63FF',
          backgroundColor: 'rgba(108,99,255,0.1)',
          pointBackgroundColor: '#FF6B9D',
          pointBorderColor: '#fff',
          pointRadius: 6,
          pointHoverRadius: 9,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => ` ₹${ctx.raw.toLocaleString('en-IN')}` }
        }},
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false },
            ticks: { callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) }
          }
        },
        animation: { duration: 1000 }
      }
    });
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
    openModal();
  }
  if (e.key === 'Escape') closeModal();
});