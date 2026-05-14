// ===== SUPABASE INIT =====
let _sb = null;

function getDB() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

function isConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

function showConfigError() {
  document.body.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:32px;font-family:sans-serif;text-align:center">
      <div style="font-size:3rem;margin-bottom:16px">⚙️</div>
      <h2 style="margin-bottom:12px;color:#0f172a">Cần cấu hình Supabase</h2>
      <p style="color:#64748b;max-width:440px;line-height:1.7">
        Mở file <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">js/config.js</code>
        và điền <strong>SUPABASE_URL</strong> và <strong>SUPABASE_ANON_KEY</strong> từ dự án Supabase của bạn.<br><br>
        Chạy <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">schema.sql</code>
        trong Supabase SQL Editor để tạo bảng.
      </p>
    </div>`;
}

// ===== DATA LAYER =====
const DB = {
  async getBookings() {
    const { data, error } = await getDB()
      .from('bookings').select('*').order('date').order('time');
    if (error) { console.error('getBookings:', error); return []; }
    return data || [];
  },

  async addBooking(booking) {
    const { data, error } = await getDB()
      .from('bookings').insert(booking).select().single();
    if (error) throw error;
    return data;
  },

  async deleteBooking(id) {
    const { error } = await getDB().from('bookings').delete().eq('id', id);
    if (error) throw error;
  },

  async getBlockedTimes() {
    const { data, error } = await getDB()
      .from('blocked_times').select('*').order('date').order('time');
    if (error) { console.error('getBlockedTimes:', error); return []; }
    return data || [];
  },

  async addBlockedTime(blocked) {
    const { data, error } = await getDB()
      .from('blocked_times').insert(blocked).select().single();
    if (error) throw error;
    return data;
  },

  async deleteBlockedTime(id) {
    const { error } = await getDB().from('blocked_times').delete().eq('id', id);
    if (error) throw error;
  },
};

// ===== SLOT CALCULATOR =====
function generateSlots(startDate, numDays, bookings, blockedTimes) {
  const { workingHours, slotDuration, workingDays } = APP_CONFIG;
  const slots = [];
  const bookingSet  = new Set(bookings.map(b => `${b.date}_${b.time}`));
  const blockedSet  = new Set(blockedTimes.map(b => `${b.date}_${b.time}`));

  for (let d = 0; d < numDays; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    if (!workingDays.includes(date.getDay())) continue;

    const dateStr = fmtDate(date);
    for (let h = workingHours.start; h < workingHours.end; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        if (h * 60 + m + slotDuration > workingHours.end * 60) break;
        const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        const key = `${dateStr}_${timeStr}`;
        if (isPast(dateStr, timeStr)) continue;
        if (bookingSet.has(key))      continue;
        if (blockedSet.has(key))      continue;
        slots.push({ date: dateStr, time: timeStr });
      }
    }
  }
  return slots;
}

// ===== CELL INFO =====
function getCellInfo(dateStr, timeStr, bookings, blockedTimes) {
  if (isPast(dateStr, timeStr)) return { type: 'past' };
  const dow = parseDate(dateStr).getDay();
  if (!APP_CONFIG.workingDays.includes(dow)) return { type: 'off' };

  const blocked = blockedTimes.find(b => b.date === dateStr && b.time === timeStr);
  if (blocked) return { type: 'blocked', note: blocked.note };

  const booking = bookings.find(b => b.date === dateStr && b.time === timeStr);
  if (booking) return { type: 'booked', booking };

  return { type: 'available' };
}

// ===== UTILS =====
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDisplayDate(str) {
  return parseDate(str).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function isPast(dateStr, time) {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  const d = parseDate(dateStr);
  d.setHours(h, m, 0, 0);
  return d < now;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== TOAST =====
function toast(msg, type = 'default') {
  let wrap = document.querySelector('.toast-container');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-container';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', default: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || icons.default}</span> ${msg}`;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.cssText = 'opacity:0;transform:translateY(8px);transition:all .3s';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay'))
    e.target.classList.remove('open');
});

// ===== WEEK HELPER =====
function getWeekDates(referenceDate) {
  const d = new Date(referenceDate);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

const WEEK_DAYS_VN  = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES_VN = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];

// ===== TIME LABELS =====
function buildTimeLabels() {
  const { workingHours, slotDuration } = APP_CONFIG;
  const labels = [];
  for (let h = workingHours.start; h < workingHours.end; h++) {
    for (let m = 0; m < 60; m += slotDuration) {
      if (h * 60 + m + slotDuration > workingHours.end * 60) break;
      labels.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }
  return labels;
}
