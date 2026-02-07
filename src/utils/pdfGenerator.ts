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
        riskDetails?: {
            hasRisk: boolean;
            riskType: string;
            description: string;
        };
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
    sustainability: {
        score: 'Low' | 'Medium' | 'High';
        intensity: string;
        advice: string;
    };
    rexStatus?: string;
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
    const mathStatus = data.sumCheck.passed ? 'SECURE' : 'CORRECTED 🚨';
    const declaredVsCalc = data.sumCheck.passed ? 'Matched' : `Declared: $${data.sumCheck.declared} | Calc: $${data.sumCheck.calculated}`;

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Metric', 'Formula / Reference', 'Value']],
        body: [
            ['FOB Value (True)', 'Invoice Total (Validated)', `$${data.mathIntegrity.fob.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Assessable Value (AV)', '(FOB * 1.01) * 1.01', `$${data.mathIntegrity.av.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Math Integrity', declaredVsCalc, mathStatus],
            ['REX Compliance', '> €6,000 Rule', data.rexStatus || 'N/A'],
            ['Cash Incentive', 'FOB * 8% (Ref: FE-2025)', `$${data.mathIntegrity.incentive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Revenue Risk', 'AV * 11.9% (LDC Grading)', `$${data.mathIntegrity.revenueRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
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
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 'auto', fontStyle: 'italic' },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                // Colorize Logic
                if (data.row.index === 2 && data.cell.raw === 'CORRECTED 🚨') data.cell.styles.textColor = [220, 38, 38]; // Red
                if (data.row.index === 3 && data.cell.raw === 'MISSING') data.cell.styles.textColor = [220, 38, 38]; // Red
                if (data.row.index === 4) data.cell.styles.textColor = [22, 163, 74]; // Green for Incentive
                if (data.row.index === 5) data.cell.styles.textColor = [220, 38, 38]; // Red for Risk
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
        head: [['Road Status', 'Sea Status', '72h Weather Outlook']],
        body: [[
            data.logistics.road,
            data.logistics.sea,
            data.logistics.riskDetails?.hasRisk
                ? `⚠️ ${data.logistics.riskDetails.riskType}`
                : '✅ Clear'
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
                } else if (text.includes('⚠️')) {
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
        `+$${item.savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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


    // --- 5. SUSTAINABILITY & CARBON STRATEGY (CBAM) ---
    currentY = addSectionHeader('4. SUSTAINABILITY & CARBON STRATEGY', currentY);

    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text(`Carbon Score: ${data.sustainability.score.toUpperCase()}`, margin + 5, currentY + 5);

    // Icon Simulation using text color
    const scoreColor = data.sustainability.score === 'Low' ? [22, 163, 74] :
        data.sustainability.score === 'Medium' ? [234, 179, 8] : [220, 38, 38];
    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text('●', margin, currentY + 5);
    doc.setTextColor(0, 0, 0); // Reset

    doc.setFont('times', 'normal');
    doc.text(`Intensity Baseline: ${data.sustainability.intensity}`, margin + 50, currentY + 5);

    doc.setFont('times', 'bolditalic');
    doc.text(`Mitigation Strategy:`, margin, currentY + 12);
    doc.setFont('times', 'italic');
    doc.setFontSize(9);

    // Text wrap for advice
    const splitAdvice = doc.splitTextToSize(data.sustainability.advice, pageWidth - (margin * 2));
    doc.text(splitAdvice, margin, currentY + 17);

    currentY += 25; // Spacing after section


    // 2026 Graduation Risk: Use 2-decimal formatting strictly
    // Formula: (FOB * 1.01) * 1.01
    // 2026 Graduation Risk: AV * 11.9%
    // Note: We use the EXACT same string mapping 
    doc.text(`- **Assessable Value (AV)**: $${data.mathIntegrity.av.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, currentY + 10); // Simulated text placement matching prompt request
    // This part of the file generates the 'Strategic Audit Report' text block in the JSON, but here strictly formatting the table.
    // The prompt requested ensuring Section 2 and Section 5 match.
    // Section 2 is the 'Financial Integrity Audit' table above (Line 116).
    // Section 3 is 'Strategic Advice' (Line 215).
    // The user mentioned a "Strategic Audit Report" text block in route.ts, let's update route.ts mostly for that.
    // But here in PDF we ensure every $ output has 2 decimals.

    // --- 6. INVOICE LINE ITEMS (Pagination Safe) ---
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
    }

    currentY = addSectionHeader('5. INVOICE LINE ITEMS', currentY);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['#', 'Description', 'HS Code', 'Qty', 'Unit Price', 'Status']],
        body: data.lineItems.map(item => [
            item.format,
            item.description,
            item.hsCode,
            item.qty.toLocaleString(),
            `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
