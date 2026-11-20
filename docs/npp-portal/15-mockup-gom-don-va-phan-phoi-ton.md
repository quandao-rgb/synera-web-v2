# Mockup gom chuyến và phân phối hàng tồn — 16/11/2026

**Mốc lịch sử:** route hiện tại đã chuyển sang [API thật trên local](16-tich-hop-that-local.md).
Không dùng server 4177 để mở web vận hành. Chờ người dùng test local OK mới deploy.

## Yêu cầu và hiện trạng

Người dùng cung cấp ba ảnh: bảng báo cáo xanh/nâu cam; Chuyến giao có danh sách đơn sẵn sàng và
đề xuất giao chung; Kho có dự báo tồn theo lô và các điểm từng mua mặt hàng. Yêu cầu hiện tại là
khôi phục màu báo cáo và làm mockup thao tác được để duyệt trước.

Đã khảo sát route `/delivery` → `Delivery.tsx`, `/inventory` → `Management.tsx`, `/reports` NSX
→ `Reports.tsx`; dùng chung shell, quyền route, `PageHead`, `Panel`, `Table`, `Modal`, ảnh danh mục,
định dạng tiền và token CSS. Snapshot trước sửa nằm tại `artifacts/npp-planning-mockups/before`.
Thư mục hiện là source snapshot, không có `.git`; không ghi đè bản thay đổi mobile/IPA trước đó.

Luồng thật đã có tạo chuyến cho đơn `PICKING`, chọn tài xế/ngày giao và xác nhận thực nhận.
Chưa có đầy đủ khoảng ngày khách nhận, mức khẩn cấp và dữ liệu địa lý phục vụ gom tự động.
Kho đã có số dư/lô; cần thêm hợp đồng truy vấn lịch sử mua cùng SKU, căn cứ dự báo và xử lý giá/lô
khi muốn chuyển chức năng mới sang vận hành thật. Mốc này không đổi backend hoặc schema.

## Cách mở

- NPP → Đơn hàng → Chuyến giao → **Gom đơn hàng**.
  Route: `/#/delivery?view=grouping`; nút quay về trang chuyến giao đang vận hành.
- NPP → Kho hàng → Hàng hóa & tồn kho → **Rủi ro tồn kho**.
  Route: `/#/inventory?view=risk`; quay về Tồn theo lô để dùng các thao tác kho hiện có.
- Bảng báo cáo khôi phục màu tại `/#/reports` với vai trò NSX, không đổi số liệu hoặc công thức.

Hai mockup ghi rõ Dữ liệu minh họa. Fixture chỉ dùng cho các màn này, không trộn vào dữ liệu API
và không dùng làm fallback khi API lỗi. Mọi thao tác mô phỏng chỉ ở RAM; rời màn hình/tải lại sẽ
trở về trạng thái đầu. Giữ nháp thiết bị, LocalStorage nghiệp vụ và database hiện hữu.

## Gom đơn giao chung

- Sáu đơn đã chuẩn bị xong; ba đơn Bình Tân–Tân Phú có ngày nhận chung 17/11; hai đơn Gò Vấp
  nhận ngày 18/11. Một đơn gấp cần ngày 16/11 không được tự lùi để gom vào ngày 17/11.
- Có checkbox chọn thủ công, ngày nhận chung và chuyển cụm. Ngày ngoài khoảng nhận chung,
  khác khu vực hoặc không có đơn đều chặn lập chuyến.
- Xác nhận qua Modal → tạo chuyến minh họa, chuyển tab Chuyến đã lập; đơn trong chuyến biến khỏi
  danh sách chờ, không được gom trùng. So sánh N đơn → 1 chuyến tính theo lựa chọn thực trên màn.
- Chưa tính xăng/nhân công, tải trọng hoặc giải bài toán tuyến bản đồ; không đưa số tiền tiết kiệm giả.

## Rủi ro tồn và điểm bán mục tiêu

