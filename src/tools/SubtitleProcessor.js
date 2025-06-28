import { FileUploader } from '../components/common/FileUploader.js';
import { ConfigManager } from '../services/ConfigManager.js';

export class SubtitleProcessor {
    constructor() {
        this.fileUploader = null;
        this.processedText = '';
        this.originalFilename = '';
        this.config = new ConfigManager();
        this.stats = { lines: 0, characters: 0 };
        // Add these properties that were missing
        this.currentFile = null;
        this.processedContent = '';
        this.originalContent = '';
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.initFileUploader();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="subtitle-processor">
                <div class="tool-header">
                    <h2>Subtitle Processor</h2>
                    <p class="tool-description">Upload .srt or .txt files to clean and format subtitles</p>
                </div>

                <div id="file-upload-area" class="upload-section"></div>

                <div class="output-section">
                    <div class="output-header">
                        <h3>Output</h3>
                        <div class="output-stats" id="output-stats" style="display: none;">
                            <span id="line-count">0 lines</span> • <span id="char-count">0 characters</span>
                        </div>
                        <div class="output-actions">
                            <button class="btn-secondary" id="copy-btn" disabled>
                                <i data-lucide="copy"></i>
                                Copy
                            </button>
                            <button class="btn-secondary" id="download-btn" disabled>
                                <i data-lucide="download"></i>
                                Download TXT
                            </button>
                            <button class="btn-secondary" id="pdf-btn" disabled>
                                <i data-lucide="printer"></i>
                                Print PDF
                            </button>
                            <button class="btn-secondary" id="clear-btn" disabled>
                                <i data-lucide="trash-2"></i>
                                Clear
                            </button>
                        </div>
                    </div>
                    <textarea id="output-text" 
                              class="output-textarea" 
                              placeholder="Upload a file to see the processed output here. The text will be cleaned, formatted, and ready for use."
                              readonly></textarea>
                </div>

                <div class="settings-section">
                    <button class="settings-toggle" id="settings-toggle">
                        <i data-lucide="settings"></i>
                        PDF Settings
                    </button>
                    <div class="settings-panel" id="settings-panel" style="display: none;">
                        ${this.renderPDFSettings()}
                    </div>
                </div>
            </div>
        `;

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    renderPDFSettings() {
        const config = this.config.get('subtitle') || {};
        
        return `
            <div class="settings-grid">
                <div class="setting-group">
                    <label>Title</label>
                    <input type="text" id="pdf-title" value="${config.title || ''}" placeholder="Optional PDF title">
                </div>
                
                <div class="setting-group">
                    <label>Columns</label>
                    <select id="pdf-columns">
                        <option value="1" ${config.pdfColumns === 1 ? 'selected' : ''}>1 Column</option>
                        <option value="2" ${config.pdfColumns === 2 ? 'selected' : ''}>2 Columns</option>
                        <option value="3" ${config.pdfColumns === 3 || !config.pdfColumns ? 'selected' : ''}>3 Columns</option>
                        <option value="4" ${config.pdfColumns === 4 ? 'selected' : ''}>4 Columns</option>
                    </select>
                </div>
                
                <div class="setting-group">
                    <label>Font Size</label>
                    <select id="pdf-font-size">
                        <option value="6" ${config.pdfFontSize === 6 ? 'selected' : ''}>6pt (Tiny)</option>
                        <option value="7" ${config.pdfFontSize === 7 ? 'selected' : ''}>7pt (Small)</option>
                        <option value="8" ${config.pdfFontSize === 8 || !config.pdfFontSize ? 'selected' : ''}>8pt (Normal)</option>
                        <option value="9" ${config.pdfFontSize === 9 ? 'selected' : ''}>9pt (Medium)</option>
                        <option value="10" ${config.pdfFontSize === 10 ? 'selected' : ''}>10pt (Large)</option>
                    </select>
                </div>
                
                <div class="setting-group checkbox-group">
                    <label>
                        <input type="checkbox" id="show-timestamps" ${config.showTimestampsInPDF !== false ? 'checked' : ''}>
                        Show timestamps in PDF
                    </label>
                </div>
            </div>
        `;
    }

    initFileUploader() {
        this.fileUploader = new FileUploader({
            accept: '.srt,.txt',
            onFileSelect: (file) => this.handleFileSelect(file)  // Changed method name
        });
        this.fileUploader.mount('#file-upload-area');
    }

    bindEvents() {
        // Settings toggle
        document.getElementById('settings-toggle').addEventListener('click', () => {
            const panel = document.getElementById('settings-panel');
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
        });

        // Settings changes
        document.getElementById('pdf-title').addEventListener('input', (e) => {
            this.config.set('subtitle.title', e.target.value);
        });

        document.getElementById('pdf-columns').addEventListener('change', (e) => {
            this.config.set('subtitle.pdfColumns', parseInt(e.target.value));
        });

        document.getElementById('pdf-font-size').addEventListener('change', (e) => {
            this.config.set('subtitle.pdfFontSize', parseInt(e.target.value));
        });

        document.getElementById('show-timestamps').addEventListener('change', (e) => {
            this.config.set('subtitle.showTimestampsInPDF', e.target.checked);
        });

        // Action buttons
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadTXT());
        document.getElementById('pdf-btn').addEventListener('click', () => this.printPDF());  // Changed method name
        document.getElementById('clear-btn').addEventListener('click', () => this.clearContent());  // Changed method name
    }

    // Fixed method name to match the working version
    async handleFileSelect(file) {
        try {
            this.currentFile = file;
            this.originalFilename = file.name.replace(/\.[^/.]+$/, "");
            const content = await this.readFile(file);
            this.originalContent = content;
            
            // Process the content using the working method
            this.processedContent = this.processSubtitleContent(content);
            this.processedText = this.processedContent; // Keep both for compatibility
            
            this.updateOutput();
            this.enableButtons();
        } catch (error) {
            console.error('File processing error:', error);
            this.processedContent = '';
            this.processedText = '';
            this.updateOutput();
            this.disableButtons();
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    // Use the working subtitle processing logic from reference code
    processSubtitleContent(content) {
        // Split content into lines and clean
        const lines = content.split('\n').map(line => line.trim());
        const subtitleBlocks = [];
        let currentBlock = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines
            if (!line) continue;
            
            // Skip line numbers (numeric only lines)
            if (/^\d+$/.test(line)) continue;
            
            // Check if line is a timestamp
            if (this.isTimestamp(line)) {
                // Save previous block if exists
                if (currentBlock) {
                    subtitleBlocks.push(currentBlock);
                }
                
                // Start new block
                currentBlock = {
                    timestamp: line,
                    content: []
                };
            } else if (currentBlock) {
                // Add content to current block
                currentBlock.content.push(line);
            }
        }
        
        // Add last block
        if (currentBlock) {
            subtitleBlocks.push(currentBlock);
        }
        
        // Format output with timestamps and proper spacing
        return subtitleBlocks.map(block => {
            const lines = [block.timestamp, ...block.content];
            return lines.join('\n');
        }).join('\n\n'); // Double newline between blocks
    }

    // Add the missing isTimestamp method
    isTimestamp(line) {
        // Match SRT timestamp format: 00:00:00,000 --> 00:00:00,000
        return /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line);
    }

    updateOutput() {
        const outputTextarea = document.getElementById('output-text');
        outputTextarea.value = this.processedContent;

        // Update stats with proper thousand separators
        this.stats.lines = this.processedContent ? this.processedContent.split('\n').filter(line => line.trim()).length : 0;
        this.stats.characters = this.processedContent.length;

        const statsElement = document.getElementById('output-stats');
        const lineCountElement = document.getElementById('line-count');
        const charCountElement = document.getElementById('char-count');

        if (this.processedContent) {
            // Format numbers with thousand separators
            lineCountElement.textContent = `${this.formatNumber(this.stats.lines)} lines`;
            charCountElement.textContent = `${this.formatNumber(this.stats.characters)} characters`;
            statsElement.style.display = 'block';
        } else {
            statsElement.style.display = 'none';
        }
    }

    formatNumber(num) {
        return num.toLocaleString();
    }

    enableButtons() {
        document.getElementById('copy-btn').disabled = false;
        document.getElementById('download-btn').disabled = false;
        document.getElementById('pdf-btn').disabled = false;
        document.getElementById('clear-btn').disabled = false;
    }

    disableButtons() {
        document.getElementById('copy-btn').disabled = true;
        document.getElementById('download-btn').disabled = true;
        document.getElementById('pdf-btn').disabled = true;
        document.getElementById('clear-btn').disabled = true;
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.processedContent);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    }

    downloadTXT() {
        const blob = new Blob([this.processedContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.getDownloadFilename('.txt');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Use the complete working printPDF method from reference code
    async printPDF() {
        try {
            // Get PDF configuration
            const config = this.config.validatePDFConfig(this.config.config);
            
            // Use html2canvas and jsPDF
            if (window.html2canvas && window.jsPDF) {
                const { jsPDF } = window.jsPDF;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                // Add title page FIRST if needed
                if (config.showTitle && config.title && config.title.trim()) {
                    pdf.setFontSize(config.titleFontSize);
                    pdf.setFont('helvetica', 'bold');
                    
                    // Center the title on page
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const titleY = 50; // Position from top
                    
                    pdf.text(config.title.trim(), pageWidth / 2, titleY, { 
                        align: 'center',
                        maxWidth: pageWidth - 40 // Leave margins
                    });
                    
                    // Add some spacing and subtitle info if available
                    if (this.currentFile) {
                        pdf.setFontSize(12);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(`Source: ${this.currentFile.name}`, pageWidth / 2, titleY + 20, { 
                            align: 'center' 
                        });
                        
                        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, titleY + 30, { 
                            align: 'center' 
                        });
                    }
                    
                    // Add new page for content
                    pdf.addPage();
                }
                
                // Prepare content for PDF
                const pdfContent = this.preparePDFContent(config);
                
                // Create temporary container for PDF rendering
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: fixed;
                    top: -10000px;
                    left: -10000px;
                    width: 210mm;
                    background: white;
                    font-family: 'Times New Roman', serif;
                    font-size: ${config.fontSize}pt;
                    line-height: 1.2;
                    padding: 20mm;
                    box-sizing: border-box;
                    columns: ${config.columns};
                    column-gap: 10mm;
                    color: #000;
                `;
                
                tempContainer.innerHTML = pdfContent;
                document.body.appendChild(tempContainer);
                
                // Wait a moment for rendering
                await new Promise(resolve => setTimeout(resolve, 200));
                
                const canvas = await window.html2canvas(tempContainer, {
                    scale: config.fontQuality || 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210; // A4 width in mm
                const pageHeight = 297; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;
                
                // Add content pages
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                // Clean up
                document.body.removeChild(tempContainer);
                
                // Open print dialog directly
                const pdfUrl = pdf.output('bloburl');
                const printWindow = window.open(pdfUrl, '_blank');
                
                if (printWindow) {
                    printWindow.onload = () => {
                        setTimeout(() => {
                            printWindow.print();
                        }, 250);
                    };
                } else {
                    // Fallback: download PDF
                    const filename = config.title && config.title.trim() 
                        ? `${config.title.trim().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
                        : this.getDownloadFilename('.pdf');
                    pdf.save(filename);
                }
                
            } else {
                // Fallback: browser print with title
                const config = this.config.validatePDFConfig(this.config.config);
                const pdfContent = this.preparePDFContent(config);
                
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${config.title || 'Subtitle'}</title>
                        <style>
                            body { 
                                font-family: 'Times New Roman', serif; 
                                font-size: ${config.fontSize}pt; 
                                line-height: 1.2; 
                                margin: 20mm;
                                color: #000;
                            }
                            .title-page {
                                page-break-after: always;
                                text-align: center;
                                margin-top: 100px;
                            }
                            .title {
                                font-size: ${config.titleFontSize}pt;
                                font-weight: bold;
                                margin-bottom: 30px;
                            }
                            .subtitle-info {
                                font-size: 12pt;
                                color: #666;
                                margin-bottom: 10px;
                            }
                            .content {
                                columns: ${config.columns};
                                column-gap: 10mm;
                            }
                            .subtitle-block { 
                                break-inside: avoid; 
                                margin-bottom: 10pt; 
                            }
                            .timestamp { 
                                font-weight: bold; 
                                color: #666; 
                            }
                            @media print {
                                body { margin: 15mm; }
                            }
                        </style>
                    </head>
                    <body>
                        ${config.showTitle && config.title && config.title.trim() ? `
                            <div class="title-page">
                                <div class="title">${config.title.trim()}</div>
                                ${this.currentFile ? `<div class="subtitle-info">Source: ${this.currentFile.name}</div>` : ''}
                                <div class="subtitle-info">Generated: ${new Date().toLocaleDateString()}</div>
                            </div>
                        ` : ''}
                        <div class="content">${pdfContent}</div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 250);
            }
            
        } catch (error) {
            console.error('PDF print failed:', error);
        }
    }

    // Add the missing preparePDFContent method
    preparePDFContent(config) {
        const lines = this.processedContent.split('\n');
        const blocks = [];
        let currentBlock = [];
        
        for (const line of lines) {
            if (line.trim() === '') {
                if (currentBlock.length > 0) {
                    blocks.push(currentBlock);
                    currentBlock = [];
                }
            } else {
                currentBlock.push(line);
            }
        }
        
        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }
        
        return blocks.map(block => {
            const [timestamp, ...content] = block;
            let html = '<div class="subtitle-block">';
            
            if (config.showTimestampsInPDF && this.isTimestamp(timestamp)) {
                html += `<div class="timestamp">${timestamp}</div>`;
                html += content.map(line => `<div>${this.escapeHtml(line)}</div>`).join('');
            } else {
                html += block.map(line => `<div>${this.escapeHtml(line)}</div>`).join('');
            }
            
            html += '</div>';
            return html;
        }).join('');
    }

    // Add missing utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getDownloadFilename(extension) {
        if (this.currentFile) {
            const name = this.currentFile.name.replace(/\.[^/.]+$/, '');
            return `${name}_processed${extension}`;
        }
        return `subtitle_processed_${new Date().toISOString().slice(0, 10)}${extension}`;
    }

    clearContent() {
        this.currentFile = null;
        this.processedContent = '';
        this.processedText = '';
        this.originalContent = '';
        this.originalFilename = '';
        this.stats = { lines: 0, characters: 0 };
        
        document.getElementById('output-text').value = '';
        this.disableButtons();
        
        // Reset file input
        const fileInput = document.querySelector('#file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    destroy() {
        if (this.fileUploader) {
            this.fileUploader.destroy();
        }
    }
}