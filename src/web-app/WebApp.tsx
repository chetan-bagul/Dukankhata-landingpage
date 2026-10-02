import React, { useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';
import { Store, Receipt, BookUser, BarChart3, CreditCard, Plus, Minus, X, Search, Printer, LogOut, Eye, EyeOff, Globe, ShieldCheck } from 'lucide-react';
import './index.css';

type Item = { id?: string; name: string; price: number; unit?: string };
type CartLine = { itemId?: string; name: string; qty: number; price: number };
type Customer = { id: string; indexNo: number; name: string; mobile: string; outstanding: number; availableAdvance: number };
const inr = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const GST_RATE = 0.05; // adjust per shop / per item as needed

// Razorpay is loaded only when someone subscribes, so the website and the rest of the app stay light.
const loadRazorpay = () => new Promise<void>((resolve, reject) => {
  if ((window as any).Razorpay) return resolve();
  const sc = document.createElement('script');
  sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
  sc.onload = () => resolve();
  sc.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'));
  document.body.appendChild(sc);
});

function Modal({ title, onClose, children, wide }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
      <div className={`max-h-[92vh] w-full overflow-auto rounded-2xl bg-white p-5 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand">{title}</h3>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- AUTH ---------------- */
function PasswordField({ value, onChange, placeholder, invalid, autoComplete }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`inp pr-10 ${invalid ? '!border-red-500 focus:!ring-red-300' : ''}`}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={onChange}
      />
      <button type="button" tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function Auth({ onDone }: { onDone: () => void }) {
  const [signup, setSignup] = useState(false);
  const [f, setF] = useState({ name: '', shopName: '', mobile: '', password: '', confirmPassword: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: k === 'mobile' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value });
  const mismatch = signup && f.confirmPassword.length > 0 && f.password !== f.confirmPassword;

  const validate = () => {
    if (signup && (!f.name.trim() || !f.shopName.trim())) return 'Please enter your name and shop name.';
    if (!/^\d{10}$/.test(f.mobile)) return 'Enter a valid 10-digit mobile number.';
    if (!f.password) return 'Please enter your password.';
    if (signup && f.password.length < 6) return 'Password must be at least 6 characters.';
    if (signup && f.password !== f.confirmPassword) return 'Password and confirm password do not match.';
    return '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) return setErr(v);
    setErr(''); setBusy(true);
    try {
      const deviceName = navigator.userAgent.slice(0, 40);
      // confirmPassword is checked here in the browser only and is NOT sent to the API.
      const body = signup
        ? { name: f.name.trim(), shopName: f.shopName.trim(), mobile: f.mobile, password: f.password, deviceName, operatingMode: 'LARGE_SHOP' }
        : { mobile: f.mobile, password: f.password, deviceName };
      const { data } = await api.post(signup ? 'auth/signup' : 'auth/login', body);
      localStorage.setItem('token', data.token);
      onDone();
    } catch (e: any) {
      setErr(e.response?.data?.message || (signup ? 'Could not create the account. Please try again.' : 'Could not sign in. Check mobile and password.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen min-w-[1000px] grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-between bg-gradient-to-br from-brand to-[#0A2B25] p-12 text-white">
        <a href="/" className="flex items-center gap-2"><img src="/logo-header-dark.svg" alt="DukanKhata" className="h-9" /></a>
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">Billing, udhar and daily closing — on your computer.</h2>
          <ul className="mt-6 space-y-3 text-[#C6DDD0]">
            <li className="flex items-center gap-2"><ShieldCheck size={18} className="text-gold" /> POS counter billing with GST invoices</li>
            <li className="flex items-center gap-2"><ShieldCheck size={18} className="text-gold" /> Cash + UPI + Udhar split payments</li>
            <li className="flex items-center gap-2"><ShieldCheck size={18} className="text-gold" /> Synced with your Android app</li>
          </ul>
        </div>
        <a href="/" className="text-sm text-[#C6DDD0] hover:text-white">← Back to dukankhata.in</a>
      </div>
      <div className="flex items-center justify-center bg-paper p-10">
        <form onSubmit={submit} noValidate className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-lg">
          <div>
            <h1 className="text-2xl font-extrabold text-brand">{signup ? 'Create your shop account' : 'Welcome back'}</h1>
            <p className="text-sm text-slate-500">DukanKhata <span className="font-semibold text-gold">Large Shop</span> · Web App</p>
          </div>
          {signup && (
            <div className="grid grid-cols-2 gap-3">
              <input className="inp" placeholder="Your name" value={f.name} onChange={set('name')} autoComplete="name" />
              <input className="inp" placeholder="Shop name" value={f.shopName} onChange={set('shopName')} autoComplete="organization" />
            </div>
          )}
          <input className="inp" placeholder="Mobile number (10 digits)" inputMode="numeric" value={f.mobile} onChange={set('mobile')} autoComplete="tel-national" />
          <PasswordField placeholder="Password" value={f.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} />
          {signup && (
            <div>
              <PasswordField placeholder="Confirm password" value={f.confirmPassword} onChange={set('confirmPassword')} invalid={mismatch} autoComplete="new-password" />
              {mismatch && <p className="mt-1 text-sm text-red-600">Passwords do not match.</p>}
            </div>
          )}
          {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={busy} className="btn w-full bg-gold text-brand">{busy ? 'Please wait…' : signup ? 'Create shop account' : 'Log in'}</button>
          <button type="button" className="w-full text-sm text-slate-500 hover:text-brand" onClick={() => { setSignup(!signup); setErr(''); setF({ ...f, password: '', confirmPassword: '' }); }}>
            {signup ? 'Already have an account? Log in' : 'New shop? Sign up'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- INVOICE ---------------- */
function Invoice({ bill, shop, onClose }: any) {
  const sub = bill.items.reduce((s: number, i: CartLine) => s + i.qty * i.price, 0);
  const tax = sub * GST_RATE;
  return (
    <Modal title="GST Tax Invoice" onClose={onClose} wide>
      <div id="invoice" className="bg-white p-6 text-sm">
        <div className="flex justify-between border-b-2 border-brand pb-3">
          <div><div className="text-xl font-extrabold text-brand">{shop?.shopName || 'Shop'}</div><div>GSTIN: {shop?.gstin || '—'}</div><div>{shop?.address}</div></div>
          <div className="text-right"><div className="font-bold">Invoice #{bill.id || bill.billNo || 'NEW'}</div><div>{new Date(bill.createdAt || Date.now()).toLocaleString('en-IN')}</div></div>
        </div>
        <table className="my-3 w-full"><thead><tr className="bg-slate-100 text-left"><th className="p-2">Item</th><th>Qty</th><th>Rate</th><th>GST {GST_RATE * 100}%</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{bill.items.map((i: CartLine, k: number) => (
            <tr key={k} className="border-b"><td className="p-2">{i.name}</td><td>{i.qty}</td><td>{inr(i.price)}</td><td>{inr(i.qty * i.price * GST_RATE)}</td><td className="text-right">{inr(i.qty * i.price * (1 + GST_RATE))}</td></tr>))}</tbody></table>
        <div className="ml-auto w-60 space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(sub)}</span></div>
          <div className="flex justify-between"><span>CGST / SGST</span><span>{inr(tax)}</span></div>
          <div className="flex justify-between border-t pt-1 text-lg font-bold"><span>Total</span><span>{inr(sub + tax)}</span></div>
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3">
          <b>Payment split:</b> Cash {inr(bill.cashPaid)} · Online {inr(bill.onlinePaid)} · Udhar {inr(bill.creditAmount)}
        </div>
        <div className="mt-12 text-right">______________________<br />Authorised signatory</div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn flex items-center gap-2 bg-brand text-white" onClick={() => window.print()}><Printer size={16} /> Print A4</button>
        <a className="btn bg-cash text-white" target="_blank" rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(`${shop?.shopName} bill: ${inr(sub + tax)}`)}`}>WhatsApp</a>
      </div>
    </Modal>
  );
}

