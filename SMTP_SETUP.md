# SMTP Email Configuration Guide

The reminder service can send email reminders for quote follow-ups. To enable email sending, you need to configure SMTP settings.

## Current Status

If you see: `[reminderService] SMTP configuration missing. Reminders will be logged to console only.`

This means:
- ✅ The reminder service is running
- ✅ Reminders are being checked every minute
- ⚠️ Emails are not being sent (logged to console only)
- 📧 To send actual emails, configure SMTP below

## Setup Instructions

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Quote Portal" as the name
   - Copy the 16-character password generated

3. **Set Environment Variables**:

**For Local Development (.env file):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_SECURE=false
SMTP_FROM=your-email@gmail.com
```

**For Railway (Environment Variables):**
- Go to Railway dashboard → Your backend service → Variables tab
- Add each variable:
  - `SMTP_HOST` = `smtp.gmail.com`
  - `SMTP_PORT` = `587`
  - `SMTP_USER` = `your-email@gmail.com`
  - `SMTP_PASS` = `your-16-char-app-password`
  - `SMTP_SECURE` = `false`
  - `SMTP_FROM` = `your-email@gmail.com`

### Option 2: Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_SECURE=false
SMTP_FROM=your-email@outlook.com
```

### Option 3: SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key
3. Use these settings:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
SMTP_FROM=noreply@yourdomain.com
```

### Option 4: Mailgun

1. Sign up at https://www.mailgun.com
2. Get your SMTP credentials from the dashboard

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
SMTP_FROM=noreply@yourdomain.com
```

### Option 5: Custom SMTP Server

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_SECURE=false  # or true for port 465
SMTP_FROM=noreply@yourdomain.com
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password/app password | `your-password` |
| `SMTP_SECURE` | Use SSL/TLS | `false` (port 587) or `true` (port 465) |
| `SMTP_FROM` | From email address | `noreply@yourdomain.com` |

## Testing

After configuring SMTP:

1. **Restart the server** (or Railway will auto-redeploy)
2. **Check the logs** for:
   - ✅ `[reminderService] Reminder scheduler started`
   - ✅ No more "SMTP configuration missing" warning
3. **Create a test quote** with:
   - Customer Email: your email address
   - Expected Date: today or tomorrow
4. **Wait for the reminder** (runs every minute)

## Troubleshooting

### "Authentication failed"
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Outlook**: Check if 2FA is enabled and use an app password
- Verify username and password are correct

### "Connection timeout"
- Check firewall settings
- Verify SMTP_HOST and SMTP_PORT are correct
- Try SMTP_SECURE=true with port 465

### "Emails not sending"
- Check server logs for error messages
- Verify SMTP_FROM is set correctly
- Ensure the reminder email field is filled in quotes
- Check that Expected Date is set and in the past

### "Still seeing console-only message"
- Verify all SMTP_* variables are set
- Restart the server after adding variables
- Check for typos in variable names

## Security Notes

⚠️ **Important:**
- Never commit `.env` files to Git
- Use App Passwords for Gmail (not your main password)
- For production, use a dedicated email service (SendGrid, Mailgun)
- Keep SMTP credentials secure

## Without SMTP

If you don't configure SMTP:
- ✅ Reminders still work (logged to console)
- ✅ You can see reminder logs in server console
- ❌ No actual emails are sent
- This is fine for development/testing

## Next Steps

1. Choose an email provider (Gmail is easiest for testing)
2. Set up the required credentials
3. Add environment variables to Railway
4. Redeploy the service
5. Test with a quote that has an Expected Date set
