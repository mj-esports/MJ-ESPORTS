/**
 * MJ ESPORTS Production Branded Document Templates
 * Standardized HTML/CSS generators for official certificates, receipts, registration confirmations, and result sheets.
 */

export function generateTournamentCertificateHTML({ playerName, teamName, tournamentTitle, placement, game, date }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MJ ESPORTS - Official Certificate of Achievement</title>
      <style>
        body { font-family: 'Courier New', monospace; background: #0b0e11; color: #ffffff; padding: 40px; margin: 0; }
        .cert-card { border: 4px solid #00f2ff; background: #151a21; padding: 40px; text-center; border-radius: 16px; box-shadow: 0 0 30px rgba(0,242,255,0.3); }
        .title { font-size: 28px; font-weight: 900; color: #00f2ff; text-transform: uppercase; letter-spacing: 2px; }
        .subtitle { font-size: 14px; color: #fe6b00; text-transform: uppercase; font-weight: bold; margin-top: 8px; }
        .winner-name { font-size: 32px; font-weight: bold; color: #ffffff; margin: 24px 0 8px 0; border-bottom: 2px solid #3a494b; display: inline-block; padding-bottom: 8px; }
        .details { font-size: 14px; color: #8e9dae; margin: 16px 0; line-height: 1.6; }
        .footer { font-size: 12px; color: #00ff9d; margin-top: 32px; text-transform: uppercase; letter-spacing: 1px; }
      </style>
    </head>
    <body>
      <div class="cert-card">
        <div class="title">MJ ESPORTS ARENA</div>
        <div class="subtitle">CERTIFICATE OF VICTORY & EXCELLENCE</div>
        <div class="details">This official certificate is proudly awarded to</div>
        <div class="winner-name">${playerName || 'ESPORTS CHAMPION'}</div>
        <div class="details">
          Squad Team: <strong>${teamName || 'Independent Participant'}</strong><br/>
          Tournament: <strong>${tournamentTitle || 'Official Tournament'}</strong><br/>
          Rank Placement: <strong>${placement || '1st Place Winner'}</strong> (${game || 'Free Fire MAX'})
        </div>
        <div class="footer">Verified by MJ ESPORTS Referees &bull; Date: ${date || new Date().toLocaleDateString()}</div>
      </div>
    </body>
    </html>
  `
}

export function generatePaymentReceiptHTML({ receiptId, userEmail, teamName, tournamentTitle, amountPaid, date }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MJ ESPORTS - Official Payment Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0b0e11; color: #e1e2e7; padding: 30px; margin: 0; }
        .receipt-card { max-width: 500px; margin: 0 auto; background: #151a21; border: 1px solid #3a494b; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { border-bottom: 1px solid #3a494b; padding-bottom: 16px; margin-bottom: 16px; }
        .brand { font-size: 20px; font-weight: bold; color: #00f2ff; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
        .label { color: #8e9dae; }
        .value { font-weight: bold; color: #ffffff; }
        .total-row { border-top: 1px solid #3a494b; padding-top: 12px; margin-top: 16px; font-size: 16px; color: #00ff9d; }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div class="brand">MJ ESPORTS</div>
          <div style="font-size: 11px; color: #8e9dae;">Receipt ID: ${receiptId || 'REC-' + Date.now()}</div>
        </div>
        <div class="row"><span class="label">Payer Account:</span><span class="value">${userEmail}</span></div>
        <div class="row"><span class="label">Registered Squad:</span><span class="value">${teamName}</span></div>
        <div class="row"><span class="label">Tournament:</span><span class="value">${tournamentTitle}</span></div>
        <div class="row"><span class="label">Payment Date:</span><span class="value">${date || new Date().toLocaleDateString()}</span></div>
        <div class="row total-row"><span class="label">Amount Paid:</span><span class="value">${amountPaid}</span></div>
      </div>
    </body>
    </html>
  `
}
