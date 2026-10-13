import { useEffect } from "react";
import { Link } from "react-router-dom";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Terms of Service — DukanKhata™";
  }, []);

  return (
    <div className="legal-page-root">
      <LandingNav />

      {/* Hero Header */}
      <section className="legal-hero" aria-labelledby="terms-heading">
        <div className="legal-hero-container">
          <nav className="legal-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Legal</span>
            <span>/</span>
            <span style={{ color: "#FFFFFF" }}>Terms of Service</span>
          </nav>

          <span className="legal-hero-badge">⚖️ LEGAL AGREEMENT</span>
          <h1 id="terms-heading">Terms of Service</h1>

          <div className="legal-hero-meta">
            <span>Last Updated: October 13, 2026</span>
            <span>•</span>
            <span>Entity: DukanKhata™ Technologies Pvt. Ltd.</span>
            <span>•</span>
            <span>Jurisdiction: India</span>
          </div>
        </div>
      </section>

      {/* Content Layout */}
      <div className="legal-content-wrap">
        {/* Table of Contents */}
        <aside className="legal-toc-sidebar" aria-label="Table of Contents">
          <div className="legal-toc-title">Table of Contents</div>
          <nav className="legal-toc-nav">
            <a href="#acceptance" className="legal-toc-link">1. Acceptance of Terms</a>
            <a href="#eligibility" className="legal-toc-link">2. Merchant Eligibility</a>
            <a href="#services" className="legal-toc-link">3. SaaS Platform &amp; Shop Modes</a>
            <a href="#data-ownership" className="legal-toc-link">4. Store Data Ownership</a>
            <a href="#payments" className="legal-toc-link">5. Transactions &amp; Billing</a>
            <a href="#whatsapp" className="legal-toc-link">6. WhatsApp &amp; SMS Policy</a>
            <a href="#multi-user" className="legal-toc-link">7. Staff &amp; Cashier Logins</a>
            <a href="#uptime" className="legal-toc-link">8. Uptime &amp; Offline Cache</a>
            <a href="#liability" className="legal-toc-link">9. Limitation of Liability</a>
            <a href="#governing-law" className="legal-toc-link">10. Governing Law</a>
          </nav>
        </aside>

        {/* Main Article Content */}
        <article className="legal-main-article">
          <div className="legal-callout-box info">
            <strong>Important Summary:</strong> These Terms of Service govern your access to and use of the DukanKhata™ retail operating system. By signing up, logging in, or creating sales bills on DukanKhata™, you agree to be bound by these Terms.
          </div>

          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>
            Welcome to DukanKhata™ (&ldquo;Platform&rdquo;, &ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), operated by <strong>DukanKhata™ Technologies Private Limited</strong>, an incorporated company registered in Maharashtra, India.
          </p>
          <p>
            By accessing or using our web application, desktop client, Point of Sale (POS) register, mobile interfaces, or cloud billing APIs, you agree that you have read, understood, and agreed to be legally bound by these Terms of Service, along with our <Link to="/privacy">Privacy Policy</Link> and <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>

          <h2 id="eligibility">2. Merchant Eligibility &amp; Account Registration</h2>
          <p>
            To use DukanKhata™, you must be a legitimate business owner, authorized merchant, sole proprietor, partnership, LLP, or corporation legally operating in India or abroad, and at least 18 years of age.
          </p>
          <ul>
            <li>You agree to provide true, accurate, and complete information regarding your shop name, trade name, business category, GSTIN (if registered), and official mobile phone number.</li>
            <li>You are solely responsible for maintaining the confidentiality of your login credentials, OTP verifications, and counter cashier pin codes.</li>
            <li>Any activity conducted under your merchant account is deemed your legal responsibility.</li>
          </ul>

          <h2 id="services">3. SaaS Platform &amp; Operating Modes</h2>
          <p>
            DukanKhata™ provides cloud-managed retail software designed specifically for physical store counters, featuring dual operational modes:
          </p>
          <div className="legal-grid-cards">
            <div className="legal-card">
              <strong>Small Shop Mode</strong>
              <p>Tailored for single-counter stalls, tea shops, bakeries, street food kiosks, and quick service retail requiring 30-second daily drawer cash vs PhonePe/UPI reconciliation without barcode hardware.</p>
            </div>
            <div className="legal-card">
              <strong>Large Shop Mode</strong>
              <p>Tailored for supermarkets, apparel marts, grocery stores, pharmacies, and wholesale distribution counters requiring high-speed barcode scanning, multi-method payment splits, and GST Rule 46 invoices.</p>
            </div>
          </div>

          <h2 id="data-ownership">4. Merchant Data Ownership &amp; Khata Ledgers</h2>
          <div className="legal-callout-box success">
            <strong>100% Data Sovereignty:</strong> You retain complete, unencumbered ownership of your shop data. DukanKhata™ never sells, monetizes, or shares your inventory pricing, profit margins, supplier contracts, or customer khata lists with any third party.
          </div>
          <p>
            All products, customer credit logs (Udhar Khata), purchase orders, supplier dues, daily profit records, and historical tax invoices belong exclusively to you. You maintain the right to export your entire ledger into Excel, CSV, or PDF formats at any time without fees or artificial lock-ins.
          </p>

          <h2 id="payments">5. Transactions, Billing &amp; Subscriptions</h2>
          <p>
            DukanKhata™ provides a 30-day full-access free trial without requiring payment details or credit card authorization. Following the trial period:
          </p>
          <ul>
            <li>Subscribed merchants agree to pay applicable recurring subscription fees (monthly or yearly) based on their chosen plan.</li>
            <li>All prices listed are in Indian Rupees (INR) and are subject to statutory GST at the prevailing rate.</li>
            <li>We do not act as a payment gateway; payment processing fees (if any) from third-party UPI or card aggregators are outside DukanKhata&rsquo;s platform charges.</li>
          </ul>

          <h2 id="whatsapp">6. WhatsApp &amp; SMS Communication Compliance</h2>
          <p>
            DukanKhata™ integrates transactional WhatsApp and SMS notifications enabling merchants to send digital thermal receipts, payment links, and Udhar balance alerts directly to customers.
          </p>
          <ul>
            <li>Merchants must ensure consent before sending promotional communications.</li>
            <li>Notifications must comply with the Telecom Commercial Communications Customer Preference Regulations (TCCCPR) 2018 established by the Telecom Regulatory Authority of India (TRAI).</li>
            <li>Spamming, harassment, or abusive debt collection messages via DukanKhata&rsquo;s communication channels will result in immediate termination of service.</li>
          </ul>

          <h2 id="multi-user">7. Multi-User, Staff Logins &amp; Cashier Audits</h2>
          <p>
            Merchants operating multi-lane stores may delegate cashier and staff credentials. Store owners can restrict staff permissions such that cashiers can ring up sales and print receipts without viewing store profit margins, day closing summaries, or audit logs. You remain responsible for all sales logged under your staff credentials.
          </p>

          <h2 id="uptime">8. Uptime, Offline Resilience &amp; Data Backups</h2>
          <p>
            We strive for 99.9% platform availability across our secure Indian cloud clusters. Our Point of Sale interface incorporates browser-side caching allowing billing to continue uninterrupted during temporary internet dropouts, with automatic idempotent synchronization upon reconnection.
          </p>

          <h2 id="liability">9. Limitation of Liability &amp; Disclaimers</h2>
          <p>
            DukanKhata™ provides calculation tools, POS billing, and bookkeeping assistance. While our platform accurately computes GST tax breakdowns and inventory deductions based on merchant inputs, we are not a chartered accountancy firm. Merchants are ultimately responsible for verifying the accuracy of their tax filings and compliance with statutory Indian authorities.
          </p>

          <h2 id="governing-law">10. Governing Law &amp; Dispute Resolution</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the substantive laws of the Republic of India. In the event of any dispute or claim arising out of these Terms, the courts located in Nashik, Maharashtra, India shall have exclusive jurisdiction.
          </p>

          {/* Contact Support Card */}
          <div className="legal-contact-card">
            <h3>Have Questions About Our Terms?</h3>
            <p>Our merchant legal and compliance team is available to assist you with any questions or store governance requirements.</p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <a href="mailto:dukankhata.help@gmail.com" className="btn btn-primary btn-sm">
                ✉️ dukankhata.help@gmail.com
              </a>
              <a href="https://wa.me/919800012345" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                💬 WhatsApp Merchant Helpdesk
              </a>
            </div>
          </div>
        </article>
      </div>

      <LandingFooter />
    </div>
  );
}
