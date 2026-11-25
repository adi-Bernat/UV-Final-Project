
const puppeteer = require("puppeteer");

// =====================================
// יצירת PDF מהצעת מחיר חתומה
// =====================================

async function createSignedQuotePdf(token) {

    // בדיקת תקינות הקישור המאובטח
    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/i.test(token)
    ) {
        throw new Error("Invalid quote token");
    }

    // כתובת האתר
    const frontendUrl = (
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(/\/+$/, "");

    const quoteUrl =
        frontendUrl + "/quote/view/" + token;

    let browser;

    try {

        // פתיחת דפדפן אוטומטי
        browser = await puppeteer.launch({
            headless: true,
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1200,
            height: 900,
            deviceScaleFactor: 1,
        });

        // טעינת הצעת המחיר
        await page.goto(quoteUrl, {
            waitUntil: "networkidle2",
            timeout: 45000,
        });

        // מוודאים שההצעה באמת אושרה ונחתמה
        await page.waitForSelector(
            ".quote-signed-result",
            {
                visible: true,
                timeout: 20000,
            }
        );

        // המתנה לטעינת הלוגו ותמונת החתימה
        await page.waitForFunction(
            () => {
                const images = Array.from(
                    document.querySelectorAll(
                        ".quote-preview-paper img"
                    )
                );

                return images.every(
                    (img) =>
                        img.complete &&
                        img.naturalWidth > 0
                );
            },
            { timeout: 15000 }
        );

        // הסתרת רכיבי אתר שלא צריכים להופיע ב-PDF
        await page.addStyleTag({
            content: `
        @media print {

          .site-header,
          footer,
          .uv-a11y2-widget,
          .uv-skip-link,
          .quote-customer-print-button,
          .quote-approved-banner {
            display: none !important;
          }

        }
      `,
        });

        // שימוש בעיצוב ההדפסה של האתר
        await page.emulateMediaType("print");

        // יצירת PDF בגודל A4
        const pdfData = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: "12mm",
                bottom: "12mm",
                left: "10mm",
                right: "10mm",
            },
        });

        // החזרת הקובץ בזיכרון, בלי לשמור קובץ זמני
        return Buffer.from(pdfData);

    } finally {

        // סגירת הדפדפן גם במקרה של שגיאה
        if (browser) {
            await browser.close();
        }

    }
}

module.exports = { createSignedQuotePdf };
