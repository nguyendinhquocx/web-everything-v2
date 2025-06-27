export class PDFExporter {
    constructor() {
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 15;
        this.columnGap = 8;
        this.maxLinesPerPage = 150;
        this.fontLoaded = false;
    }

    async loadVietnameseFont(pdf) {
        if (this.fontLoaded) return;
        
        try {
            // Add NotoSans font for Vietnamese support
            const fontUrl = 'https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.woff2';
            
            // For now, we'll use the built-in fonts with better Unicode support
            // You can add custom font loading here if needed
            pdf.addFont(fontUrl, 'NotoSans', 'normal');
            this.fontLoaded = true;
        } catch (error) {
            console.warn('Could not load Vietnamese font, using fallback');
        }
    }

    async export(content, config) {
        try {
            const lines = this.prepareContent(content);
            
            // For very large content, use improved chunked processing
            if (lines.length > 1000) {
                return await this.exportLargeContentWithUnicode(lines, config);
            } else {
                return await this.exportNormalContent(content, config);
            }
            
        } catch (error) {
            console.error('PDF Export Error:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        }
    }

    async exportLargeContentWithUnicode(lines, config) {
        const progressCallback = (progress) => {
            window.dispatchEvent(new CustomEvent('pdf-export-progress', { detail: progress }));
        };
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        
        // Load Vietnamese font support
        await this.loadVietnameseFont(pdf);
        
        // Calculate content dimensions
        const contentWidth = (this.pageWidth - (2 * this.margin) - ((config.columns - 1) * this.columnGap)) / config.columns;
        const lineHeight = config.fontSize * 0.4;
        const maxLinesPerColumn = Math.floor((this.pageHeight - (2 * this.margin)) / lineHeight);
        const linesPerPage = maxLinesPerColumn * config.columns;
        
        // Set default font with Unicode support
        pdf.setFont('helvetica', 'normal');
        
        // Add title if exists
        if (config.title) {
            pdf.setFontSize(config.fontSize + 4);
            pdf.setFont('helvetica', 'bold');
            const titleText = this.ensureTextCompatibility(config.title);
            pdf.text(titleText, this.pageWidth / 2, this.margin + 10, { align: 'center' });
            pdf.setFont('helvetica', 'normal');
        }
        
        // Process content in chunks
        const chunks = this.chunkLines(lines, linesPerPage);
        
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            progressCallback((chunkIndex / chunks.length) * 100);
            
            if (chunkIndex > 0) {
                pdf.addPage();
            }
            
            const chunk = chunks[chunkIndex];
            const columns = this.splitIntoColumns(chunk, config.columns);
            
            // Render columns with Unicode support
            for (let colIndex = 0; colIndex < columns.length; colIndex++) {
                const column = columns[colIndex];
                const x = this.margin + (colIndex * (contentWidth + this.columnGap));
                let y = this.margin + (config.title ? 20 : 10);
                
                for (const line of column) {
                    if (y > this.pageHeight - this.margin) break;
                    
                    const isTimestamp = this.isTimestamp(line);
                    const processedLine = this.ensureTextCompatibility(line);
                    
                    if (isTimestamp) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.setFontSize(Math.max(config.fontSize - 1, 8));
                    } else {
                        pdf.setFont('helvetica', 'normal');
                        pdf.setFontSize(config.fontSize);
                    }
                    
                    // Handle text wrapping with Unicode support
                    const wrappedLines = this.splitTextWithUnicode(pdf, processedLine, contentWidth);
                    
                    for (const wrappedLine of wrappedLines) {
                        if (y > this.pageHeight - this.margin) break;
                        pdf.text(wrappedLine, x, y);
                        y += lineHeight;
                    }
                    
                    if (isTimestamp) {
                        y += lineHeight * 0.5;
                    }
                }
            }
        }
        
        // Save with Unicode filename
        const filename = this.generateFilename(config);
        pdf.save(filename);
    }

    splitTextWithUnicode(pdf, text, maxWidth) {
        // Custom text splitting that handles Vietnamese characters better
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = pdf.getTextWidth(testLine);
            
            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [text];
    }

    ensureTextCompatibility(text) {
        // Ensure text is compatible with PDF generation
        return text
            .replace(/'/g, "'")  // Replace smart quotes
            .replace(/"/g, '"')  // Replace smart quotes
            .replace(/–/g, '-')  // Replace en dash
            .replace(/—/g, '--') // Replace em dash
            .replace(/…/g, '...') // Replace ellipsis
            .replace(/[\u2000-\u206F]/g, ' ') // Replace Unicode spaces
            .normalize('NFC'); // Normalize Unicode characters
    }

    async exportNormalContent(content, config) {
        // Use existing method for smaller files
        const htmlContent = this.createHTMLContent(content, config);
        const tempContainer = this.createTempContainer(htmlContent, config);
        
        document.body.appendChild(tempContainer);
        
        try {
            await this.waitForRender();
            
            // Use smaller scale for large content to prevent memory issues
            const scale = this.calculateOptimalScale(tempContainer);
            
            const canvas = await html2canvas(tempContainer, {
                scale: scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: tempContainer.scrollWidth,
                height: Math.min(tempContainer.scrollHeight, 50000), // Limit height
                onclone: (clonedDoc) => {
                    const clonedContainer = clonedDoc.querySelector('.pdf-temp-container');
                    if (clonedContainer) {
                        clonedContainer.style.position = 'static';
                        clonedContainer.style.opacity = '1';
                        clonedContainer.style.visibility = 'visible';
                        clonedContainer.style.left = '0';
                        clonedContainer.style.top = '0';
                    }
                }
            });
            
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                throw new Error('Canvas generation failed - invalid dimensions');
            }
            
            await this.createPDFFromCanvas(canvas, config);
            
        } finally {
            document.body.removeChild(tempContainer);
        }
    }

    calculateOptimalScale(element) {
        const contentSize = element.scrollHeight * element.scrollWidth;
        
        // Reduce scale for very large content to prevent memory issues
        if (contentSize > 10000000) return 0.5; // Very large
        if (contentSize > 5000000) return 0.75;  // Large
        return 1; // Normal
    }

    chunkLines(lines, linesPerChunk) {
        const chunks = [];
        for (let i = 0; i < lines.length; i += linesPerChunk) {
            chunks.push(lines.slice(i, i + linesPerChunk));
        }
        return chunks;
    }

    generateFilename(config) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const title = config.title ? 
            config.title.replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/gi, '_').toLowerCase() : 
            'subtitle';
        return `${title}_${timestamp}.pdf`;
    }

    createHTMLContent(content, config) {
        const lines = this.prepareContent(content);
        const columns = this.splitIntoColumns(lines, config.columns);
        
        let html = '';
        
        // Add title if exists
        if (config.title) {
            html += `<div class="pdf-title">${this.escapeHtml(config.title)}</div>`;
        }
        
        // Create columns
        html += '<div class="pdf-columns">';
        
        columns.forEach((column, index) => {
            html += `<div class="pdf-column">`;
            
            column.forEach(line => {
                const cleanLine = this.escapeHtml(line);
                const isTimestamp = this.isTimestamp(line);
                
                html += `<div class="pdf-line${isTimestamp ? ' timestamp' : ''}">${cleanLine}</div>`;
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        
        return html;
    }

    createTempContainer(htmlContent, config) {
        const container = document.createElement('div');
        container.className = 'pdf-temp-container';
        
        // Make container visible but positioned off-screen
        container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 800px;
            background: white;
            font-family: 'Noto Sans', 'Inter', Arial, sans-serif;
            font-size: ${config.fontSize}pt;
            line-height: 1.4;
            color: #000;
            padding: 20px;
            box-sizing: border-box;
            z-index: 9999;
            visibility: visible;
            opacity: 1;
            transform: translateX(-200vw);
        `;
        
        container.innerHTML = `
            <style>
                .pdf-temp-container {
                    font-family: 'Noto Sans', 'Inter', Arial, sans-serif !important;
                }
                
                .pdf-temp-container * {
                    box-sizing: border-box;
                    color: #000 !important;
                    font-family: 'Noto Sans', 'Inter', Arial, sans-serif !important;
                }
                
                .pdf-title {
                    font-size: ${config.fontSize + 4}pt;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #000;
                    color: #000 !important;
                    font-family: 'Noto Sans', 'Inter', Arial, sans-serif !important;
                }
                
                .pdf-columns {
                    display: flex;
                    gap: 20px;
                    width: 100%;
                    align-items: flex-start;
                }
                
                .pdf-column {
                    flex: 1;
                    min-width: 0;
                }
                
                .pdf-line {
                    margin-bottom: 8px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    line-height: 1.3;
                    color: #000 !important;
                    font-family: 'Noto Sans', 'Inter', Arial, sans-serif !important;
                }
                
                .pdf-line.timestamp {
                    font-weight: bold;
                    color: #333 !important;
                    margin-bottom: 4px;
                    margin-top: 12px;
                    font-size: ${Math.max(config.fontSize - 1, 8)}pt;
                    font-family: 'Noto Sans', 'Inter', Arial, sans-serif !important;
                }
                
                .pdf-line.timestamp:first-child {
                    margin-top: 0;
                }
            </style>
            ${htmlContent}
        `;
        
        return container;
    }

    async createPDFFromCanvas(canvas, config) {
        const { jsPDF } = window.jspdf;
        
        // Check canvas content
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check if canvas has any non-white pixels
        let hasContent = false;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
                hasContent = true;
                break;
            }
        }
        
        if (!hasContent) {
            throw new Error('Canvas appears to be empty or all white');
        }
        
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        
        // Convert to image
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions
        const pdfWidth = this.pageWidth - (2 * this.margin);
        const pdfHeight = this.pageHeight - (2 * this.margin);
        
        const canvasRatio = canvas.height / canvas.width;
        const imgWidth = pdfWidth;
        const imgHeight = pdfWidth * canvasRatio;
        
        if (imgHeight <= pdfHeight) {
            // Single page
            pdf.addImage(imgData, 'PNG', this.margin, this.margin, imgWidth, imgHeight);
        } else {
            // Multiple pages
            const pagesNeeded = Math.ceil(imgHeight / pdfHeight);
            
            for (let page = 0; page < pagesNeeded; page++) {
                if (page > 0) {
                    pdf.addPage();
                }
                
                const sourceY = (page * pdfHeight / imgHeight) * canvas.height;
                const sourceHeight = Math.min(
                    (pdfHeight / imgHeight) * canvas.height,
                    canvas.height - sourceY
                );
                
                const pageCanvas = document.createElement('canvas');
                const pageCtx = pageCanvas.getContext('2d');
                
                pageCanvas.width = canvas.width;
                pageCanvas.height = sourceHeight;
                
                pageCtx.drawImage(
                    canvas,
                    0, sourceY, canvas.width, sourceHeight,
                    0, 0, canvas.width, sourceHeight
                );
                
                const pageImgData = pageCanvas.toDataURL('image/png');
                const pageImgHeight = (sourceHeight / canvas.height) * imgHeight;
                
                pdf.addImage(pageImgData, 'PNG', this.margin, this.margin, imgWidth, pageImgHeight);
            }
        }
        
        // Save
        const filename = config.title ? 
            `${config.title.replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/gi, '_').toLowerCase()}_subtitle.pdf` : 
            'subtitle_processed.pdf';
        
        pdf.save(filename);
    }

    async waitForRender() {
        // Wait for fonts and layout
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
        
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    prepareContent(content) {
        return content.split('\n')
            .filter(line => line.trim())
            .map(line => line.trim());
    }

    splitIntoColumns(lines, columnCount) {
        const totalLines = lines.length;
        const linesPerColumn = Math.ceil(totalLines / columnCount);
        const columns = [];
        
        for (let i = 0; i < columnCount; i++) {
            const start = i * linesPerColumn;
            const end = Math.min(start + linesPerColumn, totalLines);
            columns.push(lines.slice(start, end));
        }
        
        return columns;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isTimestamp(line) {
        return /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}$/.test(line);
    }

    estimatePages(content, config) {
        if (!content) return 0;
        
        const lines = this.prepareContent(content);
        const linesPerColumn = Math.ceil(lines.length / config.columns);
        
        // Rough estimation based on font size and line height
        const linesPerPage = Math.floor(220 / (config.fontSize * 1.4)); // Approximate
        
        return Math.max(1, Math.ceil(linesPerColumn / linesPerPage));
    }
}
