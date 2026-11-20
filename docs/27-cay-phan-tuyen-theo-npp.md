# Cây phân tuyến theo NPP — 16/11/2026

Yêu cầu trực tiếp của người dùng chốt thứ tự, dù ảnh minh họa có mô hình BU khác:

**Công ty sản xuất → Nhà phân phối → Miền → Tỉnh/Thành phố → Vùng bán hàng → Tuyến.**

Một NPP có thể phụ trách nhiều miền; cùng một miền có thể xuất hiện dưới nhiều NPP. Mỗi miền chỉ xuất hiện một lần dưới một NPP. Một tỉnh/TP có nhiều vùng bán hàng; mỗi vùng có nhiều tuyến. Tuyến luôn thuộc đúng một NPP và chỉ được gắn vào vùng nằm dưới NPP đó.

## Cấu hình và dữ liệu hiện hữu

- Dấu cộng trên cây xác định cấp kế tiếp. Biểu mẫu chọn cấp trên và hiển thị đường dẫn đầy đủ; không cho tạo tùy ý BU/khu vực xen giữa các cấp.
- Chọn miền Bắc/Trung/Nam; server chuẩn hóa tên miền. Tỉnh/TP và vùng bán hàng kế thừa miền của cấp trên. Backend chặn bỏ cấp, vòng lặp, đổi miền làm sai cấp dưới và chuyển nhánh đang chứa tuyến sang NPP khác.
- Miền giao dịch chính của NPP giữ để tương thích phân quyền thương mại hiện tại. Nhánh địa bàn không tự cấp quyền đọc công nợ, kho hoặc dữ liệu NPP khác. NPP xem được các nhánh miền của chính mình; NSX theo quyền hiện hành. Chưa mở rộng chính sách phân quyền quản lý miền trong thay đổi này.
- Đơn vị cũ khác cấu trúc giữ trong mục thu gọn để đối chiếu. Tuyến chưa gắn đúng vùng nằm trong danh sách cần phân vùng; không giả lập NPP thành vùng bán hàng.
- API cũ tạo tuyến không truyền vùng vẫn được tiếp nhận ở trạng thái chưa phân vùng. Giao diện tạo tuyến và lịch MCP chỉ cho chọn vùng hợp lệ; thao tác phân vùng riêng hỗ trợ dữ liệu cũ.

## Phân vùng không phải giao lại lịch

`POST /api/v1/routes/{id}/organization` nhận `organizationId`, `version`, `reason`, cần `ROUTE_WRITE` và `Idempotency-Key`. Giao dịch khóa cây và tuyến, kiểm tra phiên bản/phạm vi trước khi ghi. Chỉ đổi vùng gắn tuyến và phiên bản, thêm audit. Không sửa điểm bán, thứ tự dừng, người phụ trách, kế hoạch tuần hoặc lượt ghé. Gửi lại cùng khóa trả kết quả cũ; phiên bản cũ trả 409.

Đổi lịch hoặc Sales vẫn dùng API MCP hiện có. Lượt hoàn thành giữ người thực hiện và hiển thị mờ/chỉ đọc cho người đi thay; lượt đang ghé giữ người đang thực hiện. Không lưu MCP chỉ để sửa vị trí cây.

## Hiển thị chung

Phản hồi tiếp theo ngày 16/11: các NPP cùng miền đứng liền nhau, miền Nam trước rồi Bắc/Trung; các nhóm cách nhau bằng khoảng trống. Nhóm căn cứ vào các nhánh REGION thực tế, không dựa riêng miền giao dịch chính. NPP có nhiều miền giữ nguyên cây trong nhóm “Nhiều miền”; chưa có miền thì vào nhóm “Chưa cấu hình miền”. Không đổi ID/parentId hoặc phạm vi nghiệp vụ. Bộ nối SVG dùng góc bo tối đa 12px, nét 1.75px và token chung, bám vào cạnh giữa các ô hiện có; thu gọn nhánh sẽ bỏ luôn các nét nối bị ẩn. Quy tắc này thay nét vuông 2px của lần đầu.

Kiểm tra riêng thay đổi trình bày: 21 unit tests, architecture/format/build và 13 nhóm design checks đạt. Bộ kiểm tra cây đo điểm đầu/cuối của từng nét nối so với cạnh ô thực tế ở 1440/900/390px, sau thu/mở nhánh và reduced motion; không có nét nối mồ côi hoặc tràn ngang toàn trang. Cả database chính có Minh Phát/Đông Phương cùng miền Nam và database kiểm tra riêng có NPP nhiều miền đều đạt. Ảnh/kết quả có tiền tố `rounded-` trong `artifacts/hierarchy/`. Thay đổi này chỉ đọc dữ liệu nghiệp vụ, không gửi thao tác đổi tổ chức hay lịch MCP.

Cây có tên sáu cấp, đường nối 2px dùng token `--tree-line` cho sáng/tối. Nội dung rộng cuộn bên trong khung, không làm tràn toàn trang trên điện thoại. Giữ khung xám, phông chữ, biểu mẫu giữa màn hình và các thành phần dùng chung. Không sửa danh mục, ảnh, giá hay đơn vị sản phẩm.

## Kiểm chứng

- Frontend: 21 unit tests; architecture/format/build.
- Backend Java 25: `verify` chạy 194 mục, 97 pass và 97 mục MySQL có điều kiện skip trong lượt mặc định; không có failure/error. Chạy riêng `RouteMcpMySqlTest` trên MySQL 8.4: 9/9 pass.
- Production JAR với database kiểm tra riêng: 18 integration checks, 13 nhóm design checks, MCP từ NSX đến Sales, giữ lịch sử khi thay người, ba kích thước màn hình và reduced motion.
- `scripts/hierarchy-check.mjs`: sáu cấp, thêm miền Bắc cho NPP đã có miền Nam qua biểu mẫu, NPP đọc được hai miền, chặn bỏ cấp, đường nối và thu/mở cây.
- Sao lưu trước sửa bản local: `artifacts/backups/before-distribution-hierarchy-20261116-005546/`. Biên bản và đối chiếu dữ liệu: `artifacts/hierarchy/`.

Bản local: sáu tuyến hiện hữu đã được phân vùng bằng API; route stops, kế hoạch tuần, lượt ghé, Sales, cửa hàng, SKU/UOM, kho, sổ công nợ và hóa đơn không đổi. Đối chiếu ngay sau phân vùng khớp hoàn toàn. Trong lượt kiểm tra cuối sau 01:00, tác vụ `nightly-reconcile` có sẵn chuyển ba đơn nhập 13/16/18 từ RECEIVED sang RECONCILED, tăng version/timestamp; audit ghi “Đối soát đêm theo nhận thực tế”. Không sửa hoặc hoàn tác tác vụ đó. Bằng chứng ngoại lệ: `artifacts/hierarchy/preservation-nightly-reconciliation.json`; mọi trường khác trong bộ đối chiếu vẫn khớp. Không có thao tác tự xác nhận đã nhận hàng.

Tài khoản NPP mặc định vẫn bị chặn chức năng ghi tuyến theo quyền hiện tại. Không tự cấp thêm quyền cho tài khoản khi sửa cấu trúc; cấu hình từ NSX, Sales nhận lịch qua API hiện hữu. Kiểm tra giao diện NSX/NPP và đối chiếu 12 thẻ sản phẩm: 57 trường hợp về khung xám, text, hình ảnh/giá/đơn vị và responsive đạt.

Trình duyệt Sales xác minh API/web dùng chung. Chưa kiểm trực tiếp iOS trong lượt này; không thay mã native hay cấu hình kết nối IPA.
