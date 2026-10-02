import React, { useEffect, useState } from "react";

export default function App() {
  const [mode, setMode] = useState("small");
  const [billing, setBilling] = useState("m");

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  const yearly = billing === "y";

  return (
    <>

<header>
<div className="wrap nav">
<a href="#"><img alt="DukanKhata" src="/logo-header-light.svg"/></a>
<ul>
<li><a href="#modes">Modes</a></li><li><a href="#features">Features</a></li><li><a href="#app">The app</a></li><li><a href="#pricing">Pricing</a></li><li><a href="#faq">FAQ</a></li>
</ul>
<a className="btn" href="#download">Download APK</a>
</div>
</header>
<main>
{/* HERO */}
<div className="hero"><div className="wrap hero-grid">
<div>
<span className="eyebrow">Daily sales book · Udhar khata · GST billing</span>
<h1 className="serif">The khata book your shop <em>always wanted.</em></h1>
<p className="lead">Close your day in 30 seconds. Know if you're short or extra. Track cash, UPI and udhar — and bill customers with GST invoices. All in one app, synced to the cloud.</p>
<div className="cta">
<a className="btn btn-gold" href="#download">📲 Download DukanKhata.apk</a>
<a className="btn btn-ghost" href="https://api.dukankhata.in" rel="noopener" target="_blank">Open Web App</a>
</div>
<div className="ticks"><span>Cash &amp; UPI tracking</span><span>GST invoices</span><span>WhatsApp sharing</span></div>
</div>
<div className="stage">
<div className="phone p1"><div className="scr"><img alt="DukanKhata history and financial overview" src="/screens/history.jpg"/></div></div>
<div className="phone p2"><div className="scr"><img alt="Customer ledger with credit history" src="/screens/customer-ledger.jpg"/></div></div>
<div className="slip mono">
<div className="t">Today's closing</div>
<div className="r"><span>Estimate</span><span>₹3,560</span></div>
<div className="r"><span>Actual</span><b>₹3,560</b></div>
<div className="stamp">BALANCED</div>
</div>
</div>
</div></div>
<div className="strip"><div aria-hidden="true" className="row">
<span>30-sec closing</span><span>★</span><span>Cash &amp; UPI</span><span>★</span><span>Udhar khata</span><span>★</span><span>GST A4 invoices</span><span>★</span><span>PDF reports</span><span>★</span><span>Cloud sync</span><span>★</span>
<span>30-sec closing</span><span>★</span><span>Cash &amp; UPI</span><span>★</span><span>Udhar khata</span><span>★</span><span>GST A4 invoices</span><span>★</span><span>PDF reports</span><span>★</span><span>Cloud sync</span><span>★</span>
</div></div>
{/* MODES */}
<section id="modes"><div className="wrap">
<div className="head"><span className="eyebrow">Two operating modes</span>
<h2 className="serif">One app. Built around how your shop runs.</h2>
<p>Pick the mode that fits today and switch anytime as you grow.</p></div>
<div className="tabs" role="tablist"><button className={mode === "small" ? "on" : ""} data-m="small" onClick={() => setMode("small")}>🏪 Small Shop</button><button className={mode === "large" ? "on" : ""} data-m="large" onClick={() => setMode("large")}>⚡ Large Shop</button></div>
<div className={`mode ${mode === "small" ? "on" : ""}`} id="small">
<div>
<span className="tag">30-SEC CLOSING</span>
<h3 className="serif">Small Shop Mode</h3>
<p className="for">Kiosks, tea stalls, bakeries and small daily retail stores.</p>
<ul><li><b>✓</b>Quick end-of-day sales closing</li><li><b>✓</b>Cash &amp; PhonePe collection logging</li><li><b>✓</b>Automatic profit / loss variance badge</li></ul>
</div>
<div className="shot"><div><img alt="Small shop daily breakdown" src="/screens/history.jpg" style={{marginTop: "-8px"}}/></div></div>
</div>
<div className={`mode ${mode === "large" ? "on" : ""}`} id="large">
<div>
<span className="tag g">POS &amp; GST</span>
<h3 className="serif">Large Shop Mode</h3>
<p className="for">Busy counters, supermarkets, pharmacies and retail shops.</p>
<ul><li><b>✓</b>Real-time POS counter billing &amp; cart checkout</li><li><b>✓</b>Itemized GST A4 tax invoices with WhatsApp sharing</li><li><b>✓</b>Daily sales history &amp; inventory rollup, automatic</li><li><b>✓</b><span><strong>Smart Split Payment</strong> with Auto-Ledger checkout <a href="#split" style={{color: "var(--cash)", textDecoration: "underline"}}>· see how</a></span></li></ul>
</div>
<div aria-label="Illustration of a POS bill" className="pos mono">
<div className="ln"><span>Tea × 2</span><span>₹20</span></div>
<div className="ln"><span>Cream roll × 1</span><span>₹15</span></div>
<div className="ln"><span>Pani bottle × 1</span><span>₹20</span></div>
<div className="ln"><span>GST</span><span>incl.</span></div>
<div className="tot"><span>Total</span><span>₹55</span></div>
<div className="go">Generate GST Invoice →</div>
</div>
</div>
{/* EXCLUSIVE: SMART SPLIT PAYMENT */}
<div className="sp" id="split">
<div style={{position: "relative", zIndex: "1"}}>
<span className="badge">⚡ EXCLUSIVE LARGE SHOP FEATURE</span>
<h3>Smart Split Payment &amp; Auto-Ledger Checkout</h3>
<p>Counter customers can split a single bill across multiple payment methods. Pay part in <b>Cash</b>, part via <b>UPI / Online</b>, and automatically post the remaining unpaid balance directly to their <b className="g">Customer Udhar Khata Ledger</b> in 1 tap.</p>
<div className="steps"><span>1 · Cash</span><span>2 · UPI / Online</span><span>3 · Balance → Udhar</span></div>
</div>
<div aria-label="Example bill split" className="bill-card">
<div className="hd"><small>Example bill split</small><b>₹1,000</b></div>
<div className="bar"><i style={{width: "50%", background: "#2F8A55"}}></i><i style={{width: "30%", background: "#5F259F"}}></i><i style={{width: "20%", background: "#E8C468"}}></i></div>
<div className="row"><span><i className="dot" style={{background: "#2F8A55"}}></i>💵 Cash paid</span><span className="amt2" style={{color: "#2F8A55"}}>₹500</span></div>
<div className="row"><span><i className="dot" style={{background: "#5F259F"}}></i>📱 UPI online</span><span className="amt2" style={{color: "#5F259F"}}>₹300</span></div>
<div className="led"><span>📘 Auto Udhar ledger</span><span className="amt2">₹200</span></div>
<div className="one">Complete checkout in 1 tap →</div>
</div>
</div>
</div></section>
{/* FEATURES */}
<section id="features" style={{paddingTop: "20px"}}><div className="wrap">
<div className="head"><span className="eyebrow">Features</span>
<h2 className="serif">Everything a shop owner needs. Nothing they don't.</h2></div>
<div className="bento">
<div className="card c-a"><div className="ico">📈</div><h3>Know every day: balanced, extra or short</h3><p>Enter your target and actual sales. DukanKhata tags each day automatically so mistakes show up the same evening.</p>
<div className="badges"><span className="bd b">BALANCED</span><span className="bd e">EXTRA ₹194</span><span className="bd s">SHORT ₹40</span></div></div>
<div className="card c-b"><div className="ico" style={{background: "#EBDDF7"}}>₹</div><h3>Cash vs UPI, always reconciled</h3><p>Log cash and PhonePe separately and see the split for any period.</p>
<div className="split"><div style={{background: "#DCEBE1", color: "#1E5C3B"}}>₹2,160<small>Cash</small></div><div style={{background: "#EBDDF7", color: "#5F259F"}}>₹7,550<small>PhonePe / UPI</small></div></div></div>
<div className="card c-c"><div className="ico" style={{background: "#F8EDC9"}}>📒</div><h3>Udhar khata</h3><p>Credit given, payments received and advances for every customer, in one ledger.</p></div>
<div className="card c-d"><div className="ico">🧾</div><h3>GST invoices</h3><p>Itemized A4 tax invoices, generated at checkout.</p></div>
<div className="card c-e dark"><div className="ico" style={{background: "rgba(255,255,255,.12)"}}>💬</div><h3>Share in one tap</h3><p>Send customer statements, bills and PDF financial reports on WhatsApp.</p></div>
</div>
</div></section>
{/* APP SCREENS */}
<section id="app" style={{background: "var(--paper2)", borderBlock: "1px solid var(--line)"}}><div className="wrap">
<div className="head"><span className="eyebrow">Inside the app</span>
<h2 className="serif">Clear numbers. Zero clutter.</h2>
<p>Real screens from DukanKhata.</p></div>
<div className="apps">
<figure><div className="shot"><div style={{maxHeight: "520px"}}><img alt="Financial overview" loading="lazy" src="/screens/history.jpg"/></div></div><figcaption>Financial overview</figcaption><p>Target vs actual, Cash vs UPI, and daily breakdown.</p></figure>
<figure><div className="shot"><div><img alt="Credit ledger" loading="lazy" src="/screens/credit-ledger.jpg"/></div></div><figcaption>Credit ledger</figcaption><p>Search customers and see who owes what.</p></figure>
<figure><div className="shot"><div><img alt="Customer statement" loading="lazy" src="/screens/customer-ledger.jpg"/></div></div><figcaption>Customer statements</figcaption><p>Credit sales, payments, advances — shareable.</p></figure>
</div>
</div></section>
{/* PRICING */}
<section id="pricing"><div className="wrap price-wrap">
<div className="head"><span className="eyebrow">Pricing</span>
<h2 className="serif">Simple plans. No hidden fees.</h2></div>
<div className="bill" role="tablist"><button className={billing === "m" ? "on" : ""} data-b="m" onClick={() => setBilling("m")}>Monthly</button><button className={billing === "y" ? "on" : ""} data-b="y" onClick={() => setBilling("y")}>Yearly <small>· save more</small></button></div>
<div className="plans">
<div className="plan">
<h3>Small Shop</h3>
<div className="amt"><span className="p">{yearly ? "₹1,999" : "₹199"}</span><span className="per"> / <span className="u">{yearly ? "year" : "month"}</span></span></div>
<div className="save">{yearly ? "Save ₹389 vs monthly" : ""}</div>
<ul><li>30-second daily closing</li><li>Cash &amp; PhonePe logging</li><li>Profit / loss variance badge</li></ul>
<a className="btn btn-ghost" href="#download">Get Started</a>
</div>
<div className="plan pop">
<span className="pill">MOST POPULAR</span>
<h3>Large Shop / POS</h3>
<div className="amt"><span className="p">{yearly ? "₹2,999" : "₹299"}</span><span className="per"> / <span className="u">{yearly ? "year" : "month"}</span></span></div>
<div className="save">{yearly ? "Save ₹589 vs monthly" : ""}</div>
<ul><li>Real-time POS billing</li><li>GST A4 invoices &amp; WhatsApp sharing</li><li>Sales history &amp; inventory rollup</li><li>Smart Split Payment &amp; Auto-Ledger checkout</li></ul>
<a className="btn btn-gold" href="#download">Get Started</a>
</div>
</div>
</div></section>
{/* FAQ */}
<section id="faq" style={{paddingTop: "0"}}><div className="wrap">
<div className="head"><span className="eyebrow">Questions</span><h2 className="serif">Good to know</h2></div>
<div className="faq">
<details><summary>Can I switch between Small and Large Shop mode?</summary><p>Yes. You can switch operating modes anytime inside the application.</p></details>
<details><summary>Can a customer pay part in cash, part by UPI and the rest on credit?</summary><p>Yes, in Large Shop mode. Split a single bill across Cash and UPI / Online, and the remaining unpaid balance posts to the customer's Udhar Khata ledger in one tap.</p></details>
<details><summary>Is my data safe?</summary><p>Your records are cloud-synced, so they are backed up and available beyond a single phone.</p></details>
<details><summary>Can I share bills and reports with customers?</summary><p>Yes. Share customer statements, bills and PDF financial reports, including on WhatsApp.</p></details>
<details><summary>How do I get help?</summary><p>Email us at <a href="mailto:dukankhata.help@gmail.com" style={{textDecoration: "underline"}}>dukankhata.help@gmail.com</a>.</p></details>
</div>
</div></section>
{/* FINAL CTA */}
<div className="final" id="download"><div className="wrap">
<img alt="DukanKhata" src="/logo-header-dark.svg"/>
<h2>Close today's books in <em>30 seconds.</em></h2>
<p>Download the official DukanKhata™ Android app.</p>
<a className="btn btn-gold" href="#">📲 Download DukanKhata.apk</a>
</div></div>
</main>
<footer className="bottom"><div className="wrap"><span>© 2026 DukanKhata™. All rights reserved.</span><a href="mailto:dukankhata.help@gmail.com">dukankhata.help@gmail.com</a></div></footer>


    </>
  );
}
