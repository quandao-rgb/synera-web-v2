# SYNERA Web v2

Mã nguồn web NSX, Nhà phân phối, Sales web và backend Java dùng chung. Repo công khai chỉ chứa những phần cần để build, chạy và kiểm thử; không kèm database, uploads, secret, cache, node_modules hoặc binary build.

## Chạy trên Windows

Cần Node.js 24, Python 3.10+ và Internet ở lần cài đầu. Mở PowerShell tại root repo:

```powershell
git clone https://github.com/quandao-rgb/synera-web-v2.git
cd synera-web-v2
npm.cmd install --global pnpm@11
pnpm.cmd install --frozen-lockfile
python scripts/bootstrap-backend.py
python scripts/bootstrap-mysql.py
python scripts/run-local.py start
```

Launcher tải công cụ Java 25/Maven và MySQL portable vào `.tools`, build web cùng backend, rồi chạy trên **http://127.0.0.1:8080**. MySQL 8.4 dùng cổng 3308. Lần đầu tải/cài có thể mất vài phút.

Máy mới dùng tài khoản mẫu `admin@synera.local`, `npp@synera.local`, `sales@synera.local`. Mật khẩu **mẫu cho phát triển** trong repo này là `SyneraDevOnly2026!`; có thể đặt `BOOTSTRAP_PASSWORD` trước lần khởi tạo đầu. Admin có bước OTP local. Đây không phải thông tin đăng nhập của bản đang chạy hoặc Railway; không dùng cấu hình local để hosting công khai.

```powershell
# Dừng an toàn; giữ database và tệp đã tải lên
python scripts/run-local.py stop
# Chạy lại JAR đã build
python scripts/run-local.py start --no-build
```

Database hiện hữu không bị reset khi chạy lại. Repo không chứa dữ liệu cá nhân của máy bàn giao; máy mới tự tạo dữ liệu mẫu. **Không copy hoặc import đè database đang dùng.**

## Phát triển và kiểm tra

Giữ backend 8080 chạy, dùng `pnpm.cmd dev` để phát triển frontend qua Vite/proxy 5173.

```powershell
pnpm.cmd check:architecture
pnpm.cmd format:check
pnpm.cmd test
pnpm.cmd build
.\scripts\backend.cmd verify
node scripts/auth-design-check.mjs
pnpm.cmd test:design
```

`pnpm test:e2e` có tạo chứng từ nên chỉ chạy với database kiểm thử riêng. CI đã cấu hình MySQL riêng; không dùng dữ liệu đang vận hành. H2 là kiểm thử nhanh; MySQL tests bị skip không được coi là đã đạt.

## Phần đã có

- Web NSX: mạng lưới, cây tổ chức/tuyến, hồ sơ, đơn hàng và báo cáo.
- Portal NPP: danh mục, đặt nhập/bán, kho, công nợ, gom chuyến và phân phối hàng tồn.
- Sales web: tuyến/lượt ghé, điểm bán, đơn, trợ lý phân tích yêu cầu và dữ liệu theo scope.
- Backend Java 25/Spring Boot/MySQL/Flyway; giá, phân quyền, idempotency và giao dịch ở server.
- Trang login responsive; OTP, khôi phục mật khẩu và hiện/ẩn mật khẩu.

Trợ lý hiện là parser/xếp hạng danh mục. Các kết quả/gợi ý cần người dùng xác nhận. Khoảng thiếu và phạm vi kiểm chứng ghi trong [BACKEND-BUILD-SUPPLEMENT](docs/BACKEND-BUILD-SUPPLEMENT.md).

## Đóng gói/hosting

Dockerfile build frontend/backend từ source. Profile `shared-test` cần MySQL đã có schema cùng cấu hình riêng; không seed hoặc migrate tự động. Biến mẫu: [deploy/shared-test.env.example](deploy/shared-test.env.example). Không đưa secret thật vào Git. Hướng dẫn kiến trúc và hợp đồng trong [ARCHITECTURE.md](ARCHITECTURE.md), [backend/README.md](backend/README.md), [docs/BACKEND-API.md](docs/BACKEND-API.md).

Source Expo/IPA, công cụ ký app, tài liệu họp/ảnh mockup gốc không thuộc repo web này. Sales web đã nằm trong `src`; bản app native được phát triển riêng. Một số tài liệu kỹ thuật giữ tham chiếu lịch sử đến app, ảnh kiểm thử và repo nguồn cũ.

## Tải kèm dữ liệu local gốc

Nếu được chủ dự án cấp quyền vào repo dữ liệu riêng tư, có thể khôi phục database và các tệp gốc để chạy cùng dữ liệu. Xem [docs/LOCAL-DATA.md](docs/LOCAL-DATA.md). Bản dữ liệu riêng tư được tách khỏi mã nguồn công khai; không import đè database đang có.
