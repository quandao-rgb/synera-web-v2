import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Brand } from '../../shared/Brand';
import { api, browserSession } from '../../shared/api';
import { useStore } from '../../shared/store';
import { useApi } from '../../shared/hooks/useApi';
export default function Login() {
  const { completeLogin, sessionError } = useStore();
  const navigate = useNavigate();
  const config = useApi<{ localMode?: boolean; sharedTestMode?: boolean }>('/public/config', {});
  const [step, setStep] = useState('login'),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [otp, setOtp] = useState(''),
    [challenge, setChallenge] = useState(0),
    [localOtp, setLocalOtp] = useState(''),
    [resetToken, setResetToken] = useState(''),
    [replacement, setReplacement] = useState(''),
    [error, setError] = useState(''),
    [info, setInfo] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (step === 'forgot') {
        const result = await api<{ localResetToken?: string }>('/auth/forgot-password', {
          body: { username },
        });
        setResetToken(result.localResetToken || '');
        setStep('reset');
        setInfo('Nếu tài khoản hợp lệ, hướng dẫn khôi phục đã được gửi.');
        return;
      }
      if (step === 'reset') {
        await api('/auth/reset-password', {
          body: { token: resetToken, newPassword: replacement },
        });
        setStep('login');
        setInfo('Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
        setPassword('');
        return;
      }
      const result = await browserSession(
        step === 'otp' ? 'otp' : 'login',
        step === 'otp' ? { challengeId: challenge, code: otp } : { username, password },
      );
      if (result.requiresOtp) {
        setChallenge(result.challengeId || 0);
        setLocalOtp(result.localOtp || '');
        setStep('otp');
        return;
      }
      await completeLogin(result);
      navigate(result.user?.role === 'SALES' ? '/sales' : '/dashboard', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <a className="auth-home-link" href="#/landing">
        <ArrowLeft size={16} /> Trang giới thiệu
      </a>
      <section className="auth-story">
        <a className="brand" href="#/landing" aria-label="SYNERA · Trang giới thiệu">
          <Brand />
        </a>
        <div className="auth-message">
          <h1>
            Vận hành đồng bộ
            <br />
            <span>Tăng trưởng bền vững</span>
          </h1>
          <p>
            Kết nối đơn hàng · Kho hàng · Vận chuyển · Khách hàng
            <br />
            Trên một nền tảng duy nhất
          </p>
        </div>
      </section>
      <section className="auth-form-area">
        <div className="auth-form">
          <a className="auth-card-brand" href="#/landing" aria-label="SYNERA · Trang giới thiệu">
            <Brand />
          </a>
          <h2>
            {step === 'login'
              ? 'Chào mừng trở lại'
              : step === 'otp'
                ? 'Xác nhận OTP'
                : step === 'forgot'
                  ? 'Khôi phục mật khẩu'
                  : 'Đặt mật khẩu mới'}
          </h2>
          <p>
            {step === 'login'
              ? 'Đăng nhập để tiếp tục quản lý cơ sở của bạn.'
              : step === 'otp'
                ? 'Nhập mã xác thực để hoàn tất đăng nhập.'
                : step === 'forgot'
                  ? 'Nhập email tài khoản để nhận hướng dẫn khôi phục.'
                  : 'Nhập mã khôi phục và mật khẩu mới của bạn.'}
          </p>
          <form className="stack" onSubmit={submit}>
            {step !== 'otp' && step !== 'reset' && (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="vd: admin@synera.vn"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
            )}
            {step === 'login' && (
              <label>
                Mật khẩu
                <div className="password-input">
                  <input
                    required
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {step === 'otp' && (
              <>
                <label>
                  Mã OTP
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="VD: 123456 (6 chữ số)"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </label>
                {localOtp && (
                  <p className="info-box">
                    {config.data.sharedTestMode ? 'Mã kiểm thử' : 'Mã local'}:{' '}
                    <strong>{localOtp}</strong>. Chỉ dùng trong môi trường kiểm thử, không phải OTP
                    gửi qua email.
                  </p>
                )}
              </>
            )}
            {step === 'reset' && (
              <>
                <label>
                  Mã khôi phục
                  <input
                    required
                    value={resetToken}
                    placeholder="Dán mã khôi phục được cấp"
                    onChange={(e) => setResetToken(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Mật khẩu mới
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={200}
                    autoComplete="new-password"
                    placeholder="Ít nhất 12 ký tự"
                    value={replacement}
                    onChange={(e) => setReplacement(e.target.value)}
                  />
                </label>
              </>
            )}
            {(error || sessionError) && (
              <p className="form-error" role="alert">
                {error || sessionError}
              </p>
            )}
            {info && <p role="status">{info}</p>}
            <button
              className="btn primary"
              disabled={busy}
              aria-label={step === 'login' || step === 'otp' ? 'Tiếp tục đăng nhập' : undefined}
            >
              {busy
                ? 'Đang xử lý...'
                : step === 'forgot'
                  ? 'Gửi yêu cầu khôi phục'
                  : step === 'reset'
                    ? 'Đổi mật khẩu'
                    : step === 'otp'
                      ? 'Xác nhận OTP'
                      : 'Đăng nhập'}
              <ArrowRight size={16} />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setStep(step === 'login' ? 'forgot' : 'login');
                setError('');
              }}
            >
              {step === 'login' ? 'Quên mật khẩu?' : 'Quay lại đăng nhập'}
            </button>
          </form>
          {step === 'login' && (
            <p className="auth-register">
              Chưa có tài khoản?{' '}
              <a href="mailto:synera.suz26@gmail.com?subject=Đăng%20ký%20SYNERA">Đăng ký SYNERA</a>
            </p>
          )}
          <div className="auth-support">
            <p>Cần hỗ trợ đăng nhập?</p>
            <div>
              <a href="mailto:synera.suz26@gmail.com">synera.suz26@gmail.com</a>
              <a href="tel:0345666888">0345 666 888</a>
            </div>
          </div>
          {config.data.sharedTestMode && (
            <div className="auth-demo-note">
              Bản chia sẻ kiểm thử. Các tài khoản dùng chung dữ liệu theo phân quyền; OTP hiển thị
              để kiểm thử. Tệp tải lên chưa được quét mã độc.
            </div>
          )}
          {config.data.localMode && (
            <details className="auth-demo-note auth-local-note">
              <summary>Thông tin môi trường local</summary>
              <span>
                Local: admin@synera.local / npp@synera.local / sales@synera.local. Mật khẩu được cấu
                hình khi khởi tạo; mặc định SyneraDevOnly2026!.
              </span>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
