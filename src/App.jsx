import { useEffect } from 'react';
import './styles.css';

const pageMarkup = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="ck" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
<symbol id="chart" viewBox="0 0 24 24"><path d="M3 3v18h18M7 15l4-4 3 3 5-6"/></symbol>
<symbol id="wallet" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2zM16 14h.01"/></symbol>
<symbol id="book" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2zM4 19a2 2 0 0 1 2-2h13M9 8h6"/></symbol>
<symbol id="doc" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6"/></symbol>
<symbol id="chat" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.7 7L3 21l2-5.6A8 8 0 1 1 21 12z"/></symbol>
<symbol id="cloud" viewBox="0 0 24 24"><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.3 9.6 4.8 4.8 0 0 0 7 19z"/></symbol>
<symbol id="split" viewBox="0 0 24 24"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M21 16v5h-5M21 21l-6-6M3 8V3h5M3 3l6 6"/></symbol>
<symbol id="dl" viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16"/></symbol>
<symbol id="users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></symbol>
<symbol id="lock" viewBox="0 0 24 24"><path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"/></symbol>
<symbol id="cart" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6M10 20h.01M17 20h.01"/></symbol>
<symbol id="list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol>
<symbol id="tag" viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01"/></symbol>
</defs></svg>

<header><div class="wrap nav">
  <a href="#"><img src="/logo-header-light.svg" alt="DukanKhata"></a>
  <ul><li><a href="#how">How it works</a></li><li><a href="#features">Features</a></li><li><a href="#modes">Modes</a></li><li><a href="#pricing">Pricing</a></li><li><a href="#faq">FAQ</a></li></ul>
  <a href="#download" class="btn btn-dark">Download APK</a>
</div></header>

<main>
<div class="hero"><div class="wrap hero-grid">
  <div>
    <span class="pill">Daily sales book · Udhar · GST billing</span>
    <h1>The modern khata book for <em>Indian shops.</em></h1>
    <p class="lead">Close your day in 30 seconds. Know if you're short or extra. Track cash, UPI and udhar, and bill customers with GST invoices — all synced to the cloud.</p>
    <div class="cta"><a href="#download" class="btn btn-gold"><svg class="i"><use href="#dl"/></svg>Download DukanKhata.apk</a><button type="button" class="btn btn-dark" data-soon>Open Web App</button></div>
    <div class="checks"><span><svg class="i"><use href="#ck"/></svg>Cash &amp; UPI tracking</span><span><svg class="i"><use href="#ck"/></svg>GST invoices</span><span><svg class="i"><use href="#ck"/></svg>WhatsApp sharing</span></div>
  </div>
  <div class="visual">
    <div class="phone"><div><img src="/screens/history.jpg" alt="DukanKhata financial overview"></div></div>
    <div class="float f1 mono"><small style="font-size:11px;letter-spacing:.1em;color:#5B6B63">TODAY'S CLOSING</small><div class="r" style="margin-top:8px"><span>Estimate</span><b>₹3,560</b></div><div class="r"><span>Actual</span><b>₹3,560</b></div><span class="ok"><svg class="i" style="width:12px;height:12px;stroke-width:3"><use href="#ck"/></svg>BALANCED</span></div>
    <div class="float f2"><small>PhonePe / UPI</small><b>₹7,550</b></div>
  </div>
</div></div>

<div class="trust"><div class="wrap">
  <div><b>30 sec</b><span>Daily closing</span></div><div><b>GST</b><span>A4 tax invoices</span></div><div><b>Cash + UPI</b><span>Always reconciled</span></div><div><b>Cloud</b><span>Synced &amp; backed up</span></div>
</div></div>

<section id="how"><div class="wrap center">
  <span class="eyebrow">How it works</span><h2>From counter to closing in three steps</h2>
  <p class="sub">No spreadsheets, no paper registers. Just the numbers that matter.</p>
  <div class="steps" style="text-align:left">
    <div class="step"><span class="n">01</span><h3>Record sales</h3><p>Log cash and PhonePe collections, or bill at the counter with POS.</p></div>
    <div class="step"><span class="n">02</span><h3>Close the day</h3><p>Enter your target and actual sales. DukanKhata tags the day Balanced, Extra or Short.</p></div>
    <div class="step"><span class="n">03</span><h3>Share and review</h3><p>Send statements, bills and PDF reports on WhatsApp, anytime.</p></div>
  </div>
</div></section>

