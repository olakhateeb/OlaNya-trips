// מייבא את ספריית nodemailer לצורך שליחת מיילים
const nodemailer = require("nodemailer");

// Map זמני לשמירת קודי אימות
class CodeStore {
  constructor() {
    this.store = new Map();
  }

  saveCode(email, code) {
    this.store.set(email, code);
  }

  getCode(email) {
    return this.store.get(email);
  }

  clearCode(email) {
    this.store.delete(email);
  }
}

const codeStore = new CodeStore();

// מחולל קוד רנדומלי בן 6 ספרות
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 📧 שולח קוד אימות למייל לצורך שחזור סיסמה
async function sendCode(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email.");
  }

  const code = generateCode();
  codeStore.saveCode(email, code);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "doolanyatrips@gmail.com",
      pass: process.env.EMAIL_PASS || "loeu irzo fbxx iuep",
    },
  });

  const mailOptions = {
    from: "doolanyatrips@gmail.com",
    to: email,
    subject: "קוד אימות לאיפוס סיסמה",
    text: `קוד האימות שלך הוא: ${code}`,
  };

  await transporter.sendMail(mailOptions);
  return { message: "✅ קוד נשלח למייל." };
}

// פונקציית אימות קוד
function verifyCode(email, code) {
  if (!email || !code) {
    return { success: false, message: "Missing email or code" };
  }

  const storedCode = codeStore.getCode(email);
  if (storedCode === code) {
    codeStore.clearCode(email);
    return { success: true, message: "✅ קוד אומת בהצלחה" };
  } else {
    return { success: false, message: "❌ קוד שגוי" };
  }
}

// 🆕 פונקציה כללית לשליחת מייל מותאם (למשל הזמנה, הודעה, אישור וכו')
async function sendCustomEmail(email, subject, text) {
  if (!email || !subject || !text) {
    throw new Error("Missing parameters for sending email.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "doolanyatrips@gmail.com",
      pass: process.env.EMAIL_PASS || "loeu irzo fbxx iuep",
    },
  });

  const mailOptions = {
    from: "doolanyatrips@gmail.com",
    to: email,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
  return { message: "✅ Email sent successfully." };
}

module.exports = {
  sendCode,
  verifyCode,
  sendCustomEmail, // ← הוספה חשובה
};
