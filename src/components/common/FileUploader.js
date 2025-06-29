export class FileUploader {
    constructor(options = {}) {
        this.options = {
            accept: '*',
            multiple: false,
            maxSize: 10 * 1024 * 1024, // 10MB
            onFileSelect: () => {},
            ...options
        };
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="file-input-wrapper" id="file-drop-zone">
                <input type="file" 
                       class="file-input" 
                       id="file-input"
                       accept="${this.options.accept}"
                       ${this.options.multiple ? 'multiple' : ''}>
                <div class="file-input-text">
                    <i data-lucide="upload" style="width: 24px; height: 24px;"></i>
                    <div>
                        <strong>Click to upload</strong> or drag and drop
                    </div>
                    <div class="text-small text-muted">
                        ${this.getAcceptText()}
                    </div>
                </div>
            </div>
        `;

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    getAcceptText() {
        if (this.options.accept === '.srt,.txt') {
            return 'SRT or TXT';
        }
        return `Max size: ${Math.round(this.options.maxSize / 1024 / 1024)}MB`;
    }

    bindEvents() {
        const dropZone = this.container.querySelector('#file-drop-zone');
        const fileInput = this.container.querySelector('#file-input');

        // Click to upload
        dropZone.addEventListener('click', () => fileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
    }

    handleFiles(files) {
        const file = files[0]; // Take first file only
        
        if (!this.validateFile(file)) {
            return;
        }

        this.options.onFileSelect(file);
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxSize) {
            alert(`File too large. Maximum size is ${Math.round(this.options.maxSize / 1024 / 1024)}MB`);
            return false;
        }

        // Check file type
        if (this.options.accept !== '*') {
            const acceptedTypes = this.options.accept.split(',').map(t => t.trim());
            const fileExt = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!acceptedTypes.includes(fileExt)) {
                alert(`File type not supported. Please upload: ${acceptedTypes.join(', ')}`);
                return false;
            }
        }

        return true;
    }

    destroy() {
        // Cleanup if needed
    }
}