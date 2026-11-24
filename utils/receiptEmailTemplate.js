const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

const admissionReceiptTemplate = ({ member, plan }) => `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
    <h2 style="color:#e63946;">Welcome to J P Fitness, ${member.name}!</h2>
    <p>Thank you for joining J P Fitness Gym. Here are your membership details:</p>
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding:6px 0;"><strong>Plan</strong></td><td>${plan.name}</td></tr>
      <tr><td style="padding:6px 0;"><strong>Batch</strong></td><td>${member.batch}</td></tr>
      <tr><td style="padding:6px 0;"><strong>Admission Date</strong></td><td>${formatDate(member.admissionDate)}</td></tr>
      <tr><td style="padding:6px 0;"><strong>Expiry Date</strong></td><td>${formatDate(member.expiryDate)}</td></tr>
      <tr><td style="padding:6px 0;"><strong>Amount Paid (Cash)</strong></td><td>₹${member.amountPaid}</td></tr>
    </table>
    <p style="margin-top:16px;">We're excited to have you with us. See you at the gym!</p>
    <p style="color:#888; font-size:12px;">— Team J P Fitness</p>
  </div>
`;

const renewalReceiptTemplate = ({ member, plan }) => `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
    <h2 style="color:#e63946;">Membership Renewed — FitZone</h2>
    <p>Hi ${member.name}, your membership has been successfully renewed.</p>
    <table style="width:100%; border-collapse: collapse;">
      <tr><td style="padding:6px 0;"><strong>Plan</strong></td><td>${plan.name}</td></tr>
      <tr><td style="padding:6px 0;"><strong>New Expiry Date</strong></td><td>${formatDate(member.expiryDate)}</td></tr>
      <tr><td style="padding:6px 0;"><strong>Amount Paid (Cash)</strong></td><td>₹${member.amountPaid}</td></tr>
    </table>
    <p style="margin-top:16px;">Thanks for continuing your fitness journey with us!</p>
    <p style="color:#888; font-size:12px;">— Team FitZone</p>
  </div>
`;

const expiryReminderTemplate = ({ member }) => `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
    <h2 style="color:#e63946;">Your FitZone plan is expiring soon</h2>
    <p>Hi ${member.name}, your membership is set to expire on <strong>${formatDate(member.expiryDate)}</strong>.</p>
    <p>Please visit the front desk to renew and continue your fitness journey without interruption.</p>
    <p style="color:#888; font-size:12px;">— Team FitZone</p>
  </div>
`;

module.exports = { admissionReceiptTemplate, renewalReceiptTemplate, expiryReminderTemplate };
