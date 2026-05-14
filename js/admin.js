// ===== ADMIN AUTH GATE =====
(function() {
  const authenticated = sessionStorage.getItem('adminAuth') === '1';
  if (authenticated) {
    showAdminDashboard();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('adminGate').style.display = 'flex';
    });
  }
})();

function checkAdminPassword(e) {
  e.preventDefault();
  const input = document.getElementById('gateInput').value;
  if (input === ADMIN_PASSWORD) {
    sessionStorage.setItem('adminAuth', '1');
    document.getElementById('adminGate').style.display = 'none';
    showAdminDashboard();
    initAdmin();
  } else {
    document.getElementById('gateError').style.display = 'block';
    document.getElementById('gateInput').value = '';
    document.getElementById('gateInput').focus();
  }
}

function toggleGateVisibility() {
  const inp = document.getElementById('gateInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function showAdminDashboard() {
  document.getElementById('adminHeader').style.display = 'flex';
  document.getElementById('adminContent').style.display = 'block';
}

// ===== ADMIN PAGE =====
let calView = 'week';
let calDate = new Date();
let pendingDeleteId   = null;
let pendingDeleteType = null; // 'booking' | 'blocked'

let _bookings     = [];
let _blockedTimes = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (sessionStorage.getItem('adminAuth') === '1') {
    if (!isConfigured()) { showConfigError(); return; }
    await initAdmin();
  }
});

async function initAdmin() {
  if (!isConfigured()) { showConfigError(); return; }
  initTabs();
  initCalViewTabs();
  initBlockForm();
  initDeleteModal();
  await loadData();
  renderAll();
}

