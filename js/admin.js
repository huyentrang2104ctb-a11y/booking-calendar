// ===== ADMIN PAGE =====
let slotCategoryFilter = 'all';
let bookingCategoryFilter = 'all';
let calView = 'week';
let calDate = new Date();
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
  DB.seedIfEmpty();
  initTabs();
  initCalViewTabs();
  initAddSlotForm();
  initDeleteModal();
  renderAll();
});

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['slots','bookings','calendar'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== btn.dataset.tab);
      });
      if (btn.dataset.tab === 'calendar') renderAdminCalendar();
    });
  });
}

function initCalViewTabs() {
  document.querySelectorAll('.tab-btn[data-calview]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-calview]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calView = btn.dataset.calview;
      renderAdminCalendar();
    });
  });
}

// ===== ADD SLOT FORM =====
function initAddSlotForm() {
  // default date = today
  document.getElementById('slotDate').value = fmtDate(new Date());

  document.getElementById('addSlotForm').addEventListener('submit', e => {
    e.preventDefault();
    const slot = {
      date: document.getElementById('slotDate').value,
      time: document.getElementById('slotTime').value,
      duration: Number(document.getElementById('slotDuration').value),
      category: document.getElementById('slotCategory').value.trim(),
      color: document.getElementById('slotColor').value,
    };
    if (!slot.date || !slot.time || !slot.category) return;
    DB.addSlot(slot);
    toast('Đã thêm slot mới!', 'success');
    e.target.reset();
    document.getElementById('slotDate').value = fmtDate(new Date());
    renderAll();
  });
}

// ===== DELETE MODAL =====
function initDeleteModal() {
  document.getElementById('confirmDeleteSlot').addEventListener('click', () => {
    if (!pendingDeleteId) return;
    DB.deleteSlot(pendingDeleteId);
    pendingDeleteId = null;
    closeModal('deleteSlotModal');
    toast('Đã xoá slot.', 'success');
    renderAll();
  });
}

// ===== RENDER ALL =====
function renderAll() {
  renderStats();
  renderSlots();
  renderBookings();
  updateCategoryDatalist();
}

// ===== STATS =====
function renderStats() {
  const slots = DB.getSlots();
  const bookings = DB.getBookings();
  const available = slots.filter(s => s.status === 'available').length;
  const booked = slots.filter(s => s.status === 'booked').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-card-label">Slot trống</div><div class="stat-card-value" style="color:var(--success)">${available}</div></div>
    <div class="stat-card"><div class="stat-card-label">Đã được book</div><div class="stat-card-value">${booked}</div></div>
    <div class="stat-card"><div class="stat-card-label">Tổng booking</div><div class="stat-card-value">${bookings.length}</div></div>
    <div class="stat-card"><div class="stat-card-label">Tổng slot</div><div class="stat-card-value" style="color:var(--text-muted)">${slots.length}</div></div>
  `;
}

// ===== CATEGORY DATALIST =====
function updateCategoryDatalist() {
  const cats = [...new Set(DB.getSlots().map(s => s.category))];
  document.getElementById('categoryList').innerHTML = cats.map(c => `<option value="${c}">`).join('');
}

// ===== SLOTS =====
function renderSlots() {
  const slots = DB.getSlots();
  const cats = ['all', ...new Set(slots.map(s => s.category))];

  // Filter bar
  document.getElementById('slotFilterBar').innerHTML = cats.map(c => `
    <button class="filter-chip ${slotCategoryFilter===c?'active':''}" data-cat="${c}">
      ${c === 'all' ? 'Tất cả' : c}
    </button>
  `).join('');
  document.querySelectorAll('#slotFilterBar .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { slotCategoryFilter = btn.dataset.cat; renderSlots(); });
  });

  const filtered = slotCategoryFilter === 'all' ? slots : slots.filter(s => s.category === slotCategoryFilter);
  // Sort by date then time
  filtered.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const container = document.getElementById('slotList');
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>Chưa có slot nào. Hãy thêm slot ở trên!</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(slot => {
    const past = isPast(slot.date, slot.time);
    const statusBadge = slot.status === 'booked'
      ? `<span class="badge badge-primary">Đã book</span>`
      : past
        ? `<span class="badge">Đã qua</span>`
        : `<span class="badge badge-success">Trống</span>`;
    return `
      <div class="slot-item">
        <div class="slot-item-color" style="background:${slot.color}"></div>
        <div class="slot-item-info">
          <div class="slot-item-title">${slot.category}</div>
          <div class="slot-item-meta">
            ${fmtDisplayDate(slot.date)} &nbsp;•&nbsp; ${slot.time} &nbsp;•&nbsp; ${slot.duration} phút
          </div>
        </div>
        ${statusBadge}
        <div class="slot-item-actions">
          <button class="btn btn-danger" onclick="deleteSlot('${slot.id}')">Xoá</button>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteSlot = function(id) {
  pendingDeleteId = id;
  openModal('deleteSlotModal');
};

// ===== BOOKINGS =====
function renderBookings() {
  const bookings = DB.getBookings();
  const slots = DB.getSlots();
  const cats = ['all', ...new Set(bookings.map(b => b.category))];

  // Filter bar
  document.getElementById('bookingFilterBar').innerHTML = cats.map(c => `
    <button class="filter-chip ${bookingCategoryFilter===c?'active':''}" data-cat="${c}">
      ${c === 'all' ? 'Tất cả' : c}
    </button>
  `).join('');
  document.querySelectorAll('#bookingFilterBar .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { bookingCategoryFilter = btn.dataset.cat; renderBookings(); });
  });

  const filtered = bookingCategoryFilter === 'all' ? bookings : bookings.filter(b => b.category === bookingCategoryFilter);
  filtered.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const container = document.getElementById('bookingList');
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Chưa có lịch hẹn nào.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const slot = slots.find(s => s.id === b.slotId);
    const color = slot?.color || '#6366f1';
    return `
      <div class="booking-card">
        <div class="booking-card-name">${escHtml(b.clientName)}</div>
        <div class="booking-card-email">${escHtml(b.clientEmail)}</div>
        <div class="booking-card-row">
          <span style="color:${color}">■</span>
          <span>${escHtml(b.category)}</span>
        </div>
        <div class="booking-card-row">
          📅 <span>${fmtDisplayDate(b.date)}</span>
        </div>
        <div class="booking-card-row">
          🕐 <span>${b.time} (${b.duration} phút)</span>
        </div>
        ${b.notes ? `<div class="booking-card-row">📝 <span>${escHtml(b.notes)}</span></div>` : ''}
        <div class="form-actions mt-8">
          <button class="btn btn-danger" style="font-size:.78rem;padding:5px 12px" onclick="cancelBooking('${b.id}')">Huỷ booking</button>
        </div>
      </div>
    `;
  }).join('');
}

