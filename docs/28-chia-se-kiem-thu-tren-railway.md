# Chia sẻ kiểm thử trên Railway — 16/11/2026

Đã triển khai và kiểm tra: **https://synera-web-production.up.railway.app/**.
Project quản lý: https://railway.com/project/5489a2f4-5f84-4617-a9ca-ab59147b2fdb.

## Sửa lỗi login 17/11/2026 — ảnh đè chữ ở cửa sổ thấp

Deployment tiếp theo `e785cad7-e758-4c52-a699-4eb2f46fd5a5` đã SUCCESS. Chỉ sửa auth.css:
ảnh neo trên, min-height desktop 900px, giữ min-height theo viewport ở tablet/mobile.
Đã tái hiện trước sửa tại 1920×640 và kiểm tra cloud sau sửa ở 8 viewport, gồm 1920×640/768,
1366×768, 1680×900; chữ nằm trên mép laptop, không tràn ngang. OTP NSX và login NPP đạt.
27 unit tests/13 nhóm design checks local đạt. Hash JAR cloud khớp local
`f0751d26f598b7a6d3a4480059b232d9bc0039a0c2a95391782642903edadaf0`;
19 bảng nghiệp vụ, schema và tệp uploads/exports không đổi. Bằng chứng riêng tại
`artifacts/railway-login-fix-20261117/`; không reset/import database.
Repo GitHub người dùng gửi hiện không truy cập được, nên không có thao tác đọc/push source repo đó.

## Cập nhật 17/11/2026 — deploy toàn bộ bản local đã duyệt

Người dùng đã yêu cầu deploy đầy đủ sau khi xem local, thay cho mốc chỉ chạy local trước đó.
Deployment `2965e1e8-ea82-45ac-9ba0-7b5bac6cd0b3`, service synera-web hiện hữu,
environment production, profile shared-test. Đưa nguyên JAR local lên, không tạo site/service/DB mới,
không nhập database local, không đổi secret hoặc volume.

Bao gồm login nền kho/laptop mới, sidebar và hai luồng NPP gom đơn/phân phối tồn dùng API thật,
header báo cáo xanh/nâu, parser lên đơn chung và toàn bộ frontend/backend hiện tại.
Gom đơn: **Đơn hàng → Gom đơn giao hàng** hoặc Chuyến giao. Phân phối tồn:
**Kho hàng → Phân phối hàng tồn** hoặc tab Rủi ro tồn kho.

Đã backup cloud riêng tư trước deploy, giữ deployment cũ để rollback. SHA256 JAR trên cloud
khớp bản local `49bf3c00b34dd1ee1eac52cfc499e38ebe478cf90f1433c5f206fbebaecbb9e0`.
67 tệp frontend được kiểm trong JAR; 66 tệp public so byte qua HTTPS khớp local, video landing
đọc Range thành công. 19 bảng nghiệp vụ, schema V121 và hash các tệp uploads/exports giữ nguyên
sau deploy. Chứng cứ tại `artifacts/railway-release-20261117/`; SQL backup không nằm trong build context.

Kiểm tra HTTPS sau deploy đạt: health, đăng nhập NSX/NPP/Sales và OTP, login desktop/mobile
sau khi tải xong ảnh, menu gom đơn/phân phối tồn và reload, màu header báo cáo, endpoint phân tích
ngữ nghĩa theo SKU thật. NPP cloud hiện đọc được 12 sản phẩm, 21 điểm bán, 25 đơn bán, 19 đơn nhập,
2 đơn sẵn sàng, 26 lô có hạn dùng còn tồn. Không tạo chứng từ/ghi chú thử trong đợt release này.

Giao diện/chức năng được đồng bộ theo mã. Số liệu cloud tiếp tục là dữ liệu cloud hiện hữu, không
phải sao chép đè số liệu của local. Ghi chú OTP bản chia sẻ khác ghi chú local theo đúng cấu hình.

Các phần dưới mô tả lần thiết lập đầu ngày 16/11 và vẫn là lịch sử triển khai/dữ liệu.

Mục tiêu: đưa mã hiện tại và dữ liệu đang có lên một máy chủ chung để các tài khoản khác
xem được cùng dữ liệu theo quyền. Không chuyển MySQL sang PostgreSQL/Supabase trong bước deploy.

## Kiến trúc bản chia sẻ

- Một web service chứa Java 25 và frontend production build cùng origin HTTPS.
- MySQL 8.4 ở mạng private, volume riêng `/var/lib/mysql`; không có TCP proxy public.
- Volume web `/app/.data` chứa tệp đã tải lên và báo cáo; không lưu trên filesystem tạm.
- Profile `shared-test`: cookie Secure, JWT secret riêng, không seed, không chạy migration tự động,
  không lộ danh sách/mật khẩu tài khoản mặc định trên màn đăng nhập. Tài khoản cũ được giữ.
- Các email `.local` không nhận SMTP: OTP kiểm thử được ghi nhãn rõ và hiển thị trong form sau
  khi mật khẩu hợp lệ. File giữ chế độ chưa quét của bản test, AI manual. Không gọi đây là production.
- Production profile vẫn yêu cầu OTP SMTP/HTTPS, không chấp nhận chế độ OTP kiểm thử kể cả khi
  trộn profile `prod` với `shared-test`.
- `/health` giữ giao thức IPA hiện tại: `{service:"SYNERA Sales API",ready:true}` khi dịch vụ khỏe,
  trả 503/ready=false khi chưa sẵn sàng; không trả chi tiết database/hệ thống. API nghiệp vụ giữ xác thực.

## Chuyển dữ liệu