// ===== DATA =====
async function loadData() {
  const [bookings, blocked] = await Promise.all([
    DB.getBookings(),
    DB.getBlockedTimes(),
  ]);
  _bookings     = bookings;
  _blockedTimes = blocked;
}

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['blocked','bookings','calendar'].forEach(t => {
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

// ===== BLOCK FORM =====
function initBlockForm() {
  document.getElementById('blockDate').value = fmtDate(new Date());

  document.getElementById('blockForm').addEventListener('submit', async e => {
    e.preventDefault();
    const blocked = {
      date:     document.getElementById('blockDate').value,
      time:     document.getElementById('blockTime').value,
      duration: APP_CONFIG.slotDuration,
      note:     document.getElementById('blockNote').value.trim(),
    };
    if (!blocked.date || !blocked.time) return;

    const exists = _blockedTimes.some(b => b.date === blocked.date && b.time === blocked.time);
    if (exists) { toast('Giờ này đã bị chặn rồi.', 'error'); return; }

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    try {
      const result = await DB.addBlockedTime(blocked);
      _blockedTimes.push(result);
      toast('Đã chặn thời gian!', 'success');
      e.target.reset();
      document.getElementById('blockDate').value = fmtDate(new Date());
      renderAll();
    } catch (err) {
      toast('Lỗi: ' + (err.message || 'Vui lòng thử lại'), 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ===== DELETE MODAL =====
function initDeleteModal() {
  document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (!pendingDeleteId || !pendingDeleteType) return;

    const btn = document.getElementById('confirmDelete');
    btn.disabled = true;
    try {
      if (pendingDeleteType === 'booking') {
        await DB.deleteBooking(pendingDeleteId);
        _bookings = _bookings.filter(b => b.id !== pendingDeleteId);
        toast('Đã huỷ booking.', 'success');
      } else {
        await DB.deleteBlockedTime(pendingDeleteId);
        _blockedTimes = _blockedTimes.filter(b => b.id !== pendingDeleteId);
        toast('Đã bỏ chặn thời gian.', 'success');
      }
      pendingDeleteId   = null;
      pendingDeleteType = null;
      closeModal('deleteModal');
      renderAll();
    } catch (err) {
      toast('Lỗi: ' + (err.message || 'Vui lòng thử lại'), 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

// ===== RENDER ALL =====
function renderAll() {
  renderStats();
  renderBlockedList();
  renderBookings();
}

// ===== STATS =====
function renderStats() {
  const avail = generateSlots(new Date(), APP_CONFIG.daysAhead, _bookings, _blockedTimes).length;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-label">Slot trống (${APP_CONFIG.daysAhead} ngày)</div>
      <div class="stat-card-value" style="color:var(--success)">${avail}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Đã được book</div>
      <div class="stat-card-value">${_bookings.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-label">Đang chặn</div>
      <div class="stat-card-value" style="color:#ef4444">${_blockedTimes.length}</div>
    </div>`;
}

// ===== BLOCKED LIST =====
function renderBlockedList() {
  const container = document.getElementById('blockedList');
  if (!_blockedTimes.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Chưa chặn giờ nào. Tất cả giờ làm việc đang mở.</p></div>`;
    return;
  }
  const sorted = [..._blockedTimes].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  container.innerHTML = sorted.map(b => `
    <div class="slot-item">
      <div class="slot-item-color" style="background:#ef4444"></div>
      <div class="slot-item-info">
        <div class="slot-item-title">${b.note ? escHtml(b.note) : 'Không có sẵn'}</div>
        <div class="slot-item-meta">${fmtDisplayDate(b.date)} &nbsp;•&nbsp; ${b.time} &nbsp;•&nbsp; ${b.duration} phút</div>
      </div>
      <div class="slot-item-actions">
        <button class="btn btn-danger" onclick="confirmAdminDelete('${b.id}','blocked')">Bỏ chặn</button>
      </div>
    </div>`).join('');
}

// ===== BOOKINGS =====
function renderBookings() {
  const container = document.getElementById('bookingList');
  if (!_bookings.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Chưa có lịch hẹn nào.</p></div>`;
    return;
  }
  const sorted = [..._bookings].sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  container.innerHTML = sorted.map(b => {
    const cat = APP_CONFIG.categories.find(c => c.name === b.category);
    const clr = cat ? cat.color : '#6366f1';
    return `
      <div class="booking-card">
        <div class="booking-card-name">${escHtml(b.client_name)}</div>
        <div class="booking-card-email">${escHtml(b.client_email)}</div>
        <div class="booking-card-row"><span style="color:${clr}">■</span><span>${escHtml(b.category)}</span></div>
        <div class="booking-card-row">📅 <span>${fmtDisplayDate(b.date)}</span></div>
        <div class="booking-card-row">🕐 <span>${b.time} (${b.duration} phút)</span></div>
        ${b.notes ? `<div class="booking-card-row">📝 <span>${escHtml(b.notes)}</span></div>` : ''}
        <div class="form-actions mt-8">
          <button class="btn btn-danger" style="font-size:.78rem;padding:5px 12px"
            onclick="confirmAdminDelete('${b.id}','booking')">Huỷ booking</button>
        </div>
      </div>`;
  }).join('');
}

window.confirmAdminDelete = function(id, type) {
  pendingDeleteId   = id;
  pendingDeleteType = type;
  document.getElementById('deleteModalTitle').textContent =
    type === 'booking' ? 'Huỷ booking này?' : 'Bỏ chặn thời gian này?';
  document.getElementById('deleteModalSub').textContent =
    type === 'booking'
      ? 'Booking sẽ bị xoá và slot sẽ trống trở lại.'
      : 'Giờ này sẽ trở thành có thể đặt lịch.';
  openModal('deleteModal');
};

// ===== ADMIN CALENDAR =====
function renderAdminCalendar() {
  const container = document.getElementById('adminCalendar');
  if (calView === 'week') renderAdminWeekCal(container);
  else renderAdminMonthCal(container);
}

function renderAdminWeekCal(container) {
  const weekDates    = getWeekDates(calDate);
  const todayStr     = fmtDate(new Date());
  const weekDateStrs = weekDates.map(fmtDate);
  const timeLabels   = buildTimeLabels();

  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button onclick="adminCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">
          ${weekDates[0].getDate()}/${weekDates[0].getMonth()+1}
          &ndash;
          ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}
        </div>
        <button onclick="adminCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="adminGoToday()">Hôm nay</button>
    </div>
    <div class="cal-week"><div></div>`;

  weekDates.forEach((d, i) => {
    const ds = fmtDate(d);
    html += `<div class="${ds===todayStr?'today-col':''}">${WEEK_DAYS_VN[i]}<br><strong>${d.getDate()}/${d.getMonth()+1}</strong></div>`;
  });

  timeLabels.forEach(timeStr => {
    html += `<div class="time-row"><div class="time-col">${timeStr}</div>`;
    weekDateStrs.forEach(ds => {
      html += renderAdminCell(ds, timeStr);
    });
    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderAdminCell(dateStr, timeStr) {
  const info = getCellInfo(dateStr, timeStr, _bookings, _blockedTimes);

  if (info.type === 'past' || info.type === 'off')
    return `<div class="time-cell cell-off"></div>`;

  if (info.type === 'blocked')
    return `<div class="time-cell"><div class="slot-chip blocked-chip" title="${escHtml(info.note||'Blocked')}">Bận</div></div>`;

  if (info.type === 'booked') {
    const b   = info.booking;
    const cat = APP_CONFIG.categories.find(c => c.name === b.category);
    const clr = cat ? cat.color : '#6366f1';
    return `<div class="time-cell">
      <div class="slot-chip booked"
           style="border-color:${clr};color:${clr};background:${clr}18"
           title="${escHtml(b.client_name)}">
        ${escHtml(b.category)}<br><small style="opacity:.7">${escHtml(b.client_name)}</small>
      </div>
    </div>`;
  }
  // available (read-only in admin calendar)
  return `<div class="time-cell cell-available" style="cursor:default"></div>`;
}

function renderAdminMonthCal(container) {
  const { workingDays } = APP_CONFIG;
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const todayStr    = fmtDate(new Date());
  const firstDay    = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const timeLabels  = buildTimeLabels();

  let html = `
    <div class="cal-header">
      <div class="cal-nav">
        <button onclick="adminCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">${MONTH_NAMES_VN[m]} ${y}</div>
        <button onclick="adminCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="adminGoToday()">Hôm nay</button>
    </div>
    <table class="cal-month">
      <thead><tr>${WEEK_DAYS_VN.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
      <tbody><tr>`;

  for (let i = 0; i < startOffset; i++) {
    const prev = new Date(y, m, 1 - startOffset + i);
    html += `<td class="other-month"><div class="cal-day-num">${prev.getDate()}</div></td>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds  = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const col = (startOffset + d - 1) % 7;
    if (col === 0 && d !== 1) html += `</tr><tr>`;

    const isT      = ds === todayStr;
    const isWorking = workingDays.includes(parseDate(ds).getDay());
    let avail = 0, booked = 0, blocked = 0;

    if (isWorking) {
      timeLabels.forEach(t => {
        if (isPast(ds, t)) return;
        const info = getCellInfo(ds, t, _bookings, _blockedTimes);
        if (info.type === 'available') avail++;
        else if (info.type === 'booked')  booked++;
        else if (info.type === 'blocked') blocked++;
      });
    }

    html += `<td class="${isT?'today':''}${!isWorking?' other-month':''}">
      <div class="cal-day-num">${d}</div>
      ${isWorking ? `
        ${avail   > 0 ? `<div class="slot-chip available" style="font-size:.68rem;padding:2px 5px">${avail} trống</div>` : ''}
        ${booked  > 0 ? `<div class="slot-chip booked"    style="font-size:.68rem;padding:2px 5px">${booked} đặt</div>` : ''}
        ${blocked > 0 ? `<div class="slot-chip blocked-chip" style="font-size:.68rem;padding:2px 5px">${blocked} bận</div>` : ''}
      ` : ''}
    </td>`;
  }

  const rem = (startOffset + daysInMonth) % 7;
  if (rem) for (let i = 1; i <= 7 - rem; i++)
    html += `<td class="other-month"><div class="cal-day-num">${i}</div></td>`;

  html += `</tr></tbody></table>`;
  container.innerHTML = html;
}

window.adminCalNav = function(dir) {
  if (calView === 'week') calDate.setDate(calDate.getDate() + dir * 7);
  else calDate.setMonth(calDate.getMonth() + dir);
  renderAdminCalendar();
};

window.adminGoToday = function() {
  calDate = new Date();
  renderAdminCalendar();
};
