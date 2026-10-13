import { useEffect } from "react";
import { Link } from "react-router-dom";
import LandingNav from "../../components/landing/LandingNav";
import LandingFooter from "../../components/landing/LandingFooter";

export default function GstCompliancePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "GST Compliance & Invoicing Standards — DukanKhata™";
  }, []);

  return (
    <div className="legal-page-root">
      <LandingNav />

      {/* Hero Header */}
      <section className="legal-hero" aria-labelledby="gst-heading">
        <div className="legal-hero-container">
          <nav className="legal-breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Legal</span>
            <span>/</span>
            <span style={{ color: "#FFFFFF" }}>GST Compliance</span>
          </nav>

          <span className="legal-hero-badge">🏛️ REGULATORY STANDARDS</span>
          <h1 id="gst-heading">GST Compliance &amp; Invoicing Standards</h1>

          <div className="legal-hero-meta">
            <span>Last Updated: October 13, 2026</span>
            <span>•</span>
            <span>CGST Act, 2017 &amp; Rule 46 Compliant</span>
            <span>•</span>
            <span>GSTR-1 &amp; GSTR-3B Ready Reports</span>
          </div>
        </div>
      </section>

      {/* Content Layout */}
      <div className="legal-content-wrap">
        {/* Table of Contents */}
        <aside className="legal-toc-sidebar" aria-label="Table of Contents">
          <div className="legal-toc-title">Table of Contents</div>
          <nav className="legal-toc-nav">
            <a href="#overview" className="legal-toc-link">1. GST Framework Overview</a>
            <a href="#rule-46" className="legal-toc-link">2. Rule 46 Tax Invoice Rules</a>
            <a href="#composition-scheme" className="legal-toc-link">3. Composition Scheme</a>
            <a href="#tax-calculations" className="legal-toc-link">4. CGST / SGST / IGST Math</a>
            <a href="#hsn-sac" className="legal-toc-link">5. HSN/SAC Code Mapping</a>
            <a href="#returns-filing" className="legal-toc-link">6. GSTR-1 &amp; 3B Export</a>
            <a href="#audit-trail" className="legal-toc-link">7. Digital Audit Trails</a>
            <a href="#verification" className="legal-toc-link">8. Thermal Slip QR Verification</a>
          </nav>
        </aside>

        {/* Main Article Content */}
        <article className="legal-main-article">
          <div className="legal-callout-box success">
            <strong>Engineered for Indian Tax Laws:</strong> DukanKhata™ automatically calculates GST breakdowns, auto-populates HSN codes, and structures thermal receipts and A4 invoices to comply with the Central Goods and Services Tax (CGST) Rules, 2017.
          </div>

          <h2 id="overview">1. Indian GST Framework for Retail Businesses</h2>
          <p>
            Under the Goods and Services Tax (GST) regime in India, retailers must issue compliant tax invoices or bills of supply depending on their registration tier and annual turnover threshold (₹40 Lakhs for goods in most states, ₹20 Lakhs for special category states).
          </p>
          <p>
            DukanKhata™ handles the computational complexity so cashiers and store owners can scan barcodes and ring up sales in sub-seconds without manual tax calculations.
          </p>

          <h2 id="rule-46">2. Rule 46 CGST Tax Invoice Mandatory Fields</h2>
          <p>
            Every tax invoice generated through DukanKhata™ (printed on 58mm/80mm thermal rolls or exported as A4 PDFs) automatically embeds the statutory fields required by <strong>Rule 46 of the CGST Rules, 2017</strong>:
          </p>
          <div className="legal-grid-cards">
            <div className="legal-card">
              <strong>1. Supplier Identification</strong>
              <p>Store trade name, legal entity name, registered physical address, and 15-character GSTIN prominently formatted at top.</p>
            </div>
            <div className="legal-card">
              <strong>2. Consecutive Serial Number</strong>
              <p>Unique invoice number generated sequentially without gaps (e.g. #INV-2026-1042) compliant with the tax period.</p>
            </div>
            <div className="legal-card">
              <strong>3. Date &amp; Time Stamp</strong>
              <p>Exact date and hour of bill generation recorded for daily drawer cash tally and accounting audits.</p>
            </div>
            <div className="legal-card">
              <strong>4. HSN Code &amp; Tax Split</strong>
              <p>Harmonized System of Nomenclature (HSN) codes for goods, taxable value, and explicit CGST + SGST or IGST tax amounts.</p>
            </div>
          </div>

          <h2 id="composition-scheme">3. Regular Dealers vs Composition Scheme Dealers</h2>
          <p>DukanKhata™ adapts its billing workflow based on your store&rsquo;s tax profile:</p>
          <ul>
            <li><strong>Regular GST Registered Stores:</strong> Invoices show pre-tax item value, applied GST slab (0%, 5%, 12%, 18%, 28%), explicit CGST and SGST splits, and total gross value. Customers can furnish their business GSTIN for input tax credit (ITC).</li>
            <li><strong>Composition Scheme Retailers:</strong> The platform formats bills as a statutory <strong>&ldquo;Bill of Supply&rdquo;</strong> with the mandatory declaration: <em>&ldquo;Composition taxable person, not eligible to collect tax on supplies&rdquo;</em>, ensuring complete legal protection for small vendors.</li>
            <li><strong>Unregistered Micro Retailers:</strong> Clean, straightforward retail receipts showing net item rates, ideal for tea stalls, kiosks, and kirana shops operating under Small Shop Mode.</li>
          </ul>

          <h2 id="tax-calculations">4. Intra-State vs Inter-State Tax Calculations</h2>
          <p>The billing engine performs deterministic tax calculations:</p>
          <ul>
            <li><strong>Intra-State Sales (Within Same State):</strong> Tax is equally divided into <strong>CGST (Central GST)</strong> and <strong>SGST (State GST)</strong>. E.g., on an 18% item, 9% is allocated to CGST and 9% to SGST.</li>
            <li><strong>Inter-State Sales (Outside State / Wholesale):</strong> The entire tax amount is allocated to <strong>IGST (Integrated GST)</strong>, preventing erroneous state ledger claims.</li>
          </ul>

          <h2 id="hsn-sac">5. HSN/SAC Code Catalog &amp; Barcode Integration</h2>
          <p>
            DukanKhata™ maintains an integrated database of common retail HSN codes across fast-moving consumer goods (FMCG), dairy, grains, apparel, electronics, and confectionery. When you scan an item barcode or select an SKU, the matching HSN code and statutory tax rate are linked automatically.
          </p>

          <h2 id="returns-filing">6. 1-Click GSTR-1 &amp; GSTR-3B Sales Register Export</h2>
          <p>
            At month-end or quarter-end, filing tax returns is simplified. Instead of manually collating paper kachha bills:
          </p>
          <div className="legal-callout-box info">
            <strong>Chartered Accountant Ready:</strong> Navigate to the Reports Desk to export your <strong>B2B Sales Register</strong> and <strong>B2C Summary</strong> in structured Excel/CSV formats directly compatible with the GST Offline Tool and ClearTax.
          </div>

          <h2 id="audit-trail">7. Digital Audit Trails &amp; Tamper-Evident Logs</h2>
          <p>
            To prevent cash leakage and comply with statutory scrutiny:
          </p>
          <ul>
            <li>All bill modifications, sales returns, item voiding, and credit note issuances are permanently logged with cashier ID and timestamp.</li>
            <li>Invoices cannot be silently deleted from the database without generating an audit trail entry.</li>
          </ul>

          <h2 id="verification">8. Thermal Slip QR Code Verification</h2>
          <p>
            For stores generating high volumes of thermal receipts, DukanKhata™ embeds dynamic verification tokens on the receipt footer, ensuring each printed bill can be audited and matched against cloud records.
          </p>

          {/* Support Box */}
          <div className="legal-contact-card">
            <h3>Need GST Invoicing Assistance for Your Shop?</h3>
            <p>Our retail accounting team can assist you in configuring your store GSTIN, HSN codes, and thermal printer invoice templates.</p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <a href="mailto:dukankhata.help@gmail.com" className="btn btn-primary btn-sm">
                ✉️ dukankhata.help@gmail.com
              </a>
              <Link to="/reports" className="btn btn-outline btn-sm">
                📊 Open GST Sales Reports
              </Link>
            </div>
          </div>
        </article>
      </div>

      <LandingFooter />
    </div>
  );
}