/* ---------------- POS ---------------- */
function POS({ shop }: any) {
  const [menu, setMenu] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [custom, setCustom] = useState({ name: '', price: '' });
  const [pay, setPay] = useState(false);
  const [done, setDone] = useState<any>(null);
  useEffect(() => { api.get('menu').then((r) => setMenu(r.data)).catch(() => {}); }, []);

  const add = (it: Item) => setCart((c) => {
    const i = c.findIndex((l) => l.name === it.name && l.price === it.price);
    if (i >= 0) return c.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l));
    return [...c, { itemId: it.id, name: it.name, qty: 1, price: it.price }];
  });
  const upd = (i: number, p: Partial<CartLine>) => setCart((c) => c.map((l, k) => (k === i ? { ...l, ...p } : l)).filter((l) => l.qty > 0));
  const sub = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = sub * GST_RATE;
  const total = Math.round(sub + tax);
  const shown = menu.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid grid-cols-[1fr_400px] gap-4">
      <div>
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="inp pl-9" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="mb-3 flex gap-2">
          <input className="inp" placeholder="Custom item" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input className="inp w-28" placeholder="Price" inputMode="decimal" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} />
          <button className="btn bg-brand text-white" onClick={() => { if (custom.name && +custom.price > 0) { add({ name: custom.name, price: +custom.price }); setCustom({ name: '', price: '' }); } }}>Add</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {shown.map((m) => (
            <button key={m.id} onClick={() => add(m)} className="rounded-xl border bg-white p-3 text-left hover:border-gold">
              <div className="font-semibold">{m.name}</div><div className="text-cash">{inr(m.price)}{m.unit && <span className="text-xs text-slate-400"> / {m.unit}</span>}</div>
            </button>))}
          {!shown.length && <p className="col-span-full text-slate-500">No items yet. Add a custom item above to start billing.</p>}
        </div>
      </div>

      <aside className="h-fit rounded-2xl bg-white p-4 shadow sticky top-4">
        <h2 className="mb-2 font-bold text-brand">Current bill</h2>
        <div className="max-h-[45vh] space-y-2 overflow-auto">
          {cart.map((l, i) => (
            <div key={i} className="flex items-center gap-2 border-b pb-2">
              <div className="flex-1 text-sm font-medium">{l.name}</div>
              <input className="inp !w-20 !py-1" inputMode="decimal" value={l.price} onChange={(e) => upd(i, { price: +e.target.value || 0 })} />
              <button onClick={() => upd(i, { qty: l.qty - 1 })}><Minus size={16} /></button><span className="w-5 text-center">{l.qty}</span>
              <button onClick={() => upd(i, { qty: l.qty + 1 })}><Plus size={16} /></button>
              <button onClick={() => upd(i, { qty: 0 })} className="text-red-500"><X size={16} /></button>
            </div>))}
          {!cart.length && <p className="text-sm text-slate-400">Tap an item to add it.</p>}
        </div>
        <div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{inr(sub)}</span></div><div className="flex justify-between"><span>GST {GST_RATE * 100}%</span><span>{inr(tax)}</span></div></div>
        <div className="my-2 text-4xl font-extrabold text-brand">{inr(total)}</div>
        <button disabled={!cart.length} className="btn w-full bg-gold text-brand" onClick={() => setPay(true)}>Checkout</button>
      </aside>

      {pay && <Checkout total={total} onClose={() => setPay(false)} onPay={async (split: any) => {
        const body = { items: cart, ...split, paymentMethod: split.creditAmount ? (split.cashPaid || split.onlinePaid ? 'SPLIT' : 'CREDIT') : split.cashPaid && split.onlinePaid ? 'SPLIT' : split.onlinePaid ? 'ONLINE' : 'CASH' };
        const { data } = await api.post('pos/bills', body);
        setDone({ ...body, ...(data || {}) }); setPay(false); setCart([]);
      }} />}
      {done && <Invoice bill={done} shop={shop} onClose={() => setDone(null)} />}
    </div>
  );
}

