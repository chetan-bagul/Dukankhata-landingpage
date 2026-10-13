import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorDetails } from "../../api/apiError";
import BrandLogo from "../../components/common/BrandLogo";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const mobileInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const [form, setForm] = useState({
    mobile: "",
    password: "",
  });

  const [rememberMobile, setRememberMobile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [touched, setTouched] = useState({ mobile: false, password: false });
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Initialize remembered mobile or set focus
  useEffect(() => {
    const savedMobile = localStorage.getItem("dk_remember_mobile");
    if (savedMobile) {
      setForm((prev) => ({ ...prev, mobile: savedMobile }));
      setRememberMobile(true);
      passwordInputRef.current?.focus();
    } else {
      mobileInputRef.current?.focus();
    }
  }, []);

  // Validation
  const isMobileValid = /^[6-9]\d{9}$/.test(form.mobile);
  const isMobileTouchedAndInvalid = touched.mobile && !isMobileValid;
  const isPasswordTouchedAndEmpty = touched.password && !form.password.trim();

  const handleMobileChange = (e) => {
    const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, mobile: numericOnly }));
    if (errorDetails) setErrorDetails(null);
  };

  const handlePasswordChange = (e) => {
    setForm((prev) => ({ ...prev, password: e.target.value }));
    if (errorDetails) setErrorDetails(null);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    // Trigger full field validations
    setTouched({ mobile: true, password: true });

    if (!isMobileValid) {
      mobileInputRef.current?.focus();
      return;
    }

    if (!form.password.trim()) {
      passwordInputRef.current?.focus();
      return;
    }

    setErrorDetails(null);
    setSubmitting(true);

    try {
      // Save or remove remembered mobile based on user preference
      if (rememberMobile) {
        localStorage.setItem("dk_remember_mobile", form.mobile);
      } else {
        localStorage.removeItem("dk_remember_mobile");
      }

      const userData = await login({
        mobile: form.mobile,
        password: form.password,
      });

      // Target route resolution: redirect to where the user was heading, or dashboard
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      const details = getApiErrorDetails(
        err,
        "Invalid mobile number or password. Please verify your credentials or register a new store account."
      );
      if (details.message === "An unexpected error occurred." || details.status === 500) {
        details.message =
          "Incorrect mobile number or password, or account does not exist. Please check your credentials or register your store.";
      }
      setErrorDetails(details);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        {/* Brand Header */}
        <div className="auth-brand-center">
          <Link className="brand" to="/" aria-label="DukanKhata Home">
            <BrandLogo size={44} alt="DukanKhata" />
            <span>Dukan</span>
            <span>Khata</span>
          </Link>
        </div>

        <div className="auth-header-text">
          <h1>Welcome Back</h1>
          <p>Sign in to your merchant store account</p>
        </div>

        <form className="form-card" onSubmit={handleSubmit} noValidate>
          {/* General API Error Alert */}
          {errorDetails && (
            <div className="alert-banner error" role="alert">
              <span aria-hidden="true" style={{ fontSize: "16px" }}>⚠️</span>
              <div>
                <strong>{errorDetails.message}</strong>
                {errorDetails.correlationId && (
                  <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
                    Error ID: {errorDetails.correlationId}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Number Input */}
          <div className="input-group">
            <div className="input-label-row">
              <label htmlFor="login-mobile">Mobile Number</label>
              <span style={{ fontSize: "11px", color: "var(--mute)" }}>
                {form.mobile.length}/10 digits
              </span>
            </div>
            <div className="input-wrapper">
              <span className="input-prefix" aria-hidden="true">+91</span>
              <input
                id="login-mobile"
                ref={mobileInputRef}
                className={`input-with-prefix ${isMobileTouchedAndInvalid ? "input-error" : ""}`}
                type="tel"
                placeholder="9876543210"
                value={form.mobile}
                onChange={handleMobileChange}
                onBlur={() => setTouched((prev) => ({ ...prev, mobile: true }))}
                autoComplete="username tel"
                required
                aria-invalid={isMobileTouchedAndInvalid}
                aria-describedby={isMobileTouchedAndInvalid ? "mobile-error" : undefined}
                disabled={submitting}
              />
            </div>
            {isMobileTouchedAndInvalid && (
              <span id="mobile-error" className="inline-error">
                Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="input-group">
            <div className="input-label-row">
              <label htmlFor="login-password">Password</label>
            </div>
            <div className="input-wrapper">
              <input
                id="login-password"
                ref={passwordInputRef}
                className={isPasswordTouchedAndEmpty ? "input-error" : ""}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your store password"
                value={form.password}
                onChange={handlePasswordChange}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                autoComplete="current-password"
                required
                aria-invalid={isPasswordTouchedAndEmpty}
                aria-describedby={isPasswordTouchedAndEmpty ? "password-error" : undefined}
                disabled={submitting}
              />
              <button
                type="button"
                className="input-adornment-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                {showPassword ? (
                  /* Eye Off SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  /* Eye SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {isPasswordTouchedAndEmpty && (
              <span id="password-error" className="inline-error">
                Password is required
              </span>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="auth-options-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMobile}
                onChange={(e) => setRememberMobile(e.target.checked)}
                disabled={submitting}
              />
              <span>Remember mobile</span>
            </label>
            <button
              type="button"
              className="forgot-link"
              onClick={() => setShowForgotModal(true)}
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "4px" }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"></path>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to DukanKhata</span>
            )}
          </button>

          {/* Footer Link */}
          <p className="form-footer">
            New to DukanKhata? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setShowForgotModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
        >
          <div
            className="form-card"
            style={{ maxWidth: "420px", width: "90%", margin: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="forgot-modal-title" style={{ fontSize: "20px", color: "var(--deep)" }}>
              Password Reset Assistance
            </h3>
            <p className="muted" style={{ fontSize: "14px" }}>
              For store security and tenant isolation:
            </p>
            <ul style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px", color: "var(--ink-secondary)" }}>
              <li>• <strong>Staff / Cashiers:</strong> Please contact your Shop Owner to reset your credential in the Staff Management panel.</li>
              <li>• <strong>Shop Owners:</strong> Contact DukanKhata Verified Merchant Support at <strong>+91 98000 12345</strong> or email <strong>support@dukankhata.in</strong> with your registered shop details.</li>
            </ul>
            <button
              className="btn btn-primary"
              style={{ marginTop: "12px", width: "100%" }}
              onClick={() => setShowForgotModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
