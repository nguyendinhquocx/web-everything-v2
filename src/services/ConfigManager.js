export class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('everything-tool-config');
            return saved ? JSON.parse(saved) : this.getDefaultConfig();
        } catch {
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            subtitle: {
                fontSize: 8, // Smaller default
                columns: 3,
                fontFamily: 'calibri',
                removeTimestamps: false,
                removeLineNumbers: true,
                // PDF-specific settings
                pdfColumns: 3,
                pdfFontSize: 8, // Much smaller for PDF
                removeTimestampsInPDF: false, // Show timestamps by default
                showTimestampsInPDF: true, // New explicit setting
                autoOptimize: true,
                // Title settings
                title: '',
                showTitle: true,
                titleFontSize: 14, // Smaller title
                titleSpacing: 10, // Less spacing
                // Vietnamese font settings
                useImageRendering: true,
                fontQuality: 2
            },
            general: {
                theme: 'light',
                autoSave: true
            }
        };
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.config);
        
        target[lastKey] = value;
        this.saveConfig();
    }

    saveConfig() {
        try {
            localStorage.setItem('everything-tool-config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Could not save config:', error);
        }
    }

    validatePDFConfig(config) {
        const pdfConfig = config.subtitle || {};
        
        return {
            columns: Math.max(1, Math.min(4, pdfConfig.pdfColumns || 3)),
            fontSize: Math.max(6, Math.min(12, pdfConfig.pdfFontSize || 8)), // Smaller range
            removeTimestampsInPDF: Boolean(pdfConfig.removeTimestampsInPDF),
            showTimestampsInPDF: Boolean(pdfConfig.showTimestampsInPDF !== false),
            autoOptimize: Boolean(pdfConfig.autoOptimize !== false),
            title: String(pdfConfig.title || '').trim(),
            showTitle: Boolean(pdfConfig.showTitle !== false),
            titleFontSize: Math.max(12, Math.min(18, pdfConfig.titleFontSize || 14)),
            titleSpacing: Math.max(5, Math.min(20, pdfConfig.titleSpacing || 10)),
            useImageRendering: Boolean(pdfConfig.useImageRendering !== false),
            fontQuality: Math.max(1, Math.min(4, pdfConfig.fontQuality || 2))
        };
    }

    exportSettings() {
        return JSON.stringify(this.config, null, 2);
    }
    
    importSettings(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            if (this.validateConfig(imported)) {
                this.config = imported;
                this.saveConfig();
                return true;
            }
        } catch (error) {
            console.error('Import failed:', error);
        }
        return false;
    }

    validateConfig(config) {
        return typeof config === 'object' && config !== null;
    }
}