window.cancelBooking = function(id) {
  DB.deleteBooking(id);
  toast('Đã huỷ booking.', 'success');
  renderAll();
};

// ===== ADMIN CALENDAR =====
function renderAdminCalendar() {
  const container = document.getElementById('adminCalendar');
  if (calView === 'week') renderWeekCalendar(container);
  else renderMonthCalendar(container);
}

function renderWeekCalendar(container) {
  const slots = DB.getSlots();
  const weekDates = getWeekDates(calDate);
  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 - 18:00

  const todayStr = fmtDate(new Date());
  const weekDateStrs = weekDates.map(fmtDate);

  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button onclick="adminCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">
          ${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}
        </div>
        <button onclick="adminCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="calDate=new Date();renderAdminCalendar()">Hôm nay</button>
    </div>
    <div class="cal-week">
      <div></div>
  `;

  weekDates.forEach((d, i) => {
    const ds = fmtDate(d);
    const isT = ds === todayStr;
    html += `<div class="${isT ? 'today-col' : ''}">${WEEK_DAYS_VN[i]}<br><strong>${d.getDate()}/${d.getMonth()+1}</strong></div>`;
  });

  HOURS.forEach(h => {
    const timeLabel = `${String(h).padStart(2,'0')}:00`;
    html += `<div class="time-row"><div class="time-col">${timeLabel}</div>`;
    weekDateStrs.forEach(ds => {
      const daySlots = slots.filter(s => s.date === ds && s.time === timeLabel);
      html += `<div class="time-cell">`;
      daySlots.forEach(s => {
        const cls = s.status === 'booked' ? 'booked' : isPast(s.date, s.time) ? 'past' : 'available';
        html += `<div class="slot-chip ${cls}" title="${s.category}" style="border-color:${s.color};color:${s.color};background:${s.color}18">
          ${s.category}
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderMonthCalendar(container) {
  const slots = DB.getSlots();
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const todayStr = fmtDate(new Date());

  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button onclick="adminCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">${MONTH_NAMES_VN[m]} ${y}</div>
        <button onclick="adminCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="calDate=new Date();renderAdminCalendar()">Hôm nay</button>
    </div>
    <table class="cal-month">
      <thead><tr>${WEEK_DAYS_VN.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
      <tbody><tr>
  `;

  for (let i = 0; i < startOffset; i++) {
    const prevDate = new Date(y, m, 1 - startOffset + i);
    html += `<td class="other-month"><div class="cal-day-num">${prevDate.getDate()}</div></td>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const daySlots = slots.filter(s => s.date === ds);
    const isT = ds === todayStr;
    const col = (startOffset + d - 1) % 7;
    if (col === 0 && d !== 1) html += `</tr><tr>`;

    html += `<td class="${isT ? 'today' : ''}">
      <div class="cal-day-num">${d}</div>
      ${daySlots.slice(0,3).map(s => {
        const cls = s.status === 'booked' ? 'booked' : isPast(s.date, s.time) ? 'past' : 'available';
        return `<div class="slot-chip ${cls}" style="border-color:${s.color};color:${s.color};background:${s.color}18">${s.time} ${s.category}</div>`;
      }).join('')}
      ${daySlots.length > 3 ? `<div class="text-muted" style="font-size:.7rem">+${daySlots.length-3} slot</div>` : ''}
    </td>`;
  }

  const totalCells = startOffset + daysInMonth;
  const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainder; i++) {
    html += `<td class="other-month"><div class="cal-day-num">${i}</div></td>`;
  }

  html += `</tr></tbody></table>`;
  container.innerHTML = html;
}

window.adminCalNav = function(dir) {
  if (calView === 'week') calDate.setDate(calDate.getDate() + dir * 7);
  else calDate.setMonth(calDate.getMonth() + dir);
  renderAdminCalendar();
};

// ===== XSS SAFE =====
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
