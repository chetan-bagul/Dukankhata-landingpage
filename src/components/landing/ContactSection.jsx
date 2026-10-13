import { useState } from "react";
import { Link } from "react-router-dom";

export default function ContactSection() {
  const [form, setForm] = useState({ name: "", phone: "", shopType: "Kirana / Grocery" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="landing-section" aria-labelledby="contact-heading">
      <div className="cta-banner-wrapper">
        <div className="cta-banner-content">
          <span className="eyebrow gold" style={{ background: "rgba(232, 196, 104, 0.15)", color: "var(--gold)" }}>
            READY TO TRANSFORM YOUR SHOP?
          </span>
          <h2 id="contact-heading">Take Control of Your Daily Sales Today</h2>
          <p>
            Join thousands of Indian retailers saving 2+ hours every day with automated daily closing, rapid POS billing, and customer Udhar tracking.
          </p>
          <div className="cta-banner-actions" style={{ marginTop: "24px" }}>
            <Link className="btn btn-accent btn-lg" to="/signup">
              Start Free Trial Now
            </Link>
            <Link className="btn btn-outline btn-lg" to="/login" style={{ background: "rgba(255, 255, 255, 0.12)", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.25)" }}>
              Merchant Login
            </Link>
          </div>
        </div>

        {/* Quick Callback / Consultation Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
            color: "var(--ink)",
            maxWidth: "380px",
            width: "100%",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <h3 style={{ fontSize: "18px", color: "var(--deep)", marginBottom: "4px" }}>
            Request a Free Store Setup
          </h3>
          <p style={{ fontSize: "13px", color: "var(--mute)", marginBottom: "16px" }}>
            Our retail specialists will help you configure your inventory and counter printers.
          </p>

          {submitted ? (
            <div className="success-box" style={{ margin: "10px 0" }}>
              ✓ Thank you! Our onboarding team will call you within 1 business hour.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label htmlFor="callback-name" style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>YOUR NAME</label>
                <input
                  id="callback-name"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="callback-phone" style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>MOBILE NUMBER</label>
                <input
                  id="callback-phone"
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  pattern="[0-9]{10}"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="callback-shop" style={{ fontSize: "11px", fontWeight: 700, color: "var(--mute)" }}>SHOP TYPE</label>
                <select
                  id="callback-shop"
                  value={form.shopType}
                  onChange={(e) => setForm({ ...form, shopType: e.target.value })}
                >
                  <option>Kirana / Grocery Store</option>
                  <option>Chai / Snacks / Fast Food</option>
                  <option>Supermarket / Departmental</option>
                  <option>Bakery &amp; Sweet Shop</option>
                  <option>Pharmacy / Medical Store</option>
                  <option>Hardware / Electrical</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" style={{ marginTop: "8px", width: "100%" }}>
                Request Callback
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
