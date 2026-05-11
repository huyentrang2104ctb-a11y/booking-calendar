// ===== BOOKING PAGE =====
let calView = 'week';
let calDate = new Date();
let categoryFilter = 'all';
let selectedSlotId = null;

document.addEventListener('DOMContentLoaded', () => {
  DB.seedIfEmpty();
  initCalViewTabs();
  initBookingForm();
  renderAll();
});

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

function renderAll() {
  renderFilterBar();
  renderCalendar();
  renderAvailableSlots();
}

// ===== FILTER BAR =====
function renderFilterBar() {
  const slots = DB.getSlots().filter(s => s.status === 'available' && !isPast(s.date, s.time));
  const cats = ['all', ...new Set(slots.map(s => s.category))];
  document.getElementById('bookingFilterBar').innerHTML = cats.map(c => `
    <button class="filter-chip ${categoryFilter===c?'active':''}" data-cat="${c}">
      ${c === 'all' ? 'Tất cả' : c}
    </button>
  `).join('');
  document.querySelectorAll('#bookingFilterBar .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => { categoryFilter = btn.dataset.cat; renderAll(); });
  });
}

// ===== CALENDAR =====
function renderCalendar() {
  const container = document.getElementById('bookingCalendar');
  if (calView === 'week') renderWeekCal(container);
  else renderMonthCal(container);
}

