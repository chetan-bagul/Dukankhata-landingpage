import { useState } from "react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "Can I use DukanKhata on my mobile phone or tablet?",
      a: "Yes! DukanKhata is 100% responsive and works seamlessly across Android phones, iPhones, iPads, Android tablets, and Windows/Mac desktop browsers. You can run POS billing on a PC while checking daily closing on your phone.",
    },
    {
      q: "How does Small Shop Mode differ from Large Shop Mode?",
      a: "Small Shop Mode is built for fast food counters, tea stalls, and kiosks where you just want to tap item quantities sold (+ / −), log daily expenses, and reconcile cash/UPI in 30 seconds. Large Shop Mode provides full barcode POS billing, customer Udhar tracking, purchase orders, and live inventory management.",
    },
    {
      q: "Does DukanKhata support thermal printers and barcode scanners?",
      a: "Yes. Standard USB and Bluetooth thermal receipt printers (58mm and 80mm) as well as 1D/2D wireless USB barcode scanners work natively without installing extra drivers.",
    },
    {
      q: "Is my shop's customer and financial data safe and isolated?",
      a: "Absolutely. DukanKhata implements strict multi-tenant tenant isolation and server-side authorization on every single transaction. Your data, customers, and profit figures are strictly accessible only to your authenticated shop account.",
    },
    {
      q: "Can my staff create invoices without seeing my total shop profit?",
      a: "Yes. DukanKhata includes granular role-based access. Staff and Cashiers can generate bills and record payments, while sensitive profit margins, closing reconciliations, and supplier costs remain visible strictly to the shop Owner.",
    },
    {
      q: "How does the 30-day free trial work?",
      a: "You get immediate full access to all DukanKhata features upon signing up with your mobile number. No credit card or advance payment is required. At the end of the trial, you can choose an affordable subscription plan to continue.",
    },
  ];

  const toggleFaq = (index) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  };

  return (
    <section id="faq" className="landing-section narrow" aria-labelledby="faq-heading">
      <div className="section-header">
        <span className="eyebrow">FREQUENTLY ASKED QUESTIONS</span>
        <h2 id="faq-heading">Got Questions? We've Got Answers</h2>
        <p>
          Everything you need to know about setting up and running DukanKhata™ in your store.
        </p>
      </div>

      <div className="faq-list">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
              <button
                className="faq-question-btn"
                onClick={() => toggleFaq(idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
                id={`faq-question-${idx}`}
              >
                <span>{faq.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  ▼
                </span>
              </button>
              {isOpen && (
                <div
                  id={`faq-answer-${idx}`}
                  className="faq-answer"
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
