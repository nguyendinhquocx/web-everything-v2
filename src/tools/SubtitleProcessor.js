import { FileUploader } from '../components/common/FileUploader.js';
import { NotificationManager } from '../components/common/NotificationManager.js';
import { ConfigManager } from '../services/ConfigManager.js';

export class SubtitleProcessor {
    constructor() {
        this.fileUploader = null;
        this.notificationManager = new NotificationManager();
        this.configManager = new ConfigManager();
        this.currentFile = null;
        this.processedContent = '';
        this.originalContent = '';
        this.stats = { lines: 0, characters: 0, processTime: 0 };
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
        console.log('✅ SubtitleProcessor mounted');
    }

    render() {
        this.container.innerHTML = `
            <div class="subtitle-processor">
                <div class="section">
                    <h2>Subtitle Processor</h2>
                    <p class="description">Upload .srt or .txt files to clean and format subtitles</p>
                </div>

                <div class="section">
                    <div id="file-uploader"></div>
                    <div id="file-info" class="file-info" style="display: none;"></div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <h3>Output</h3>
                        <div class="action-buttons">
                            <button id="copy-btn" class="btn btn-secondary" disabled>
                                <i data-lucide="copy"></i> Copy
                            </button>
                            <button id="download-btn" class="btn btn-secondary" disabled>
                                <i data-lucide="download"></i> Download TXT
                            </button>
                            <button id="print-pdf-btn" class="btn btn-primary" disabled>
                                <i data-lucide="printer"></i> Print PDF
                            </button>
                            <button id="clear-btn" class="btn btn-outline" disabled>
                                <i data-lucide="trash-2"></i> Clear
                            </button>
                        </div>
                    </div>
                    
                    <textarea id="output-text" 
                              class="output-textarea" 
                              placeholder="Upload a file to see the processed output here. The text will be cleaned, formatted, and ready for use."
                              readonly></textarea>
                    
                    <div id="stats" class="stats" style="display: none;"></div>
                </div>

                <div class="section">
                    <details class="settings-panel">
                        <summary class="settings-header">
                            <i data-lucide="settings"></i> PDF Settings
                        </summary>
                        <div class="settings-content">
                            ${this.renderPDFSettings()}
                        </div>
                    </details>
                </div>
            </div>
        `;

        this.initializeComponents();
    }

    renderPDFSettings() {
        const config = this.configManager.get('subtitle');
        
        return `
            <div class="settings-grid">
                <div class="setting-item">
                    <label for="pdf-title">Document Title</label>
                    <input type="text" id="pdf-title" value="${config.title || ''}" 
                           placeholder="Enter document title (optional)">
                </div>
                
                <div class="setting-item">
                    <label for="pdf-columns">Columns</label>
                    <select id="pdf-columns">
                        <option value="1" ${config.pdfColumns === 1 ? 'selected' : ''}>1 Column</option>
                        <option value="2" ${config.pdfColumns === 2 ? 'selected' : ''}>2 Columns</option>
                        <option value="3" ${config.pdfColumns === 3 ? 'selected' : ''}>3 Columns</option>
                        <option value="4" ${config.pdfColumns === 4 ? 'selected' : ''}>4 Columns</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label for="pdf-font-size">Font Size</label>
                    <select id="pdf-font-size">
                        <option value="6" ${config.pdfFontSize === 6 ? 'selected' : ''}>6pt</option>
                        <option value="7" ${config.pdfFontSize === 7 ? 'selected' : ''}>7pt</option>
                        <option value="8" ${config.pdfFontSize === 8 ? 'selected' : ''}>8pt</option>
                        <option value="9" ${config.pdfFontSize === 9 ? 'selected' : ''}>9pt</option>
                        <option value="10" ${config.pdfFontSize === 10 ? 'selected' : ''}>10pt</option>
                        <option value="12" ${config.pdfFontSize === 12 ? 'selected' : ''}>12pt</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label class="checkbox-label">
                        <input type="checkbox" id="show-timestamps" 
                               ${config.showTimestampsInPDF !== false ? 'checked' : ''}>
                        Show timestamps in PDF
                    </label>
                </div>
            </div>
        `;
    }

    initializeComponents() {
        // Initialize file uploader
        this.fileUploader = new FileUploader({
            accept: '.srt,.txt',
            multiple: false,
            onFileSelect: (file) => this.handleFileSelect(file)
        });
        this.fileUploader.mount('#file-uploader');

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    bindEvents() {
        // Action buttons
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download-btn').addEventListener('click', () => this.downloadTXT());
        document.getElementById('print-pdf-btn').addEventListener('click', () => this.printPDF());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearContent());

        // Settings
        document.getElementById('pdf-title').addEventListener('input', (e) => {
            this.configManager.set('subtitle.title', e.target.value);
        });
        
        document.getElementById('pdf-columns').addEventListener('change', (e) => {
            this.configManager.set('subtitle.pdfColumns', parseInt(e.target.value));
        });
        
        document.getElementById('pdf-font-size').addEventListener('change', (e) => {
            this.configManager.set('subtitle.pdfFontSize', parseInt(e.target.value));
        });
        
        document.getElementById('show-timestamps').addEventListener('change', (e) => {
            this.configManager.set('subtitle.showTimestampsInPDF', e.target.checked);
        });
    }

