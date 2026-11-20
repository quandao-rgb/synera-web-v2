# Sidebar, tổ chức bán hàng và lịch MCP — 15/11/2026

Yêu cầu trực tiếp, ảnh và làm rõ của người dùng là nguồn cho phần mở rộng này. Giữ luồng đặt đơn, xuất kho, công nợ hiện có; không đưa đề xuất NPP trả phí vào phạm vi.

## Điều hướng và giao diện

NSX/NPP dùng chung `SidebarSections`, lọc quyền từng liên kết, chọn đúng pathname/query. Nhóm mở menu con; rail thu gọn dùng menu nổi, điện thoại dùng drawer. Bỏ hàng liên kết công việc trên đầu nội dung và các tab chính Mạng lưới/CRM đã chuyển vào sidebar; giữ tab trạng thái và chi tiết hồ sơ.

Bốn ô công việc dùng `WorkLane`, cùng spacing, shadow, hover/press và reduced motion. NSX giữ điều hướng; NPP giữ chọn hàng chờ. Nút xử lý đơn và phần đầu hàng chờ dùng class chung.

## Tổ chức và lịch tuần

- Cây hỗ trợ Khối kinh doanh, Chi nhánh, Miền, Tỉnh/TP, Khu vực, Vùng bán hàng: thêm cấp con, sửa cha, thu/mở nhánh, mở tuyến. Giữ công ty gốc; không tự mở rộng đa hãng. Ghi cây có khóa và chặn vòng lặp.
- Mỗi tuyến thuộc một NPP. Đơn vị của tuyến phải trong phạm vi cấp quyền, cùng công ty và cùng miền/toàn quốc; không gắn vào NPP khác.
- Chọn **tuần cụ thể thứ Hai–Chủ nhật** rồi phân từng ngày. Có sao chép tuần trước vào bản đang chỉnh để kiểm tra rồi lưu. Không tự suy ra chu kỳ 4 tuần hoặc tuần trong tháng.
- Chọn Sales, ngày hiệu lực, thứ tự điểm bán và ngày ghé. Lưu tạo `visit` thực; mobile đọc `/visits/today`. Tuần chưa phân không tự lấy lịch tuần trước.
- Tuyến cũ giữ `RECURRING` tới khi lưu MCP; tuyến MCP dùng `WEEKLY`, scheduler cũ không tạo thêm. Lượt tuần khác được giữ nguyên.
- Chỉ thay đổi/hủy lượt chưa bắt đầu từ ngày hiệu lực trong tuần chọn. Giữ người thực hiện/giờ vào/ra của lượt đang ghé/đã hoàn thành. Người cũ có thể kết thúc lượt đang ghé; người nhận tuyến thấy ngữ cảnh mờ, chỉ xem.
- Phân Sales trong tuần không đổi toàn bộ chủ sở hữu điểm bán hoặc tuyến gốc. Quyền tác nghiệp bổ sung chỉ cho điểm có lượt chưa ghé/đang ghé của chính Sales hôm nay. Ngữ cảnh lịch sử không cấp quyền hồ sơ điểm bán.
- `CANCELLED` không xuất hiện trong công việc hôm nay/báo cáo kế hoạch. Version, idempotency, khóa ghi chống ghi đè/trùng lượt.
- Polling/focus không ghi đè form MCP đang chỉnh. Version dùng lúc nạp form; xung đột phải tải lại. Đổi tuần khi chưa lưu có cảnh báo.

## API và mobile

Migration cộng thêm V121: route.organization_id/schedule_mode, visit.route_id/sequence_no/handover_to_rep_id, route_week_plan; không reset dữ liệu.

`POST /routes/weekly`: nppId, repId, name, organizationId, storeIds. `GET /routes/{id}/mcp?weekStart=YYYY-MM-DD`: route/version, assigned rep, entries, actual visits, holidays. `POST` cùng path: weekStart, effectiveFrom, repId, organizationId, version, entries [{storeId,sequence,weekdays:[1..7]}]; ROUTE_WRITE + Idempotency-Key. Giữ API tạo/lập lịch tuyến cũ.

Visit DTO giữ trường cũ, thêm routeId, sequence, checkedOutAt, readOnly, performedBy, tham chiếu điểm bán đã scope. Client mobile v6 thêm hiển thị mờ/chỉ xem. IPA cập nhật JS trong native container unsigned v3, native module không đổi; vẫn cần ký/cài và nghiệm thu iPhone thật.

## Kiểm chứng

`RouteMcpIntegrationTest`: 6 ca. `RouteMcpMySqlTest`: cùng 6 ca trên MySQL 8.4 cô lập, gồm retry/idempotency, stale version, quyền, cây nhiều cấp/vòng lặp/khác miền, tuần độc lập, bàn giao lượt hoàn thành/đang ghé.

`scripts/mcp-ui-check.mjs` chỉ chấp nhận runtime cô lập 8091. Kiểm NSX → MCP → Sales, sao chép tuần, ngữ cảnh lịch sử, sidebar ba kích thước, query CRM, style chung và reduced motion. Bằng chứng ở `artifacts/mcp/`. Web preview không thay thế kiểm GPS/SQLite/SecureStore trên iPhone.

Kết quả hoàn tất: Java verify 186 ca được phát hiện, 92 chạy đạt và 94 ca cần môi trường riêng được skip theo cấu hình; MCP MySQL chạy riêng 6/6 đạt. Frontend 16/16, design checks đạt, e2e 18/18, mobile 33/33, TypeScript/Expo dependency check/web export/iOS Hermes99 export đạt. Expo web preview xác nhận 1 lượt hoàn thành mờ/chỉ xem và 2 lượt còn lại thao tác được.

Bản chính đã sao lưu tại `artifacts/backups/before-mcp-20261115-141050/` trước khi lên V121. So sánh số dòng trước/sau: bảng nghiệp vụ cũ không đổi, thêm bảng route_week_plan rỗng; chỉ migration/job log tăng. Kiểm HTTPS thực xác nhận giữ 9 cửa hàng, 5 lượt PLANNED hôm nay và 3 đơn trị giá 297.000đ.

IPA bàn giao: `output/ios/SYNERA-Sales-v6-MCP-Internet-unsigned.ipa`, build 6, SHA256 `261875f11f6ef2d7ebb27dc58153741345bcec02f77ed9b0e621994e32df185c`; native executable giữ nguyên, ZIP CRC và assets đạt. Origin mới `https://revised-charlie-tony-reform.trycloudflare.com` đã kiểm đăng nhập/đọc API. Tunnel tạm thời phụ thuộc máy/gateway; app giữ cấu hình endpoint cũ thì cần đổi trong Cấu hình máy chủ. Chưa có nghiệm thu cài/ký Sideloadly trên iPhone thật.
