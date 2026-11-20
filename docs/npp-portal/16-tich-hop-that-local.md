# Gom đơn và phân phối tồn — API thật

**Cập nhật 17/11/2026:** Người dùng đã cho phép deploy đầy đủ. Hai luồng này đã nằm trong bản
Railway mới, giữ dữ liệu cloud hiện hữu. [Release và kiểm chứng](../28-chia-se-kiem-thu-tren-railway.md).
Nội dung bên dưới ghi lại mốc kiểm thử local trước khi được duyệt deploy.

Người dùng yêu cầu chạy với dữ liệu thật và xác nhận **test local OK mới deploy**.
Không deploy Railway ở mốc này. Server mockup 4177 đã dừng, route vận hành không import component Preview.
Web: `http://127.0.0.1:8080`, MySQL8.4 hiện hữu; backup riêng tư tại
`artifacts/local-real-integration/before-local.sql`. Không nhập lại/reset database.
NPP local đọc được 12 sản phẩm, 21 điểm bán, 17 đơn nhập, 20 đơn bán, 2 đơn sẵn sàng và 30 lô.
Cloud đọc được 12/21/19/24 tương ứng. Local/cloud riêng, không đồng bộ hai chiều.

## Luồng thật

Vị trí trong web NPP: **Đơn hàng → Chuyến giao** mở ngay bảng đơn sẵn sàng và đề xuất;
menu **Gom đơn giao hàng** cũng dẫn thẳng vào đây. **Chuyến đã lập** mở bảng vận hành cũ,
giữ xuất phát và xác nhận giao. **Kho hàng → Phân phối hàng tồn** mở tab **Rủi ro tồn kho**
trong trang Kho & tồn hàng; vẫn đổi được kho. Không cần URL preview hoặc server 4177.
Dự báo có bộ lọc lô rủi ro, chọn lô và gợi ý điểm bán thật, modal ghi liên hệ và CTA lập nháp.
Không tạo chứng từ thử vào DB hiện hữu khi kiểm giao diện.

- GET `/delivery-trips/ready?nppId=`: quyền kho, scope NPP, đơn PICKING chưa thuộc chuyến chưa hủy.
  Trả địa chỉ/tuyến/tọa độ và expectedDelivery thật. FE gợi ý cùng tuyến hoặc cách điểm đầu ≤3km
  đường chim bay; không phải tối ưu bản đồ/tải trọng/chi phí. Thiếu thông tin cần chọn thủ công.
- Ngày giao không vượt ngày hẹn; đơn quá hạn ưu tiên hôm nay. Chưa có field khoảng ngày nhận hoặc
  mức gấp riêng nên không bịa. Ngày chưa hẹn cần người dùng liên hệ xác nhận.
- Chọn tài xế → POST `/delivery-trips` hiện có. Backend khóa đơn, chặn gom trùng và sai phạm vi,
  giữ idempotency, dispatch và receipt. Không đổi schema.
- GET `/inventory/redistribution?warehouseId=`: WAREHOUSE_WRITE, kho NPP scoped. Tồn khả dụng từ
  InventoryFacade; lượng thực nhận 30 ngày từ SalesFacade, factor snapshot. Nhu cầu được phân bổ
  FEFO toàn NPP để tránh dùng cùng nhịp bán cho nhiều lô. Chỉ khách từng thực nhận SKU và đang hoạt
  động được đề xuất; hàng hết hạn không gợi ý bán. Đây là phép chiếu nhịp bán, chưa phải model AI.
- Ghi trao đổi vào `/interactions` thật; không tự gọi/gửi tin. `/quotations` lưu nháp dùng giá hiện hành;
  khách đồng ý thì ACCEPTED tạo sales-order theo luồng có sẵn. Giá thương lượng khác cần cập nhật
  chính sách trước; không âm thầm vượt bảng giá. Chưa giữ riêng lô gợi ý, xác nhận đơn vẫn dùng FEFO.

## Kiểm chứng

TypeScript/build và 27 unit tests web đạt. Java25 backend verify đạt, gồm 35 API integration tests
trên H2 cô lập; bổ sung chặn gom trùng/sai NPP. Test riêng dự báo không bịa người mua/hàng hết hạn đạt.
MySQL tests có điều kiện skip không được coi là bằng chứng concurrency MySQL.
Đã đọc API mới trên MySQL local và kiểm browser với backend thật: 2 đơn, dự báo lô, không nhãn fixture,
không lỗi runtime. Không tạo chứng từ thử trong dữ liệu hiện hữu; các ca ghi chỉ chạy trên DB test.
Ảnh và log tại `artifacts/local-real-integration`. Chờ người dùng duyệt trước khi deploy.

Kiểm tra lại từ menu NPP bằng `node scripts/npp-planning-check.mjs`: Chuyến giao mặc định mở
gom đơn, bỏ chọn hết chặn lập chuyến, gom lại và mở bước chọn tài xế, về danh sách vận hành;
Kho → Phân phối tồn mở dự báo/khách thật, liên hệ mở đúng số điện thoại và ghi chú; desktop/mobile
không tràn trang, reload giữ route, không lỗi JS/API. Test này không gửi lệnh ghi chứng từ/trao đổi.
13 nhóm kiểm tra `npm run test:design` đạt. Local hiện chưa có tài xế NPP, UI chỉ dẫn sang
Tuyến & đội ngũ để thêm; không tự tạo tài xế hay sửa dữ liệu cho việc kiểm thử.

Script trên còn kiểm tra nút cuối bằng chặn request ghi trong riêng browser test: ghi nhận liên hệ,
tạo DRAFT, chuyển SENT rồi ACCEPTED, nhận liên kết đơn; chọn tài xế và lập chuyến rồi mở chi tiết.
Không gửi request ghi nào trong phần này xuống MySQL. Đây là kiểm tra UI/hợp đồng, tách với
API integration trên H2; không thay thế kiểm thử giao dịch đồng thời MySQL.
