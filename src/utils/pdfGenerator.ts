import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFData {
    invoiceNo: string;
    auditDate: string;
    fobValue: number;
    logistics: {
        roadSeaStatus: string;
        trackingAlerts: string;
    };
    financials: {
        avCalculation: number;
        cashIncentive: number;
        revenueRisk: number;
    };
    strategy: {
        optimization: string[];
        compliance: string[];
        riskMitigation: string[];
    };
}

export const generateCFOReport = (data: PDFData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Helper for centering text
    const centerText = (text: string, y: number, fontSize: number = 12, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // --- HEADER ---
    doc.setFillColor(30, 41, 59); // Dark Navy Blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 215, 0); // Gold
    centerText('SYNTHETIC STEPS LTD', 15, 18, true);

    doc.setTextColor(255, 255, 255);
    centerText('CFO ACCURACY REPORT', 25, 14, true);

    doc.setFontSize(10);
    doc.text(`Invoice ID: ${data.invoiceNo}`, 14, 35);
    const dateText = `Audit Date: ${data.auditDate}`;
    doc.text(dateText, pageWidth - doc.getTextWidth(dateText) - 14, 35);

    doc.setTextColor(0, 0, 0); // Reset text color
    let currentY = 50;

    // --- SECTION 1: LOGISTICS ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SECTION 1: LOGISTICS SNAPSHOT', 14, currentY);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Movement Status: ${data.logistics.roadSeaStatus}`, 14, currentY);
    currentY += 6;
    doc.text(`Tracking Alerts: ${data.logistics.trackingAlerts}`, 14, currentY);
    currentY += 15;

    // --- SECTION 2: FINANCIALS ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SECTION 2: FINANCIAL INTEGRITY & RISK', 14, currentY);
    doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
    currentY += 10;

    // Financial Table using autoTable
    autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value ($)', 'Notes']],
        body: [
            ['FOB Value', `$${data.fobValue.toLocaleString()}`, 'Declared Value'],
            ['Assessable Value (AV)', `$${data.financials.avCalculation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Formula: (FOB * 1.01) * 1.01'],
            ['Cash Incentive Potential', `$${data.financials.cashIncentive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Est. based on current rates'],
            ['2026 Revenue Risk', `$${data.financials.revenueRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'LDC Graduation Impact'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 215, 0] },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15;

    // --- SECTION 3: STRATEGIC ADVICE ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SECTION 3: AI STRATEGIC EXECUTIVE SUMMARY', 14, currentY);
    doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
    currentY += 10;

    const addBulletPoints = (title: string, points: string[]) => {
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title, 14, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        points.forEach(point => {
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
            // Split long text
            const lines = doc.splitTextToSize(`• ${point}`, pageWidth - 28);
            doc.text(lines, 14, currentY);
            currentY += (lines.length * 5) + 2;
        });
        currentY += 5;
    };

    addBulletPoints('OPTIMIZATION OPPORTUNITIES:', data.strategy.optimization);
    addBulletPoints('COMPLIANCE ALERTS:', data.strategy.compliance);
    addBulletPoints('RISK MITIGATION:', data.strategy.riskMitigation);

    // --- FOOTER ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(240, 240, 240);
        doc.rect(0, doc.internal.pageSize.height - 15, pageWidth, 15, 'F');

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        centerText('Generated by Lead-Time Guardian AI - Verified via Supabase Integrity Checks', doc.internal.pageSize.height - 9, 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, doc.internal.pageSize.height - 9);
    }

    doc.save(`CFO_Accuracy_Report_${data.invoiceNo}.pdf`);
};
