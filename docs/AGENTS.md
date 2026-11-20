# AGENTS.md — SYNERA

Hướng dẫn làm việc trong repo SYNERA. Khi sửa tính năng đang chạy hoặc thêm tính năng, hãy lần theo code hiện tại, tái sử dụng những phần phù hợp và giữ trải nghiệm nhất quán giữa các màn hình.

## Trước khi sửa

1. Xem `git status --short` và phần diff liên quan để nhận diện các thay đổi đang làm dở. Giữ các chỉnh sửa của người khác.
2. Tìm màn hình hoặc luồng gần nhất với yêu cầu. Lần từ route, layout và component đến xử lý dữ liệu, API, phân quyền và database nếu có liên quan. Đọc test và cấu hình hiện hành để xác định hành vi được kỳ vọng.
3. Xác định phần nào đã có thể dùng lại và phần nào thực sự thiếu. Tìm cả tên nghiệp vụ, tên hiển thị và tên kỹ thuật để tránh bỏ sót logic nằm ở module khác.
4. Dùng yêu cầu của task để xác định hành vi cần thay đổi. Code, test và cấu hình đang được repo sử dụng là căn cứ để hiểu cách hệ thống vận hành. Khi các nguồn này mâu thuẫn, lần theo luồng thực tế và nêu điểm chưa xác minh nếu nó ảnh hưởng đến kết quả.

## Kế thừa code đang có

- Sửa qua route và luồng chính mà người dùng đang sử dụng. Ưu tiên mở rộng component, hook, service, lớp gọi API và quy tắc nghiệp vụ hiện hữu khi chúng phù hợp.
- Một quy tắc dùng ở nhiều nơi nên có một chỗ xử lý chung. Ví dụ, quyền thực hiện thao tác và cách chuyển trạng thái đơn cần dùng cùng quy tắc ở các màn hình liên quan. UI chỉ hiển thị quyền theo cơ chế đã có, còn backend vẫn kiểm tra quyền khi xử lý yêu cầu.
- Giữ tương thích với dữ liệu cũ và các màn hình đang dùng chung API hoặc component. Nếu buộc phải đổi hợp đồng API, trạng thái hoặc schema, cập nhật các bên sử dụng và xử lý dữ liệu cũ trong cùng thay đổi.
- Với luồng có ghi dữ liệu, kiểm tra trường hợp lỗi giữa chừng, bấm gửi lại hoặc nhiều người thao tác cùng lúc khi chúng có thể xảy ra. Tái sử dụng cơ chế lưu và kiểm tra đã có trong repo.
- Giới hạn thay đổi ở phạm vi cần thiết. Tránh viết lại cả module, thêm thư viện, tạo màn hình song song hoặc chỉnh lại các phần ngoài task chỉ để đồng bộ hình thức.

## Đồng bộ giao diện toàn web

- **Chọn màn hình tham chiếu.** Dùng màn hình đã được duyệt hoặc mẫu đang dùng chung trong repo có cùng mục đích. Nếu có nhiều kiểu, ưu tiên mẫu gắn với layout và bộ component dùng chung. Đối chiếu theo loại màn hình, chẳng hạn danh sách với danh sách, form với form, trang chi tiết với trang chi tiết.
- **Dùng chung khung trang.** Các màn hình nghiệp vụ dùng layout SYNERA hiện có, gồm sidebar, header, vùng nội dung và cách đặt tiêu đề, bộ lọc, hành động chính. Landing page và đăng nhập có thể giữ layout riêng theo mục đích, đồng thời dùng nhận diện thương hiệu đã chốt.
- **Lấy thông số từ theme.** Dùng màu, font, cỡ chữ, khoảng cách, bo góc, viền, bóng và breakpoint từ theme, biến CSS hoặc cấu hình chung đang có. Nếu thiếu một giá trị cần dùng chung, bổ sung ở nguồn định dạng chung thay vì tự đặt riêng từng trang.
- **Dùng lại thành phần tương tác.** Ưu tiên bộ nút, input, select, bảng, phân trang, badge, dialog, drawer, toast và icon đang dùng. Nếu component chung thiếu một biến thể thực sự cần thiết, mở rộng nó và kiểm tra các màn hình đang gọi.
- **Giữ nhất quán về từ ngữ và trạng thái.** Cùng một trạng thái nghiệp vụ dùng cùng nhãn và màu trong danh sách, trang chi tiết và báo cáo. Giữ cách đặt tên vai trò, hành động, ngày và số liệu theo chuẩn hiện có. Dùng chung cách hiển thị đang tải, trống, lỗi, thành công, vô hiệu hóa và thiếu quyền.
- **Kiểm tra trên màn hình thực tế.** Hành động chính phải dễ tìm. Form có nhãn và thông báo lỗi rõ. Kiểm tra hiển thị desktop và mobile, cuộn bảng, menu, thao tác bàn phím và focus ở những phần bị ảnh hưởng.

Nếu task yêu cầu đồng bộ nhiều màn hình đang lệch nhau, kiểm kê các khác biệt trước. Chốt mẫu chung rồi ưu tiên sửa theme, layout hoặc component dùng chung để các màn hình nhận thay đổi từ cùng một nguồn. Xem lại từng màn hình bị ảnh hưởng sau khi sửa.

Ví dụ, khi thêm màn hình **Đơn chờ giao**, mở từ sidebar và layout hiện có. Lấy bảng, bộ lọc và badge từ màn hình đơn hàng gần nhất. Dùng dữ liệu và trạng thái từ luồng đơn đang chạy. Chỉ bổ sung các phần cần riêng cho danh sách chờ giao.

## Trước khi bàn giao

- Rà diff để phát hiện thay đổi ngoài phạm vi hoặc logic, component và CSS bị lặp.
- Chạy các lệnh kiểm tra phù hợp được khai báo trong repo, như lint, typecheck, test hoặc build. Dùng đúng trình quản lý gói và các script sẵn có.
- Kiểm tra luồng người dùng qua route thực với vai trò phù hợp. Khi sửa UI, đối chiếu với màn hình tham chiếu. Khi sửa thành phần dùng chung, kiểm tra thêm ít nhất một màn hình khác đang dùng thành phần đó nếu có thể.
- Báo ngắn gọn phần đã sửa, phần đã tái sử dụng, kết quả kiểm tra và các mục chưa kiểm tra được.
