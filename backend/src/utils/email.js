const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host || !config.smtp.user) {
    console.warn("[email] SMTP не настроен — письма будут только логироваться в консоль.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.password },
  });
  return transporter;
}

async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:DRY-RUN] to=${to} subject=${subject}\n${html}`);
    return;
  }
  await t.sendMail({ from: config.smtp.from, to, subject, html });
}

async function sendPasswordResetEmail(to, resetUrl) {
  await sendEmail(
    to,
    "Восстановление пароля — КомпМастер",
    `<p>Вы запросили восстановление пароля.</p>
     <p><a href="${resetUrl}">Нажмите сюда, чтобы задать новый пароль</a>.</p>
     <p>Ссылка действует 1 час. Если это были не вы — просто проигнорируйте письмо.</p>`
  );
}

module.exports = { sendEmail, sendPasswordResetEmail };
