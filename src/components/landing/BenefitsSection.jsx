export default function BenefitsSection() {
  const benefits = [
    {
      icon: "⚡",
      title: "Save 2+ Hours Every Single Day",
      description:
        "No more calculating manual registers with calculators at midnight. Close your day in under 30 seconds with automatic discrepancy detection and instant profit tallying.",
      tag: "Time-Saving Automation",
    },
    {
      icon: "👁️",
      title: "Zero Cash Leakage & 100% Visibility",
      description:
        "Clearly separate drawer cash, PhonePe/GooglePay QR collections, customer credit, and vendor expenses. Know exactly where every rupee went with real-time audit trails.",
      tag: "Financial Clarity",
    },
    {
      icon: "🔒",
      title: "Audit-Grade Cloud Records",
      description:
        "Your data is securely isolated with multi-tenant encryption. Access historical invoices, customer balances, and tax reports from any mobile, tablet, or PC anytime.",
      tag: "Reliable & Secure",
    },
  ];

  return (
    <section id="benefits" className="landing-section" aria-labelledby="benefits-heading">
      <div className="section-header">
        <span className="eyebrow">MEASURABLE BUSINESS IMPACT</span>
        <h2 id="benefits-heading">Why Thousands of Merchants Choose DukanKhata™</h2>
        <p>
          Built specifically around the operational realities of Indian retail shops. Eliminate paperwork errors and focus on growing sales.
        </p>
      </div>

      <div className="benefits-grid">
        {benefits.map((b, idx) => (
          <div key={idx} className="benefit-card">
            <div className="benefit-icon-box" aria-hidden="true">
              {b.icon}
            </div>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--brand)", letterSpacing: "0.08em" }}>
              {b.tag}
            </span>
            <h3>{b.title}</h3>
            <p>{b.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
