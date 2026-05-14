// ===== BOOKING PAGE =====
let calView = 'week';
let calDate = new Date();
let selectedDate = null;
let selectedTime = null;

let _bookings     = [];
let _blockedTimes = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!isConfigured()) { showConfigError(); return; }

  showLoading(true);
  await loadData();
  showLoading(false);

  initCalViewTabs();
  populateCategorySelect();
  initBookingForm();
  renderAll();
});

// ===== DATA =====
async function loadData() {
  const [bookings, blocked] = await Promise.all([
    DB.getBookings(),
    DB.getBlockedTimes(),
  ]);
  _bookings     = bookings;
  _blockedTimes = blocked;
}

function showLoading(show) {
  const el = document.getElementById('loadingState');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ===== CATEGORY SELECT =====
function populateCategorySelect() {
  const sel = document.getElementById('bookingCategory');
  if (!sel) return;
  APP_CONFIG.categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

// ===== VIEW TABS =====
function initCalViewTabs() {
  document.querySelectorAll('.tab-btn[data-calview]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-calview]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calView = btn.dataset.calview;
      renderCalendar();
    });
  });
}

// ===== RENDER =====
function renderAll() {
  renderCalendar();
  renderAvailableSlots();
}

// ===== CALENDAR =====
function renderCalendar() {
  const container = document.getElementById('bookingCalendar');
  if (calView === 'week') renderWeekCal(container);
  else renderMonthCal(container);
}

function renderWeekCal(container) {
  const weekDates   = getWeekDates(calDate);
  const todayStr    = fmtDate(new Date());
  const weekDateStrs = weekDates.map(fmtDate);
  const timeLabels  = buildTimeLabels();

  let html = `
    <div class="cal-header" style="margin-top:8px">
      <div class="cal-nav">
        <button onclick="bookCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">
          ${weekDates[0].getDate()}/${weekDates[0].getMonth()+1}
          &ndash;
          ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}
        </div>
        <button onclick="bookCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="bookGoToday()">Hôm nay</button>
    </div>
    <div class="cal-week">
      <div></div>`;

  weekDates.forEach((d, i) => {
    const ds = fmtDate(d);
    html += `<div class="${ds===todayStr?'today-col':''}">${WEEK_DAYS_VN[i]}<br><strong>${d.getDate()}/${d.getMonth()+1}</strong></div>`;
  });

  timeLabels.forEach(timeStr => {
    html += `<div class="time-row"><div class="time-col">${timeStr}</div>`;
    weekDateStrs.forEach(ds => {
      html += renderBookingCell(ds, timeStr);
    });
    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderBookingCell(dateStr, timeStr) {
  const info = getCellInfo(dateStr, timeStr, _bookings, _blockedTimes);

  if (info.type === 'past' || info.type === 'off') {
    return `<div class="time-cell cell-off"></div>`;
  }
  if (info.type === 'blocked') {
    return `<div class="time-cell"><div class="slot-chip blocked-chip" title="${escHtml(info.note||'Không có sẵn')}">Bận</div></div>`;
  }
  if (info.type === 'booked') {
    const b   = info.booking;
    const cat = APP_CONFIG.categories.find(c => c.name === b.category);
    const clr = cat ? cat.color : '#6366f1';
    return `<div class="time-cell">
      <div class="slot-chip booked"
           style="border-color:${clr};color:${clr};background:${clr}18"
           title="${escHtml(b.client_name)} — ${escHtml(b.category)}">
        ${escHtml(b.category)}<br><small style="opacity:.7">Đã đặt</small>
      </div>
    </div>`;
  }
  // available — empty cell = clickable
  return `<div class="time-cell cell-available"
               onclick="selectSlot('${dateStr}','${timeStr}')"
               title="Bấm để đặt lịch ${timeStr}">
    <div class="plus-label">+</div>
  </div>`;
}

function renderMonthCal(container) {
  const { workingHours, slotDuration, workingDays } = APP_CONFIG;
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const todayStr   = fmtDate(new Date());
  const firstDay   = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const timeLabels  = buildTimeLabels();

  let html = `
    <div class="cal-header" style="margin-top:8px">
      <div class="cal-nav">
        <button onclick="bookCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">${MONTH_NAMES_VN[m]} ${y}</div>
        <button onclick="bookCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="bookGoToday()">Hôm nay</button>
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
    let avail = 0, booked = 0;

    if (isWorking) {
      timeLabels.forEach(t => {
        if (isPast(ds, t)) return;
        const info = getCellInfo(ds, t, _bookings, _blockedTimes);
        if (info.type === 'available') avail++;
        else if (info.type === 'booked') booked++;
      });
    }

    html += `<td class="${isT?'today':''}${!isWorking?' other-month':''}">
      <div class="cal-day-num">${d}</div>
      ${isWorking && avail  > 0 ? `<div class="slot-chip available" style="cursor:pointer;font-size:.68rem;padding:2px 5px" onclick="bookJumpToWeek('${ds}')">${avail} trống</div>` : ''}
      ${isWorking && booked > 0 ? `<div class="slot-chip booked"    style="font-size:.68rem;padding:2px 5px">${booked} đã book</div>` : ''}
    </td>`;
  }

  const rem = (startOffset + daysInMonth) % 7;
  if (rem) for (let i = 1; i <= 7 - rem; i++)
    html += `<td class="other-month"><div class="cal-day-num">${i}</div></td>`;

  html += `</tr></tbody></table>`;
  container.innerHTML = html;
}

window.bookCalNav = function(dir) {
  if (calView === 'week') calDate.setDate(calDate.getDate() + dir * 7);
  else calDate.setMonth(calDate.getMonth() + dir);
  renderCalendar();
};

window.bookGoToday = function() {
  calDate = new Date();
  renderCalendar();
};

window.bookJumpToWeek = function(dateStr) {
  calDate = parseDate(dateStr);
  calView = 'week';
  document.querySelectorAll('.tab-btn[data-calview]').forEach(b => {
    b.classList.toggle('active', b.dataset.calview === 'week');
  });
  renderCalendar();
};

// ===== AVAILABLE SLOT LIST =====
function renderAvailableSlots() {
  const slots = generateSlots(new Date(), APP_CONFIG.daysAhead, _bookings, _blockedTimes);
  document.getElementById('slotCount').textContent = `${slots.length} slot`;

  const container = document.getElementById('availableSlots');
  if (!slots.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><p>Không có slot trống trong ${APP_CONFIG.daysAhead} ngày tới. Vui lòng quay lại sau!</p></div>`;
    return;
  }

  // Group by date
  const byDate = {};
  slots.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s.time);
  });

  container.innerHTML = Object.entries(byDate).map(([date, times]) => `
    <div class="slot-date-group">
      <div class="slot-date-label">${fmtDisplayDate(date)}</div>
      <div class="slot-times">
        ${times.map(t => `<button class="slot-time-btn" onclick="selectSlot('${date}','${t}')">${t}</button>`).join('')}
      </div>
    </div>
  `).join('');
}

