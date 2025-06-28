import { FileUploader } from '../components/common/FileUploader.js';
import { NotificationManager } from '../components/common/NotificationManager.js';
import { ConfigManager } from '../services/ConfigManager.js';

export class SubtitleProcessor {
    constructor() {
        this.fileUploader = null;
        this.notificationManager = new NotificationManager();
        this.configManager = new ConfigManager();
        this.currentFile = null;
        this.processedText = '';
        this.isProcessing = false;
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
        this.initializeComponents();
    }

    render() {
        this.container.innerHTML = `
            <div class="tool-header">
                <h2>Subtitle Processor</h2>
                <p>Upload .srt or .txt files to clean and format subtitles</p>
            </div>

            <div id="file-uploader"></div>
            
            <div id="file-info" class="file-info" style="display: none;">
                <div class="file-info-content">
                    <div class="file-info-name"></div>
                    <div class="file-info-details"></div>
                </div>
                <button class="file-info-remove" title="Remove file">
                    <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                </button>
            </div>

            <div id="processing-status" class="loading" style="display: none;">
                <div class="spinner"></div>
                <span>Processing file...</span>
            </div>

            <div class="progress-bar" id="progress-bar" style="display: none;">
                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
            </div>

            <div class="output-section">
                <div class="output-header">
                    <h3>Output</h3>
                    <div class="output-actions">
                        <button class="btn" id="copy-btn" disabled>
                            <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                            Copy
                        </button>
                        <button class="btn" id="download-txt-btn" disabled>
                            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                            Download TXT
                        </button>
                        <button class="btn primary" id="print-pdf-btn" disabled>
                            <i data-lucide="printer" style="width: 14px; height: 14px;"></i>
                            Print PDF
                        </button>
                        <button class="btn" id="clear-btn" style="display: none;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            Clear
                        </button>
                    </div>
                </div>
                
                <textarea id="output" class="output-textarea" 
                          placeholder="Upload a file to see the processed output here. The text will be cleaned, formatted, and ready for use." 
                          readonly></textarea>
                
                <div id="stats" class="stats" style="display: none;">
                    <div class="stat-item">
                        <div class="stat-value" id="lines-count">0</div>
                        <div class="stat-label">Lines</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="chars-count">0</div>
                        <div class="stat-label">Characters</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="process-time">0ms</div>
                        <div class="stat-label">Process Time</div>
                    </div>
                </div>
            </div>

            <!-- PDF Settings moved to top for print layout -->
            <div class="settings-section print-settings-page">
                <div class="settings-toggle" id="settings-toggle">
                    <i data-lucide="settings" style="width: 16px; height: 16px;"></i>
                    <h3>PDF Settings</h3>
                    <i data-lucide="chevron-down" style="width: 16px; height: 16px;" id="settings-chevron"></i>
                </div>
                
                <div class="settings-content" id="settings-content">
                    <div class="settings-group">
                        <h4>Layout Settings</h4>
                        <div class="form-group">
                            <label for="pdf-columns">Columns</label>
                            <select id="pdf-columns">
                                <option value="1">1 Column</option>
                                <option value="2">2 Columns</option>
                                <option value="3" selected>3 Columns</option>
                                <option value="4">4 Columns</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="pdf-font-size">Font Size</label>
                            <input type="range" id="pdf-font-size" min="6" max="12" value="8" step="0.5">
                            <span id="font-size-value">8pt</span>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h4>Content Settings</h4>
                        <div class="form-group">
                            <label for="pdf-title">Document Title</label>
                            <input type="text" id="pdf-title" placeholder="Enter document title">
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="show-timestamps" checked>
                            <label for="show-timestamps">Show timestamps</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="auto-optimize" checked>
                            <label for="auto-optimize">Auto optimize layout</label>
                        </div>
                    </div>
                    
                    <div class="print-instructions">
                        <h4>📖 Printing Instructions</h4>
                        <p>• Click "Print PDF" to open print dialog</p>
                        <p>• Select pages "2-end" to print only content</p>
                        <p>• Page 1 contains these settings (will be excluded)</p>
                    </div>
                </div>
            </div>

            <!-- PDF Preview - This will be on page 2+ when printing -->
            <div class="print-page-break"></div>
            <div id="pdf-preview" class="pdf-preview print-content-page" style="display: none;">
                <h1 id="preview-title" class="pdf-title">Document Preview</h1>
                <div id="preview-content" class="pdf-columns cols-3">
                    <!-- Preview content will be generated here -->
                </div>
            </div>
        `;

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    initializeComponents() {
        this.fileUploader = new FileUploader({
            accept: '.srt,.txt',
            onFileSelect: (file) => this.handleFileSelect(file)
        });
        this.fileUploader.mount('#file-uploader');

        // Load saved settings
        this.loadSettings();
    }

    bindEvents() {
        // File info remove
        document.getElementById('file-info').querySelector('.file-info-remove').onclick = () => {
            this.clearFile();
        };

        // Output actions
        document.getElementById('copy-btn').onclick = () => this.copyToClipboard();
        document.getElementById('download-txt-btn').onclick = () => this.downloadTXT();
        document.getElementById('print-pdf-btn').onclick = () => this.printPDF(); // Changed from downloadPDF
        document.getElementById('clear-btn').onclick = () => this.clearAll();

        // Settings toggle
        document.getElementById('settings-toggle').onclick = () => this.toggleSettings();

        // Settings inputs
        this.bindSettingsEvents();
    }

    bindSettingsEvents() {
        const inputs = ['pdf-columns', 'pdf-font-size', 'pdf-title', 'show-timestamps', 'auto-optimize'];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.saveSettings();
                    this.updatePreview();
                });
                
