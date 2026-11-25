
const { sendWorkEmail } = require("./services/emailService");

async function testEmail() {
    try {
        await sendWorkEmail({
            subject: "בדיקת מייל - UV נגרות חוץ",
            text: `
שלום יובל!

זוהי הודעת ניסיון שנשלחה מאתר UV נגרות חוץ.

אם קיבלת את ההודעה הזאת,
מערכת שליחת המיילים שלנו עובדת בהצלחה!

UV נגרות חוץ
      `,
        });

        console.log("the mail is send successfully");
    } catch (error) {
        console.error("error sending email:");
        console.error(error.message);
    }
}

testEmail();
