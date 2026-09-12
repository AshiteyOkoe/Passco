import 'dotenv/config';
import { testSMTPConnection, brevoApiConfigured, smtpConfigured } from './utils/otp';

(async () => {
  console.log('SMTP configured:', smtpConfigured());
  console.log('Brevo API configured:', brevoApiConfigured());
  console.log('Host:', process.env.SMTP_HOST || '(missing)', '| Port:', process.env.SMTP_PORT || '(missing)');
  console.log('From:', process.env.SMTP_FROM || process.env.SMTP_USER || '(missing)');
  console.log('User:', process.env.SMTP_USER ? `${String(process.env.SMTP_USER).slice(0, 2)}…` : '(missing)');
  console.log('Pass:', process.env.SMTP_PASS ? `${String(process.env.SMTP_PASS).slice(0, 2)}…${String(process.env.SMTP_PASS).slice(-4)}` : '(missing)');
  console.log('Node env:', process.env.NODE_ENV || '(unset)');
  console.log('---');
  try {
    const { ok, detail } = await testSMTPConnection();
    console.log('Connection test:', ok ? 'OK' : 'FAILED');
    console.log(detail);
    process.exit(ok ? 0 : 1);
  } catch (err) {
    console.log('Connection test: FAILED');
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();