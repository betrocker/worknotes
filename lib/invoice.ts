import * as Print from 'expo-print';

import { parseDateInput } from '@/lib/date';

type InvoiceParty = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  pib?: string | null;
  registrationNumber?: string | null;
  accountNumber?: string | null;
  logoUrl?: string | null;
};

type InvoiceJob = {
  id: string;
  title?: string | null;
  description?: string | null;
  scheduledDate?: string | null;
  completedAt?: string | null;
  price?: number | null;
  totalPaid: number;
  outstanding: number;
  tipAmount: number;
};

type InvoiceLineItem = {
  title: string;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceDocumentInput = {
  locale: string;
  invoiceNumberValue: string;
  issueDateValue: string;
  labels: {
    invoiceTitle: string;
    invoiceNumber: string;
    issueDate: string;
    serviceDate: string;
    servicePlace: string;
    issuer: string;
    client: string;
    clientName: string;
    clientAddress: string;
    clientPhone: string;
    pib: string;
    registrationNumber: string;
    accountNumber: string;
    jobTitle: string;
    jobDescription: string;
    scheduledDate: string;
    completedDate: string;
    tableService: string;
    tableUnit: string;
    tableQuantity: string;
    tablePrice: string;
    tableTotal: string;
    unitService: string;
    totalPrice: string;
    totalPaid: string;
    outstanding: string;
    tip: string;
    notesTitle: string;
    taxNoteTitle: string;
    taxNoteBody: string;
    footer: string;
    validWithoutSignature: string;
  };
  company: InvoiceParty;
  client: InvoiceParty;
  job: InvoiceJob;
  items: InvoiceLineItem[];
};

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(locale: string, value: number | null | undefined) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatNumber(locale: string, value: number | null | undefined) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatDate(locale: string, value: string | null | undefined) {
  if (!value) return '—';
  const parsed = parseDateInput(value) ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

export function buildInvoiceHtml(input: InvoiceDocumentInput) {
  const { labels, locale, company, client, job, invoiceNumberValue, issueDateValue } = input;
  const issueDate = formatDate(locale, issueDateValue);
  const invoiceNumber = invoiceNumberValue;
  const serviceDate = formatDate(locale, job.completedAt || job.scheduledDate);
  const servicePlace = client.address || '—';
  const invoiceItems =
    input.items.length > 0
      ? input.items
      : [
          {
            title: job.title || '—',
            unit: labels.unitService,
            quantity: 1,
            unitPrice: job.price ?? 0,
            total: job.price ?? 0,
          },
        ];
  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const totalPrice = formatCurrency(locale, invoiceTotal || job.price);
  const totalPaid = formatCurrency(locale, job.totalPaid);
  const outstanding = formatCurrency(locale, job.outstanding);
  const tip = formatCurrency(locale, job.tipAmount);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #1C2745;
          padding: 28px 32px 36px;
          font-size: 13px;
          line-height: 1.45;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 10px;
          margin-bottom: 18px;
        }
        .brand {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .company-name {
          font-size: 26px;
          font-weight: 800;
          color: #1C2745;
          line-height: 1.15;
        }
        .company-subline {
          margin-top: 6px;
          font-size: 12px;
          color: #1C2745;
          line-height: 1.45;
        }
        .company-subline-label {
          font-weight: 800;
        }
        .logo {
          max-width: 180px;
          max-height: 72px;
          object-fit: contain;
        }
        .issuer {
          max-width: 320px;
          text-align: right;
          font-size: 12px;
          line-height: 1.5;
        }
        .issuer-row-label {
          font-weight: 800;
        }
        .strong {
          font-weight: 800;
        }
        .muted {
          color: #6C789A;
        }
        .client-box {
          width: 45%;
          border-top: 1px solid #1C2745;
          border-bottom: 1px solid #1C2745;
          padding: 10px 0;
          margin: 10px 0 28px;
        }
        .client-title {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: 800;
          margin: 26px 0 12px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 8px;
          gap: 16px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }
        .table th,
        .table td {
          padding: 10px 6px;
          text-align: left;
          font-size: 13px;
        }
        .table thead th {
          font-weight: 800;
          border-top: 1px solid #1C2745;
          border-bottom: 1px solid #1C2745;
        }
        .table tbody td {
          border-top: none;
          border-bottom: none;
        }
        .table th.num,
        .table td.num {
          text-align: right;
        }
        .total-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #EFEFEF;
          border-top: 1px solid #1C2745;
          border-bottom: 1px solid #1C2745;
          padding: 12px 16px;
          margin-top: 10px;
        }
        .total-value {
          font-size: 28px;
          font-weight: 800;
          color: #000000;
        }
        .total-label {
          font-weight: 800;
          text-transform: uppercase;
        }
        .notes {
          margin-top: 26px;
        }
        .notes-title {
          font-size: 14px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .footer {
          margin-top: 30px;
          border-top: 1px solid #1C2745;
          padding-top: 14px;
          font-size: 12px;
          color: #000000;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          ${company.logoUrl ? `<img class="logo" src="${escapeHtml(company.logoUrl)}" />` : ''}
          <div class="brand-text">
            <div class="company-name">${escapeHtml(company.name || labels.issuer)}</div>
            ${company.address ? `<div class="company-subline"><span class="company-subline-label">Adresa:</span> ${escapeHtml(company.address)}</div>` : ''}
            ${company.phone ? `<div class="company-subline"><span class="company-subline-label">Telefon:</span> ${escapeHtml(company.phone)}</div>` : ''}
          </div>
        </div>
        <div class="issuer">
          ${company.pib ? `<div><span class="issuer-row-label">${escapeHtml(labels.pib)}:</span> ${escapeHtml(company.pib)}</div>` : ''}
          ${company.registrationNumber ? `<div><span class="issuer-row-label">${escapeHtml(labels.registrationNumber)}:</span> ${escapeHtml(company.registrationNumber)}</div>` : ''}
          ${company.accountNumber ? `<div><span class="issuer-row-label">${escapeHtml(labels.accountNumber)}:</span> ${escapeHtml(company.accountNumber)}</div>` : ''}
        </div>
      </div>

      <div class="client-box">
        <div class="client-title">${escapeHtml(labels.client)}:</div>
        ${client.name ? `<div><span class="strong">${escapeHtml(labels.clientName)}:</span> ${escapeHtml(client.name)}</div>` : ''}
        ${client.address ? `<div><span class="strong">${escapeHtml(labels.clientAddress)}:</span> ${escapeHtml(client.address)}</div>` : ''}
        ${client.phone ? `<div><span class="strong">${escapeHtml(labels.clientPhone)}:</span> ${escapeHtml(client.phone)}</div>` : ''}
      </div>

      <div class="invoice-title">${escapeHtml(labels.invoiceTitle)} ${escapeHtml(invoiceNumber)}</div>

      <div class="meta-row">
        <div><span class="strong">${escapeHtml(labels.issueDate)}:</span> ${escapeHtml(issueDate)}</div>
        <div><span class="strong">${escapeHtml(labels.serviceDate)}:</span> ${escapeHtml(serviceDate)}</div>
        <div><span class="strong">${escapeHtml(labels.servicePlace)}:</span> ${escapeHtml(servicePlace)}</div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>${escapeHtml(labels.tableService)}</th>
            <th class="num">${escapeHtml(labels.tableUnit)}</th>
            <th class="num">${escapeHtml(labels.tableQuantity)}</th>
            <th class="num">${escapeHtml(labels.tablePrice)}</th>
            <th class="num">${escapeHtml(labels.tableTotal)}</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceItems
            .map(
              (item, index) => `
                <tr>
                  <td>
                    <div>${escapeHtml(item.title)}</div>
                  </td>
                  <td class="num">${escapeHtml(item.unit || labels.unitService)}</td>
                  <td class="num">${escapeHtml(formatNumber(locale, item.quantity))}</td>
                  <td class="num">${escapeHtml(formatCurrency(locale, item.unitPrice))}</td>
                  <td class="num">${escapeHtml(formatCurrency(locale, item.total))}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-label">${escapeHtml(labels.totalPrice)}</div>
        <div class="total-value">${escapeHtml(totalPrice)}</div>
      </div>

      <div class="notes">
        <div class="notes-title">${escapeHtml(labels.notesTitle)}</div>
        <div>${escapeHtml(labels.totalPaid)}: ${escapeHtml(totalPaid)}</div>
        <div>${escapeHtml(labels.outstanding)}: ${escapeHtml(outstanding)}</div>
        ${job.tipAmount > 0 ? `<div>${escapeHtml(labels.tip)}: ${escapeHtml(tip)}</div>` : ''}
      </div>

      <div class="notes">
        <div class="notes-title">${escapeHtml(labels.taxNoteTitle)}</div>
        <div>${escapeHtml(labels.taxNoteBody)}</div>
      </div>

      <div class="footer">${escapeHtml(labels.footer)}</div>
    </body>
  </html>
  `;
}

export async function generateInvoicePdf(input: InvoiceDocumentInput) {
  const html = buildInvoiceHtml(input);
  return await Print.printToFileAsync({
    html,
    base64: false,
  });
}
