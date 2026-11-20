# Hoàn thiện khả năng sử dụng và dữ liệu — 15/11/2026

Nguồn: yêu cầu trực tiếp của người dùng về xử lý đơn, trợ lý nhập hàng, ví dụ nhập liệu, sự nhất quán NSX/NPP, báo cáo đi tuyến và ảnh gửi kèm. Web `https://synera-web-mpdu.onrender.com/#/` được xem bằng Edge: trang tham khảo mở ở đăng nhập, nhãn/nút dùng Segoe UI, độ đậm 400/600, tiêu đề 27px/700. Chỉ dùng để tham khảo độ rõ chữ; không truy cập tài khoản hay sao chép dữ liệu từ dịch vụ đó.

## Đơn hàng

Đối chiếu lịch sử hai đơn gốc: đơn 1 đóng ngày 14/11 giờ Việt Nam, đơn 2 đóng ngày 15/11; không có bằng chứng một thao tác đóng hai đơn trong lịch sử được kiểm tra. Lỗi xác nhận được là danh sách luôn hiển thị “Xử lý đơn” cho cả đơn đã đóng.

`shared/orderActions` dùng chung quyết định bước tiếp theo theo trạng thái/quyền. Đơn hoàn tất dùng “Xem kết quả”; đơn chờ vai trò khác hoặc kết thúc hủy/từ chối dùng “Xem chi tiết”. Chi tiết báo “Đơn hàng đã hoàn tất”, tiến trình không chỉ ra bước còn phải làm. Các hành động đặt lại/hoàn hàng hợp lệ được giữ riêng.

Biểu mẫu ghi giữ snapshot mã đơn, ID, channel, dòng hàng và hành động lúc mở. Đổi route đóng biểu mẫu; trạng thái đã đổi thì yêu cầu kiểm tra lại. Chặn gửi lặp đồng bộ bằng ref, không chỉ đợi React cập nhật disabled. Backend vẫn khóa ID/kiểm trạng thái/idempotency hiện có; không thay trạng thái lịch sử để che lỗi.

Kiểm thử MySQL + browser: tạo hai đơn độc lập, chạy đầy đủ từ duyệt tới đóng trên một đơn, kiểm đơn thứ hai giữ nguyên trạng thái và history. Sau đóng, danh sách chỉ còn “Xem kết quả”; thay route khi dialog mở không gửi hành động cho đơn mới.

## Trợ lý nhập hàng

`OrderRequestParser` dùng danh mục `PricingFacade.offerings` đã scope NPP/điểm bán; chuẩn hóa chữ hoa/thường, dấu tiếng Việt, từ giao tiếp, một số tên gọi như nước suối/nước lọc; xếp hạng sản phẩm gần nhất bằng độ phủ từ và khoảng cách chính tả, bao gồm đảo hai chữ liền nhau. Đây là thuật toán so khớp danh mục, **không phải mô hình ngôn ngữ tổng quát hoặc mô hình KNN đã huấn luyện**.

Ví dụ `tôi muốn nhập 2 thùng nước khoáng`, `2thung nuoc khoan`, `hai thùng nước suối`. Nếu danh mục có nhiều loại nước khoáng gần nhau, trả tối đa ba lựa chọn, bắt người dùng chọn rồi xác nhận thêm giỏ. Giữ kiểm đơn vị, số lượng dương, bội số; thiếu thông tin hoặc không đủ gần trả lý do. Không tự suy giá/khuyến mãi hay gửi đơn.

API giữ `lines`, `unresolved`, `method`; thêm `suggestions: [{text,candidates}]`, mỗi dòng có thông tin khớp để giải thích. Giá/ưu đãi tiếp tục lấy quote server sau khi thêm vào giỏ. Không mở rộng tìm kiếm vượt danh mục được cấp.

## Giao diện và hướng dẫn

- Placeholder xám do `inputGuidance` dùng khóa/nhãn/kiểu field, có override `FormField.placeholder`, không tự điền dữ liệu thật. Số lượng ví dụ nằm trong min/max; trường ngày có hướng dẫn định dạng vì browser không hiển thị placeholder ngày. Form riêng cho đăng nhập/cửa hàng/giỏ/số ngày phủ cũng có ví dụ; lựa chọn/checkbox/file dùng label, hướng dẫn loại dữ liệu.
- `displayLabel` Việt hóa loại chứng từ, trạng thái, đơn vị, kỳ, vai trò/quyền trong các form và bảng nghiệp vụ. `terms` thành “Ngưỡng quá hạn”, INVOICE thành “Hóa đơn”; ngày/giờ sổ công nợ dùng định dạng Việt Nam. Mã định danh, mã cấu hình, SKU, CSV/XLSX/PDF vẫn giữ khi cần đối chiếu kỹ thuật.
- Màu nền chung trắng xám, header xám nhạt và viền chung ở token canonical. Thang chữ chung Segoe UI; tiêu đề 26px/600, bảng 13px, header bảng 12px/600. Không tạo file override theo từng vai trò.
- Trang chính sách có khung nội dung ở giữa; dialog soạn chương trình/tài liệu rộng, ở giữa, vẫn cuộn được trên màn nhỏ. Giữ sidebar/motion đã triển khai.
- Hình sản phẩm chỉ dùng các asset có tên tương ứng. Cập nhật tiếp 15/11: bổ sung đủ sáu ảnh minh họa cho sáu SKU mới, cùng nguồn ảnh ở NSX/NPP và bộ chọn sản phẩm gần giống. Không gắn ảnh nước lọc cho nước ép táo hoặc sữa tươi cho sữa đậu nành; sản phẩm chưa ánh xạ vẫn dùng biểu tượng hàng hóa.

