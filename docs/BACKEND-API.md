# Hợp đồng API SYNERA

NPP gom đơn/phân phối tồn 16/11/2026, hiện chỉ nghiệm thu local:
`GET /delivery-trips/ready?nppId=` trả đơn SELL_OUT PICKING chưa có chuyến chưa hủy,
kèm hồ sơ điểm bán. `POST /delivery-trips` giữ hợp đồng cũ, bổ sung khóa đơn chống gán trùng
và kiểm ngày chuyến không muộn hơn expectedDelivery (đơn quá hẹn phải giao hôm nay).
`GET /inventory/redistribution?warehouseId=` trả asOf/lookbackDays/lots, mỗi lô có tồn khả dụng,
days/daily/expectedSold/surplus/expired và buyers từng thực nhận SKU; lượng đã quy đổi đơn vị cơ sở.
Cả hai GET cần WAREHOUSE_WRITE và scope NPP/kho. Không có side effect đọc, không migration mới.
Ghi liên hệ, báo giá nháp và chấp nhận báo giá tiếp tục dùng interactions/quotations hiện có.
[Chi tiết và giới hạn dự báo](npp-portal/16-tich-hop-that-local.md).

Chia sẻ test 16/11/2026: `GET /health` công khai trả `{service:"SYNERA Sales API",ready:true}` khi
health UP, 503/ready=false khi DOWN; không lộ datasource. `/public/config` bổ sung `sharedTestMode`
để UI ghi nhãn OTP thử nghiệm và không quảng bá credential local. Các API `/api/v1` giữ contract/quyền.

Phân tuyến 16/11/2026: `POST /routes/{id}/organization` nhận `{organizationId,version,reason}`, cần `ROUTE_WRITE` và `Idempotency-Key`. Chỉ đổi vùng thuộc đúng NPP, không tái tạo lượt ghé. `/organizations/nodes` chỉ tạo `REGION → PROVINCE → SALES_REGION` dưới NPP; tạo NPP qua `/organizations`. Một NPP có nhiều miền; cùng miền có nhiều NPP. [Chi tiết](27-cay-phan-tuyen-theo-npp.md).