function Checkout({ total, onClose, onPay }: any) {
  const [cash, setCash] = useState(''); const [online, setOnline] = useState(''); const [cid, setCid] = useState('');
  const [custs, setCusts] = useState<Customer[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { api.get('customers').then((r) => setCusts(r.data)).catch(() => {}); }, []);
  const credit = Math.max(0, total - (+cash || 0) - (+online || 0));
  const over = (+cash || 0) + (+online || 0) > total;
  return (
    <Modal title={`Collect ${inr(total)}`} onClose={onClose}>
      <label className="text-sm font-medium text-cash">Cash</label><input className="inp mb-2" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} />
      <label className="text-sm font-medium text-upi">UPI / Online</label><input className="inp mb-2" inputMode="decimal" value={online} onChange={(e) => setOnline(e.target.value)} />
      <div className="mb-2 flex gap-2"><button className="btn bg-cash/10 text-cash" onClick={() => { setCash(String(total)); setOnline(''); }}>All cash</button><button className="btn bg-upi/10 text-upi" onClick={() => { setOnline(String(total)); setCash(''); }}>All UPI</button></div>
      <div className="rounded-lg bg-slate-50 p-3 text-sm">Remaining to Udhar: <b className="text-red-600">{inr(credit)}</b></div>
      {credit > 0 && <select className="inp mt-2" value={cid} onChange={(e) => setCid(e.target.value)}>
        <option value="">Select customer for Udhar…</option>{custs.map((c) => <option key={c.id} value={c.id}>#{c.indexNo} {c.name} ({c.mobile})</option>)}</select>}
      {(err || over) && <p className="mt-2 text-sm text-red-600">{over ? 'Cash plus online is more than the bill total.' : err}</p>}
      <button disabled={busy || over || (credit > 0 && !cid)} className="btn mt-3 w-full bg-brand text-white" onClick={async () => {
        setBusy(true); setErr('');
        try { await onPay({ cashPaid: +cash || 0, onlinePaid: +online || 0, creditAmount: credit, customerId: credit > 0 ? cid : null }); }
        catch (e: any) { setErr(e.response?.data?.message || 'Bill could not be saved. Try again.'); setBusy(false); }
      }}>Save bill & print invoice</button>
    </Modal>
  );
}

/* ---------------- BILLS ---------------- */
function Bills({ shop }: any) {
  const [bills, setBills] = useState<any[]>([]); const [q, setQ] = useState(''); const [view, setView] = useState<any>(null);
  useEffect(() => { api.get(`days/${today()}/pos-bills`).then((r) => setBills(r.data)).catch(() => {}); }, []);
  const list = bills.filter((b) => JSON.stringify(b).toLowerCase().includes(q.toLowerCase()));
  return (<div>
    <input className="inp mb-3" placeholder="Search today's bills" value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="space-y-2">{list.map((b, i) => (
      <div key={b.id || i} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <div><div className="font-semibold">Bill #{b.billNo || b.id}</div><div className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleTimeString('en-IN')}</div></div>
        <div className="font-bold">{inr(b.total ?? b.items?.reduce((s: number, l: CartLine) => s + l.qty * l.price, 0))}</div>
        <button className="btn bg-brand text-white" onClick={() => setView(b)}>View / reprint</button>
      </div>))}{!list.length && <p className="text-slate-500">No bills today yet.</p>}</div>
    {view && <Invoice bill={view} shop={shop} onClose={() => setView(null)} />}
  </div>);
}

/* ---------------- CUSTOMERS ---------------- */
function Customers() {
  const [list, setList] = useState<Customer[]>([]); const [q, setQ] = useState(''); const [sel, setSel] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<any[]>([]); const [act, setAct] = useState<null | 'credit' | 'payments' | 'advance'>(null);
  const [amt, setAmt] = useState(''); const [method, setMethod] = useState('CASH'); const [note, setNote] = useState(''); const [add, setAdd] = useState(false);
  const [nc, setNc] = useState({ name: '', mobile: '', address: '' });
  const load = () => api.get('customers').then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { if (sel) api.get(`customers/${sel.id}/ledger`).then((r) => setLedger(r.data)).catch(() => setLedger([])); }, [sel, list]);
  const shown = useMemo(() => list.filter((c) => String(c.indexNo) === q.trim() || c.name.toLowerCase().includes(q.toLowerCase()) || c.mobile.includes(q)), [list, q]);
  const cur = sel && list.find((c) => c.id === sel.id);
  const submit = async () => {
    if (!cur || !act || !(+amt > 0)) return;
    await api.post(`customers/${cur.id}/${act}`, act === 'credit' ? { amount: +amt, note } : { amount: +amt, paymentMethod: method });
    setAct(null); setAmt(''); setNote(''); load();
  };
  return (<div className="grid grid-cols-[340px_1fr] gap-4">
    <div>
      <input className="inp mb-2" placeholder="Index #, name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn mb-2 w-full bg-brand text-white" onClick={() => setAdd(true)}>New customer</button>
      <div className="space-y-1">{shown.map((c) => (
        <button key={c.id} onClick={() => setSel(c)} className={`flex w-full justify-between rounded-lg bg-white p-3 text-left ${cur?.id === c.id ? 'ring-2 ring-gold' : ''}`}>
          <span>#{c.indexNo} {c.name}</span>
          <span className={c.outstanding > 0 ? 'text-red-600' : 'text-cash'}>{c.outstanding > 0 ? '-' + inr(c.outstanding) : '+' + inr(c.availableAdvance)}</span>
        </button>))}</div>
    </div>
    <div className="rounded-2xl bg-white p-4">
      {!cur ? <p className="text-slate-500">Select a customer to see their ledger.</p> : <>
        <h2 className="text-xl font-bold text-brand">{cur.name}</h2><p className="text-sm text-slate-500">{cur.mobile}</p>
        <div className="my-3 flex gap-3"><div className="flex-1 rounded-lg bg-red-50 p-3 text-red-600">Udhar<div className="text-2xl font-bold">-{inr(cur.outstanding)}</div></div>
          <div className="flex-1 rounded-lg bg-green-50 p-3 text-cash">Advance<div className="text-2xl font-bold">+{inr(cur.availableAdvance)}</div></div></div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="btn bg-red-600 text-white" onClick={() => setAct('credit')}>Add credit sale</button>
          <button className="btn bg-cash text-white" onClick={() => setAct('payments')}>Receive payment</button>
          <button className="btn bg-upi text-white" onClick={() => setAct('advance')}>Receive advance</button>
        </div>
        <div className="max-h-80 divide-y overflow-auto text-sm">{ledger.map((e, i) => (
          <div key={i} className="flex justify-between py-2"><span>{e.note || e.type}<span className="block text-xs text-slate-400">{e.createdAt && new Date(e.createdAt).toLocaleDateString('en-IN')}</span></span><b>{inr(e.amount)}</b></div>))}
          {!ledger.length && <p className="py-2 text-slate-400">No ledger entries yet.</p>}</div></>}
    </div>
    {act && <Modal title={act === 'credit' ? 'Add credit sale' : act === 'payments' ? 'Receive payment' : 'Receive advance'} onClose={() => setAct(null)}>
      <input className="inp mb-2" placeholder="Amount" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} />
      {act === 'credit' ? <input className="inp mb-2" placeholder="Note (what was sold)" value={note} onChange={(e) => setNote(e.target.value)} />
        : <select className="inp mb-2" value={method} onChange={(e) => setMethod(e.target.value)}><option>CASH</option><option>UPI</option></select>}
      <button className="btn w-full bg-brand text-white" onClick={submit}>Save entry</button></Modal>}
    {add && <Modal title="New customer" onClose={() => setAdd(false)}>
      {(['name', 'mobile', 'address'] as const).map((k) => <input key={k} className="inp mb-2" placeholder={k[0].toUpperCase() + k.slice(1)} onChange={(e) => setNc({ ...nc, [k]: e.target.value })} />)}
      <button className="btn w-full bg-brand text-white" onClick={async () => { await api.post('customers', { ...nc, type: 'RETAIL' }); setAdd(false); load(); }}>Save customer</button></Modal>}
  </div>);
}

