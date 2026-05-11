// ===== DATA LAYER =====
const DB = {
  SLOTS_KEY: 'bookingapp_slots',
  BOOKINGS_KEY: 'bookingapp_bookings',

  getSlots() {
    return JSON.parse(localStorage.getItem(this.SLOTS_KEY) || '[]');
  },
  saveSlots(slots) {
    localStorage.setItem(this.SLOTS_KEY, JSON.stringify(slots));
  },
  getBookings() {
    return JSON.parse(localStorage.getItem(this.BOOKINGS_KEY) || '[]');
  },
  saveBookings(bookings) {
    localStorage.setItem(this.BOOKINGS_KEY, JSON.stringify(bookings));
  },

  addSlot(slot) {
    const slots = this.getSlots();
    slot.id = uid();
    slot.status = 'available';
    slots.push(slot);
    this.saveSlots(slots);
    return slot;
  },

  deleteSlot(id) {
    const slots = this.getSlots().filter(s => s.id !== id);
    this.saveSlots(slots);
    // Also remove associated booking
    const bookings = this.getBookings().filter(b => b.slotId !== id);
    this.saveBookings(bookings);
  },

  addBooking(booking) {
    const bookings = this.getBookings();
    booking.id = uid();
    booking.createdAt = Date.now();
    bookings.push(booking);
    this.saveBookings(bookings);
    // Mark slot as booked
    const slots = this.getSlots();
    const slot = slots.find(s => s.id === booking.slotId);
    if (slot) { slot.status = 'booked'; this.saveSlots(slots); }
    return booking;
  },

  deleteBooking(id) {
    const booking = this.getBookings().find(b => b.id === id);
    if (booking) {
      // Restore slot to available
      const slots = this.getSlots();
      const slot = slots.find(s => s.id === booking.slotId);
      if (slot) { slot.status = 'available'; this.saveSlots(slots); }
    }
    const bookings = this.getBookings().filter(b => b.id !== id);
    this.saveBookings(bookings);
  },

  seedIfEmpty() {
    if (this.getSlots().length > 0) return;
    const today = new Date();
    const seeds = [];
    const categories = [
      { name: 'Tư vấn SEO', color: '#6366f1' },
      { name: 'Review website', color: '#f43f5e' },
      { name: 'Training', color: '#06b6d4' },
    ];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      const dateStr = fmtDate(date);
      const hours = [9, 10, 14, 15, 16];
      hours.forEach((h, i) => {
        if (Math.random() > 0.4) {
          const cat = categories[i % categories.length];
          seeds.push({
            id: uid(),
            date: dateStr,
            time: `${String(h).padStart(2,'0')}:00`,
            duration: 60,
            category: cat.name,
            color: cat.color,
            status: 'available',
          });
        }
      });
    }
    this.saveSlots(seeds);
  }
};

// ===== UTILS =====
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDisplayDate(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function fmtDisplayTime(time) {
  return time; // 'HH:MM' already readable
}

function isToday(dateStr) {
  return dateStr === fmtDate(new Date());
}

function isPast(dateStr, time) {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  const d = parseDate(dateStr);
  d.setHours(h, m, 0, 0);
  return d < now;
}

// ===== TOAST =====
function toast(msg, type = 'default') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', default: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || icons.default}</span> ${msg}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 2800);
}

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ===== WEEK HELPER =====
function getWeekDates(referenceDate) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // Mon
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

const WEEK_DAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES_VN = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
