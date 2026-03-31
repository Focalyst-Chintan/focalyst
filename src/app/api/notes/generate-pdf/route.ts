import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

// Set correct dynamic configuration for Vercel
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { htmlContent, noteTitle } = await req.json();

        if (!htmlContent) {
            return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
        }

        let browser;
        try {
            const isLocal = process.env.NODE_ENV === "development";

            const executablePath = isLocal
                ? (process.platform === "win32"
                    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
                    : process.platform === "linux"
                        ? "/usr/bin/google-chrome"
                        : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
                : await chromium.executablePath(
                    "https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.tar"
                );

            browser = await puppeteer.launch({
                args: isLocal ? [] : (chromium as any).args,
                defaultViewport: (chromium as any).defaultViewport || { width: 1280, height: 720 },
                executablePath: executablePath,
                headless: isLocal ? true : (chromium as any).headless,
            });

            const page = await browser.newPage();

            // Wrap content in basic HTML structure with styles
            const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #000000;
              line-height: 1.6;
              padding: 40px;
              background-color: #FFFFFF;
            }
            h1 { color: #000000; font-size: 28px; margin-bottom: 24px; border-bottom: 1px solid #000000; padding-bottom: 12px; }
            .content { font-size: 14px; }
            /* Handle Tiptap specific styles if any */
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 8px; }
            pre { background: #F5F5F5; padding: 12px; border-radius: 8px; overflow-x: auto; border: 1px solid #E0E0E0; }
            blockquote { border-left: 4px solid #000000; padding-left: 16px; margin-left: 0; font-style: italic; color: #333333; }

          </style>
        </head>
        <body>
          <h1>${noteTitle || "Untitled Note"}</h1>
          <div class="content">
            ${htmlContent}
          </div>
        </body>
        </html>
      `;

            await page.setContent(fullHtml, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: {
                    top: "20mm",
                    right: "20mm",
                    bottom: "20mm",
                    left: "20mm",
                },
            });

            await browser.close();

            const fileName = noteTitle ? `${noteTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf` : "note.pdf";

            return new NextResponse(pdfBuffer as any, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${fileName}"`,
                },
            });
        } catch (launchError) {
            console.error("Puppeteer Launch Error:", launchError);
            if (browser) await ((browser as any).close ? (browser as any).close() : null);
            return NextResponse.json({ error: "Failed to launch PDF engine" }, { status: 500 });
        }
    } catch (error) {
        console.error("PDF generation failed:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
