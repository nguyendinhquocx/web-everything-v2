import { FileUploader } from '../components/common/FileUploader.js';
import { NotificationManager } from '../components/common/NotificationManager.js';
import { ConfigManager } from '../services/ConfigManager.js';

export class SubtitleProcessor {
    static name = 'Subtitle Processor';
    static id = 'subtitle-processor';

    constructor() {
        this.fileUploader = null;
        this.notification = new NotificationManager();
        this.config = new ConfigManager();
        this.processedContent = '';
        this.originalFileName = '';
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="tool-content">
                <div class="tool-header">
                    <h2>Subtitle Processor</h2>
                    <p class="text-muted">Upload .srt or .txt files to clean and format subtitles</p>
                </div>

                <div class="file-uploader-container" id="file-uploader"></div>

                <div class="output-section">
                    <div class="section-header">
                        <h3>Output</h3>
                        <div class="actions" id="output-actions">
                            <button class="btn btn-outline" id="copy-btn" disabled>
                                <i data-lucide="copy"></i>
                                Copy
                            </button>
                            <button class="btn btn-outline" id="download-txt-btn" disabled>
                                <i data-lucide="download"></i>
                                Download TXT
                            </button>
                            <button class="btn btn-primary" id="download-pdf-btn" disabled>
                                <i data-lucide="file-text"></i>
                                Download PDF
                            </button>
                        </div>
                    </div>
                    
                    <textarea class="output-textarea" 
                              id="output-content" 
                              placeholder="Upload a file to see the output here..."
                              readonly></textarea>
                </div>

                ${this.renderPDFSettings()}
            </div>

            <!-- Hidden PDF Preview Container -->
            <div id="pdf-preview-container" style="position: absolute; left: -9999px; top: -9999px;">
                <!-- PDF content will be rendered here for html2canvas -->
            </div>
        `;

        this.initializeComponents();
    }

    renderPDFSettings() {
        return `
            <div class="settings-section collapsed" id="pdf-settings">
                <div class="settings-header" id="settings-toggle">
                    <i data-lucide="settings"></i>
                    <span>PDF Settings</span>
                    <i data-lucide="chevron-down" class="chevron"></i>
                </div>
                <div class="settings-content">
                    <div class="setting-group">
                        <label for="pdf-title">Document Title</label>
                        <input type="text" id="pdf-title" placeholder="Enter document title..." 
                               value="${this.config.get('subtitle.title') || ''}">
                    </div>
                    
                    <div class="setting-row">
                        <div class="setting-group">
                            <label for="pdf-columns">Columns</label>
                            <select id="pdf-columns">
                                <option value="2" ${this.config.get('subtitle.columns') === 2 ? 'selected' : ''}>2 Columns</option>
                                <option value="3" ${this.config.get('subtitle.columns') === 3 ? 'selected' : ''}>3 Columns</option>
                                <option value="4" ${this.config.get('subtitle.columns') === 4 ? 'selected' : ''}>4 Columns</option>
                            </select>
                        </div>
                        
                        <div class="setting-group">
                            <label for="pdf-font-size">Font Size</label>
                            <select id="pdf-font-size">
                                <option value="8" ${this.config.get('subtitle.fontSize') === 8 ? 'selected' : ''}>8px (Tiny)</option>
                                <option value="9" ${this.config.get('subtitle.fontSize') === 9 ? 'selected' : ''}>9px (Small)</option>
                                <option value="10" ${this.config.get('subtitle.fontSize') === 10 ? 'selected' : ''}>10px (Medium)</option>
                                <option value="11" ${this.config.get('subtitle.fontSize') === 11 ? 'selected' : ''}>11px (Regular)</option>
                            </select>
                        </div>
                    </div>

                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="remove-timestamps" 
                                   ${this.config.get('subtitle.removeTimestamps') ? 'checked' : ''}>
                            <span>Remove timestamps from PDF</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    initializeComponents() {
        // Initialize file uploader
        this.fileUploader = new FileUploader({
            accept: '.srt,.txt',
            onFileSelect: (file) => this.processFile(file)
        });
        this.fileUploader.mount('#file-uploader');

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    bindEvents() {
        // Button events
        const copyBtn = this.container.querySelector('#copy-btn');
        const downloadTxtBtn = this.container.querySelector('#download-txt-btn');
        const downloadPdfBtn = this.container.querySelector('#download-pdf-btn');

        copyBtn.addEventListener('click', () => this.copyContent());
        downloadTxtBtn.addEventListener('click', () => this.downloadTXT());
        downloadPdfBtn.addEventListener('click', () => this.downloadPDF());

        // Settings toggle
        const settingsToggle = this.container.querySelector('#settings-toggle');
        const settingsSection = this.container.querySelector('#pdf-settings');
        
        settingsToggle.addEventListener('click', () => {
            settingsSection.classList.toggle('collapsed');
            const chevron = settingsToggle.querySelector('.chevron');
            chevron.style.transform = settingsSection.classList.contains('collapsed') 
                ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        // Settings change events
        const titleInput = this.container.querySelector('#pdf-title');
        const columnsSelect = this.container.querySelector('#pdf-columns');
        const fontSizeSelect = this.container.querySelector('#pdf-font-size');
        const removeTimestampsCheckbox = this.container.querySelector('#remove-timestamps');

        titleInput.addEventListener('input', (e) => {
            this.config.set('subtitle.title', e.target.value);
        });

        columnsSelect.addEventListener('change', (e) => {
            this.config.set('subtitle.columns', parseInt(e.target.value));
        });

        fontSizeSelect.addEventListener('change', (e) => {
            this.config.set('subtitle.fontSize', parseInt(e.target.value));
        });

        removeTimestampsCheckbox.addEventListener('change', (e) => {
            this.config.set('subtitle.removeTimestamps', e.target.checked);
        });
    }

    async processFile(file) {
        try {
            this.originalFileName = file.name.replace(/\.[^/.]+$/, "");
            
            const progressNotification = this.notification.info('Processing subtitle file...', 0);
            
            const text = await this.readFile(file);
            this.processedContent = this.cleanSubtitleText(text);
            
            // Update output
            const outputTextarea = this.container.querySelector('#output-content');
            outputTextarea.value = this.processedContent;
            
            // Enable buttons
            this.enableActionButtons();
            
            this.notification.remove(progressNotification);
            this.notification.success(`File processed successfully! ${this.processedContent.split('\n').filter(l => l.trim()).length} lines cleaned.`);
            
        } catch (error) {
            this.notification.error(`Failed to process file: ${error.message}`);
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

    cleanSubtitleText(text) {
        let lines = text.split('\n');
        let cleaned = [];
        let currentBlock = [];
        
        for (let line of lines) {
            line = line.trim();
            
            // Skip empty lines between blocks
            if (!line) {
                if (currentBlock.length > 0) {
                    // Process current block
                    const processedBlock = this.processSubtitleBlock(currentBlock);
                    if (processedBlock) {
                        cleaned.push(processedBlock);
                    }
                    currentBlock = [];
                }
                continue;
            }
            
            currentBlock.push(line);
        }
        
        // Process last block
        if (currentBlock.length > 0) {
            const processedBlock = this.processSubtitleBlock(currentBlock);
            if (processedBlock) {
                cleaned.push(processedBlock);
            }
        }
        
        return cleaned.join('\n');
    }

    processSubtitleBlock(block) {
        let result = [];
        
        for (let line of block) {
            // Skip subtitle numbers (just numbers)
            if (/^\d+$/.test(line)) {
                continue;
            }
            
            // Keep timestamps (SRT format)
            if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(line)) {
                result.push(line);
                continue;
            }
            
            // Keep actual subtitle text
            if (line && !(/^\d+$/.test(line))) {
                result.push(line);
            }
        }
        
        return result.length > 0 ? result.join('\n') : '';
    }

    enableActionButtons() {
        const buttons = this.container.querySelectorAll('#output-actions button');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
    }

    copyContent() {
        if (!this.processedContent) return;
        
        navigator.clipboard.writeText(this.processedContent).then(() => {
            this.notification.success('Content copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = this.container.querySelector('#output-content');
            textarea.select();
            document.execCommand('copy');
            this.notification.success('Content copied to clipboard!');
        });
    }

    downloadTXT() {
        if (!this.processedContent) return;
        
        const blob = new Blob([this.processedContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.originalFileName}_cleaned.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.notification.success('TXT file downloaded successfully!');
    }

    async downloadPDF() {
        if (!this.processedContent) return;

        try {
            const progressNotification = this.notification.info('Generating high-quality PDF...', 0);
            
            // Create HTML preview for PDF generation
            const pdfContent = this.createPDFPreview();
            
            // Use html2canvas + jsPDF for better Vietnamese support
            const canvas = await html2canvas(pdfContent, {
                scale: 2, // High resolution
                useCORS: true,
                letterRendering: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                width: 794, // A4 width in pixels (96 DPI)
                height: 1123 // A4 height in pixels (96 DPI)
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= 297; // A4 height in mm

            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }

            // Clean up
            document.body.removeChild(pdfContent);
            
            const fileName = `${this.originalFileName}_formatted.pdf`;
            pdf.save(fileName);
            
            this.notification.remove(progressNotification);
            this.notification.success(`High-quality PDF generated! Saved as ${fileName}`);
            
        } catch (error) {
            this.notification.error(`Failed to generate PDF: ${error.message}`);
            console.error('PDF generation error:', error);
        }
    }

    createPDFPreview() {
        // Get settings
        const title = this.config.get('subtitle.title') || this.originalFileName || 'Subtitle Document';
        const columns = this.config.get('subtitle.columns') || 3;
        const fontSize = this.config.get('subtitle.fontSize') || 9;
        const removeTimestamps = this.config.get('subtitle.removeTimestamps') || false;

        // Process content
        let content = this.processedContent;
        if (removeTimestamps) {
            content = content.replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, '');
            content = content.replace(/\n\s*\n/g, '\n'); // Remove extra empty lines
        }

        const lines = content.split('\n').filter(line => line.trim());

        // Create HTML structure
        const pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = `
            width: 794px;
            min-height: 1123px;
            padding: 40px;
            background: white;
            font-family: 'Noto Sans', 'Inter', Arial, sans-serif;
            font-size: ${fontSize}px;
            line-height: 1.3;
            color: #000;
            box-sizing: border-box;
        `;

        // Add title
        const titleElement = document.createElement('div');
        titleElement.style.cssText = `
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #000;
        `;
        titleElement.textContent = title;
        pdfContainer.appendChild(titleElement);

        // Create columns container
        const columnsContainer = document.createElement('div');
        columnsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${columns}, 1fr);
            gap: 20px;
            margin-top: 20px;
        `;

        // Create columns
        const columnElements = [];
        for (let i = 0; i < columns; i++) {
            const column = document.createElement('div');
            column.style.cssText = `
                font-size: ${fontSize}px;
                line-height: 1.3;
                word-break: break-word;
                hyphens: auto;
            `;
            columnElements.push(column);
            columnsContainer.appendChild(column);
        }

        // Distribute content across columns
        let currentColumn = 0;
        let currentBlock = [];

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            // Check if this is a timestamp
            const isTimestamp = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(line);
            
            if (isTimestamp) {
                // Start new block
                if (currentBlock.length > 0) {
                    // Add previous block
                    const blockDiv = document.createElement('div');
                    blockDiv.style.cssText = 'margin-bottom: 12px;';
                    blockDiv.innerHTML = currentBlock.join('<br>');
                    columnElements[currentColumn].appendChild(blockDiv);
                    
                    // Move to next column
                    currentColumn = (currentColumn + 1) % columns;
                    currentBlock = [];
                }
                
                // Add timestamp
                currentBlock.push(`<span style="font-weight: 500; color: #333;">${line}</span>`);
            } else {
                // Add content line
                currentBlock.push(line);
            }
        });

        // Add last block
        if (currentBlock.length > 0) {
            const blockDiv = document.createElement('div');
            blockDiv.style.cssText = 'margin-bottom: 12px;';
            blockDiv.innerHTML = currentBlock.join('<br>');
            columnElements[currentColumn].appendChild(blockDiv);
        }

        pdfContainer.appendChild(columnsContainer);
        
        // Add to DOM temporarily for rendering
        document.body.appendChild(pdfContainer);
        
        return pdfContainer;
    }

    destroy() {
        if (this.fileUploader) {
            this.fileUploader.destroy();
        }
    }
}