                if (element.type === 'range') {
                    element.addEventListener('input', () => {
                        document.getElementById('font-size-value').textContent = element.value + 'pt';
                    });
                }
            }
        });
    }

    async handleFileSelect(file) {
        this.currentFile = file;
        this.showFileInfo(file);
        
        try {
            this.showProcessing(true);
            const startTime = Date.now();
            
            const text = await this.readFile(file);
            this.processedText = this.processSubtitleText(text);
            
            const processTime = Date.now() - startTime;
            
            this.showOutput(this.processedText);
            this.showStats(this.processedText, processTime);
            this.updatePreview();
            
            this.notificationManager.success(`File processed successfully! ${this.getLineCount(this.processedText)} lines processed in ${processTime}ms`);
        } catch (error) {
            this.notificationManager.error(`Failed to process file: ${error.message}`);
        } finally {
            this.showProcessing(false);
        }
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = fileInfo.querySelector('.file-info-name');
        const fileDetails = fileInfo.querySelector('.file-info-details');
        
        fileName.textContent = file.name;
        fileDetails.textContent = `${this.formatFileSize(file.size)} • ${file.type || 'text/plain'}`;
        
        fileInfo.style.display = 'flex';
        
        // Hide file uploader
        document.getElementById('file-uploader').style.display = 'none';
    }

    showProcessing(show) {
        this.isProcessing = show;
        document.getElementById('processing-status').style.display = show ? 'flex' : 'none';
        
        if (show) {
            this.simulateProgress();
        }
    }

    simulateProgress() {
        const progressBar = document.getElementById('progress-bar');
        const progressFill = document.getElementById('progress-fill');
        
        progressBar.style.display = 'block';
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 500);
            }
            progressFill.style.width = progress + '%';
        }, 100);
    }

    showOutput(text) {
        const output = document.getElementById('output');
        output.value = text;
        
        // Enable buttons
        document.getElementById('copy-btn').disabled = false;
        document.getElementById('download-txt-btn').disabled = false;
        document.getElementById('print-pdf-btn').disabled = false; // Always enable print
        document.getElementById('clear-btn').style.display = 'inline-flex';
    }

    showStats(text, processTime) {
        const stats = document.getElementById('stats');
        const lines = this.getLineCount(text);
        const chars = text.length;
        
        document.getElementById('lines-count').textContent = lines;
        document.getElementById('chars-count').textContent = chars.toLocaleString();
        document.getElementById('process-time').textContent = processTime + 'ms';
        
        stats.style.display = 'flex';
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    processSubtitleText(text) {
        const config = this.configManager.get('subtitle');
        
        // Split into lines
        let lines = text.split('\n');
        
        // Remove empty lines
        lines = lines.filter(line => line.trim() !== '');
        
        // Remove line numbers if enabled
        if (config.removeLineNumbers) {
            lines = lines.filter(line => !/^\d+$/.test(line.trim()));
        }
        
        // Remove timestamps if enabled
        if (config.removeTimestamps) {
            lines = lines.filter(line => !this.isTimestamp(line));
        }
        
        // Join back
        return lines.join('\n');
    }

    isTimestamp(line) {
        return /^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(line.trim());
    }

    getLineCount(text) {
        return text.split('\n').filter(line => line.trim() !== '').length;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.processedText);
            this.notificationManager.success('Text copied to clipboard');
        } catch (error) {
            this.notificationManager.error('Failed to copy text');
        }
    }

    downloadTXT() {
        const blob = new Blob([this.processedText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.getFileName() + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        this.notificationManager.success('TXT file downloaded');
    }

    // NEW: Print PDF function
    printPDF() {
        if (!this.processedText) {
            this.notificationManager.error('No content to print');
            return;
        }

        try {
            // Ensure preview is visible and updated
            this.updatePreview();
            
            // Add print class to body for print-specific styles
            document.body.classList.add('printing');
            
            // Show notification with instructions
            this.notificationManager.info('🖨️ Print dialog opened. Select pages "2-end" to print only content.');
            
            // Open print dialog
            setTimeout(() => {
                window.print();
                
                // Remove print class after print dialog
                setTimeout(() => {
                    document.body.classList.remove('printing');
                }, 1000);
            }, 500);
            
        } catch (error) {
            console.error('Print error:', error);
            this.notificationManager.error(`Print failed: ${error.message}`);
            document.body.classList.remove('printing');
        }
    }

    getPDFConfig() {
        return {
            columns: parseInt(document.getElementById('pdf-columns').value),
            fontSize: parseFloat(document.getElementById('pdf-font-size').value),
            title: document.getElementById('pdf-title').value,
            showTimestamps: document.getElementById('show-timestamps').checked,
            autoOptimize: document.getElementById('auto-optimize').checked
        };
    }

    getFileName() {
        if (this.currentFile) {
            return this.currentFile.name.replace(/\.[^/.]+$/, "");
        }
        return 'subtitle-processed';
    }

    toggleSettings() {
        const content = document.getElementById('settings-content');
        const chevron = document.getElementById('settings-chevron');
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            chevron.style.transform = 'rotate(0deg)';
        } else {
            content.classList.add('expanded');
            chevron.style.transform = 'rotate(180deg)';
            this.updatePreview();
        }
    }

    updatePreview() {
        if (!this.processedText) return;
        
        const config = this.getPDFConfig();
        const preview = document.getElementById('pdf-preview');
        const previewContent = document.getElementById('preview-content');
        const previewTitle = document.getElementById('preview-title');
        
        // Update title
        previewTitle.textContent = config.title || this.getFileName();
        
        // Update columns class
        previewContent.className = `pdf-columns cols-${config.columns}`;
        
        // Update font size
        previewContent.style.fontSize = config.fontSize + 'px';
        
        // Process text for preview
        let lines = this.processedText.split('\n').filter(line => line.trim() !== '');
        
        // Remove timestamps if configured for PDF
        if (!config.showTimestamps) {
            lines = lines.filter(line => !this.isTimestamp(line));
        }
        
        const entriesPerColumn = Math.ceil(lines.length / config.columns);
        
        // Create columns
        let html = '';
        for (let col = 0; col < config.columns; col++) {
            const start = col * entriesPerColumn;
            const end = start + entriesPerColumn;
            const columnLines = lines.slice(start, end);
            
            html += `<div class="pdf-column">`;
            columnLines.forEach(line => {
                html += `<div class="pdf-entry">${this.escapeHtml(line)}</div>`;
            });
            html += `</div>`;
        }
        
        previewContent.innerHTML = html;
        preview.style.display = 'block';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadSettings() {
        const config = this.configManager.get('subtitle');
        
        document.getElementById('pdf-columns').value = config.pdfColumns || 3;
        document.getElementById('pdf-font-size').value = config.pdfFontSize || 8;
        document.getElementById('pdf-title').value = config.title || '';
        document.getElementById('show-timestamps').checked = config.showTimestampsInPDF !== false;
        document.getElementById('auto-optimize').checked = config.autoOptimize !== false;
        
        // Update font size display
        document.getElementById('font-size-value').textContent = (config.pdfFontSize || 8) + 'pt';
    }

    saveSettings() {
        const config = this.getPDFConfig();
        
        this.configManager.set('subtitle.pdfColumns', config.columns);
        this.configManager.set('subtitle.pdfFontSize', config.fontSize);
        this.configManager.set('subtitle.title', config.title);
        this.configManager.set('subtitle.showTimestampsInPDF', config.showTimestamps);
        this.configManager.set('subtitle.autoOptimize', config.autoOptimize);
    }

    clearFile() {
        this.currentFile = null;
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('file-uploader').style.display = 'block';
    }

    clearAll() {
        this.clearFile();
        this.processedText = '';
        
        // Reset output
        document.getElementById('output').value = '';
        document.getElementById('stats').style.display = 'none';
        document.getElementById('pdf-preview').style.display = 'none';
        
        // Disable buttons
        document.getElementById('copy-btn').disabled = true;
        document.getElementById('download-txt-btn').disabled = true;
        document.getElementById('print-pdf-btn').disabled = true;
        document.getElementById('clear-btn').style.display = 'none';
        
        this.notificationManager.info('Interface cleared');
    }

    destroy() {
        if (this.fileUploader) {
            this.fileUploader.destroy();
        }
    }
}