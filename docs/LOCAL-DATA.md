# Dùng lại dữ liệu local từ repo riêng tư

Mã nguồn công khai và dữ liệu gốc được lưu ở hai repo riêng. Người được cấp quyền có thể tải cả hai rồi khôi phục để chạy cùng dữ liệu trên máy của mình. GitHub lưu source/bản sao dữ liệu; nó không tự chạy backend Java hoặc MySQL.

- Source: https://github.com/quandao-rgb/synera-web-v2
- Dữ liệu riêng tư: https://github.com/quandao-rgb/synera-web-v2-data

Chủ repo dữ liệu phải cấp quyền GitHub cho người nhận. Người chỉ có source công khai vẫn chạy được dữ liệu mẫu của một máy mới.

## Khôi phục trên Windows vào máy/project mới

Cần Node.js 24, Python 3.10+, Git. Clone hai repo cạnh nhau (hoặc tải hai ZIP và giải nén tương ứng):

```powershell
git clone https://github.com/quandao-rgb/synera-web-v2.git
git clone https://github.com/quandao-rgb/synera-web-v2-data.git
cd synera-web-v2
npm.cmd install --global pnpm@11
pnpm.cmd install --frozen-lockfile
python scripts/bootstrap-backend.py
python scripts/bootstrap-mysql.py
```

**Chưa chạy `run-local.py start`**: lệnh đó tạo/migrate/seed database, trong khi bước restore yêu cầu database trống. Nếu đang có một bản SYNERA khác trên máy, dừng đúng runtime đó và dùng môi trường riêng; không chép/import đè dữ liệu cũ.

Terminal A, giữ cửa sổ chạy MySQL:

```powershell
python scripts/local-mysql.py start --lts
```

Terminal B tại root `synera-web-v2`:

```powershell
# Kiểm tra gói trước; lệnh này không sửa dữ liệu
python scripts/restore-local-data.py --bundle ../synera-web-v2-data/data --check-only
# Chỉ nhập vào database mới/trống, từ chối dữ liệu hoặc uploads đã tồn tại
python scripts/restore-local-data.py --bundle ../synera-web-v2-data/data
# Restore thành công mới build/chạy website
python scripts/run-local.py start
```

Mở http://127.0.0.1:8080. Bản dữ liệu giữ các tài khoản/quyền và mật khẩu đã băm từ local; dùng thông tin đăng nhập do chủ dữ liệu cấp riêng. Mật khẩu mẫu của repo source không thay thế mật khẩu trong database đã nhập. Phiên đăng nhập, OTP và token khôi phục cũ được để rỗng; người nhận phải đăng nhập lại.

Script kiểm hash SQL/archive, đường dẫn tệp, số bảng và hash nội dung sau nhập. Không có lệnh DROP/truncate/replace dữ liệu cũ. Nếu nhập lỗi giữa chừng, script không tự xóa dữ liệu để chạy lại: kiểm log local và dùng database đích mới/trống cho lần thử tiếp theo.

## Tạo snapshot cập nhật

Chỉ thực hiện trên instance bạn sở hữu, trong lúc app đã dừng an toàn:

```powershell
python scripts/run-local.py stop --keep-mysql
python scripts/prepare-shared-test.py --verify-local-restore
python scripts/run-local.py start --no-build
```

Gói nằm dưới `artifacts/deploy-private/<timestamp>/` (bị Git ignore). Nếu cần cập nhật bản sao trên GitHub, chỉ đưa `database.sql`, `files.tar.gz`, `manifest.json` vào **repo dữ liệu riêng tư** sau khi xác minh. Không commit dữ liệu vào repo source công khai, không mang theo `.tools`, file `.env`, key hoặc token.
