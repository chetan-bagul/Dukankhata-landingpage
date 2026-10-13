import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

export default function LandingFooter() {
  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-top">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <Link to="/" aria-label="DukanKhata Home" style={{ display: "inline-block", marginBottom: "6px" }}>
              <BrandLogo variant="horizontal" height={36} alt="DukanKhata" />
            </Link>
            <p>
              The all-in-one retail management operating system for Indian shops. Fast POS billing, 30-sec daily closing, Udhar khata ledgers, and real-time inventory control.
            </p>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "12px", background: "rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: "6px", color: "#a5d6a7" }}>
                🇮🇳 Made for Indian Retailers
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="footer-col-title">Product &amp; Features</h4>
            <div className="footer-links-list">
              <a className="footer-link" href="#modes">Small Shop Mode</a>
              <a className="footer-link" href="#modes">Large POS Mode</a>
              <a className="footer-link" href="#preview">Interactive Simulator</a>
              <a className="footer-link" href="#features">Udhar Khata Ledger</a>
              <a className="footer-link" href="#features">Inventory &amp; Stock Alerts</a>
              <a className="footer-link" href="#pricing">Pricing Plans</a>
            </div>
          </div>

          {/* Merchant Quick Links */}
          <div>
            <h4 className="footer-col-title">Merchant Portal</h4>
            <div className="footer-links-list">
              <Link className="footer-link" to="/login">Merchant Login</Link>
              <Link className="footer-link" to="/signup">Start Free 30-Day Trial</Link>
              <a className="footer-link" href="#faq">Frequently Asked Questions</a>
              <a className="footer-link" href="#contact">Schedule Setup Assistance</a>
              <span className="footer-link" style={{ color: "#64748b" }}>API Status: All Systems Operational 🟢</span>
            </div>
          </div>

          {/* Support & Contact */}
          <div>
            <h4 className="footer-col-title">Contact &amp; Support</h4>
            <div className="footer-links-list">
              <div className="footer-contact-item">
                <span>📍</span>
                <span>Nashik, Maharastra, India</span>
              </div>
              {/* <div className="footer-contact-item">
                <span>📞</span>
                <span>+91 98000 12345 (9 AM - 9 PM)</span>
              </div> */}
              <div className="footer-contact-item">
                <span>✉️</span>
                <span>dukankhata.help@gmail.com</span>
              </div>
              <div className="footer-contact-item">
                <span>💬</span>
                <span>WhatsApp Business Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} DukanKhata™ Technologies Pvt. Ltd. All rights reserved.
          </div>
          <div className="footer-legal-links">
            <Link className="footer-link" to="/terms">Terms of Service</Link>
            <Link className="footer-link" to="/privacy">Privacy Policy</Link>
            <Link className="footer-link" to="/refund-policy">Refund &amp; Cancellation</Link>
            <Link className="footer-link" to="/gst-compliance">GST Compliance</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