<section id="features" class="alt"><div class="wrap center">
  <span class="eyebrow">Features</span><h2>Everything a shop owner needs. Nothing they don't.</h2><p class="sub">Tags show which mode each feature belongs to. "Both" works in Small and Large Shop mode.</p>
  <div class="grid3" style="text-align:left">
    <div class="feat"><div class="ico"><svg class="i"><use href="#chart"/></svg></div><span class="m">Small</span><h3>Auto profit / loss badge</h3><p>Compares expected menu sales with actual cash and online collections. Every day is tagged Balanced, Extra or Short.</p></div>
    <div class="feat"><div class="ico p"><svg class="i"><use href="#list"/></svg></div><span class="m">Small</span><h3>Menu quantity steppers</h3><p>Set up your price list once. Tap + and − to count items and the target sales are calculated for you.</p></div>
    <div class="feat"><div class="ico g"><svg class="i"><use href="#wallet"/></svg></div><span class="m">Small</span><h3>Daily expense logging</h3><p>Log gas, milk, sugar, cup boxes and other expenses right on the closing screen.</p></div>
    <div class="feat"><div class="ico"><svg class="i"><use href="#cart"/></svg></div><span class="m l">Large</span><h3>Real-time POS billing</h3><p>Build itemized carts fast, change quantities instantly and type in custom items that are not on your list.</p></div>
    <div class="feat"><div class="ico p"><svg class="i"><use href="#split"/></svg></div><span class="m l">Large</span><h3>Smart Split Payment</h3><p>Split one bill across Cash, UPI / Online and the customer's Udhar ledger, all in one tap.</p></div>
    <div class="feat"><div class="ico g"><svg class="i"><use href="#doc"/></svg></div><span class="m l">Large</span><h3>GST A4 tax invoices</h3><p>Professional invoices with shop header, GSTIN, tax breakdown table and signatory line.</p></div>
    <div class="feat"><div class="ico"><svg class="i"><use href="#chat"/></svg></div><span class="m l">Large</span><h3>1-tap WhatsApp sharing</h3><p>Send PDF invoices and receipts straight to the customer's WhatsApp number.</p></div>
    <div class="feat"><div class="ico p"><svg class="i"><use href="#tag"/></svg></div><span class="m l">Large</span><h3>Today's bills &amp; auto closing</h3><p>Search, reprint or re-share any bill. Finalize Closing adds up all counter bills with no manual math.</p></div>
    <div class="feat"><div class="ico g"><svg class="i"><use href="#book"/></svg></div><span class="m b">Both</span><h3>Customer Udhar khata</h3><p>Search by index, name or mobile. Advance shows in green, outstanding credit in red, with PDF statements to share.</p></div>
    <div class="feat"><div class="ico"><svg class="i"><use href="#users"/></svg></div><span class="m b">Both</span><h3>Staff commission ledger</h3><p>Record sales by staff or agents, set a commission % for each, link credit sales to customers and track payouts.</p></div>
    <div class="feat"><div class="ico p"><svg class="i"><use href="#chart"/></svg></div><span class="m b">Both</span><h3>Analytics &amp; A4 reports</h3><p>Net profit = (PhonePe + Cash) − expenses − staff salaries. Filter by 10 days, month or custom range, then download a PDF.</p></div>
    <div class="feat"><div class="ico g"><svg class="i"><use href="#lock"/></svg></div><span class="m b">Both</span><h3>Secure &amp; synced</h3><p>Signing in on a new device ends the old session. Records are cloud-synced and backed up.</p></div>
  </div>
</div></section>