function renderWeekCal(container) {
  const slots = DB.getSlots();
  const weekDates = getWeekDates(calDate);
  const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);
  const todayStr = fmtDate(new Date());
  const weekDateStrs = weekDates.map(fmtDate);

  let html = `
    <div class="cal-header" style="margin-top:8px">
      <div class="cal-nav">
        <button onclick="bookCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">
          ${weekDates[0].getDate()}/${weekDates[0].getMonth()+1} – ${weekDates[6].getDate()}/${weekDates[6].getMonth()+1}/${weekDates[6].getFullYear()}
        </div>
        <button onclick="bookCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="calDate=new Date();renderCalendar()">Hôm nay</button>
    </div>
    <div class="cal-week">
      <div></div>
  `;

  weekDates.forEach((d, i) => {
    const ds = fmtDate(d);
    html += `<div class="${ds===todayStr?'today-col':''}">${WEEK_DAYS_VN[i]}<br><strong>${d.getDate()}/${d.getMonth()+1}</strong></div>`;
  });

  HOURS.forEach(h => {
    const timeLabel = `${String(h).padStart(2,'0')}:00`;
    html += `<div class="time-row"><div class="time-col">${timeLabel}</div>`;
    weekDateStrs.forEach(ds => {
      const daySlots = slots.filter(s => s.date === ds && s.time === timeLabel &&
        (categoryFilter === 'all' || s.category === categoryFilter));
      html += `<div class="time-cell">`;
      daySlots.forEach(s => {
        const past = isPast(s.date, s.time);
        const cls = s.status === 'booked' ? 'booked' : past ? 'past' : 'available';
        const canBook = s.status === 'available' && !past;
        html += `<div class="slot-chip ${cls}"
          style="border-color:${s.color};color:${s.color};background:${s.color}18;${canBook?'cursor:pointer':''}"
          ${canBook ? `onclick="selectSlot('${s.id}')"` : ''}
          title="${s.category}${s.status==='booked'?' (Đã đặt)':past?' (Đã qua)':' — click để đặt'}">
          ${s.category}
          ${canBook ? '<br><small>Bấm để đặt</small>' : ''}
        </div>`;
      });
      html += `</div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function renderMonthCal(container) {
  const slots = DB.getSlots();
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const todayStr = fmtDate(new Date());
  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let html = `
    <div class="cal-header" style="margin-top:8px">
      <div class="cal-nav">
        <button onclick="bookCalNav(-1)">&#8249;</button>
        <div class="cal-nav-title">${MONTH_NAMES_VN[m]} ${y}</div>
        <button onclick="bookCalNav(1)">&#8250;</button>
      </div>
      <button class="btn btn-ghost" style="font-size:.8rem;padding:5px 12px" onclick="calDate=new Date();renderCalendar()">Hôm nay</button>
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
    const daySlots = slots.filter(s => s.date === ds && (categoryFilter === 'all' || s.category === categoryFilter));
    const availableDay = daySlots.filter(s => s.status === 'available' && !isPast(s.date, s.time));
    const isT = ds === todayStr;
    const col = (startOffset + d - 1) % 7;
    if (col === 0 && d !== 1) html += `</tr><tr>`;

    html += `<td class="${isT ? 'today' : ''}">
      <div class="cal-day-num">${d}</div>
      ${availableDay.slice(0,2).map(s =>
        `<div class="slot-chip available" style="border-color:${s.color};color:${s.color};background:${s.color}18;cursor:pointer"
          onclick="selectSlot('${s.id}')">${s.time}</div>`
      ).join('')}
      ${availableDay.length > 2 ? `<div class="text-muted" style="font-size:.7rem">+${availableDay.length-2}</div>` : ''}
      ${daySlots.filter(s => s.status==='booked').length > 0
        ? `<div class="slot-chip booked" style="font-size:.65rem;padding:1px 4px">${daySlots.filter(s=>s.status==='booked').length} đã book</div>` : ''}
    </td>`;
  }

  const remainder = (startOffset + daysInMonth) % 7;
  if (remainder) {
    for (let i = 1; i <= 7 - remainder; i++)
      html += `<td class="other-month"><div class="cal-day-num">${i}</div></td>`;
  }

  html += `</tr></tbody></table>`;
  container.innerHTML = html;
}

window.bookCalNav = function(dir) {
  if (calView === 'week') calDate.setDate(calDate.getDate() + dir * 7);
  else calDate.setMonth(calDate.getMonth() + dir);
  renderCalendar();
};

// ===== AVAILABLE SLOT LIST =====
function renderAvailableSlots() {
  const slots = DB.getSlots()
    .filter(s => s.status === 'available' && !isPast(s.date, s.time) &&
      (categoryFilter === 'all' || s.category === categoryFilter))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  document.getElementById('slotCount').textContent = `${slots.length} slot`;

  const container = document.getElementById('availableSlots');
  if (!slots.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">😔</div><p>Hiện không có slot trống. Vui lòng quay lại sau!</p></div>`;
    return;
  }

  container.innerHTML = slots.map(s => `
    <div class="slot-item" style="cursor:pointer" onclick="selectSlot('${s.id}')">
      <div class="slot-item-color" style="background:${s.color}"></div>
      <div class="slot-item-info">
        <div class="slot-item-title">${escHtml(s.category)}</div>
        <div class="slot-item-meta">${fmtDisplayDate(s.date)} &nbsp;•&nbsp; ${s.time} &nbsp;•&nbsp; ${s.duration} phút</div>
      </div>
      <span class="badge badge-success">Trống</span>
      <button class="btn btn-primary" style="font-size:.8rem">Đặt ngay</button>
    </div>
  `).join('');
}

// ===== SELECT SLOT & BOOKING MODAL =====
window.selectSlot = function(id) {
  const slots = DB.getSlots();
  const slot = slots.find(s => s.id === id);
  if (!slot || slot.status !== 'available' || isPast(slot.date, slot.time)) {
    toast('Slot này không còn trống.', 'error');
    return;
  }
  selectedSlotId = id;
  document.getElementById('selectedSlotInfo').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:10px;height:40px;border-radius:4px;background:${slot.color};flex-shrink:0"></div>
      <div>
        <div style="font-weight:700">${escHtml(slot.category)}</div>
        <div style="color:var(--text-muted);font-size:.85rem">${fmtDisplayDate(slot.date)} &nbsp;•&nbsp; ${slot.time} &nbsp;•&nbsp; ${slot.duration} phút</div>
      </div>
    </div>
  `;
  openModal('bookingModal');
};

// ===== BOOKING FORM =====
function initBookingForm() {
  document.getElementById('bookingForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!selectedSlotId) return;

    const slot = DB.getSlots().find(s => s.id === selectedSlotId);
    if (!slot || slot.status !== 'available') {
      toast('Slot đã được đặt bởi người khác.', 'error');
      closeModal('bookingModal');
      renderAll();
      return;
    }

    const booking = DB.addBooking({
      slotId: selectedSlotId,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      category: slot.category,
      clientName: document.getElementById('clientName').value.trim(),
      clientEmail: document.getElementById('clientEmail').value.trim(),
      notes: document.getElementById('clientNotes').value.trim(),
    });

    closeModal('bookingModal');
    document.getElementById('successDetail').innerHTML =
      `<strong>${escHtml(slot.category)}</strong><br>${fmtDisplayDate(slot.date)} lúc ${slot.time}<br>Xác nhận gửi đến: ${escHtml(booking.clientEmail)}`;
    openModal('successModal');

    e.target.reset();
    selectedSlotId = null;
    renderAll();
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