Trợ lý nhập hàng 15/11/2026: `/catalog/order-assistance` vẫn nhận scope/text, giữ lines/unresolved và thêm suggestions cho các sản phẩm gần nhau; chỉ trả SKU/UOM/lượng từ offerings đã cấp, không tạo đơn hoặc giá. [Quy tắc xếp hạng và xác nhận](24-de-su-dung-va-du-lieu.md#trợ-lý-nhập-hàng).

Mở rộng ngày 15/11/2026: [Tuyến MCP theo tuần và DTO bàn giao](23-sidebar-va-mcp.md#api-và-mobile). Các API tuyến cũ vẫn tương thích.

## Cập nhật sửa lỗi nghiệm thu 14/11/2026

- `POST /sell-in-orders/{id}/confirm` và `POST /sales-orders/{id}/confirm` hỗ trợ thêm `expectedDelivery` dạng `YYYY-MM-DD`, tùy chọn. Ngày không được trước ngày nghiệp vụ hiện tại; lưu/đọc cùng đơn, không đổi bước trạng thái hay phép tính giá/tồn. Client cũ bỏ trường này vẫn dùng được.
- `POST /tickets` nhận `orderChannel` tùy chọn (`SELL_IN` mặc định hoặc `SELL_OUT`). Đơn/dòng phải tồn tại, đúng NPP/kênh; dòng phải thuộc đơn, cửa hàng/nhân viên phải đúng phạm vi nếu áp dụng. Trả 404 cho liên kết không thuộc scope; 422 cho line không có order/kênh không hợp lệ. Ticket không gắn đơn vẫn được dùng cho yêu cầu chung.
- Ticket `DELIVERY_SHORT` không chuyển `RESOLVED/CLOSED` khi còn thiếu hoặc còn chờ kết quả báo khách/đối soát. Chứng từ giao bù và phản hồi khách tiếp tục qua API hiện có, không tự sửa tiền/tồn bằng nút đổi trạng thái ticket.
- `receipt-auto-enabled` chỉ cho giá trị 0; worker quá hạn chỉ nhắc, không tự ghi nhận đủ kể cả dữ liệu cấu hình cũ là 1. Dữ liệu `AUTO_RECEIVED` lịch sử không bị xóa/đổi.
- Báo cáo ngày loại đơn hủy khỏi số đếm, thống nhất với `sales-orders/summary`; `amount` vẫn là giá trị đơn không hủy, không đổi thành doanh số thực nhận.

Cập nhật portal NPP 12/11/2026: V119 bổ sung `/sales-replacements` (đề xuất, duyệt độc lập, xuất, thực nhận, hủy, báo khách), `/catalog/order-assistance` và routing thông báo OrderCreated/SalesOrderUpdated/Replacement. Ba client dùng chung trạng thái/số lượng. Xem [hợp đồng liên ứng dụng](npp-portal/04-backend-dong-bo.md); `expectedStatus` bắt buộc khi ghi customer-feedback.

Base local: http://127.0.0.1:8080/api/v1. OpenAPI phát sinh từ code tại /v3/api-docs, Swagger /swagger-ui.html (local; tắt mặc định prod). Danh sách method/path chính xác được sinh tại [BACKEND-ENDPOINTS.md](BACKEND-ENDPOINTS.md). DTO/validation và OpenAPI là hợp đồng chi tiết; tài liệu này là bản đồ endpoint. FE hiện đọc/ghi các API này.

13/11: `GET /sales-replacements` nhận `orderId` tùy chọn, kiểm scope đơn và lọc tại database. Task gốc sell-out dùng reference `SALES_DELIVERY_SHORT`, hoàn tất sau cả hàng lẫn báo khách; giữ tương thích task cũ có căn cứ. Hai cầu nối app dùng cùng policy full `/api/v1`. Chi tiết và kiểm thử ở [12](npp-portal/12-cau-noi-va-dong-viec-sau-ban.md).

## Quy ước giao dịch và lỗi

Web NSX 13/11: `GET /manufacturer/network?from=&to=` tổng hợp dữ liệu qua Facade có scope; `GET /manufacturer/npps/{id}/360` hồ sơ NPP. Chỉ actor NSX có REPORT_READ, phạm vi vùng giữ ở server. Installation nhiều NSX bị từ chối 409 cho tới khi có ownership/grants; không coi đây là multi-brand isolation hoàn chỉnh. Đơn đang chờ quyết định nằm ở `pendingSellIn` độc lập kỳ; `sellIn`/`sellOut` theo ngày tạo trong kỳ; tồn hiện tại theo lô/đơn vị. Chi tiết [NSX](nsx-portal/01-nguon-va-man-hinh.md).

13/11/2026: `reason` là tùy chọn, thiếu/null được chuẩn hóa rỗng; ghi chú giao hàng `note` không bắt buộc. Giữ mọi ràng buộc quyền/trạng thái/số lượng; nhận thiếu không lý do vẫn tạo hồ sơ từ số liệu thực tế. `SalesOrderUpdated` phục vụ trạng thái và thông báo Sales. Chi tiết: [đơn và thông báo](npp-portal/14-don-hang-va-thong-bao.md).

Response JSON: `{"success":true,"data":{},"error":null}`. Lỗi gồm error.code/message/details và X-Request-ID. HTTP 400 cấu trúc/validation, 401 xác thực, 403 thiếu quyền, 404 ngoài scope/không có, 409 xung đột/trùng key/lock, 422 nghiệp vụ, 429 giới hạn, 503 adapter chưa sẵn sàng.

Bearer access token và Idempotency-Key UUID cho lệnh tạo/chuyển chứng từ. Retry giữ key và body; dùng cùng key cho nội dung/thao tác/workspace khác trả 409. Kết quả thành công lưu snapshot. Auth/đọc thông báo/hoàn thành task có quy tắc riêng. Tiền BigDecimal 2 số lẻ; quantity cơ sở tối đa 3 số lẻ; FE không gửi giá để ép server quyết toán.

## Auth browser và workspace

- POST /auth/session/login `{username,password}`; nếu requiresOtp, POST /auth/session/otp `{challengeId,code}`.
- POST /auth/session/refresh dùng cookie HttpOnly synera_refresh, không cần gửi bearer cũ. JWT 15 phút, refresh rotate 7 ngày.
- POST /auth/session/workspace `{workspaceKey}` có bearer; GET /auth/session/workspaces liệt kê grant đã cấp. Một workspace cho mỗi request, không gộp quyền khác NPP.
- POST /auth/session/logout thu hồi phiên qua cookie; POST /auth/password đổi mật khẩu; /auth/forgot-password và /auth/reset-password cho khôi phục.
- Session endpoints kiểm Origin đúng allowlist và header X-Session-Request: synera; cookie SameSite Strict, Secure ở prod; response không trả refresh token JSON.
- GET /auth/me trả role, nppId/region, authorities và workspaceKey. Quyền được kiểm lại từ DB, thay grant/mật khẩu thu hồi token/refresh.

REST client ngoài browser vẫn có /auth/login, /auth/otp/verify, /auth/refresh, /auth/logout. Không lưu token LocalStorage/Service Worker. Local có localOtp/localResetToken; production không trả các trường đó. /public/config báo chế độ local để UI ghi nhãn đúng.

## Bản đồ endpoint

Sales mobile có `GET /sales-orders/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`: chỉ role SALES có REPORT_READ, chỉ số liệu actor và NPP của workspace hiện tại; không nhận ID nhân viên/NPP do client chọn. `orderCount`/`orderValue` tính đơn không huỷ theo ngày tạo ở Asia/Ho_Chi_Minh. `receivedSales` dùng lại `SalesFacade.deliveredInPeriod`: ngày giao, lượng thực nhận và chiết khấu dòng, có làm tròn BigDecimal như báo cáo hiện có. Response có `layer`, `generatedAt`, `from`, `to`, `repId`. Endpoint chỉ đọc, không migration hoặc thay đổi quy trình giá/đơn/tồn/công nợ.

| Module | Endpoint chính |
|---|---|
| IAM | /admin/users, /admin/roles, /admin/users/{id}/workspaces, /admin/audit, /admin/jobs, /admin/outbox, /admin/parameters, /admin/workflows; /staff |
| Danh mục | /organizations, /organizations/tree, /organizations/{id}, /catalog/skus, /catalog/skus/{id}/units, /warehouses, /stores; /catalog/references?kind= và /{id}/members |
| Excel | /imports/template.xlsx?kind=STORE hoặc SKU hoặc STOCK; POST /imports?kind=STORE&preview=true hoặc preview=false, multipart file và Idempotency-Key |
| Giá | /catalog/offerings?nppId=&storeId=, /pricing/quote, /pricing/prices; /policies, /policies/{id}/conditions, /targets, /publish |
| Policy documents | /policy-documents, /{id}/publish, /{id}/acknowledge; nội dung/attachment giữ snapshot |
| Sell-in | /sell-in-orders, /{id}; action /submit, /approve, /confirm, /ship, /dispatch, /delivered, /receipt, /reconcile, /close, /cancel, /reorder, /need-info, /resubmit, /reject |
| Công nợ | /credit, /credit/{nppId}/ledger, /invoices, /limit, /temporary-limit, /terms; /credit/payments |
| Kho | /inventory/balances?warehouseId=, /receipts, /stocktakes, /stocktakes/{id}/approve, /transfers, /movements |
| Giao/hoàn | /delivery-trips, /delivery-trips/{id}, /dispatch, /stops/{stopId}/deliver; /returns, /{id}/approve, /{id}/receive |
| Chốt kỳ | /closing/periods, /{id}/transition, /{id}/snapshots, /closing/exceptions, /closing/adjustments, /{id}/approve; /operations/alerts, /{id}/acknowledge |
| Kế hoạch | /demand/plans, /{id}/transition; /demand/sell-out; /demand/replenishment?nppId=&lookbackDays=30&coverDays=14 |
| CRM | /leads, /{id}/transition, /stores/{id}/360, /stores/{id}/360/{section}?page=&size=, /appointments, /{id}/complete, /interactions, /quotations, /{id}/transition (ACCEPTED tạo đơn), /campaigns, /{id}/launch, /{id}/progress, /stock-surveys; GET /stores/{id}/stock-surveys |
| Tuyến | /routes, /{id}/plan, /visits/today, /visits/{id}/check-in, /check-out, /handovers, /sales/daily-report |
| Sell-out/offline | /sales-orders, /{id}, /{id}/confirm, /ship, /dispatch, /receipt, /cancel; /sales-orders/sync |
| Ticket | /tickets, /{id}/transition, /{id}/comments, /{id}/assign |
| Trade | /trade/budgets, /trade/requests, /{id}/decide, /{id}/settle, /trade/settlements, /trade/feedback |
| Hiệu suất | /performance/targets?periodId=, /targets/{id}/payout, /performance/payouts |
| Trưng bày | /display-audits/criteria, /display-audits, /{id}/review; AI nội bộ theo cấu hình provider |
| Báo cáo | /reports/dashboard, /comparison, /orders.xlsx, /exports, /exports/{id}/download, /schedules, /schedules/{id}/cancel |
| Tệp/thông báo | /attachments/presign, /attachments/upload, /{id}/complete, /{id}/content; /notifications, /tasks, /approvals |

Bảng là nhóm URL; xem annotation trong OpenAPI để xác nhận method/DTO cho action. DRIVER chỉ có chuyến được phân công và bằng chứng được phép, không được đọc giá thương mại; STORE chưa có portal nên fail closed. List/ID đều phải đúng scope, không tin nppId từ FE.

## Đơn, giá và nhận hàng

Tạo sell-in: `{"nppId":2,"lines":[{"skuId":1,"uom":"THUNG","qty":5}]}`. Sell-out thêm storeId; báo giá/offerings theo storeId để áp nhóm cửa hàng. Server chọn giá nhóm cửa hàng → NPP cụ thể → nhóm NPP → chung, trong ngày hiệu lực. Cache có version DB; submit/create chốt snapshot và giữ budget/lượt dùng trong transaction.

Confirm: `{"quantities":{"<lineId>":5}}`. Receipt: `{"lines":[{"lineId":1,"received":5,"damaged":0,"returned":0}],"reason":"Nhận đủ"}`. lineId là ID dòng API trả, không phải SKU ID. Nhập kho tay phải có expiryDate thực; không đổi hạn dùng của lô đã tồn tại. Chênh lệch nhận tạo ticket/ngoại lệ, không tự giảm nợ khi chưa có chứng từ được duyệt.

Combo hiện hỗ trợ điều kiện đủ nhiều SKU/lượng cơ sở và ưu đãi phần trăm, budget và giới hạn lượt. Quà tặng tự sinh thêm dòng SKU miễn phí chưa được triển khai; không coi combo phần trăm là nghiệp vụ quà tặng.

## Offline ACK

POST /sales-orders/sync: mảng tối đa 50 item, 100 dòng/item, mỗi item `{clientId,idempotencyKey,storeId,createdAt,lines:[{skuId,uom,qty,clientPrice}]}`. Mỗi item transaction riêng; response CREATED/DUPLICATE/REJECTED/PRICE_CHANGED. Payload sai cấu trúc có thể 400 toàn request; lỗi nghiệp vụ tách theo item.

FE chỉ xóa item CREATED/DUPLICATE đúng clientId. PRICE_CHANGED giữ draft để người dùng xác nhận giá và key mới; không tự chấp nhận giá cũ. Nháp có owner/workspace để tránh gửi lẫn tài khoản. Server vẫn revalidate quyền/tồn/giá khi online; cache offline không cấp quyền ghi server.

## Upload, AI và report

Upload multipart file/nppId hoặc S3 presign/complete. 5 MB tối đa, MIME/magic/hash/ownership kiểm tra; local ghi UNSCANNED, prod bắt buộc scanner sạch. Download có xác thực và scope, không public URL.

HTTP AI request: auditId, contentType, imageBase64, criteria, Authorization bearer và Idempotency-Key display-{id}. Provider trả 200 `{score,confidence,modelVersion,findings}` hoặc 202 để callback. Callback POST `/internal/display-audits/{id}/result` nằm ngoài /api/v1, với X-Callback-Time (Unix giây), X-Callback-Event và X-Callback-Signature (HMAC-SHA256 hex). Chuỗi ký: `time.event.path.rawBody`, nối bằng dấu chấm, path chính xác như URL trên, secret AI_CALLBACK_SECRET. Chấp nhận lệch tối đa 300 giây; cùng event/body replay kết quả cũ, đổi nội dung 409. Điểm 0–100, confidence 0–1; confidence thấp cần duyệt thủ công. Local mock luôn confidence 0.

Async report trả PENDING → PROCESSING → DONE hoặc FAILED, retry tối đa 3. Chỉ chủ user/workspace có quyền REPORT_READ được tải, file hết hạn 24 giờ và chuyển EXPIRED sau cleanup. Loại SELL_IN/SELL_OUT, XLSX/PDF, khoảng tối đa 366 ngày; dữ liệu là tạm tính có timestamp, không thay snapshot chốt. Lịch DAILY/WEEKLY/MONTHLY chỉ gửi email tài khoản, quyền được kiểm lại lúc chạy. SMTP không đảm bảo exactly-once khi provider nhận rồi mất phản hồi.