<section id="modes"><div class="wrap">
  <span class="eyebrow">Two operating modes</span><h2>One app. Built around how your shop runs.</h2>
  <p class="sub">Pick the mode that fits today and switch anytime as you grow.</p>
  <div class="tabs" role="tablist"><button class="on" data-m="small">Small Shop</button><button data-m="large">Large Shop</button></div>
  <div class="mode on" id="small">
    <div><span class="tag">30-SEC CLOSING</span><h3>Small Shop Mode</h3><p class="for">Kiosks, tea stalls, bakeries and small daily retail stores.</p>
      <ul><li><svg class="i"><use href="#ck"/></svg>Quick end-of-day sales closing</li><li><svg class="i"><use href="#ck"/></svg>Cash &amp; PhonePe collection logging</li><li><svg class="i"><use href="#ck"/></svg>Automatic profit / loss variance badge</li><li><svg class="i"><use href="#ck"/></svg>Menu quantity steppers with auto target sales</li><li><svg class="i"><use href="#ck"/></svg>Daily expense logging and Udhar deductions</li></ul></div>
    <div class="shot"><div><img src="/screens/history.jpg" alt="Small shop daily breakdown" loading="lazy"></div></div>
  </div>
  <div class="mode" id="large">
    <div><span class="tag g">POS &amp; GST</span><h3>Large Shop Mode</h3><p class="for">Busy counters, supermarkets, pharmacies and retail shops.</p>
      <ul><li><svg class="i"><use href="#ck"/></svg>Real-time POS counter billing &amp; cart checkout</li><li><svg class="i"><use href="#ck"/></svg>Itemized GST A4 invoices with WhatsApp sharing</li><li><svg class="i"><use href="#ck"/></svg>Today's bills history, reprint and re-share</li><li><svg class="i"><use href="#ck"/></svg>Finalize Closing auto-adds all counter bills</li><li><svg class="i"><use href="#ck"/></svg><span><b>Smart Split Payment</b> with Auto-Ledger checkout</span></li></ul></div>
    <div class="pos mono" aria-label="Illustration of a POS bill">
      <div class="ln"><span>Tea × 2</span><span>₹20</span></div><div class="ln"><span>Cream roll × 1</span><span>₹15</span></div><div class="ln"><span>Pani bottle × 1</span><span>₹20</span></div><div class="ln"><span>GST</span><span>incl.</span></div>
      <div class="tot"><span>Total</span><span>₹55</span></div><div class="go">Generate GST Invoice →</div>
    </div>
  </div>

  <div class="sp" id="split">
    <div>
      <span class="badge">EXCLUSIVE · LARGE SHOP</span>
      <h3>Smart Split Payment &amp; Auto-Ledger Checkout</h3>
      <p>Split a single bill across payment methods. Pay part in <b>Cash</b>, part via <b>UPI / Online</b>, and post the remaining balance straight to the <b class="g">Customer Udhar Khata Ledger</b> in 1 tap.</p>
      <div class="st"><span>1 · Cash</span><span>2 · UPI / Online</span><span>3 · Balance → Udhar</span></div>
    </div>
    <div class="bc" aria-label="Example bill split">
      <div class="hd"><small>Example bill split</small><b>₹1,000</b></div>
      <div class="bar"><i style="width:50%;background:#2F8A55"></i><i style="width:30%;background:#5F259F"></i><i style="width:20%;background:#E8C468"></i></div>
      <div class="row"><span><i class="dot" style="background:#2F8A55"></i>Cash paid</span><span class="mono" style="color:#2F8A55">₹500</span></div>
      <div class="row"><span><i class="dot" style="background:#5F259F"></i>UPI online</span><span class="mono" style="color:#5F259F">₹300</span></div>
      <div class="led"><span>Auto Udhar ledger</span><span class="mono">₹200</span></div>
      <div class="one">Complete checkout in 1 tap →</div>
    </div>
  </div>
</div></section>

<section id="app" class="alt"><div class="wrap center">
  <span class="eyebrow">Inside the app</span><h2>Clear numbers. Zero clutter.</h2><p class="sub">Real screens from DukanKhata.</p>
  <div class="apps">
    <figure><div class="shot"><div><img src="/screens/history.jpg" alt="Financial overview" loading="lazy"></div></div><figcaption>Financial overview</figcaption><p>Target vs actual, Cash vs UPI, expenses and Udhar for any period.</p></figure>
    <figure><div class="shot"><div><img src="/screens/credit-ledger.jpg" alt="Credit ledger" loading="lazy"></div></div><figcaption>Credit ledger</figcaption><p>Search by name or mobile and see advance or credit at a glance.</p></figure>
    <figure><div class="shot"><div><img src="/screens/customer-ledger.jpg" alt="Customer statement" loading="lazy"></div></div><figcaption>Customer statements</figcaption><p>Credit sales, payments and advances, ready to share.</p></figure>
  </div>
</div></section>

<section id="pricing"><div class="wrap center">
  <span class="eyebrow">Pricing</span><h2>Simple plans. No hidden fees.</h2>
  <div class="bill" role="tablist"><button class="on" data-b="m">Monthly</button><button data-b="y">Yearly</button></div>
  <div class="plans">
    <div class="plan"><h3>Small Shop</h3>
      <div class="amt"><span class="p" data-m="₹199" data-y="₹1,999">₹199</span><span class="per"> / <span class="u">month</span></span></div>
      <div class="save" data-y="Save ₹389 vs monthly"></div>
      <ul><li><svg class="i"><use href="#ck"/></svg>30-second daily closing</li><li><svg class="i"><use href="#ck"/></svg>Cash &amp; PhonePe logging</li><li><svg class="i"><use href="#ck"/></svg>Profit / loss variance badge</li><li><svg class="i"><use href="#ck"/></svg>Menu steppers &amp; expense logging</li></ul>
      <a href="#download" class="btn btn-out">Get Started</a></div>
    <div class="plan pop"><span class="pl">MOST POPULAR</span><h3>Large Shop / POS</h3>
      <div class="amt"><span class="p" data-m="₹299" data-y="₹2,999">₹299</span><span class="per"> / <span class="u">month</span></span></div>
      <div class="save" data-y="Save ₹589 vs monthly"></div>
      <ul><li><svg class="i"><use href="#ck"/></svg>Real-time POS billing</li><li><svg class="i"><use href="#ck"/></svg>GST A4 invoices &amp; WhatsApp sharing</li><li><svg class="i"><use href="#ck"/></svg>Bills history &amp; auto EOD closing</li><li><svg class="i"><use href="#ck"/></svg>Smart Split Payment &amp; Auto-Ledger</li></ul>
      <a href="#download" class="btn btn-gold">Get Started</a></div>
  </div>
