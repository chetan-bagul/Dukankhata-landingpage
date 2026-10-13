import { useEffect } from "react";
import { Link } from "react-router-dom";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";

export default function RefundPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Refund & Cancellation Policy — DukanKhata™";
  }, []);

  return (
    <div className="legal-page-root">
      <LandingNav />

      {/* Hero Header */}
      <section className="legal-hero" aria-labelledby="refund-heading">
        <div className="legal-hero-container">
          <nav className="legal-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Legal</span>
            <span>/</span>
            <span style={{ color: "#FFFFFF" }}>Refund &amp; Cancellation Policy</span>
          </nav>

          <span className="legal-hero-badge">💳 BILLING &amp; REFUNDS</span>
          <h1 id="refund-heading">Refund &amp; Cancellation Policy</h1>

          <div className="legal-hero-meta">
            <span>Last Updated: October 13, 2026</span>
            <span>•</span>
            <span>30-Day Zero-Risk Trial</span>
            <span>•</span>
            <span>7-Day Money-Back Guarantee</span>
          </div>
        </div>
      </section>

      {/* Content Layout */}
      <div className="legal-content-wrap">
        {/* Table of Contents */}
        <aside className="legal-toc-sidebar" aria-label="Table of Contents">
          <div className="legal-toc-title">Table of Contents</div>
          <nav className="legal-toc-nav">
            <a href="#trial" className="legal-toc-link">1. 30-Day Free Trial</a>
            <a href="#cancellation" className="legal-toc-link">2. Subscription Cancellation</a>
            <a href="#refund-policy" className="legal-toc-link">3. 7-Day Refund Guarantee</a>
            <a href="#plan-switches" className="legal-toc-link">4. Upgrades &amp; Plan Switches</a>
            <a href="#billing-errors" className="legal-toc-link">5. Double Charges &amp; Errors</a>
            <a href="#hardware" className="legal-toc-link">6. Hardware Purchases</a>
            <a href="#how-to-request" className="legal-toc-link">7. How to Request a Refund</a>
          </nav>
        </aside>

        {/* Main Article Content */}
        <article className="legal-main-article">
          <div className="legal-callout-box success">
            <strong>Transparent Merchant Billing:</strong> At DukanKhata™, we believe in transparent, stress-free pricing. We want every retail merchant to experience the power of fast POS billing and 30-sec closing with complete confidence.
          </div>

          <h2 id="trial">1. 30-Day Zero-Risk Free Trial</h2>
          <p>
            Every new retail store signing up for DukanKhata™ receives an automatic <strong>30-day full-access free trial</strong>.
          </p>
          <ul>
            <li><strong>No Credit Card Required:</strong> You never need to enter credit card, debit card, or UPI autopay details to start your trial.</li>
            <li><strong>Zero Involuntary Charges:</strong> When your 30-day trial concludes, your account will simply pause until you choose to activate a paid subscription plan. You will never be billed without your explicit consent.</li>
          </ul>

          <h2 id="cancellation">2. 1-Click Subscription Cancellation</h2>
          <p>
            You can cancel your active monthly or yearly SaaS subscription at any time without penalty or cancellation fees:
          </p>
          <ul>
            <li>Navigate to <strong>Store Settings &gt; Subscription Desk</strong> inside your merchant dashboard.</li>
            <li>Click <strong>&ldquo;Cancel Subscription&rdquo;</strong> to prevent future billing cycles.</li>
            <li>Upon cancellation, your store retains complete access to POS billing and financial reports until the end of the current paid billing cycle.</li>
            <li>You can export all your past invoices, customer khata entries, and inventory records even after cancellation.</li>
          </ul>

          <h2 id="refund-policy">3. 7-Day Money-Back Guarantee for Annual Plans</h2>
          <p>
            For merchants who purchase an annual subscription:
          </p>
          <div className="legal-callout-box info">
            <strong>Full 7-Day Refund Window:</strong> If you purchase an annual plan and decide within 7 days of payment that DukanKhata™ does not meet your store&rsquo;s operational needs, you are eligible for a <strong>100% full refund</strong>, no questions asked.
          </div>
          <p>
            For monthly subscriptions, because you can cancel anytime before the next monthly invoice date, refunds for partially used monthly billing cycles are generally not granted except in cases of technical outage or platform billing errors.
          </p>

          <h2 id="plan-switches">4. Upgrades &amp; Mode Switches (Small Shop to Large POS)</h2>
          <p>
            As your retail counter scales, you can switch between operating modes seamlessly:
          </p>
          <ul>
            <li><strong>Upgrades:</strong> When upgrading from Small Shop Mode to Large POS Mode, the unused balance of your existing plan is automatically credited as a prorated discount against your new tier.</li>
            <li><strong>Downgrades:</strong> Downgrades take effect at the conclusion of the active billing cycle.</li>
          </ul>

          <h2 id="billing-errors">5. Erroneous Deductions &amp; Double Charges</h2>
          <p>
            In the rare event that network connectivity issues during payment result in a double charge or duplicate deduction:
          </p>
          <ul>
            <li>Our automated reconciliation engine detects duplicate idempotency tokens and flags duplicate payments within 24 hours.</li>
            <li>Duplicate charges are automatically refunded to the original payment method (UPI account, net banking, or debit/credit card).</li>
            <li>Refunds typically reflect in your bank account within <strong>5 to 7 business days</strong> depending on your issuing bank.</li>
          </ul>

          <h2 id="hardware">6. Third-Party Hardware &amp; Accessories</h2>
          <p>
            DukanKhata™ is a software application compatible with standard thermal receipt printers (ESC/POS 58mm/80mm), USB/Bluetooth barcode scanners, and Android cash registers. We do not manufacture hardware directly. Any physical barcode scanners or printers purchased from third-party manufacturers or distributors are governed by the manufacturer&rsquo;s respective warranty and return policies.
          </p>

          <h2 id="how-to-request">7. How to Request a Refund</h2>
          <p>
            To request a refund under our 7-day annual guarantee or report an erroneous charge, contact our billing helpdesk with your registered store mobile number and payment transaction reference:
          </p>
          <div className="legal-contact-card">
            <h3>DukanKhata™ Billing &amp; Accounts Helpdesk</h3>
            <p>
              <strong>Email:</strong> dukankhata.help@gmail.com / billing@dukankhata.in<br />
              <strong>WhatsApp Support:</strong> Available 9:00 AM – 8:00 PM IST (Mon – Sat)<br />
              <strong>Turnaround Time:</strong> Refund requests are reviewed and acknowledged within 24 hours.
            </p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "12px" }}>
              <a href="mailto:dukankhata.help@gmail.com" className="btn btn-primary btn-sm">
                ✉️ Email Billing Team
              </a>
              <Link to="/subscription" className="btn btn-outline btn-sm">
                ⚙️ Manage Subscription Portal
              </Link>
            </div>
          </div>
        </article>
      </div>

      <LandingFooter />
    </div>
  );
}
