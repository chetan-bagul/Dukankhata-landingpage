import { useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorDetails } from "../../api/apiError";
import BrandLogo from "../../components/common/BrandLogo";

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();

  const [step, setStep] = useState(1); // 1 | 2

  const [form, setForm] = useState(() => {
    const urlMode = searchParams.get("mode");
    return {
      name: "",
      mobile: "",
      shopName: "",
      password: "",
      confirmPassword: "",
      operatingMode: urlMode === "LARGE" ? "LARGE" : "SMALL",
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [touched, setTouched] = useState({});

  const nameInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const shopNameInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // Field Validations
  const isNameValid = form.name.trim().length >= 2;
  const isShopNameValid = form.shopName.trim().length >= 2;
  const isMobileValid = /^[6-9]\d{9}$/.test(form.mobile);
  const isPasswordValid = form.password.length >= 8;
  const isConfirmPasswordValid = form.password === form.confirmPassword && form.confirmPassword.length > 0;

  const isStep1Valid =
    isNameValid &&
    isShopNameValid &&
    isMobileValid &&
    isPasswordValid &&
    isConfirmPasswordValid;

  const handleMobileChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, mobile: numeric }));
    if (errorDetails) setErrorDetails(null);
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorDetails) setErrorDetails(null);
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    setTouched({
      name: true,
      shopName: true,
      mobile: true,
      password: true,
      confirmPassword: true,
    });

    if (!isNameValid) {
      nameInputRef.current?.focus();
      return;
    }
    if (!isMobileValid) {
      mobileInputRef.current?.focus();
      return;
    }
    if (!isShopNameValid) {
      shopNameInputRef.current?.focus();
      return;
    }
    if (!isPasswordValid) {
      passwordInputRef.current?.focus();
      return;
    }
    if (!isConfirmPasswordValid) {
      confirmPasswordInputRef.current?.focus();
      return;
    }

    setErrorDetails(null);
    setStep(2);
  };

  async function handleFinalSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setErrorDetails(null);
    setSubmitting(true);

    try {
      // Submit authoritative backend payload matching existing DTO
      await signup({
        name: form.name.trim(),
        mobile: form.mobile,
        shopName: form.shopName.trim(),
        password: form.password,
        operatingMode: form.operatingMode,
      });

      navigate("/dashboard");
    } catch (err) {
      const details = getApiErrorDetails(
        err,
        "Unable to create the shop account. Please check your details."
      );
      setErrorDetails(details);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel wide">
        {/* Brand Header */}
        <div className="auth-brand-center">
          <Link className="brand" to="/" aria-label="DukanKhata Home">
            <BrandLogo size={44} alt="DukanKhata" />
            <span>Dukan</span>
            <span>Khata</span>
          </Link>
        </div>

        <div className="auth-header-text">
          <h1>Create Your Store Account</h1>
          <p>Start your 30-day free trial with full feature access</p>
        </div>

        {/* Multi-Step Progress Indicator */}
        <div className="step-progress-wrapper" aria-label={`Step ${step} of 2`}>
          <div className="step-progress-header">
            <span>
              {step === 1 ? "Step 1: Store & Owner Details" : "Step 2: Choose Operating Mode"}
            </span>
            <span>{step === 1 ? "50%" : "100%"}</span>
          </div>
          <div className="step-progress-bar">
            <div
              className="step-progress-fill"
              style={{ width: step === 1 ? "50%" : "100%" }}
            ></div>
          </div>
        </div>

        <div className="form-card">
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

          {/* ================= STEP 1: Store & Owner Details ================= */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Owner Name */}
              <div className="input-group">
                <label htmlFor="signup-name">Owner Full Name</label>
                <div className="input-wrapper">
                  <input
                    id="signup-name"
                    ref={nameInputRef}
                    className={touched.name && !isNameValid ? "input-error" : ""}
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={form.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    autoComplete="name"
                    required
                  />
                </div>
                {touched.name && !isNameValid && (
                  <span className="inline-error">Owner name is required (min 2 characters)</span>
                )}
              </div>

              {/* Mobile Number */}
              <div className="input-group">
                <div className="input-label-row">
                  <label htmlFor="signup-mobile">Mobile Number (Primary Login ID)</label>
                  <span style={{ fontSize: "11px", color: "var(--mute)" }}>
                    {form.mobile.length}/10 digits
                  </span>
                </div>
                <div className="input-wrapper">
                  <span className="input-prefix" aria-hidden="true">+91</span>
                  <input
                    id="signup-mobile"
                    ref={mobileInputRef}
                    className={`input-with-prefix ${touched.mobile && !isMobileValid ? "input-error" : ""}`}
                    type="tel"
                    placeholder="9876543210"
                    value={form.mobile}
                    onChange={handleMobileChange}
                    onBlur={() => setTouched((prev) => ({ ...prev, mobile: true }))}
                    autoComplete="tel"
                    required
                  />
                </div>
                {touched.mobile && !isMobileValid && (
                  <span className="inline-error">Enter a valid 10-digit mobile number</span>
                )}
              </div>

              {/* Shop Name */}
              <div className="input-group">
                <label htmlFor="signup-shopName">Store / Shop Name</label>
                <div className="input-wrapper">
                  <input
                    id="signup-shopName"
                    ref={shopNameInputRef}
                    className={touched.shopName && !isShopNameValid ? "input-error" : ""}
                    type="text"
                    placeholder="e.g. Sharma Kirana & General Store"
                    value={form.shopName}
                    onChange={(e) => handleFieldChange("shopName", e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, shopName: true }))}
                    autoComplete="organization"
                    required
                  />
                </div>
                {touched.shopName && !isShopNameValid && (
                  <span className="inline-error">Store name is required</span>
                )}
              </div>

              {/* Password */}
              <div className="input-group">
                <div className="input-label-row">
                  <label htmlFor="signup-password">Password</label>
                  <span style={{ fontSize: "11px", color: "var(--mute)" }}>Min 8 characters</span>
                </div>
                <div className="input-wrapper">
                  <input
                    id="signup-password"
                    ref={passwordInputRef}
                    className={touched.password && !isPasswordValid ? "input-error" : ""}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) => handleFieldChange("password", e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-adornment-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {touched.password && !isPasswordValid && (
                  <span className="inline-error">Password must be at least 8 characters</span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="input-group">
                <label htmlFor="signup-confirm-password">Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    id="signup-confirm-password"
                    ref={confirmPasswordInputRef}
                    className={touched.confirmPassword && !isConfirmPasswordValid ? "input-error" : ""}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-adornment-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {touched.confirmPassword && !isConfirmPasswordValid && (
                  <span className="inline-error">Passwords do not match</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: "100%", marginTop: "8px" }}
              >
                <span>Continue to Operating Mode</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>
          )}

          {/* ================= STEP 2: Operating Mode Selection ================= */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", color: "var(--deep)", marginBottom: "4px" }}>
                  Select Your Store's Operating Mode
                </h3>
                <p className="muted" style={{ fontSize: "13.5px" }}>
                  You can change this anytime later in Shop Settings.
                </p>
              </div>

              <div className="mode-cards-group" role="radiogroup" aria-label="Operating Mode Selection">
                {/* 1. Small Shop Mode */}
                <div
                  className={`mode-select-card ${form.operatingMode === "SMALL" ? "selected" : ""}`}
                  onClick={() => handleFieldChange("operatingMode", "SMALL")}
                  role="radio"
                  aria-checked={form.operatingMode === "SMALL"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      handleFieldChange("operatingMode", "SMALL");
                    }
                  }}
                >
                  <div className="mode-select-radio" aria-hidden="true"></div>
                  <div className="mode-select-content">
                    <div className="mode-select-title-row">
                      <span className="mode-select-title">☕ Small Shop Mode</span>
                      <span className="mode-select-tag">Quick Counter</span>
                    </div>
                    <p className="mode-select-desc">
                      Fast daily quantity tallies (+ / −), Cash + UPI reconciliation, direct expense tracking, and 30-second daily closing. Ideal for tea stalls, cafes, and bakeries.
                    </p>
                  </div>
                </div>

                {/* 2. Large Shop Mode */}
                <div
                  className={`mode-select-card ${form.operatingMode === "LARGE" ? "selected" : ""}`}
                  onClick={() => handleFieldChange("operatingMode", "LARGE")}
                  role="radio"
                  aria-checked={form.operatingMode === "LARGE"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      handleFieldChange("operatingMode", "LARGE");
                    }
                  }}
                >
                  <div className="mode-select-radio" aria-hidden="true"></div>
                  <div className="mode-select-content">
                    <div className="mode-select-title-row">
                      <span className="mode-select-title">🛒 Large Shop Mode</span>
                      <span className="mode-select-tag" style={{ color: "var(--brand)", background: "var(--gold-tint)" }}>
                        Enterprise POS
                      </span>
                    </div>
                    <p className="mode-select-desc">
                      High-speed barcode POS billing, split payments, products catalog, low-stock alerts, supplier purchases, and GST tax invoices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="auth-button-group">
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  style={{ flex: "1" }}
                  onClick={() => {
                    setErrorDetails(null);
                    setStep(1);
                  }}
                  disabled={submitting}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ flex: "2" }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                        <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"></path>
                      </svg>
                      <span>Creating Store Account...</span>
                    </>
                  ) : (
                    <span>Create Store &amp; Start Trial</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Footer Link */}
          <p className="form-footer">
            Already registered? <Link to="/login">Login to your account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