`scripts/prepare-shared-test.py` chụp bản ổn định trong lúc main local dừng, tự mở lại local sau đó
qua helper triển khai. SQL giữ schema, ID, dữ liệu và trigger; tài khoản cloud chạy app chỉ có DML.
Ba bảng refresh token, OTP và password-reset token được để rỗng, không mang phiên cũ lên Internet.

Bản snapshot `artifacts/deploy-private/20261116-015738/` có **96 bảng, 3.766 dòng và 19 tệp**.
Đã phục hồi thử trên MySQL local riêng, đối chiếu hash từng bảng và số trigger. Import thật qua SSH
Railway vào database mới/rỗng; không mở cổng database ra Internet. Hash 96 bảng trên cloud khớp bản
snapshot sau chuẩn hóa ký tự xuống dòng Windows/Linux. Tệp được đối chiếu riêng trên volume web.

SQL, ảnh người dùng, khóa SSH và secret chỉ nằm trong thư mục private bị Git/Docker ignore;
không được đưa vào build context hoặc repository. Bản deploy trực tiếp dùng context chỉ có Dockerfile
và JAR đã kiểm thử; root Dockerfile cũng cung cấp cách build lại từ source. Đây là bản chụp source
local, chưa tự động đồng bộ source lên repository GitHub cũ.

## Cách dùng cùng dữ liệu

Sau khi đưa lên cloud, **chủ dự án cũng dùng URL cloud**, cùng người được chia sẻ. Chỉnh sửa được
lưu tại MySQL cloud và đọc lại theo phân quyền NSX/NPP/Sales. Local vẫn là bản độc lập, không tự
đồng bộ hai chiều; thay đổi local sau snapshot không tự xuất hiện trên cloud.

IPA có cấu hình máy chủ thì nhập origin HTTPS cloud, không thêm `/api/v1` hoặc `/#/`. API native
dùng chung backend; kiểm thử API client không thay cho nghiệm thu trực tiếp trên iPhone.

## Chi phí và phạm vi kiểm chứng

Railway xác nhận tài khoản có trial 5 USD, tối đa 30 ngày tại thời điểm bắt đầu. Credit hết trước
thì thời gian dùng ngắn hơn; không hứa miễn phí vĩnh viễn. Không thao tác nâng cấp hoặc thêm thẻ.
CLI không cho đặt hard cap dưới 10 USD nên không áp cap đó thay cho ngân sách 5 USD; chỉ sử dụng
trial hiện có. Sau trial cần backup trước thời hạn Railway thu hồi volume.

Log, manifest và kết quả đối chiếu ở `artifacts/cloud-deploy/`. Không nêu hoàn tất public deploy
chỉ dựa vào build thành công: phải có health HTTPS, đăng nhập các vai trò, kiểm tra ảnh, dữ liệu chung
từ phiên độc lập, restart vẫn giữ dữ liệu/tệp. Các kết quả hoàn tất được bổ sung sau khi chạy thực tế.

## Kết quả bàn giao

- Frontend architecture/format, 21 unit tests và production build đạt.
- Backend verify: 196 test cases, 99 pass/97 MySQL có điều kiện skip trong lượt mặc định, không lỗi;
  4 kiểm tra bổ sung cho handshake IPA, OTP và bootstrap production đạt. Không coi các mục skip
  là bằng chứng MySQL; bản cloud chạy MySQL 8.4.13 thực và đã nhập/đối chiếu dữ liệu trực tiếp.
- Khôi phục local snapshot: 96 bảng khớp hash và số trigger khớp. Cloud: 96 bảng khớp hash trước
  khi bật workers và thử ghi; 19 tệp khớp hash trên volume. Tổng dữ liệu chuyển: 3.766 dòng.
- Web đã redeploy với workers bật, MySQL đã restart thật. Sau restart: 16 bảng nghiệp vụ so hash
  vẫn khớp, 22 trigger còn đủ, tài khoản chạy app chỉ có SELECT/INSERT/UPDATE/DELETE; 19 tệp vẫn khớp
  mà không chép lại. Kết quả: `persistence-result.json` và `files-verification.json`.
- 13 nhóm design checks trên URL cloud; cây phân tuyến ba chiều rộng; 57 trường hợp kiểm tra sản phẩm,
  khung/chữ, responsive NSX/NPP đạt. 12 ảnh, giá và đơn vị được đối chiếu với baseline local.
- 7 kiểm tra API cloud/native đạt: handshake IPA, đăng nhập/đọc theo scope, native refresh/logout,
  cookie browser Secure/HttpOnly/SameSite Strict và refresh HTTPS.
- Một ghi chú CRM được tạo trên cloud tại cửa hàng ID1: “Rà soát lịch ghé và nhu cầu bổ sung hàng”,
  interaction ID11. NPP ghi, NSX và Sales phụ trách đọc thấy từ phiên độc lập. Giữ lại ghi chú này
  làm bằng chứng test được người dùng cho phép, không tạo thêm đơn hoặc reset trạng thái đơn cũ.
- MySQL không có TCP proxy public. App và database đều báo SUCCESS; `/health` trả ready=true.

Tài khoản/mật khẩu đã có vẫn dùng như local. IPA có mục cấu hình máy chủ thì nhập
`https://synera-web-production.up.railway.app`, bấm kiểm tra/lưu rồi đăng nhập. Chưa kiểm trực tiếp
iPhone trong lượt này; API client native và handshake đã được chạy thật qua HTTPS.

Hết credit trial thì dịch vụ có thể dừng; không có cấu hình tự nâng cấp trả phí. Backup gốc và
manifest private nằm trong workspace; SQL và tệp private không được public trong GitHub/source build.
