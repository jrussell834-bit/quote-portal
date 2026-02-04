const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { getDueReminders, markReminderSent } = require('./db');

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST) {
    console.warn(
      '[reminderService] SMTP configuration missing. Reminders will be logged to console only.'
    );
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === 'true',
    auth: SMTP_USER
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      : undefined
  });
}

function sendReminderEmail(quote, transporter) {
  if (!quote.reminderEmail) return;

  const subject = `Quote follow-up: ${quote.title} for ${quote.clientName}`;
  const text = `This is a reminder to chase the quote "${quote.title}" for client "${quote.clientName}".\n\nCurrent stage: ${quote.stage}\nValue: ${
    quote.value != null ? quote.value : 'N/A'
  }\n\nLast chased: ${
    quote.lastChasedAt ? new Date(quote.lastChasedAt).toLocaleString() : 'Never'
  }`;

  if (!transporter) {
    console.log(
      `[reminderService] Reminder for ${quote.reminderEmail}: ${subject}\n${text}`
    );
    return Promise.resolve();
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || quote.reminderEmail,
    to: quote.reminderEmail,
    subject,
    text
  });
}

function startReminderScheduler() {
  const transporter = createTransport();

  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    try {
      const dueQuotes = await getDueReminders(now);
      for (const quote of dueQuotes) {
        try {
          await sendReminderEmail(quote, transporter);
          await markReminderSent(quote.id, new Date());
        } catch (err) {
          console.error('[reminderService] Error sending reminder', err);
        }
      }
    } catch (err) {
      console.error('[reminderService] Error checking reminders', err);
    }
  });

  console.log('[reminderService] Reminder scheduler started (runs every minute).');
}

module.exports = {
  startReminderScheduler
};