    async handleFileSelect(file) {
        const startTime = Date.now();
        
        try {
            this.currentFile = file;
            const content = await this.readFile(file);
            this.originalContent = content;
            
            // Process the content
            this.processedContent = this.processSubtitleContent(content);
            
            // Calculate stats
            this.stats = {
                lines: this.processedContent.split('\n').filter(line => line.trim()).length,
                characters: this.processedContent.length,
                processTime: Date.now() - startTime
            };
            
            // Update UI
            this.updateOutput();
            this.updateFileInfo();
            this.updateStats();
            this.enableButtons();
            
            this.notificationManager.success(`File processed successfully! ${this.stats.lines} lines, ${this.stats.characters} characters.`);
            
        } catch (error) {
            console.error('File processing error:', error);
            this.notificationManager.error(`Failed to process file: ${error.message}`);
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

    isTimestamp(line) {
        // Match SRT timestamp format: 00:00:00,000 --> 00:00:00,000
        return /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line);
    }

    updateOutput() {
        const outputText = document.getElementById('output-text');
        outputText.value = this.processedContent;
    }

    updateFileInfo() {
        const fileInfo = document.getElementById('file-info');
        if (this.currentFile) {
            fileInfo.innerHTML = `
                <div class="file-details">
                    <span class="file-name">${this.currentFile.name}</span>
                    <span class="file-size">${this.formatFileSize(this.currentFile.size)} • ${this.currentFile.type || 'text/plain'}</span>
                    <button class="file-remove" onclick="this.closest('.subtitle-processor').querySelector('#clear-btn').click()">×</button>
                </div>
            `;
            fileInfo.style.display = 'block';
        }
    }

    updateStats() {
        const stats = document.getElementById('stats');
        stats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${this.stats.lines}</span>
                    <span class="stat-label">Lines</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.stats.characters.toLocaleString()}</span>
                    <span class="stat-label">Characters</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${this.stats.processTime}ms</span>
                    <span class="stat-label">Process Time</span>
                </div>
            </div>
        `;
        stats.style.display = 'block';
    }

    enableButtons() {
        document.getElementById('copy-btn').disabled = false;
        document.getElementById('download-btn').disabled = false;
        document.getElementById('print-pdf-btn').disabled = false;
        document.getElementById('clear-btn').disabled = false;
    }

    disableButtons() {
        document.getElementById('copy-btn').disabled = true;
        document.getElementById('download-btn').disabled = true;
        document.getElementById('print-pdf-btn').disabled = true;
        document.getElementById('clear-btn').disabled = true;
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.processedContent);
            this.notificationManager.success('Content copied to clipboard!');
        } catch (error) {
            console.error('Copy failed:', error);
            this.notificationManager.error('Failed to copy content');
        }
    }

    downloadTXT() {
        try {
            const blob = new Blob([this.processedContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = this.getDownloadFilename('.txt');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.notificationManager.success('TXT file downloaded successfully!');
        } catch (error) {
            console.error('Download failed:', error);
            this.notificationManager.error('Failed to download file');
        }
    }

    async printPDF() {
        try {
            // Hide notifications during print to prevent them from being included
            this.hideNotifications();
            
            // Get PDF configuration
            const config = this.configManager.validatePDFConfig(this.configManager.config);
            
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
                    scale: config.fontQuality,
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
                
                // Open print dialog directly without notification
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
                const config = this.configManager.validatePDFConfig(this.configManager.config);
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
            
            // Show notifications again after a delay
            setTimeout(() => {
                this.showNotifications();
            }, 1000);
            
        } catch (error) {
            console.error('PDF print failed:', error);
            this.showNotifications();
            this.notificationManager.error('Failed to generate PDF');
        }
    }

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

    hideNotifications() {
        const notificationContainer = document.querySelector('.notifications-container');
        if (notificationContainer) {
            notificationContainer.style.display = 'none';
        }
    }

    showNotifications() {
        const notificationContainer = document.querySelector('.notifications-container');
        if (notificationContainer) {
            notificationContainer.style.display = 'block';
        }
    }

    clearContent() {
        this.currentFile = null;
        this.processedContent = '';
        this.originalContent = '';
        this.stats = { lines: 0, characters: 0, processTime: 0 };
        
        document.getElementById('output-text').value = '';
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('stats').style.display = 'none';
        
        this.disableButtons();
        this.notificationManager.info('Content cleared');
    }

    getDownloadFilename(extension) {
        if (this.currentFile) {
            const name = this.currentFile.name.replace(/\.[^/.]+$/, '');
            return `${name}_processed${extension}`;
        }
        return `subtitle_processed_${new Date().toISOString().slice(0, 10)}${extension}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.fileUploader) {
            this.fileUploader.destroy();
        }
    }
}