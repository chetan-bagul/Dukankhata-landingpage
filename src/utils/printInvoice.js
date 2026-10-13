import { numberToWordsINR } from "./numberToWords";

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateInvoiceA4Html({ sale = {}, shopInfo = {} }) {
  const shopName = shopInfo.name || shopInfo.shopName || "DukanKhata Store";
  const legalName = shopInfo.legalName || shopName;
  const address = shopInfo.addressLine || shopInfo.address || "";
  const city = shopInfo.city || "";
  const pincode = shopInfo.pincode || "";
  const mobile = shopInfo.mobile || "";
  const email = shopInfo.email || "";
  const gstin = shopInfo.gstin || "";
  const state = shopInfo.state || "Karnataka";
  const stateCode = shopInfo.stateCode || "29";
  const footerNote = shopInfo.invoiceFooterNote || "Thank you for your business! Goods once sold will not be exchanged after 7 days.";

  const invoiceNo = sale.invoiceNumber || (sale.id ? `INV-${sale.id.slice(0, 8).toUpperCase()}` : "INV-DRAFT");
  const invoiceDate = sale.createdAt
    ? new Date(sale.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const invoiceTime = sale.createdAt
    ? new Date(sale.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

  const customerName = sale.customerName || sale.customer?.name || "Walk-in Customer";
  const customerMobile = sale.customerMobile || sale.customer?.mobile || "";

  const items = sale.items || [];
  const payments = sale.payments || [];

  // Compute tax totals
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let subtotal = 0;

  const itemRows = items.map((item, idx) => {
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const lineTotal = qty * unitPrice;
    subtotal += lineTotal;

    const gstRate = Number(item.gstRate || 0);
    // In retail pricing, calculate backward taxable value if inclusive
    const taxableValue = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
    const taxAmt = lineTotal - taxableValue;
    const cgstAmt = taxAmt / 2;
    const sgstAmt = taxAmt / 2;

    totalTaxable += taxableValue;
    totalCgst += cgstAmt;
    totalSgst += sgstAmt;

    return {
      index: idx + 1,
      name: item.itemName || item.name || "Product",
      hsn: item.hsnCode || item.hsn || "-",
      qty: qty,
      rate: unitPrice,
      taxableValue: taxableValue,
      gstRate: gstRate,
      cgstAmt: cgstAmt,
      sgstAmt: sgstAmt,
      lineTotal: lineTotal,
    };
  });

  const grandTotal = Number(sale.totalAmount || sale.total || subtotal);
  const words = numberToWordsINR(grandTotal);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      font-size: 10pt;
      line-height: 1.35;
    }
    .invoice-card {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      border: 1.5px solid #111827;
      padding: 0;
    }

    /* Top Banner */
    .top-banner {
      background: #0F3D2E;
      color: #FFFFFF;
      text-align: center;
      padding: 6px;
      font-weight: 800;
      font-size: 12pt;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .sub-banner {
      text-align: center;
      font-size: 8pt;
      color: #E5E7EB;
      background: #0F3D2E;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #111827;
    }

    /* Store & Invoice Meta Box */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 1.5px solid #111827;
    }
    .meta-table td {
      vertical-align: top;
      padding: 10px 12px;
    }
    .store-col {
      width: 58%;
      border-right: 1.5px solid #111827;
    }
    .store-name {
      font-size: 16pt;
      font-weight: 800;
      color: #0F3D2E;
      line-height: 1.2;
    }
    .store-legal {
      font-size: 9pt;
      color: #4B5563;
      margin-bottom: 4px;
    }
    .meta-row {
      font-size: 9pt;
      color: #374151;
      line-height: 1.4;
    }
    .invoice-meta-col {
      width: 42%;
    }
    .invoice-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-bottom: 4px;
    }
    .invoice-meta-row strong {
      color: #111827;
    }

    /* Billed To Box */
    .buyer-box {
      border-bottom: 1.5px solid #111827;
      padding: 8px 12px;
      background: #F9FAFB;
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
    }

    /* Itemized Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .items-table th {
      background: #F3F4F6;
      color: #111827;
      border-bottom: 1.5px solid #111827;
      border-right: 1px solid #D1D5DB;
      padding: 6px 6px;
      font-size: 8.5pt;
      font-weight: 700;
      text-align: right;
    }
    .items-table th:first-child, .items-table th:nth-child(2) {
      text-align: left;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .items-table td {
      border-bottom: 1px solid #E5E7EB;
      border-right: 1px solid #E5E7EB;
      padding: 6px 6px;
      font-size: 8.5pt;
      text-align: right;
    }
    .items-table td:first-child, .items-table td:nth-child(2) {
      text-align: left;
    }
    .items-table td:last-child {
      border-right: none;
    }

    /* Totals Summary Grid */
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1.5px solid #111827;
    }
    .summary-table td {
      vertical-align: top;
    }
    .words-col {
      width: 58%;
      padding: 10px 12px;
      border-right: 1.5px solid #111827;
      font-size: 9pt;
    }
    .totals-col {
      width: 42%;
      padding: 8px 12px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      margin-bottom: 4px;
    }
    .grand-total-line {
      display: flex;
      justify-content: space-between;
      font-size: 13pt;
      font-weight: 800;
      color: #0F3D2E;
      border-top: 1.5px solid #111827;
      padding-top: 6px;
      margin-top: 6px;
    }

    /* Payment Split & Footer */
    .payment-box {
      border-top: 1px solid #D1D5DB;
      padding: 6px 12px;
      background: #F9FAFB;
      font-size: 8.5pt;
      display: flex;
      justify-content: space-between;
      color: #374151;
    }
    .footer-box {
      border-top: 1.5px solid #111827;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8pt;
      color: #4B5563;
    }
    .sign-box {
      text-align: center;
      width: 170px;
    }
    .sign-line {
      border-top: 1px solid #374151;
      padding-top: 4px;
      font-size: 8pt;
      font-weight: 700;
      color: #111827;
      margin-top: 36px;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="top-banner">TAX INVOICE</div>
    <div class="sub-banner">Original for Recipient • GST Retail Bill</div>

    <!-- Merchant & Invoice Meta -->
    <table class="meta-table">
      <tr>
        <td class="store-col">
          <div class="store-name">${shopName}</div>
          ${legalName && legalName !== shopName ? `<div class="store-legal">(${legalName})</div>` : ""}
          <div class="meta-row">
            ${address ? `${address}, ` : ""}${city} ${pincode}<br>
            ${gstin ? `<strong>GSTIN:</strong> ${gstin}<br>` : ""}
            <strong>State:</strong> ${state} (Code: ${stateCode})<br>
            ${mobile ? `<strong>Ph:</strong> +91 ${mobile}` : ""} ${email ? `• ${email}` : ""}
          </div>
        </td>
        <td class="invoice-meta-col">
          <div class="invoice-meta-row">
            <span>Invoice No:</span>
            <strong>${invoiceNo}</strong>
          </div>
          <div class="invoice-meta-row">
            <span>Date &amp; Time:</span>
            <strong>${invoiceDate} ${invoiceTime}</strong>
          </div>
          <div class="invoice-meta-row">
            <span>Place of Supply:</span>
            <span>${state} (${stateCode})</span>
          </div>
          <div class="invoice-meta-row">
            <span>Reverse Charge:</span>
            <span>No</span>
          </div>
          ${
            sale.sellerName || sale.cashierName
              ? `<div class="invoice-meta-row"><span>Billed By:</span><span>${sale.sellerName || sale.cashierName}</span></div>`
              : ""
          }
        </td>
      </tr>
    </table>

    <!-- Buyer Details -->
    <div class="buyer-box">
      <div>
        <strong>Billed To:</strong> ${customerName}
        ${customerMobile ? ` • Ph: +91 ${customerMobile}` : ""}
      </div>
      <div>
        <strong>Mode:</strong> ${payments.map((p) => p.method).join(", ") || "CASH"}
      </div>
    </div>

    <!-- Itemized Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 38%;">Item Description</th>
          <th style="width: 10%;">HSN</th>
          <th style="width: 8%;">Qty</th>
          <th style="width: 12%;">Rate (₹)</th>
          <th style="width: 10%;">GST %</th>
          <th style="width: 17%;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${
          itemRows.length === 0
            ? `<tr><td colspan="7" style="text-align: center; padding: 20px;">No items on this invoice.</td></tr>`
            : itemRows
                .map(
                  (i) => `
            <tr>
              <td>${i.index}</td>
              <td><strong>${i.name}</strong></td>
              <td>${i.hsn}</td>
              <td>${i.qty}</td>
              <td>${i.rate.toFixed(2)}</td>
              <td>${i.gstRate > 0 ? `${i.gstRate}%` : "0%"}</td>
              <td style="font-weight: 700;">${i.lineTotal.toFixed(2)}</td>
            </tr>`
                )
                .join("")
        }
      </tbody>
    </table>

    <!-- Totals Summary & In-Words -->
    <table class="summary-table">
      <tr>
        <td class="words-col">
          <div style="font-size: 8pt; text-transform: uppercase; color: #6B7280; font-weight: 700; margin-bottom: 2px;">
            Amount in Words:
          </div>
          <strong style="color: #0F3D2E; font-size: 9.5pt;">${words}</strong>

          ${
            totalCgst > 0 || totalSgst > 0
              ? `
          <div style="margin-top: 10px; font-size: 8pt; color: #4B5563; border-top: 1px dashed #E5E7EB; padding-top: 6px;">
            <strong>Tax Breakdown:</strong> Taxable: ${formatCurrency(totalTaxable)} | CGST: ${formatCurrency(totalCgst)} | SGST: ${formatCurrency(totalSgst)}
          </div>`
              : ""
          }
        </td>
        <td class="totals-col">
          <div class="total-line">
            <span>Items Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${
            totalCgst > 0
              ? `<div class="total-line"><span>CGST:</span><span>+${formatCurrency(totalCgst)}</span></div>`
              : ""
          }
          ${
            totalSgst > 0
              ? `<div class="total-line"><span>SGST:</span><span>+${formatCurrency(totalSgst)}</span></div>`
              : ""
          }
          <div class="grand-total-line">
            <span>Total Payable:</span>
            <span>${formatCurrency(grandTotal)}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Payment Split Box -->
    <div class="payment-box">
      <span>
        <strong>Settlement Breakdown:</strong> ${
          payments.length > 0
            ? payments.map((p) => `${p.method}: ${formatCurrency(p.amount)}`).join(" • ")
            : `CASH: ${formatCurrency(grandTotal)}`
        }
      </span>
      <span>Status: <strong style="color: #0F3D2E;">✓ PAID IN FULL</strong></span>
    </div>

    <!-- Footer Terms & Signatory -->
    <div class="footer-box">
      <div style="max-width: 500px;">
        <p style="font-weight: 600; color: #111827; margin-bottom: 2px;">Terms &amp; Notes:</p>
        <p>${footerNote}</p>
        <p style="margin-top: 4px; font-size: 7.5pt; color: #9CA3AF;">
          This is a computer-generated tax invoice verified with DukanKhata POS.
        </p>
      </div>
      <div class="sign-box">
        <div style="font-size: 8pt; color: #6B7280; font-weight: 600;">For ${shopName}</div>
        <div class="sign-line">Authorized Signatory</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateThermalReceiptHtml({ sale = {}, shopInfo = {} }) {
  const shopName = shopInfo.name || shopInfo.shopName || "DukanKhata Store";
  const mobile = shopInfo.mobile || "";
  const gstin = shopInfo.gstin || "";
  const address = shopInfo.addressLine || shopInfo.address || "";
  const invoiceNo = sale.invoiceNumber || (sale.id ? `INV-${sale.id.slice(0, 8).toUpperCase()}` : "INV-DRAFT");
  const invoiceDate = sale.createdAt
    ? new Date(sale.createdAt).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN");
  const invoiceTime = sale.createdAt
    ? new Date(sale.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const items = sale.items || [];
  const payments = sale.payments || [];
  const grandTotal = Number(sale.totalAmount || sale.total || 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${invoiceNo}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 74mm;
      margin: 0 auto;
      font-size: 9pt;
      color: #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-top: 2px solid #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    td, th { padding: 2px 0; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="bold" style="font-size: 13pt;">${shopName}</div>
    ${address ? `<div>${address}</div>` : ""}
    ${mobile ? `<div>Ph: +91 ${mobile}</div>` : ""}
    ${gstin ? `<div>GSTIN: ${gstin}</div>` : ""}
    <div class="divider"></div>
    <div class="bold">RETAIL CASH MEMO</div>
    <div>${invoiceNo} • ${invoiceDate} ${invoiceTime}</div>
    ${sale.customerName ? `<div>Customer: ${sale.customerName}</div>` : ""}
  </div>
  <div class="divider"></div>
  <table>
    <thead>
      <tr style="border-bottom: 1px dashed #000;">
        <th style="text-align: left;">ITEM</th>
        <th class="text-center">QTY</th>
        <th class="text-right">RATE</th>
        <th class="text-right">AMT</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (i) => `
        <tr>
          <td style="text-align: left; max-width: 32mm; word-wrap: break-word;">${i.itemName || i.name}</td>
          <td class="text-center">${i.quantity || i.qty || 1}</td>
          <td class="text-right">${Number(i.unitPrice || i.price || 0).toFixed(2)}</td>
          <td class="text-right">${(Number(i.quantity || i.qty || 1) * Number(i.unitPrice || i.price || 0)).toFixed(2)}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="double-divider"></div>
  <table>
    <tr class="bold" style="font-size: 11pt;">
      <td>TOTAL AMOUNT</td>
      <td class="text-right">${formatCurrency(grandTotal)}</td>
    </tr>
  </table>
  <div class="divider"></div>
  <div>
    <strong>PAID VIA:</strong> ${payments.map((p) => `${p.method}: ${formatCurrency(p.amount)}`).join(", ") || "CASH"}
  </div>
  <div class="divider"></div>
  <div class="text-center" style="font-size: 8pt; margin-top: 6px;">
    ${shopInfo.invoiceFooterNote || "Thank You! Visit Again."}<br>
    Powered by DukanKhata
  </div>
</body>
</html>
  `;
}

export function printInvoiceDocument({ sale, shopInfo, format = "A4" }) {
  const html = format === "THERMAL" ? generateThermalReceiptHtml({ sale, shopInfo }) : generateInvoiceA4Html({ sale, shopInfo });
  const printWindow = window.open("", "_blank", "width=850,height=800");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to print the invoice.");
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
