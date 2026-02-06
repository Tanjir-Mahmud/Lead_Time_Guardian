import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFData {
    invoiceNo: string;
    invoiceTotal: number;
    auditDate: string;
    logistics: {
        road: string;
        sea: string;
        weather: string;
    };
    mathIntegrity: {
        fob: number;
        av: number;
        incentive: number;
        revenueRisk: number;
    };
    strategicFindings: string;
    caAdvice: {
        advice: string;
        type: string;
        savings: number;
    }[];
    profitProtection: {
        cashIncentive: number;
        dutyDrawback: number;
        revenueRisk: number;
        ldcRiskScore: number;
        cbamLiability: number;
    };
    lineItems: {
        format: number;
        description: string;
        qty: number;
        price: number;
        hsCode: string;
        ldcImpact: boolean;
        status: string;
    }[];
    sumCheck: {
        declared: number;
        calculated: number;
        passed: boolean;
    };
}

export const generateCFOReport = (data: PDFData) => {
    // 1. SETUP: A4 Page, Times New Roman
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    // Global Config
    doc.setFont('times', 'normal');
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const margin = 20; // 20mm strict margin

    // --- HELPER: CENTERED TEXT ---
    const centerText = (text: string, y: number, size: number = 10, fontStyle: 'normal' | 'bold' | 'italic' = 'normal') => {
        doc.setFont('times', fontStyle);
        doc.setFontSize(size);
        const textWidth = doc.getStringUnitWidth(text) * size / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    };

    // --- HELPER: SECTION HEADER ---
    const addSectionHeader = (title: string, y: number) => {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0); // Black
        doc.text(title.toUpperCase(), margin, y);

        // Underline
        doc.setLineWidth(0.3);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        return y + 8; // Return next Y position
    };

    let currentY = margin;

    // --- 1. HEADER ---
    centerText('CFO ACCURACY REPORT', currentY, 16, 'bold');
    currentY += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    // Synthetic Steps Ltd | Invoice: ${invoice_no} | SAVAR, DHAKA
    const subHeader = `Synthetic Steps Ltd | Invoice: ${data.invoiceNo} | SAVAR, DHAKA`;
    const dateText = `Audit Date: ${data.auditDate}`;

    // Centered Subheader
    centerText(subHeader, currentY, 10, 'normal');
    currentY += 6;
    centerText(dateText, currentY, 10, 'normal');

    currentY += 15;

    // --- 2. FINANCIAL & LOGISTICS SUMMARY (Aligned via AutoTable) ---
    currentY = addSectionHeader('1. FINANCIAL INTEGRITY AUDIT', currentY);

    // Math Integrity Table
    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Metric', 'Formula / Reference', 'Value']],
        body: [
            ['FOB Value', 'Invoice Total', `$${data.mathIntegrity.fob.toLocaleString()}`],
            ['Assessable Value (AV)', '(FOB * 1.01) * 1.01', `$${data.mathIntegrity.av.toLocaleString()}`],
            ['Cash Incentive', 'FOB * 8% (Ref: FE-2025)', `$${data.mathIntegrity.incentive.toLocaleString()}`],
            ['Revenue Risk', 'AV * 11.9% (LDC Grading)', `$${data.mathIntegrity.revenueRisk.toLocaleString()}`],
        ],
        theme: 'grid',
        styles: {
            font: 'times',
            fontSize: 10,
            cellPadding: 3,
            valign: 'middle',
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [40, 40, 40], // Dark Gray
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto', fontStyle: 'italic' },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                // Colorize Logic
                if (data.row.index === 2) data.cell.styles.textColor = [22, 163, 74]; // Green for Incentive
                if (data.row.index === 3) data.cell.styles.textColor = [220, 38, 38]; // Red for Risk
            }
        }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15;

    // --- 3. LOGISTICS SNAPSHOT ---
    currentY = addSectionHeader('2. LOGISTICS STATUS', currentY);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Road Status', 'Sea Status', 'Weather / Risk']],
        body: [[
            data.logistics.road,
            data.logistics.sea,
            data.logistics.weather
        ]],
        theme: 'plain',
        styles: {
            font: 'times',
            fontSize: 10,
            cellPadding: 3,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        headStyles: {
            fontStyle: 'bold',
            textColor: [100, 100, 100],
            halign: 'center'
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                // Colorize status
                const text = data.cell.raw as string;
                if (text.includes('Clear') || text.includes('Smooth') || text.includes('Safe')) {
                    data.cell.styles.textColor = [22, 163, 74]; // Green
                } else {
                    data.cell.styles.textColor = [220, 38, 38]; // Red
                }
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15;

    // --- 4. STRATEGIC ADVICE ---

    // Check if we need a new page
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
    }

    currentY = addSectionHeader('3. STRATEGIC ADVICE & OPTIMIZATION', currentY);

    // Flatten logic for advice table
    const adviceBody = data.caAdvice.map(item => [
        item.type === 'Logistics' ? 'LOGISTICS' : 'FINANCIAL',
        item.advice,
        `+$${item.savings.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Category', 'Recommendation', 'Est. Savings']],
        body: adviceBody,
        theme: 'striped',
        styles: {
            font: 'times',
            fontSize: 10,
            cellPadding: 4,
            valign: 'middle',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [30, 41, 59], // Navy
            textColor: [255, 255, 255],
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold', fontSize: 8 },
            1: { cellWidth: 'auto' }, // Wraps content
            2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
        }
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15;


    // --- 5. LINE ITEMS (Pagination Safe) ---
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
    }

    currentY = addSectionHeader('4. INVOICE LINE ITEMS', currentY);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['#', 'Description', 'HS Code', 'Qty', 'Unit Price', 'Status']],
        body: data.lineItems.map(item => [
            item.format,
            item.description,
            item.hsCode,
            item.qty.toLocaleString(),
            `$${item.price}`,
            item.status
        ]),
        theme: 'grid',
        styles: {
            font: 'times',
            fontSize: 9,
            cellPadding: 2,
            valign: 'middle',
            halign: 'center'
        },
        headStyles: {
            fillColor: [240, 240, 240], // Light gray
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto', halign: 'left' }, // Description aligned left
            2: { cellWidth: 25 },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 20 }
        }
    });

    // --- FOOTER ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('times', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Page ${i} of ${pageCount} | Generated by Lead-Time Guardian AI`,
            margin,
            pageHeight - 10
        );
    }

    doc.save(`CFO_Report_${data.invoiceNo}_${new Date().toISOString().split('T')[0]}.pdf`);
};