## Báo cáo đi tuyến

Hướng dẫn ba bước lọc → chọn nhóm → đọc kết quả. Có giải thích từng cột và công thức; phân biệt điểm phụ trách hiện tại, lượt theo lịch, lượt bắt đầu/kết thúc, đơn phát sinh và giá trị đơn. Một điểm có nhiều lượt, một lượt có nhiều đơn hoặc không có đơn; giá trị đơn không được gọi là doanh thu thực nhận.

Giữ kết quả lịch sử cho người thực hiện cũ khi bàn giao. Loại lượt hủy khỏi kế hoạch. Tổng điểm tính unique, tỷ lệ tổng tính từ tổng lượt hoàn thành/tổng lịch, không lấy trung bình các phần trăm. Chờ bấm “Lọc dữ liệu” trước khi thay bảng và hiển thị nhắc khi form khác bộ lọc đang áp dụng. Không gán ngưỡng 80% cảnh báo nếu chưa có quy tắc nghiệm thu cho ngưỡng đó.

## Dữ liệu kiểm thử mở rộng

`artifacts/usability/seed-scenarios.mjs` chạy từng bước có idempotency/manifest, chỉ nhận cổng local8080/8091. Đã chạy thử trên DB MySQL cô lập trước; bản chính được sao lưu SQL và JAR trước khi bổ sung. Tạo qua API và chuyển trạng thái thật; không INSERT ledger/chứng từ lịch sử bằng SQL.

Bộ mới: 6 sản phẩm, 2 NPP, 4 Sales, 18 cửa hàng, 5 tuyến/tuần; 16 đơn nhập, 17 đơn bán ở nhiều bước; 4 chương trình, 4 tài liệu, 6 báo giá, 6 lịch hẹn, 4 cơ hội, 4 yêu cầu hỗ trợ, 6 khảo sát tồn, 3 yêu cầu hỗ trợ bán hàng, 3 kế hoạch nhập, giao bù, phiếu hoàn/kiểm kê và thanh toán. Tên giao dịch bình thường; manifest ghi rõ provenance kiểm thử cho quản trị viên, không đổi số liệu thành kết quả kinh doanh thật.

Các giao dịch thanh toán mới chỉ cho hai NPP mới, tránh phân bổ vào hóa đơn cũ. Lượt ghé đang làm của người dùng giữ nguyên; các ví dụ vào/ra điểm dùng Sales mới. Không tạo lịch hẹn quá khứ hoặc timestamp giả để có KPI đẹp.

## Kiểm tra và giới hạn

Frontend 19 unit tests; backend verify phát hiện188 bài,94 chạy đạt và94 yêu cầu môi trường khác được skip theo cấu hình. Parser4 bài đạt sau bổ sung lỗi gõ đảo chữ; browser/API trên MySQL thực kiểm hai đơn độc lập, trợ lý/lựa chọn, placeholder/tiêu đề Việt hóa, dialog chính sách và responsive. e2e18 và design checks đạt trên dữ liệu mở rộng. Evidence/log/screenshot trong `artifacts/usability`.

Không coi bộ dữ liệu này là chứng minh toàn bộ PDF đã được nghiệm thu. Carrier/OTP/AI provider thật và ký/cài iPhone vẫn phụ thuộc các giới hạn đã ghi trong tài liệu gốc; yêu cầu web đợt này không thay native IPA v7 đang chờ kết quả chẩn đoán.

## Kết quả bản đang chạy

Đã triển khai tại `http://127.0.0.1:8080`, schema giữ V121, không cần migration mới. Backup `artifacts/backups/before-usability-20261115-162605/` gồm SQL và JAR trước thay đổi. So sánh trước/sau bổ sung xác nhận **6 đơn cũ giữ nguyên mã/trạng thái/tổng/dòng/lịch sử, 9 cửa hàng cũ và 5 lượt ghé cũ giữ nguyên**.

Tổng dữ liệu sau nạp: 12 sản phẩm, 27 cửa hàng, 4 NPP, 6 tuyến, 19 đơn nhập, 22 đơn bán, 4 chương trình, 4 tài liệu, 8 báo giá, 7 lịch hẹn, 7 yêu cầu hỗ trợ và 5 cơ hội. Đây là dữ liệu local phục vụ thử chức năng; các số tổng hợp đã bao gồm chứng từ kiểm thử vừa tạo.

Kiểm trình duyệt trên bản chính: tiêu đề NSX/NPP đều Segoe UI26px/600; đơn cũ đã đóng hiển thị “Xem kết quả”, dialog chính sách ở giữa, báo cáo có hướng dẫn; không tràn trang ở1440/900/390 và không có JavaScript error. `artifacts/usability/live-ui-result.json` giữ số đếm/style thực, `existing-preserved.json` giữ kết quả đối chiếu. Ảnh `live-*.png` trong cùng thư mục.
