// Executive A4 Sales & Profit Report HTML Generator & Printer

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateReportHtml({ from, to, summary, rows = [], shopInfo = {}, enableUdhar = true }) {
  const shopName = shopInfo.name || shopInfo.shopName || "DukanKhata Store";
  const address = shopInfo.addressLine || shopInfo.address || "";
  const city = shopInfo.city || "";
  const pincode = shopInfo.pincode || "";
  const mobile = shopInfo.mobile || "";
  const email = shopInfo.email || "";
  const gstin = shopInfo.gstin || "";

  const totalExpected = rows.reduce((s, r) => s + Number(r.expectedSales || 0), 0);
  const totalCash = rows.reduce((s, r) => s + Number(r.cash || 0), 0);
  const totalUpi = rows.reduce((s, r) => s + Number(r.upi || 0), 0);
  const totalUdhar = rows.reduce((s, r) => s + Number(r.udhar || 0), 0);
  const totalActual = rows.reduce((s, r) => s + Number(r.actualCollection || 0), 0);
  const totalExpenses = rows.reduce((s, r) => s + Number(r.expenses || 0), 0);
  const totalVariance = rows.reduce((s, r) => s + Number(r.variance || 0), 0);
  const totalNet = rows.reduce((s, r) => s + Number(r.netProfit || 0), 0);

  const printDate = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sales & Profit Statement - ${shopName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      font-size: 11pt;
      line-height: 1.4;
    }
    .report-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Top Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0F3D2E;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .shop-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0F3D2E;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .shop-meta {
      font-size: 9.5pt;
      color: #4B5563;
      line-height: 1.35;
    }
    .report-badge-col {
      text-align: right;
    }
    .report-title {
      font-size: 14pt;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .period-badge {
      display: inline-block;
      background: #E6F4EA;
      color: #0F3D2E;
      font-weight: 700;
      font-size: 9.5pt;
      padding: 4px 10px;
      border-radius: 4px;
      margin-top: 6px;
      border: 1px solid #A8DAB5;
    }
    .gen-date {
      font-size: 8.5pt;
      color: #6B7280;
      margin-top: 4px;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 18px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .kpi-cell {
      display: table-cell;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 10px 12px;
      vertical-align: top;
    }
    .kpi-cell.highlight {
      background: #F0FDF4;
      border-color: #86EFAC;
    }
    .kpi-label {
      font-size: 8pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #6B7280;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .kpi-value {
      font-size: 13pt;
      font-weight: 800;
      color: #111827;
    }
    .kpi-cell.highlight .kpi-value {
      color: #15803D;
    }
    .kpi-sub {
      font-size: 8pt;
      color: #6B7280;
      margin-top: 2px;
    }

    /* Secondary Split Table */
    .split-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      background: #F9FAFB;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      font-size: 9pt;
    }
    .split-table td {
      padding: 8px 12px;
      border-right: 1px solid #E5E7EB;
    }
    .split-table td:last-child {
      border-right: none;
    }

    /* Ledger Table */
    .ledger-section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 9pt;
    }
    .ledger-table th {
      background: #0F3D2E;
      color: #FFFFFF;
      font-weight: 700;
      text-align: right;
      padding: 8px 8px;
      font-size: 8.5pt;
      letter-spacing: 0.3px;
      border: 1px solid #0F3D2E;
    }
    .ledger-table th:first-child {
      text-align: left;
    }
    .ledger-table td {
      padding: 7px 8px;
      border: 1px solid #E5E7EB;
      text-align: right;
    }
    .ledger-table td:first-child {
      text-align: left;
      font-weight: 600;
    }
    .ledger-table tbody tr:nth-child(even) {
      background: #F9FAFB;
    }
    .ledger-table tfoot tr {
      background: #F3F4F6;
      font-weight: 800;
      border-top: 2px solid #111827;
    }
    .ledger-table tfoot td {
      padding: 9px 8px;
      border: 1px solid #D1D5DB;
      color: #111827;
      font-size: 9.5pt;
    }

    /* Footer Sign-off */
    .footer-table {
      width: 100%;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px dashed #D1D5DB;
      font-size: 9pt;
    }
    .footer-table td {
      vertical-align: bottom;
    }
    .sign-box {
      text-align: right;
    }
    .sign-line {
      display: inline-block;
      width: 180px;
      border-top: 1px solid #374151;
      margin-top: 40px;
      padding-top: 4px;
      font-size: 8.5pt;
      font-weight: 600;
      color: #374151;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 58%;">
          <div class="shop-title">${shopName}</div>
          <div class="shop-meta">
            ${address ? `${address}, ` : ""}${city} ${pincode}<br>
            ${gstin ? `<strong>GSTIN:</strong> ${gstin} • ` : ""}${mobile ? `Ph: +91 ${mobile}` : ""}
            ${email ? `<br>Email: ${email}` : ""}
          </div>
        </td>
        <td class="report-badge-col" style="width: 42%;">
          <div class="report-title">Sales &amp; Financial Report</div>
          <div class="period-badge">Period: ${from} to ${to}</div>
          <div class="gen-date">Generated on: ${printDate}</div>
        </td>
      </tr>
    </table>

    <!-- Executive KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-cell">
        <div class="kpi-label">Expected Sales</div>
        <div class="kpi-value">${formatCurrency(summary?.expectedSales || totalExpected)}</div>
        <div class="kpi-sub">Calculated from desk inventory</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Actual Collections</div>
        <div class="kpi-value" style="color: #0F3D2E;">${formatCurrency(summary?.actualCollection || totalActual)}</div>
        <div class="kpi-sub">Total money accounted in drawer</div>
      </div>
      <div class="kpi-cell">
        <div class="kpi-label">Store Expenses</div>
        <div class="kpi-value" style="color: #DC2626;">${formatCurrency(summary?.expenses || totalExpenses)}</div>
        <div class="kpi-sub">Payouts made from drawer</div>
      </div>
      <div class="kpi-cell highlight">
        <div class="kpi-label">Net Profit / Earnings</div>
        <div class="kpi-value">${formatCurrency(summary?.netProfit || totalNet)}</div>
        <div class="kpi-sub">Revenue after day expenses</div>
      </div>
    </div>

    <!-- Collections Breakdown Bar -->
    <table class="split-table">
      <tr>
        <td>
          <span style="color: #6B7280; font-size: 8pt; display: block;">💵 CASH COLLECTED</span>
          <strong>${formatCurrency(summary?.cash || totalCash)}</strong>
        </td>
        <td>
          <span style="color: #6B7280; font-size: 8pt; display: block;">⚡ UPI / DIGITAL</span>
          <strong>${formatCurrency(summary?.upi || totalUpi)}</strong>
        </td>
        ${
          enableUdhar
            ? `<td>
                <span style="color: #6B7280; font-size: 8pt; display: block;">📒 UDHAR CREDIT GIVEN</span>
                <strong style="color: #D97706;">${formatCurrency(summary?.udhar || totalUdhar)}</strong>
              </td>`
            : ""
        }
        <td>
          <span style="color: #6B7280; font-size: 8pt; display: block;">⚖️ DRAWER VARIANCE</span>
          <strong style="color: ${Number(summary?.variance || totalVariance) >= 0 ? "#15803D" : "#DC2626"};">
            ${Number(summary?.variance || totalVariance) >= 0 ? "+" : ""}${formatCurrency(summary?.variance || totalVariance)}
          </strong>
        </td>
        <td>
          <span style="color: #6B7280; font-size: 8pt; display: block;">📅 CLOSED DAYS</span>
          <strong>${summary?.closedDays || rows.length} Days</strong>
        </td>
      </tr>
    </table>

    <!-- Daily Closing Ledger Table -->
    <div class="ledger-section-title">Daily Financial Audit Ledger</div>
    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 14%;">Date</th>
          <th style="width: 12%;">Expected (₹)</th>
          <th style="width: 11%;">Cash (₹)</th>
          <th style="width: 11%;">UPI (₹)</th>
          ${enableUdhar ? `<th style="width: 11%;">Udhar (₹)</th>` : ""}
          <th style="width: 13%;">Actual Coll (₹)</th>
          <th style="width: 10%;">Expense (₹)</th>
          <th style="width: 8%;">Variance</th>
          <th style="width: 10%;">Net (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length === 0
            ? `<tr><td colspan="${enableUdhar ? 9 : 8}" style="text-align: center; padding: 20px; color: #9CA3AF;">No closing records found in this date range.</td></tr>`
            : rows
                .map((r) => {
                  const varVal = Number(r.variance || 0);
                  const isPos = varVal >= 0;
                  return `
            <tr>
              <td>${r.businessDate}</td>
              <td>${Number(r.expectedSales || 0).toFixed(2)}</td>
              <td>${Number(r.cash || 0).toFixed(2)}</td>
              <td>${Number(r.upi || 0).toFixed(2)}</td>
              ${enableUdhar ? `<td style="color: #B45309;">${Number(r.udhar || 0).toFixed(2)}</td>` : ""}
              <td style="font-weight: 700;">${Number(r.actualCollection || 0).toFixed(2)}</td>
              <td style="color: #DC2626;">${Number(r.expenses || 0).toFixed(2)}</td>
              <td style="color: ${isPos ? "#15803D" : "#DC2626"}; font-weight: 600;">
                ${isPos ? "+" : ""}${varVal.toFixed(2)}
              </td>
              <td style="font-weight: 700; color: #15803D;">${Number(r.netProfit || 0).toFixed(2)}</td>
            </tr>`;
                })
                .join("")
        }
      </tbody>
      <tfoot>
        <tr>
          <td>TOTAL</td>
          <td>${totalExpected.toFixed(2)}</td>
          <td>${totalCash.toFixed(2)}</td>
          <td>${totalUpi.toFixed(2)}</td>
          ${enableUdhar ? `<td>${totalUdhar.toFixed(2)}</td>` : ""}
          <td>${totalActual.toFixed(2)}</td>
          <td style="color: #DC2626;">${totalExpenses.toFixed(2)}</td>
          <td style="color: ${totalVariance >= 0 ? "#15803D" : "#DC2626"};">
            ${totalVariance >= 0 ? "+" : ""}${totalVariance.toFixed(2)}
          </td>
          <td style="color: #15803D;">${totalNet.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Footer Sign-off -->
    <table class="footer-table">
      <tr>
        <td style="color: #6B7280; font-size: 8.5pt;">
          DukanKhata Store Operating System • Confidential Financial Statement<br>
          Records verified from daily cashier till counts and digital payment settlement.
        </td>
        <td class="sign-box">
          <div class="sign-line">Authorized Signatory / Seal</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

export function printReportDocument(options) {
  const html = generateReportHtml(options);
  const printWindow = window.open("", "_blank", "width=900,height=800");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to print the report.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
