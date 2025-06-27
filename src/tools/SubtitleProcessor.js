import { FileUploader } from '../components/common/FileUploader.js';
import { NotificationManager } from '../components/common/NotificationManager.js';
import { ConfigManager } from '../services/ConfigManager.js';
import { VietnameseTextRenderer } from '../services/VietnameseTextRenderer.js';

export class SubtitleProcessor {
    constructor() {
        this.notificationManager = new NotificationManager();
        this.configManager = new ConfigManager();
        this.textRenderer = new VietnameseTextRenderer();
        this.processedText = '';
        this.originalFileName = '';
        this.subtitleEntries = []; // Store parsed subtitle entries
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
    }

    render() {
        const config = this.configManager.get('subtitle');
        
        this.container.innerHTML = `
            <div class="tool-content">
                <div class="tool-header">
                    <h2>Subtitle Processor</h2>
                    <p class="tool-description">Upload .srt or .txt files to clean and format subtitles</p>
                </div>

                <div class="upload-section">
                    <div id="file-uploader"></div>
                </div>

                <div class="output-section">
                    <div class="section-header">
                        <h3>Output</h3>
                        <div class="output-actions">
                            <button class="btn-secondary" id="copy-btn">
                                <i data-lucide="copy"></i> Copy
                            </button>
                            <button class="btn-secondary" id="download-txt-btn">
                                <i data-lucide="download"></i> Download TXT
                            </button>
                            <button class="btn-primary" id="download-pdf-btn">
                                <i data-lucide="file-text"></i> Download PDF
                            </button>
                        </div>
                    </div>
                    
                    <textarea id="output-text" class="output-textarea" 
                              placeholder="Upload a file to see the output here..." 
                              readonly></textarea>
                </div>

                <!-- PDF Settings -->
                <details class="settings-section">
                    <summary class="settings-header">
                        <i data-lucide="settings"></i> PDF Settings
                    </summary>
                    <div class="settings-content">
                        <!-- Title Settings -->
                        <div class="setting-group">
                            <h4>Document Title</h4>
                            <div class="setting-row">
                                <label>
                                    <input type="checkbox" id="show-title" ${config.showTitle ? 'checked' : ''}>
                                    Show title on first page
                                </label>
                            </div>
                            <div class="setting-row">
                                <label for="doc-title">Title:</label>
                                <input type="text" id="doc-title" value="${config.title || ''}" 
                                       placeholder="Enter document title (optional)">
                            </div>
                        </div>

                        <!-- Layout Settings -->
                        <div class="setting-group">
                            <h4>Layout</h4>
                            <div class="setting-row">
                                <label for="pdf-columns">Columns:</label>
                                <input type="range" id="pdf-columns" min="1" max="4" 
                                       value="${config.pdfColumns || 3}">
                                <span class="range-value">${config.pdfColumns || 3}</span>
                            </div>
                            <div class="setting-row">
                                <label for="pdf-font-size">Font Size:</label>
                                <input type="range" id="pdf-font-size" min="6" max="12" 
                                       value="${config.pdfFontSize || 8}">
                                <span class="range-value">${config.pdfFontSize || 8}pt</span>
                            </div>
                        </div>

                        <!-- Content Settings -->
                        <div class="setting-group">
                            <h4>Content</h4>
                            <div class="setting-row">
                                <label>
                                    <input type="checkbox" id="show-timestamps-pdf" 
                                           ${!config.removeTimestampsInPDF ? 'checked' : ''}>
                                    Show timestamps in PDF (recommended)
                                </label>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        `;

        this.initializeComponents();
        this.updateUI();
    }

