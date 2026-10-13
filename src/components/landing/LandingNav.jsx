import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header
      className={`landing-header ${scrolled ? "scrolled" : ""}`}
      role="banner"
    >
      <div className="landing-nav-container">
        <Link className="brand" to="/" aria-label="DukanKhata Home">
          <BrandLogo size={36} alt="DukanKhata" />
          <span>Dukan</span>
          <span>Khata</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-links" aria-label="Main Navigation">
          <a className="nav-link" href="#modes">Shop Modes</a>
          <a className="nav-link" href="#preview">Live Preview</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          <a className="nav-link" href="#faq">FAQ</a>
        </nav>

        {/* Action Buttons */}
        <div className="nav-actions">
          <Link className="btn btn-outline btn-sm" to="/login">
            Merchant Login
          </Link>
          <Link className="btn btn-primary btn-sm" to="/signup">
            Get Started Free
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-btn"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Accessible Drawer */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={closeMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div
            id="mobile-navigation-drawer"
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <Link className="brand" to="/" onClick={closeMenu}>
                <BrandLogo size={32} alt="DukanKhata" />
                <span>Dukan</span>
                <span>Khata</span>
              </Link>
              <button
                className="btn btn-sm btn-outline"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="mobile-nav-links">
              <a className="mobile-nav-link" href="#modes" onClick={closeMenu}>
                <span>Shop Modes</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#preview" onClick={closeMenu}>
                <span>Live Preview</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#benefits" onClick={closeMenu}>
                <span>Benefits</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#features" onClick={closeMenu}>
                <span>Features</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#pricing" onClick={closeMenu}>
                <span>Pricing Plans</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#faq" onClick={closeMenu}>
                <span>FAQ</span>
                <span>→</span>
              </a>
              <a className="mobile-nav-link" href="#contact" onClick={closeMenu}>
                <span>Contact Sales</span>
                <span>→</span>
              </a>
            </nav>

            <div className="mobile-drawer-actions">
              <Link className="btn btn-outline" to="/login" onClick={closeMenu}>
                Merchant Login
              </Link>
              <Link className="btn btn-primary" to="/signup" onClick={closeMenu}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