// ===== SELECT SLOT =====
window.selectSlot = function(date, time) {
  const info = getCellInfo(date, time, _bookings, _blockedTimes);
  if (info.type !== 'available') {
    toast('Slot này không còn trống.', 'error');
    renderAll();
    return;
  }
  selectedDate = date;
  selectedTime = time;

  document.getElementById('selectedSlotInfo').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:10px;height:40px;border-radius:4px;background:var(--primary);flex-shrink:0"></div>
      <div>
        <div style="font-weight:700">${fmtDisplayDate(date)}</div>
        <div style="color:var(--text-muted);font-size:.85rem">${time} &nbsp;•&nbsp; ${APP_CONFIG.slotDuration} phút</div>
      </div>
    </div>`;
  openModal('bookingModal');
};

// ===== BOOKING FORM =====
function initBookingForm() {
  // Clear form when modal closes via ✕ or Huỷ buttons
  document.querySelectorAll('#bookingModal .modal-close, #bookingModal .btn-cancel').forEach(el => {
    el.addEventListener('click', clearBookingForm);
  });
  // Clear when overlay background clicked
  document.getElementById('bookingModal').addEventListener('click', e => {
    if (e.target === document.getElementById('bookingModal')) clearBookingForm();
  });

  document.getElementById('bookingForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    const submitBtn = e.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang xử lý…';

    try {
      // Re-fetch to catch race conditions
      await loadData();
      const info = getCellInfo(selectedDate, selectedTime, _bookings, _blockedTimes);
      if (info.type !== 'available') {
        toast('Slot vừa được đặt bởi người khác. Vui lòng chọn slot khác.', 'error');
        closeModal('bookingModal');
        clearBookingForm();
        renderAll();
        return;
      }

      const booking = await DB.addBooking({
        date:         selectedDate,
        time:         selectedTime,
        duration:     APP_CONFIG.slotDuration,
        category:     document.getElementById('bookingCategory').value,
        client_name:  document.getElementById('clientName').value.trim(),
        client_email: document.getElementById('clientEmail').value.trim(),
        notes:        document.getElementById('clientNotes').value.trim(),
      });

      _bookings.push(booking);
      closeModal('bookingModal');

      document.getElementById('successDetail').innerHTML =
        `<strong>${escHtml(booking.category)}</strong><br>
         ${fmtDisplayDate(booking.date)} lúc ${booking.time}<br>
         Email: ${escHtml(booking.client_email)}`;
      openModal('successModal');

      clearBookingForm();
      renderAll();
    } catch (err) {
      toast('Lỗi khi đặt lịch: ' + (err.message || 'Vui lòng thử lại'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đặt lịch';
    }
  });
}

function clearBookingForm() {
  document.getElementById('bookingForm')?.reset();
  selectedDate = null;
  selectedTime = null;
}
