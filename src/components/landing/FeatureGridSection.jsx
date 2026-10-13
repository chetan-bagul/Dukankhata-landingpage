export default function FeatureGridSection() {
  const features = [
    {
      icon: "🛒",
      title: "Sub-Second POS Billing",
      desc: "Barcode scanner integration, instant item search, hotkeys, and thermal 58mm/80mm receipt printing.",
    },
    {
      icon: "☕",
      title: "Daily Closing & Reconciliation",
      desc: "Quick quantity entry, Cash/UPI variance calculation, and daily direct expense recording.",
    },
    {
      icon: "📒",
      title: "Digital Udhar Khata Ledger",
      desc: "Track customer credit balances, payment history, automated limits, and WhatsApp reminders.",
    },
    {
      icon: "📦",
      title: "Inventory & Purchase Orders",
      desc: "Track stock quantities, low-stock threshold alerts, supplier purchase invoices, and vendor payouts.",
    },
    {
      icon: "👥",
      title: "Staff Roles & Access Control",
      desc: "Delegate counter access to cashiers and managers while keeping financial profit metrics private to shop owners.",
    },
    {
      icon: "🧾",
      title: "GST Invoicing & Reports",
      desc: "Item-wise HSN code support, automated CGST/SGST/IGST breakdown, and one-click monthly sales summaries.",
    },
    {
      icon: "💬",
      title: "WhatsApp & SMS Notifications",
      desc: "Send branded digital invoices, payment confirmations, and credit balance reminders directly to customer phones.",
    },
    {
      icon: "🔐",
      title: "Audit Trail & Data Security",
      desc: "Every critical deletion, price change, and payment transaction is logged with timestamp, user ID, and IP address.",
    },
  ];

  return (
    <section id="features" className="landing-section" aria-labelledby="features-heading">
      <div className="section-header">
        <span className="eyebrow">COMPLETE FEATURE SUITE</span>
        <h2 id="features-heading">Everything Your Retail Business Needs</h2>
        <p>
          A single integrated platform replaces fragmented calculators, physical registers, and complex enterprise accounting software.
        </p>
      </div>

      <div className="feature-cards-grid">
        {features.map((item, index) => (
          <div key={index} className="feature-box">
            <span className="box-icon" aria-hidden="true">
              {item.icon}
            </span>
            <h4>{item.title}</h4>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
