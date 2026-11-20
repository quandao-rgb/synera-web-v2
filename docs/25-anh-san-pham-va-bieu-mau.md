# Ảnh sản phẩm, lựa chọn và biểu mẫu — 15/11/2026

Nguồn nghiệm thu: yêu cầu trực tiếp và bốn ảnh người dùng gửi. Phạm vi là web NSX/NPP hiện tại, dùng API và quyền hiện hữu; không thay schema, luồng đơn hàng hoặc gói IPA.

## Thay đổi

- Sáu sản phẩm mới có ảnh minh họa loại hàng tương ứng: sữa đậu nành ít đường, bánh gạo, nước ép táo, trà chanh, nước khoáng 350ml và nước khoáng có ga 500ml. Dùng file cục bộ, cùng ánh xạ với sáu sản phẩm cũ tại `src/shared/productMedia.ts`; nguồn tải và SHA256 tại `public/assets/npp-products/sources.json`. Ảnh minh họa chưa được xác minh là bao bì chính xác của SKU. Không hiện chú thích ảnh trên thẻ.
- Trợ lý trả nhiều sản phẩm gần nhau thì hiển thị danh sách gọn gồm radio, ảnh, tên, mã và lượng/đơn vị. Bấm một dòng để chọn; tên không bị thay bằng ảnh. Chỉ một lựa chọn trong từng nhóm. Vẫn cần xác nhận thêm giỏ và xác nhận đặt hàng như trước.
- Đề xuất hỗ trợ có nút Duyệt và Từ chối riêng. Duyệt mở số tiền dương, có thể duyệt một phần trong giới hạn đề xuất; Từ chối mở lý do và nút xác nhận riêng, gửi `approvedAmount: 0` theo contract hiện có. Sau khi trạng thái kết thúc quyết định, hai nút không còn trên dòng đó. Nhãn màn NSX và liên kết dùng “Hỗ trợ thị trường”; nhãn Ticket thành “Yêu cầu xử lý”.
- `ActionForm` mặc định giữa viewport cho mọi vai trò. Form ngắn rộng tối đa 580px; form dài/bằng chứng tối đa 1150px, hai cột desktop và một cột mobile. Dùng chung header, khoảng cách, control cao 44px và motion; giữ cuộn, focus trap, Escape và khóa gửi lặp. Drawer menu không thay đổi.

## Bằng chứng kiểm tra

- `npm run check:architecture`, `npm run format:check`, 19 unit test và production build: đạt.
- `test:design`: 13 nhóm đạt; `test:e2e`: 18 kiểm tra tích hợp đạt trên MySQL kiểm thử cổng 8091.
- `scripts/product-choice-check.mjs`: hai vai trò tải đủ 12 ảnh, dòng lựa chọn có ảnh nằm ngang, chỉ chọn một sản phẩm, giỏ nhận đúng nước ép táo; form giữa màn hình ở 1440/900/390px, không tràn trang. Duyệt một phần đề xuất ID 8 không đổi ID 9, sau đó từ chối ID 9 không đổi số tiền đã duyệt ID 8. Số 0 không thể gửi từ form Duyệt. Kết quả: `artifacts/product-choice/results.json`.
- `scripts/usability-check.mjs`: giữ kiểm tra đóng một đơn không tác động đơn khác, nút đơn hoàn tất, ví dụ nhập liệu, form chính sách, báo cáo và bộ chọn sản phẩm mới; đạt.
- Rà ảnh chụp thật bằng Edge; sửa lỗi kế thừa `flex-direction: column` làm dòng lựa chọn quá cao rồi chụp và kiểm tra lại. Ảnh ở `artifacts/product-choice/`.
- Main cổng 8080 đã cập nhật, `main-smoke.mjs` xác nhận lại NSX/NPP, 12 ảnh, gợi ý có ảnh, nút tách riêng, nhãn Việt và form giữa màn hình; không ghi giao dịch nghiệp vụ vào database chính. `main-smoke.json` ghi kết quả.

## Vận hành và giới hạn

Sao lưu trước cập nhật tại `artifacts/backups/before-product-choices-20261115-225107/`, gồm SQL và JAR cũ. Schema chính vẫn V121, không cần migration. Các thao tác tạo và quyết định trong kiểm thử chỉ ghi vào database audit riêng. Không chạy lại Java verify vì không sửa mã backend; package JAR chỉ để chứa frontend mới. Các quy tắc duyệt nhiều cấp, ngân sách và quyền vẫn do backend hiện tại kiểm tra, không được thay đổi trong đợt chỉnh UI này.
