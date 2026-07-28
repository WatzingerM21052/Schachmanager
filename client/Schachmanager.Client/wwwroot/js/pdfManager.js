// Generalized from SchuelerligaManager's inline pdfManager.generatePdf (which was
// Auswertung-specific) so both the tournament standings PDF and the youth Statistics PDF
// can share one grouped-table renderer.
window.pdfManager = {
    /**
     * @param {string} filename
     * @param {string} title
     * @param {string} subtitle
     * @param {string[]} columns
     * @param {{groupName: string, rows: (string|number)[][]}[]} groups
     */
    generateGroupedPdf: function (filename, title, subtitle, columns, groups) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("landscape");
        const totalPagesExp = "{total_pages_count_string}";

        groups.forEach((group, groupIndex) => {
            if (groupIndex > 0) doc.addPage();

            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 41, 66);
            doc.text(title, 14, 15);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(subtitle, 14, 21);

            doc.setFontSize(15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(201, 151, 31);
            doc.text(`${group.groupName} (${group.rows.length})`, 14, 32);

            doc.autoTable({
                startY: 38,
                head: [columns],
                body: group.rows,
                theme: "striped",
                headStyles: { fillColor: [20, 41, 66], textColor: 255, fontStyle: "bold", halign: "center" },
                bodyStyles: { textColor: 50, fontSize: 9.5 },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                didDrawPage: function (data) {
                    let str = "Seite " + doc.internal.getNumberOfPages();
                    if (typeof doc.putTotalPages === "function") str += " von " + totalPagesExp;
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
                    doc.text("Generiert mit Schachmanager", doc.internal.pageSize.width - data.settings.margin.right - 50, doc.internal.pageSize.height - 10);
                },
            });
        });

        if (typeof doc.putTotalPages === "function") doc.putTotalPages(totalPagesExp);
        doc.save(filename);
    },
};
