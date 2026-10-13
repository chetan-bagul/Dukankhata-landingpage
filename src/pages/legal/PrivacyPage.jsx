import { useEffect } from "react";
import { Link } from "react-router-dom";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Privacy Policy — DukanKhata™";
  }, []);

  return (
    <div className="legal-page-root">
      <LandingNav />

      {/* Hero Header */}
      <section className="legal-hero" aria-labelledby="privacy-heading">
        <div className="legal-hero-container">
          <nav className="legal-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Legal</span>
            <span>/</span>
            <span style={{ color: "#FFFFFF" }}>Privacy Policy</span>
          </nav>

          <span className="legal-hero-badge">🔒 DATA PRIVACY &amp; SECURITY</span>
          <h1 id="privacy-heading">Privacy Policy</h1>

          <div className="legal-hero-meta">
            <span>Last Updated: October 13, 2026</span>
            <span>•</span>
            <span>Compliant with DPDPA 2023 &amp; IT Act 2000</span>
            <span>•</span>
            <span>Indian Cloud Hosting (Mumbai AWS)</span>
          </div>
        </div>
      </section>

      {/* Content Layout */}
      <div className="legal-content-wrap">
        {/* Table of Contents */}
        <aside className="legal-toc-sidebar" aria-label="Table of Contents">
          <div className="legal-toc-title">Table of Contents</div>
          <nav className="legal-toc-nav">
            <a href="#commitment" className="legal-toc-link">1. Our Privacy Commitment</a>
            <a href="#data-collection" className="legal-toc-link">2. Information We Collect</a>
            <a href="#data-use" className="legal-toc-link">3. How Your Data Is Used</a>
            <a href="#zero-sale" className="legal-toc-link">4. Zero Data Selling Guarantee</a>
            <a href="#security" className="legal-toc-link">5. Bank-Grade Security</a>
            <a href="#staff-privacy" className="legal-toc-link">6. Role-Based Permissions</a>
            <a href="#data-retention" className="legal-toc-link">7. Retention &amp; Portability</a>
            <a href="#merchant-rights" className="legal-toc-link">8. Merchant Rights &amp; Erasure</a>
            <a href="#contact-dpo" className="legal-toc-link">9. Data Protection Officer</a>
          </nav>
        </aside>

        {/* Main Article Content */}
        <article className="legal-main-article">
          <div className="legal-callout-box success">
            <strong>Merchant Data Security First:</strong> DukanKhata™ is built to empower Indian retail merchants. We treat your store financials, inventory supplier costs, customer names, and day closing tallies as strictly private and proprietary to your business.
          </div>

          <h2 id="commitment">1. Our Privacy Commitment</h2>
          <p>
            DukanKhata™ Technologies Private Limited operates in full compliance with the <strong>Digital Personal Data Protection Act (DPDPA), 2023</strong> and the <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> under the IT Act, 2000.
          </p>
          <p>
            This Privacy Policy describes how we collect, store, safeguard, and process business and customer data entered into the DukanKhata™ SaaS application.
          </p>

          <h2 id="data-collection">2. Information We Collect</h2>
          <p>We collect only the data necessary to provide seamless retail billing, daily closing, and accounting features:</p>
          <ul>
            <li><strong>Merchant Account Data:</strong> Shop name, owner name, verified mobile number, email address, physical store address, and GSTIN (if applicable).</li>
            <li><strong>Product &amp; Inventory Data:</strong> Item names, SKU barcodes, category classifications, purchase rates, retail selling rates, HSN codes, and GST slabs.</li>
            <li><strong>Transactional Sales Records:</strong> Invoice numbers, item quantities, discounts, CGST/SGST breakdowns, timestamp logs, payment method allocations (Cash, UPI, Udhar, Split), and cashier IDs.</li>
            <li><strong>Customer Udhar Khata Entries:</strong> Customer names, mobile numbers, running credit balances, payment collection logs, and optional due dates.</li>
            <li><strong>Device &amp; Session Logs:</strong> IP address, browser user-agent, operating system, and counter terminal IDs for security audit trails.</li>
          </ul>

          <h2 id="data-use">3. How Your Data Is Processed</h2>
          <p>Your data is processed strictly for core functional operations:</p>
          <div className="legal-grid-cards">
            <div className="legal-card">
              <strong>Sub-Second POS Billing</strong>
              <p>Looking up barcode items, deducting real-time inventory balances, and calculating statutory GST lines instantly at checkout.</p>
            </div>
            <div className="legal-card">
              <strong>30-Sec Day Closing Tally</strong>
              <p>Reconciling physical cash drawer totals against digital PhonePe/GooglePay QR bank receipts to pinpoint register variances.</p>
            </div>
            <div className="legal-card">
              <strong>WhatsApp Reminders</strong>
              <p>Delivering digital thermal receipts, payment confirmation links, and friendly Udhar balance reminders to your customers on your behalf.</p>
            </div>
            <div className="legal-card">
              <strong>GST Filing Assistance</strong>
              <p>Aggregating monthly B2B and B2C sales summaries ready for your chartered accountant to file GSTR-1 and GSTR-3B.</p>
            </div>
          </div>

          <h2 id="zero-sale">4. Zero Data Selling Guarantee</h2>
          <div className="legal-callout-box warning">
            <strong>Absolute Guarantee:</strong> We do NOT sell, rent, monetize, or broker merchant business data, inventory prices, customer contact lists, or sales figures to third-party marketing networks, FMCG brands, or loan sharks.
          </div>
          <p>
            Unlike conventional apps that monetize small shop data to sell third-party financial products, DukanKhata™ operates on a clean, transparent SaaS subscription model. You pay for software, and your business data remains entirely your own.
          </p>

          <h2 id="security">5. Bank-Grade Cloud Infrastructure &amp; Security</h2>
          <p>We deploy rigorous technical safeguards to protect your retail data:</p>
          <ul>
            <li><strong>Local Cloud Residency:</strong> All customer data and transaction logs are housed within Tier-4 data centers located in Mumbai, India (AWS Asia-Pacific Region).</li>
            <li><strong>Encryption Standards:</strong> Data in transit is encrypted using TLS 1.3 with SHA-256 signatures; data at rest is encrypted using AES-256 standards.</li>
            <li><strong>Automated Hourly Snapshots:</strong> Encrypted backups are captured hourly to prevent accidental data loss in the event of hardware failure.</li>
            <li><strong>Idempotent API Safety:</strong> Every POS invoice creation utilizes unique UUID idempotency keys to ensure duplicate charges or sales never occur during network lag.</li>
          </ul>

          <h2 id="staff-privacy">6. Role-Based Permissions &amp; Cashier Isolation</h2>
          <p>
            Store owners can assign granular permissions to cashiers and store staff. Staff accounts are isolated so cashiers can scan products and print bills without seeing:
          </p>
          <ul>
            <li>Store profit margins or net profit tally</li>
            <li>Overall bank balance or merchant subscription info</li>
            <li>Wholesale supplier purchase prices</li>
          </ul>

          <h2 id="data-retention">7. Data Retention &amp; Complete Portability</h2>
          <p>
            As long as your merchant account remains active, DukanKhata™ retains your historical sales records to enable multi-year GST audits. You can download your complete transaction ledger, customer khata balances, and product catalogs in Excel/CSV at any time from your account settings.
          </p>

          <h2 id="merchant-rights">8. Merchant Rights &amp; Account Deletion</h2>
          <p>
            Under the DPDPA 2023, you maintain the right to review, rectify, or request permanent deletion of your store account and associated customer records. Permanent deletion requests can be initiated from the Shop Settings page or by contacting our Data Protection Officer.
          </p>

          <h2 id="contact-dpo">9. Data Protection Officer (DPO) Contact Details</h2>
          <p>
            For any data privacy concerns, audit verifications, or compliance questions, please contact our designated Grievance &amp; Data Protection Officer:
          </p>
          <div className="legal-contact-card">
            <h3>DukanKhata™ Data Protection &amp; Grievance Office</h3>
            <p>
              <strong>Attn:</strong> Grievance Officer, DukanKhata™ Technologies Pvt. Ltd.<br />
              <strong>Address:</strong> Tech Park, Gangapur Road, Nashik, Maharashtra 422013, India<br />
              <strong>Email:</strong> privacy@dukankhata.in / dukankhata.help@gmail.com<br />
              <strong>Response Time:</strong> Within 48 business hours as per statutory Indian IT rules.
            </p>
          </div>
        </article>
      </div>

      <LandingFooter />
    </div>
  );
}