    initializeComponents() {
        // Initialize file uploader
        this.fileUploader = new FileUploader({
            accept: '.srt,.txt',
            onFileSelect: (file) => this.handleFileSelect(file)
        });
        this.fileUploader.mount('#file-uploader');

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    bindEvents() {
        // Output actions
        document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download-txt-btn').addEventListener('click', () => this.downloadTXT());
        document.getElementById('download-pdf-btn').addEventListener('click', () => this.downloadPDF());

        // Settings events
        const settings = [
            'pdf-columns', 'pdf-font-size', 'show-timestamps-pdf', 'show-title'
        ];
        
        settings.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.handleSettingChange(id, element));
                element.addEventListener('input', () => this.handleSettingChange(id, element));
            }
        });

        // Title input
        document.getElementById('doc-title').addEventListener('input', (e) => {
            this.configManager.set('subtitle.title', e.target.value);
        });
    }

    handleSettingChange(settingId, element) {
        const value = element.type === 'checkbox' ? element.checked : 
                     element.type === 'range' ? parseInt(element.value) : element.value;
        
        const settingMap = {
            'pdf-columns': 'subtitle.pdfColumns',
            'pdf-font-size': 'subtitle.pdfFontSize',
            'show-timestamps-pdf': 'subtitle.showTimestampsInPDF',
            'show-title': 'subtitle.showTitle'
        };

        if (settingMap[settingId]) {
            // Special handling for timestamps (inverted)
            if (settingId === 'show-timestamps-pdf') {
                this.configManager.set('subtitle.removeTimestampsInPDF', !value);
            } else {
                this.configManager.set(settingMap[settingId], value);
            }
        }

        // Update range value display
        if (element.type === 'range') {
            const valueSpan = element.nextElementSibling;
            if (valueSpan && valueSpan.classList.contains('range-value')) {
                const unit = settingId.includes('font-size') ? 'pt' : '';
                valueSpan.textContent = value + unit;
            }
        }
    }

    async handleFileSelect(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^/.]+$/, "");
            const text = await this.readFile(file);
            
            // Parse subtitle entries with timestamps - FIXED LOGIC
            this.subtitleEntries = this.parseSubtitleFile(text);
            this.processedText = this.processSubtitleText(text);
            
            // Debug log
            console.log('Parsed entries:', this.subtitleEntries.length);
            console.log('First few entries:', this.subtitleEntries.slice(0, 3));
            
            document.getElementById('output-text').value = this.processedText;
            this.updateUI();
            
            this.notificationManager.success(`File "${file.name}" processed successfully! Found ${this.subtitleEntries.length} subtitle entries.`);
        } catch (error) {
            console.error('File processing error:', error);
            this.notificationManager.error(`Error processing file: ${error.message}`);
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

    parseSubtitleFile(text) {
        const entries = [];
        
        // Remove BOM if present
        text = text.replace(/^\uFEFF/, '');
        
        // Split by double newlines to get subtitle blocks
        const blocks = text.split(/\n\s*\n/);
        
        console.log('Total blocks found:', blocks.length);
        
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();
            if (!block) continue;
            
            const lines = block.split('\n').map(line => line.trim()).filter(line => line);
            
            if (lines.length >= 2) {
                let index = null;
                let timestamp = null;
                let content = [];
                
                // Try to identify the structure
                for (let j = 0; j < lines.length; j++) {
                    const line = lines[j];
                    
                    // Check if it's a number (subtitle index)
                    if (/^\d+$/.test(line) && index === null) {
                        index = line;
                    }
                    // Check if it's a timestamp
                    else if (line.includes('-->') && timestamp === null) {
                        timestamp = line;
                    }
                    // Otherwise it's content
                    else {
                        content.push(line);
                    }
                }
                
                // If we have both timestamp and content, add the entry
                if (timestamp && content.length > 0) {
                    entries.push({
                        index: index || (entries.length + 1).toString(),
                        timestamp: timestamp,
                        content: content.join('\n')
                    });
                }
                // If no timestamp found but we have content, create a simple entry
                else if (content.length > 0) {
                    entries.push({
                        index: (entries.length + 1).toString(),
                        timestamp: null,
                        content: lines.join('\n')
                    });
                }
            }
        }
        
        console.log('Entries parsed:', entries.length);
        return entries;
    }

    processSubtitleText(text) {
        const config = this.configManager.get('subtitle');
        let processed = text;

        // Remove BOM if present
        processed = processed.replace(/^\uFEFF/, '');

        // Remove line numbers (like "1", "2", "3" on separate lines)
        if (config.removeLineNumbers) {
            processed = processed.replace(/^\d+\s*$/gm, '');
        }

        // Remove timestamps for text output (but keep for PDF)
        if (config.removeTimestamps) {
            processed = processed.replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g, '');
        }

        // Clean up extra whitespace
        processed = processed.replace(/\n\s*\n\s*\n/g, '\n\n');
        processed = processed.replace(/^\s+|\s+$/g, '');

        return processed;
    }

    async downloadPDF() {
        // Check both conditions
        if (!this.subtitleEntries || this.subtitleEntries.length === 0) {
            console.log('No subtitle entries found. Entries:', this.subtitleEntries);
            this.notificationManager.error('No subtitle entries found. Please upload a valid subtitle file.');
            return;
        }

        if (!this.processedText) {
            console.log('No processed text found.');
            this.notificationManager.error('No content to export. Please upload a file first.');
            return;
        }

        try {
            this.notificationManager.info('Generating PDF... Please wait.');
            
            const config = this.configManager.validatePDFConfig(this.configManager.config);
            console.log('PDF config:', config);
            console.log('Subtitle entries for PDF:', this.subtitleEntries.length);
            
            await this.generatePDF(this.subtitleEntries, config);
            
            this.notificationManager.success('PDF generated successfully!');
        } catch (error) {
            console.error('PDF generation error:', error);
            this.notificationManager.error(`Failed to generate PDF: ${error.message}`);
        }
    }

    async generatePDF(entries, config) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Page settings
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        
        let yPosition = margin;

        // Add title if enabled and provided
        if (config.showTitle && config.title.trim()) {
            const titleImage = await this.textRenderer.renderTitle(config.title, {
                fontSize: 14,
                maxWidth: contentWidth * 2,
                quality: 2
            });
            
            // Center the title
            const titleWidth = Math.min(titleImage.width, contentWidth);
            const titleX = (pageWidth - titleWidth) / 2;
            
            doc.addImage(titleImage.dataUrl, 'PNG', titleX, yPosition, titleWidth, titleImage.height);
            yPosition += titleImage.height + 10;
            
            // Add separator line
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;
        }

        // Calculate column layout
        const columnWidth = (contentWidth - ((config.columns - 1) * 8)) / config.columns;
        let currentColumn = 0;
        let columnStartY = yPosition;

        console.log('Starting PDF generation with', entries.length, 'entries');

        // Process each subtitle entry
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            console.log(`Processing entry ${i + 1}:`, entry);
            
            const columnX = margin + (currentColumn * (columnWidth + 8));
            
            // Show timestamps if enabled and available
            if (!config.removeTimestampsInPDF && entry.timestamp) {
                const timestampImage = this.textRenderer.renderTimestamp(entry.timestamp, {
                    fontSize: config.fontSize - 1,
                    maxWidth: columnWidth * 2,
                    quality: 2
                });
                
                // Check if we need a new page
                if (yPosition + timestampImage.height + 20 > pageHeight - margin) {
                    if (currentColumn < config.columns - 1) {
                        currentColumn++;
                        yPosition = columnStartY;
                    } else {
                        doc.addPage();
                        currentColumn = 0;
                        yPosition = margin;
                        columnStartY = margin;
                    }
                }
                
                const finalX = margin + (currentColumn * (columnWidth + 8));
                doc.addImage(timestampImage.dataUrl, 'PNG', finalX, yPosition, 
                           Math.min(timestampImage.width, columnWidth), timestampImage.height);
                yPosition += timestampImage.height + 2;
            }
            
            // Render content
            const contentImage = this.textRenderer.renderTextToImage(entry.content, {
                fontSize: config.fontSize,
                maxWidth: columnWidth * 2,
                lineHeight: 1.3,
                quality: 2
            });
            
            // Check if content fits
            if (yPosition + contentImage.height + 8 > pageHeight - margin) {
                if (currentColumn < config.columns - 1) {
                    currentColumn++;
                    yPosition = columnStartY;
                } else {
                    doc.addPage();
                    currentColumn = 0;
                    yPosition = margin;
                    columnStartY = margin;
                }
                
                // Re-render timestamp if we moved to new column/page
                if (!config.removeTimestampsInPDF && entry.timestamp) {
                    const timestampImage = this.textRenderer.renderTimestamp(entry.timestamp, {
                        fontSize: config.fontSize - 1,
                        maxWidth: columnWidth * 2,
                        quality: 2
                    });
                    
                    const finalX = margin + (currentColumn * (columnWidth + 8));
                    doc.addImage(timestampImage.dataUrl, 'PNG', finalX, yPosition, 
                               Math.min(timestampImage.width, columnWidth), timestampImage.height);
                    yPosition += timestampImage.height + 2;
                }
            }
            
            const finalX = margin + (currentColumn * (columnWidth + 8));
            doc.addImage(contentImage.dataUrl, 'PNG', finalX, yPosition, 
                       Math.min(contentImage.width, columnWidth), contentImage.height);
            yPosition += contentImage.height + 8; // Space between entries
        }

        // Save PDF
        const fileName = this.originalFileName || 'subtitle-export';
        doc.save(`${fileName}.pdf`);
        
        console.log('PDF saved successfully');
    }

    downloadTXT() {
        if (!this.processedText) {
            this.notificationManager.error('No content to export. Please upload a file first.');
            return;
        }

        const blob = new Blob([this.processedText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.originalFileName || 'subtitle-export'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.notificationManager.success('TXT file downloaded successfully!');
    }

    copyToClipboard() {
        if (!this.processedText) {
            this.notificationManager.error('No content to copy.');
            return;
        }

        navigator.clipboard.writeText(this.processedText).then(() => {
            this.notificationManager.success('Content copied to clipboard!');
        }).catch(() => {
            this.notificationManager.error('Failed to copy to clipboard.');
        });
    }

    updateUI() {
        const hasContent = Boolean(this.processedText);
        const hasEntries = Boolean(this.subtitleEntries && this.subtitleEntries.length > 0);
        
        document.getElementById('copy-btn').disabled = !hasContent;
        document.getElementById('download-txt-btn').disabled = !hasContent;
        document.getElementById('download-pdf-btn').disabled = !hasEntries; // Use subtitle entries for PDF
        
        // Update button text to show entry count
        if (hasEntries) {
            const pdfBtn = document.getElementById('download-pdf-btn');
            const icon = pdfBtn.querySelector('i');
            pdfBtn.innerHTML = '';
            pdfBtn.appendChild(icon);
            pdfBtn.appendChild(document.createTextNode(` Download PDF (${this.subtitleEntries.length} entries)`));
        }
    }

    destroy() {
        if (this.fileUploader) {
            this.fileUploader.destroy();
        }
    }
}