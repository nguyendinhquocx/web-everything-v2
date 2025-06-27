export class PDFGenerator {
    constructor(config = {}) {
        this.config = {
            fontSize: 10,
            timestampFontSize: 8,
            columns: 3,
            fontFamily: 'helvetica',
            margin: 15,
            lineHeight: 4,
            paragraphSpacing: 6,
            columnSpacing: 8,
            ...config
        };
        this.pdf = null;
        this.currentPage = 1;
    }

    async generateFromData(processedData) {
        // Fix: Kiểm tra jsPDF availability
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF library not loaded. Please check the script import.');
        }

        // Khởi tạo PDF với syntax đúng
        this.pdf = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Thêm font hỗ trợ tiếng Việt
        this.setupVietnameseFont();
        
        // Tổ chức data thành cột theo trang
        const pages = this.organizeIntoPages(processedData);
        
        // Render từng trang
        pages.forEach((pageData, pageIndex) => {
            if (pageIndex > 0) {
                this.pdf.addPage();
            }
            this.renderPage(pageData, pageIndex + 1);
        });

        return this.pdf;
    }

    setupVietnameseFont() {
        // Sử dụng font có sẵn hỗ trợ Unicode tốt hơn
        this.pdf.setFont('helvetica', 'normal');
        
        // Set encoding để hỗ trợ tiếng Việt
        this.pdf.setCharSpace(0);
        this.pdf.setR2L(false);
    }

    organizeIntoPages(data) {
        const pageHeight = this.pdf.internal.pageSize.height;
        const usableHeight = pageHeight - (this.config.margin * 2) - 20; // 20mm buffer
        const lineHeight = this.config.lineHeight + 1;
        const paragraphSpacing = this.config.paragraphSpacing;
        
        // Tính toán số dòng mỗi item chiếm
        const itemsWithHeight = data.map(item => {
            const timestampLines = item.timestamp ? 1 : 0;
            const contentLines = this.estimateLines(item.content);
            const totalHeight = (timestampLines + contentLines) * lineHeight + paragraphSpacing;
            
            return {
                ...item,
                estimatedHeight: totalHeight,
                contentLines: contentLines
            };
        });

        // Chia thành các trang với multiple columns
        const pages = [];
        const itemsPerColumn = Math.floor(usableHeight / 15); // Estimate items per column
        const itemsPerPage = itemsPerColumn * this.config.columns;
        
        for (let i = 0; i < itemsWithHeight.length; i += itemsPerPage) {
            const pageItems = itemsWithHeight.slice(i, i + itemsPerPage);
            const columns = this.distributeItemsToColumns(pageItems);
            pages.push(columns);
        }

        return pages;
    }

    distributeItemsToColumns(items) {
        const columns = Array(this.config.columns).fill().map(() => []);
        
        // Distribute items evenly across columns
        items.forEach((item, index) => {
            const columnIndex = index % this.config.columns;
            columns[columnIndex].push(item);
        });

        return columns;
    }

    estimateLines(text) {
        if (!text) return 0;
        
        const pageWidth = this.pdf.internal.pageSize.width;
        const columnWidth = (pageWidth - (this.config.margin * 2) - (this.config.columnSpacing * (this.config.columns - 1))) / this.config.columns;
        const maxWidth = columnWidth - 5; // padding
        
        // Temporary set font to measure
        this.pdf.setFontSize(this.config.fontSize);
        const lines = this.pdf.splitTextToSize(text, maxWidth);
        return lines.length;
    }

    renderPage(columns, pageNumber) {
        const pageWidth = this.pdf.internal.pageSize.width;
        const pageHeight = this.pdf.internal.pageSize.height;
        const usableWidth = pageWidth - (this.config.margin * 2);
        const columnWidth = (usableWidth - (this.config.columnSpacing * (this.config.columns - 1))) / this.config.columns;

        columns.forEach((column, columnIndex) => {
            if (column.length === 0) return;

            const x = this.config.margin + (columnIndex * (columnWidth + this.config.columnSpacing));
            this.renderColumn(column, x, columnWidth, pageHeight);
        });

        // Add page number (optional)
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(150, 150, 150);
        this.pdf.text(`Page ${pageNumber}`, pageWidth - 30, pageHeight - 10);
    }

    renderColumn(items, x, width, pageHeight) {
        let y = this.config.margin + 15; // Start position
        const maxY = pageHeight - this.config.margin - 15; // Bottom margin

        items.forEach((item) => {
            // Skip if we're too close to bottom
            if (y > maxY - 20) {
                return;
            }

            // Render timestamp
            if (item.timestamp && item.timestamp.trim()) {
                this.pdf.setFontSize(this.config.timestampFontSize);
                this.pdf.setTextColor(100, 100, 100);
                
                // Fix Vietnamese text rendering
                const cleanTimestamp = this.cleanVietnameseText(item.timestamp);
                this.pdf.text(cleanTimestamp, x, y);
                y += this.config.lineHeight + 1;
            }

            // Render content
            if (item.content && item.content.trim()) {
                this.pdf.setFontSize(this.config.fontSize);
                this.pdf.setTextColor(0, 0, 0);

                // Clean and split text for Vietnamese support
                const cleanContent = this.cleanVietnameseText(item.content);
                const lines = this.pdf.splitTextToSize(cleanContent, width - 3);
                
                lines.forEach(line => {
                    if (y > maxY - 10) return; // Stop if too close to bottom
                    
                    this.pdf.text(line, x, y);
                    y += this.config.lineHeight;
                });

                y += this.config.paragraphSpacing;
            }
        });
    }

    // Fix Vietnamese text encoding issues
    cleanVietnameseText(text) {
        if (!text) return '';
        
        // Convert to proper encoding and handle special characters
        return text
            .normalize('NFC') // Normalize Unicode
            .replace(/'/g, "'") // Fix apostrophes
            .replace(/"/g, '"').replace(/"/g, '"') // Fix quotes
            .replace(/–/g, '-').replace(/—/g, '-') // Fix dashes
            .replace(/…/g, '...') // Fix ellipsis
            .trim();
    }

    async save(filename = `subtitle-${Date.now()}.pdf`) {
        if (!this.pdf) {
            throw new Error('PDF chưa được tạo. Hãy gọi generateFromData() trước.');
        }

        this.pdf.save(filename);
    }

    // Static method để kiểm tra jsPDF availability
    static isAvailable() {
        return !!(window.jspdf && window.jspdf.jsPDF);
    }

    // Method để tối ưu layout dựa trên số lượng items
    optimizeLayout(itemCount) {
        if (itemCount < 30) {
            return { columns: 1, fontSize: 11 };
        } else if (itemCount < 100) {
            return { columns: 2, fontSize: 10 };
        } else if (itemCount < 200) {
            return { columns: 3, fontSize: 9 };
        } else {
            return { columns: 4, fontSize: 8 };
        }
    }
}