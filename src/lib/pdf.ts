import jsPDF from 'jspdf';

export function generatePdf(title: string, contentText: string, filename: string) {
    try {
        const Doc = (jsPDF as any).jsPDF || jsPDF;
        const pdf = new Doc({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;

        // Draw background (F4F7FA)
        pdf.setFillColor(244, 247, 250);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Title (Navy: 4A6C8C)
        pdf.setTextColor(74, 108, 140);
        pdf.setFontSize(24);
        pdf.setFont("helvetica", "bold");

        const displayTitle = title?.trim() || 'Untitled document';
        const splitTitle = pdf.splitTextToSize(displayTitle, pageWidth - 2 * margin);
        pdf.text(splitTitle, margin, margin + 10);

        const titleHeight = splitTitle.length * 10;

        // Body (Navy text)
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");

        const cleanContent = contentText || '';
        const splitText = pdf.splitTextToSize(cleanContent, pageWidth - 2 * margin);

        let yPos = margin + titleHeight + 10;

        for (let i = 0; i < splitText.length; i++) {
            if (yPos > pageHeight - margin) {
                pdf.addPage();
                pdf.setFillColor(244, 247, 250);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                pdf.setTextColor(74, 108, 140);
                yPos = margin;
            }
            pdf.text(splitText[i], margin, yPos);
            yPos += 7;
        }

        pdf.save(filename || 'focalyst-note.pdf');
    } catch (err) {
        console.error('PDF Generation Error:', err);
    }
}

export function slugify(text: string) {
    if (!text) return 'untitled';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '') || 'document';
}
