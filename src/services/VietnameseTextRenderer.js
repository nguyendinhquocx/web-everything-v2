export class VietnameseTextRenderer {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.fontLoaded = false;
        this.initFont();
    }

    async initFont() {
        try {
            // Load Google Fonts if not already loaded
            if (!document.querySelector('link[href*="Noto+Sans"]')) {
                const link = document.createElement('link');
                link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700&display=swap';
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            
            // Wait for font to load
            await document.fonts.ready;
            this.fontLoaded = true;
        } catch (error) {
            console.warn('Font loading failed, using fallback:', error);
            this.fontLoaded = true; // Continue with fallback
        }
    }

    renderTextToImage(text, options = {}) {
        const {
            fontSize = 9, // Smaller default size
            fontWeight = 'normal',
            color = '#000000',
            maxWidth = 180, // Smaller width for columns
            lineHeight = 1.3, // Tighter line height
            quality = 2
        } = options;

        // Set high DPI for crisp text
        const scale = quality;
        const font = `${fontWeight} ${fontSize * scale}px "Noto Sans", "Segoe UI", Arial, sans-serif`;
        
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textBaseline = 'top';

        // Calculate text dimensions
        const lines = this.wrapText(text, maxWidth * scale);
        const lineHeightPx = fontSize * scale * lineHeight;
        const totalHeight = lines.length * lineHeightPx;
        const totalWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));

        // Set canvas size with minimal padding
        this.canvas.width = Math.ceil(totalWidth) + 10;
        this.canvas.height = Math.ceil(totalHeight) + 10;

        // Re-apply font (canvas resize resets context)
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textBaseline = 'top';
        this.ctx.textAlign = 'left';

        // Clear canvas with white background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = color;

        // Draw text lines with tighter spacing
        lines.forEach((line, index) => {
            this.ctx.fillText(line, 5, 5 + (index * lineHeightPx));
        });

        // Return image data
        return {
            dataUrl: this.canvas.toDataURL('image/png', 1.0),
            width: this.canvas.width / scale,
            height: this.canvas.height / scale,
            actualWidth: this.canvas.width,
            actualHeight: this.canvas.height
        };
    }

    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (let word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    renderTitle(title, options = {}) {
        const titleOptions = {
            fontSize: options.fontSize || 14, // Smaller title
            fontWeight: 'bold',
            color: '#000000',
            maxWidth: options.maxWidth || 400,
            lineHeight: 1.2,
            quality: options.quality || 2
        };

        return this.renderTextToImage(title, titleOptions);
    }

    // New method for timestamps
    renderTimestamp(timestamp, options = {}) {
        const timestampOptions = {
            fontSize: options.fontSize || 8, // Very small for timestamps
            fontWeight: 'normal',
            color: '#000000',
            maxWidth: options.maxWidth || 150,
            lineHeight: 1.2,
            quality: options.quality || 2
        };

        return this.renderTextToImage(timestamp, timestampOptions);
    }
}