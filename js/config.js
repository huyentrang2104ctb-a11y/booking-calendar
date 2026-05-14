// ===== SUPABASE CONFIG =====
// 1. Tạo dự án miễn phí tại https://supabase.com
// 2. Vào Settings → API → copy "Project URL" và "anon public key"
// 3. Paste vào đây
// 4. Chạy nội dung file schema.sql trong Supabase SQL Editor

const SUPABASE_URL = 'https://kcqfyskgxfdajwedjwyc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tEMbZLDesMy68rXc_0TFrA_8eFZF6JP';

// ===== APP CONFIG =====
const APP_CONFIG = {
  workingHours: { start: 8, end: 17 },   // 8:00 → 17:00 (slot cuối kết thúc lúc 17:00)
  slotDuration: 60,                        // phút mỗi slot
  workingDays: [1, 2, 3, 4, 5],           // 0=CN, 1=T2 … 6=T7
  daysAhead: 14,                           // hiển thị slot trống trong bao nhiêu ngày tới

  categories: [
    { name: 'Tư vấn SEO',     color: '#6366f1' },
    { name: 'Review website', color: '#f43f5e' },
    { name: 'Training',       color: '#06b6d4' },
  ],
};
