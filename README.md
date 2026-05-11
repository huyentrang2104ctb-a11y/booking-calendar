# Booking Calendar

Mini tool đặt lịch hẹn cá nhân — khách hàng tự chọn slot trống và xác nhận booking trực tiếp trên web.

## Demo

🔗 [https://huyentrang2104ctb-a11y.github.io/booking-calendar/](https://huyentrang2104ctb-a11y.github.io/booking-calendar/)

## Tính năng

**Trang đặt lịch (khách hàng)**
- Xem lịch trống theo tuần hoặc tháng
- Lọc slot theo danh mục / tag
- Bấm chọn slot → điền tên, email, ghi chú → xác nhận

**Trang admin (chủ lịch)**
- Thêm / xoá slot trống
- Xem toàn bộ booking đã nhận
- Lịch tổng quan tuần / tháng
- Thống kê số slot trống, đã book

## Cách dùng

| Trang | URL |
|---|---|
| Đặt lịch (khách) | `/index.html` |
| Quản lý (admin) | `/admin.html` |

Dữ liệu lưu trong **LocalStorage** của trình duyệt — không cần backend hay tài khoản.

## Tech stack

- HTML / CSS / JavaScript thuần
- Không có framework, không có dependency
- Deploy: GitHub Pages

## Cấu trúc

```
booking-calendar/
├── index.html        # Trang booking cho khách
├── admin.html        # Trang quản lý admin
├── css/
│   └── style.css     # Giao diện colorful, modern
└── js/
    ├── app.js        # Data layer & localStorage
    ├── booking.js    # Logic trang khách
    └── admin.js      # Logic trang admin
```

## Tác giả

Xây dựng bằng [Claude Code](https://claude.ai/code) — Khóa học Claude Code cho SEO by SEOngon.