- Dữ liệu mẫu tại 16/11/2026: ba lô có tồn khả dụng 480/600/360; nhịp bán 8/10/6 mỗi ngày;
  còn 30/45/55 ngày đến hạn → dự kiến dư 240/150/30 đơn vị tương ứng.
- Tồn khả dụng = tồn thực tế − đã giữ. Dự kiến bán giới hạn ở tồn khả dụng; phần dư không âm.
  Hàng hết hạn không được gợi ý bán. Đây là phép chiếu nhịp bán, chưa là mô hình AI được huấn luyện.
- Chọn lô cập nhật dự báo, biểu đồ có tổng khớp và ba điểm bán đứng đầu theo lượng mua/độ gần lần mua.
  Chỉ người mua có lịch sử đúng SKU mới xuất hiện. Số điện thoại được che và là minh họa;
  nút Liên hệ mở hồ sơ/biểu mẫu trao đổi, không gọi điện hay gửi tin.
- Ghi nhận lượng, giá và ghi chú → xem tạm tính → tạo đơn nháp minh họa. Chặn lượng không hợp lệ,
  tổng lượng trao đổi vượt tồn khả dụng, chưa trao đổi hoặc tạo nháp lặp. Sửa trao đổi làm mất hiệu lực
  bản nháp chưa gửi tương ứng trong RAM. Không trừ tồn, giữ hàng, đổi giá hay ghi đơn thật.

## Giao diện

Header báo cáo dùng `--report-route-head` xanh và `--report-sales-head` nâu cam, chữ trắng;
dòng tổng dùng accent nhạt. Các bảng khác tiếp tục theo hệ thống hiện tại.
Mockup NPP dùng bố cục hai cột theo ảnh; dưới 1150px chuyển thành một cột, bảng chuyển card theo
shared Table ở mobile. Màu dự báo sold/risk đặt tại token canonical, không thêm CSS override file.
Giữ nguyên logo nguồn, dùng ảnh SKU hiện có. Modal dùng cơ chế focus/Escape/trả focus sẵn có.

## Kiểm tra và bàn giao

- TypeScript, architecture, format, 25 unit tests (21 hiện có + 4 cho quy tắc mockup) và build đạt.
- Browser QA bằng Edge trên production build: ngày chung/đơn gấp, gom không trùng, cụm kế tiếp,
  trao đổi trước nháp, đổi lô, giữ các tab kho hiện có, màu báo cáo và chín dòng số liệu mẫu.
  Kiểm tra 1440/900/390px không tràn trang; không có runtime error hoặc mutation nghiệp vụ.
- Toàn bộ API của phiên QA được phục vụ bởi fixture cục bộ; không đăng nhập hoặc ghi database thật.
  Không chạy bộ E2E có tạo chứng từ lên instance người dùng cho một yêu cầu chỉ mockup.
- Ảnh và browser-result tại `artifacts/npp-planning-mockups`; bản sao bàn giao ở `output/mockups/npp-20261116`.
- Có thể chạy `node artifacts/npp-planning-mockups/preview-server.mjs` từ repo để mở bản minh họa
  tại `http://127.0.0.1:4177/?previewRole=npp#/delivery?view=grouping`. Server này chặn ghi nghiệp vụ,
  không proxy tới backend thật. Dừng bằng Ctrl+C sau khi xem.
  Có thể mở file `output/mockups/npp-20261116/Xem-Mockup.cmd` để chạy nhanh.
  Xem kho tại `http://127.0.0.1:4177/?previewRole=npp#/inventory?view=risk`,
  xem màu báo cáo tại `http://127.0.0.1:4177/?previewRole=nsx#/reports`.

Chưa triển khai server/cloud, không đổi app IPA, chưa có tác vụ gom/dự báo chạy trên dữ liệu thật.
Sau khi duyệt giao diện, cần chốt hợp đồng dữ liệu, tính khả thi tải/tuyến, kiểm tra hạn hàng theo
điều kiện nhận của điểm bán, giá/hạn mức và idempotency ở backend trước khi mở ghi thật.