/* ---------------- REPORTS ---------------- */
function Reports() {
  const d = new Date(); const [from, setFrom] = useState(new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA')); const [to, setTo] = useState(today());
  const [s, setS] = useState<any>({});
  useEffect(() => { api.get('reports/summary', { params: { from, to } }).then((r) => setS(r.data)).catch(() => {}); }, [from, to]);
  const cards: [string, any, string][] = [['Gross sales', s.grossSales, 'text-brand'], ['Cash collections', s.cashCollections, 'text-cash'], ['PhonePe / online', s.onlineCollections, 'text-upi'],
    ['Shop expenses', s.expenses, 'text-red-600'], ['Staff salaries', s.staffSalaries, 'text-red-600'], ['Net shop profit', s.netProfit, 'text-brand']];
  return (<div>
    <div className="mb-4 flex flex-wrap gap-2"><input type="date" className="inp !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="inp !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
      <button className="btn bg-brand text-white" onClick={() => window.print()}>Export report as PDF</button></div>
    <div className="grid grid-cols-3 gap-3">{cards.map(([l, v, c]) => <div key={l} className="rounded-xl bg-white p-4 shadow-sm"><div className="text-sm text-slate-500">{l}</div><div className={`text-3xl font-extrabold ${c}`}>{inr(v)}</div></div>)}</div>
  </div>);
}

/* ---------------- SUBSCRIPTION ---------------- */
function Subscription() {
  const [sub, setSub] = useState<any>(null);
  useEffect(() => { api.get('subscription').then((r) => setSub(r.data)).catch(() => {}); }, []);
  const [err, setErr] = useState('');
  const buy = async (plan: 'MONTHLY' | 'YEARLY') => {
    setErr('');
    try {
      await loadRazorpay();
      const { data } = await api.post('subscription/checkout', { plan });
      new (window as any).Razorpay({
        key: data.razorpayKeyId, order_id: data.orderId, amount: data.amountPaise, currency: 'INR', name: 'DukanKhata',
        handler: async (r: any) => { await api.post('subscription/verify', r); const s = await api.get('subscription'); setSub(s.data); },
      }).open();
    } catch (e: any) { setErr(e.response?.data?.message || e.message || 'Could not start the payment. Please try again.'); }
  };
  return (<div className="mx-auto max-w-xl text-center">
    {err && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{err}</p>}
    <p className="mb-4 text-slate-600">{sub ? `Status: ${sub.status}${sub.daysLeft != null ? ` · ${sub.daysLeft} days left` : ''}` : 'Loading plan…'}</p>
    <div className="grid grid-cols-2 gap-3">
      {([['Monthly', '₹299', 'MONTHLY'], ['Yearly', '₹2,999', 'YEARLY']] as const).map(([n, p, k]) => (
        <div key={k} className="rounded-2xl bg-white p-6 shadow"><div className="font-semibold text-brand">Large Shop Pro · {n}</div><div className="my-2 text-4xl font-extrabold">{p}</div>
          <button className="btn w-full bg-gold text-brand" onClick={() => buy(k)}>Subscribe {n.toLowerCase()}</button></div>))}
    </div></div>);
}

/* ---------------- SHELL ---------------- */
const tabs = [['pos', 'Counter POS', Store], ['bills', "Today's bills", Receipt], ['customers', 'Udhar Khata', BookUser], ['reports', 'Reports', BarChart3], ['subscription', 'Subscription', CreditCard]] as const;

// The web app is a private area: keep it out of Google and give the tab its own title.
function usePrivatePage() {
  useEffect(() => {
    const prevTitle = document.title;
    const robots = document.querySelector('meta[name="robots"]');
    const googlebot = document.querySelector('meta[name="googlebot"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const prev = [robots?.getAttribute('content'), googlebot?.getAttribute('content'), canonical?.getAttribute('href')];
    document.title = 'DukanKhata Web App';
    robots?.setAttribute('content', 'noindex, nofollow');
    googlebot?.setAttribute('content', 'noindex, nofollow');
    canonical?.setAttribute('href', 'https://dukankhata.in/app');
    return () => {
      document.title = prevTitle;
      if (prev[0] != null) robots?.setAttribute('content', prev[0]);
      if (prev[1] != null) googlebot?.setAttribute('content', prev[1]);
      if (prev[2] != null) canonical?.setAttribute('href', prev[2]);
    };
  }, []);
}

export default function WebApp() {
  usePrivatePage();
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'));
  const [tab, setTab] = useState<string>('pos');
  const [shop, setShop] = useState<any>(null);
  useEffect(() => { if (authed) api.get('shop/profile').then((r) => setShop(r.data)).catch(() => {}); }, [authed]);
  if (!authed) return <Auth onDone={() => setAuthed(true)} />;
  const title = tabs.find((t) => t[0] === tab)?.[1];
  return (
    <div className="flex min-h-screen min-w-[1100px]">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-brand text-white">
        <a href="/" className="block px-5 py-5"><img src="/logo-header-dark.svg" alt="DukanKhata" className="h-8" /></a>
        <nav className="flex-1 space-y-1 px-3">
          {tabs.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${tab === k ? 'bg-gold text-brand' : 'text-white/80 hover:bg-white/10'}`}>
              <I size={18} />{l}
            </button>))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <div className="truncate px-3 pb-1 text-xs text-white/60">{shop?.shopName || 'Your shop'}</div>
          <a href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"><Globe size={16} />Back to website</a>
          <button onClick={() => { localStorage.removeItem('token'); setAuthed(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"><LogOut size={16} />Log out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-8 py-4 backdrop-blur">
          <h1 className="text-xl font-bold text-brand">{title}</h1>
          <div className="text-sm text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </header>
        <main className="mx-auto max-w-[1400px] p-8">
          {tab === 'pos' && <POS shop={shop} />}{tab === 'bills' && <Bills shop={shop} />}{tab === 'customers' && <Customers />}
          {tab === 'reports' && <Reports />}{tab === 'subscription' && <Subscription />}
        </main>
      </div>
    </div>
  );
}
