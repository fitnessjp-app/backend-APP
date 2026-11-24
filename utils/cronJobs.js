const cron = require('node-cron');
const Member = require('../models/Member');
const { sendEmail } = require('../config/mailer');
const { expiryReminderTemplate } = require('./receiptEmailTemplate');

const startCronJobs = () => {
  // Runs daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[cron] Running daily membership expiry job...');

    try {
      // 1. Mark active members whose expiryDate has passed as expired.
      const expiredResult = await Member.updateMany(
        { status: 'active', expiryDate: { $lt: new Date() } },
        { $set: { status: 'expired' } }
      );

      // 2. Find members expiring in exactly 3 days and send reminder emails.
      const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const target = new Date();
      target.setDate(target.getDate() + 3);
      const rangeStart = startOfDay(target);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1);

      const expiringMembers = await Member.find({
        status: 'active',
        expiryDate: { $gte: rangeStart, $lt: rangeEnd },
      });

      let remindersSent = 0;
      for (const member of expiringMembers) {
        try {
          await sendEmail({
            to: member.email,
            subject: 'Your FitZone plan is expiring soon',
            html: expiryReminderTemplate({ member }),
          });
          remindersSent += 1;
        } catch (err) {
          console.error(`[cron] Failed to send reminder to ${member.email}:`, err.message);
        }
      }

      console.log(
        `[cron] Summary: ${expiredResult.modifiedCount} member(s) marked expired, ${remindersSent} reminder email(s) sent.`
      );
    } catch (err) {
      console.error('[cron] Job failed:', err.message);
    }
  });

  console.log('Cron jobs scheduled.');
};

module.exports = startCronJobs;
