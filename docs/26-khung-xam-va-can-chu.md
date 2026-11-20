# Khung xám và căn chữ NSX/NPP — 16/11/2026

Nguồn: yêu cầu và năm ảnh người dùng gửi về nhập Excel, cây tổ chức, hỗ trợ, chuyến giao và giao bù. Làm rõ tiếp theo: phần sản phẩm hiện tại đã ổn, giữ nguyên.

## Thay đổi hiển thị

- Header khung/bảng, nhóm báo cáo và các ô tổng quan dùng xám nhạt `--surface-muted` thay xanh, tím, vàng theo module. Cùng hệ chữ và token cho NSX/NPP. Giữ màu trạng thái, cảnh báo và nút hành động; chúng biểu thị ý nghĩa thao tác/trạng thái.
- Toolbar trong Panel dùng cùng khoảng đệm 20px cho cả hai vai trò. Sửa lỗi NSX không được áp dụng padding vốn chỉ có selector NPP. Thanh nhập Excel co giãn và xuống dòng, giữ các nút trong khung.
- Cây tổ chức có tiêu đề xám với padding rõ ràng. Bỏ margin dọc thừa ở nhóm Mở rộng/Thu gọn, không để tiêu đề sát mép và trôi trong vùng trắng lớn.
- Nội dung ô bảng, đoạn chính sách và phần chi tiết dài được xuống dòng, không bị ép `white-space: nowrap`. Giữ căn phải số tiền. Tên loại danh mục dùng tiếng Việt, giữ nguyên mã API.

## Phần sản phẩm được giữ nguyên

Không thay dữ liệu, ảnh, thẻ sản phẩm, bộ lọc, quy cách, giá, chọn số lượng, giỏ hoặc cách phân trang kho. Đã đối chiếu hai vai trò với bản đang chạy trước cập nhật: đủ 12 thẻ, cùng ảnh/tên/mã/giá, tập quy cách, giá trị số lượng và cấu trúc thẻ. Không có chế độ danh sách gọn trong bản bàn giao.

## Kiểm tra và giới hạn

- Kiến trúc, định dạng, 19 unit test và production build đạt; package JAR chỉ để chứa frontend, không sửa Java/schema/API.
- 13 nhóm `test:design` đạt, gồm sidebar, bảng, tìm SKU, desktop/tablet/mobile, focus và reduced motion.
- 57 trường hợp theo vai trò/màn/chiều rộng trong `scripts/gray-consistency-check.mjs`: header cùng xám; không có chữ tiêu đề/nội dung chính sách bị cắt, thiếu padding hoặc tràn trang trong các trường hợp đã kiểm tra. Kiểm tra sản phẩm đối chiếu bản trước và thao tác giỏ chỉ nằm trong bộ nhớ trình duyệt, không gửi đơn.
- Quét thêm 37 route/view ở ba chiều rộng 1440/900/390px, tổng 111 lượt, sau khi dữ liệu tải xong. Không phát hiện tràn ngang trang hoặc các lỗi text/toolbar mà bộ quét nhận diện. Cây tổ chức và báo cáo rộng vẫn cuộn trong vùng riêng theo thiết kế; không biến phần bị cuộn ra ngoài viewport thành dữ liệu bị mất.
- Đã xem ảnh chụp Edge thực tế và kiểm tra lại bản chính cổng 8080. Kết quả/ảnh tại `artifacts/gray-review/`, bản đối chiếu sản phẩm tại `products-before.json`. Các kết quả tự động là phạm vi đã kiểm tra, không khẳng định mọi dữ liệu dài hoặc mọi trạng thái tương lai đều đã được phủ.

Backup trước cập nhật: `artifacts/backups/before-gray-text-20261116-000403/`, có SQL và JAR cũ. Không tạo/xóa/chỉnh dữ liệu nghiệp vụ để kiểm tra; schema chính giữ V121.