</div></section>

<section id="faq" class="alt"><div class="wrap center">
  <span class="eyebrow">FAQ</span><h2>Good to know</h2>
  <div class="faq" style="text-align:left">
    <details><summary>Can I switch between Small and Large Shop mode?</summary><p>Yes. You can switch operating modes anytime inside the application.</p></details>
    <details><summary>Can a customer pay part in cash, part by UPI and the rest on credit?</summary><p>Yes, in Large Shop mode. Split a single bill across Cash and UPI / Online, and the remaining balance posts to the customer's Udhar Khata ledger in one tap.</p></details>
    <details><summary>Is my data safe?</summary><p>Your records are cloud-synced, so they are backed up and available beyond a single phone.</p></details>
    <details><summary>Can I share bills and reports with customers?</summary><p>Yes. Share customer statements, bills and PDF financial reports, including on WhatsApp.</p></details>
    <details><summary>How do I get help?</summary><p>Email us at <a href="mailto:dukankhata.help@gmail.com" style="text-decoration:underline">dukankhata.help@gmail.com</a>.</p></details>
  </div>
</div></section>

<div class="final" id="download"><div class="wrap">
  <img src="/logo-header-dark.svg" alt="DukanKhata">
  <h2>Close today's books in <em>30 seconds.</em></h2>
  <p>Download the official DukanKhata™ Android app.</p>
  <a href="#" class="btn btn-gold"><svg class="i"><use href="#dl"/></svg>Download DukanKhata.apk</a>
</div></div>
</main>
<div class="ov" id="soon" role="dialog" aria-modal="true" aria-labelledby="st"><div class="md">
  <button class="x" aria-label="Close" data-close>&times;</button>
  <div class="ico"><svg class="i" style="width:26px;height:26px"><use href="#cloud"/></svg></div>
  <h3 id="st">Web App — Coming soon</h3>
  <p>We're getting the DukanKhata web app ready. Until then, you can use everything on the Android app.</p>
  <a href="#download" class="btn btn-dark" data-close>Get the Android app</a>
</div></div>
<footer class="bottom"><div class="wrap"><span>© 2026 DukanKhata™. All rights reserved.</span><a href="mailto:dukankhata.help@gmail.com">dukankhata.help@gmail.com</a></div></footer>


`;

export default function App() {
  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_ID;
    if (gaId && !document.querySelector(`script[data-ga-id="${gaId}"]`)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', gaId);
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      script.dataset.gaId = gaId;
      document.head.appendChild(script);
    }
    const root = document.getElementById('dukankhata-root');
    if (!root) return;
    const modeButtons = root.querySelectorAll('.tabs button');
    const modes = root.querySelectorAll('.mode');
    modeButtons.forEach((button) => {
      button.onclick = () => {
        modeButtons.forEach((x) => x.classList.remove('on'));
        modes.forEach((x) => x.classList.remove('on'));
        button.classList.add('on');
        root.querySelector('#' + button.dataset.m)?.classList.add('on');
      };
    });
    const billingButtons = root.querySelectorAll('.bill button');
    billingButtons.forEach((button) => {
      button.onclick = () => {
        billingButtons.forEach((x) => x.classList.remove('on'));
        button.classList.add('on');
        const yearly = button.dataset.b === 'y';
        root.querySelectorAll('.p').forEach((p) => { p.textContent = yearly ? p.dataset.y : p.dataset.m; });
        root.querySelectorAll('.u').forEach((u) => { u.textContent = yearly ? 'year' : 'month'; });
        root.querySelectorAll('.save').forEach((s) => { s.textContent = yearly ? s.dataset.y : ''; });
      };
    });
    const overlay = root.querySelector('#soon');
    root.querySelectorAll('[data-soon]').forEach((button) => {
      button.onclick = () => { overlay?.classList.add('on'); overlay?.querySelector('.x')?.focus(); };
    });
    const overlayClick = (event) => {
      if (event.target === overlay || event.target.closest('[data-close]')) overlay?.classList.remove('on');
    };
    overlay?.addEventListener('click', overlayClick);
    const escapeHandler = (event) => { if (event.key === 'Escape') overlay?.classList.remove('on'); };
    document.addEventListener('keydown', escapeHandler);
    return () => {
      document.removeEventListener('keydown', escapeHandler);
      overlay?.removeEventListener('click', overlayClick);
    };
  }, []);
  return <div id="dukankhata-root" dangerouslySetInnerHTML={{ __html: pageMarkup }} />;
}
