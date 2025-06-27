export class SubtitleParser {
    process(content, options = {}) {
        const defaultOptions = {
            removeTimestamps: false,
            removeLineNumbers: true,
            removeBrackets: false,
            mergeLines: false
        };
        
        const opts = { ...defaultOptions, ...options };
        
        const lines = content.split('\n');
        const result = [];
        let currentBlock = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                if (currentBlock.length > 0) {
                    result.push(this.processBlock(currentBlock, opts));
                    currentBlock = [];
                }
                continue;
            }
            
            // Skip line numbers if option is enabled
            if (opts.removeLineNumbers && /^\d+$/.test(line)) {
                continue;
            }
            
            currentBlock.push(line);
        }
        
        // Process last block
        if (currentBlock.length > 0) {
            result.push(this.processBlock(currentBlock, opts));
        }
        
        let finalResult = result.filter(block => block).join('\n\n');
        
        // Apply post-processing options
        if (opts.removeBrackets) {
            finalResult = this.removeBrackets(finalResult);
        }
        
        if (opts.mergeLines) {
            finalResult = this.mergeShortLines(finalResult);
        }
        
        return finalResult;
    }
    
    processBlock(block, options) {
        if (block.length === 0) return '';
        
        let processedLines = [...block];
        
        // Remove timestamps if option is enabled
        if (options.removeTimestamps) {
            processedLines = processedLines.filter(line => !this.isTimestamp(line));
        }
        
        // Filter out empty lines
        processedLines = processedLines.filter(line => line.trim());
        
        if (processedLines.length === 0) {
            return '';
        }
        
        return processedLines.join('\n');
    }
    
    removeBrackets(text) {
        return text
            .replace(/\[.*?\]/g, '') // Remove [brackets]
            .replace(/\(.*?\)/g, '') // Remove (parentheses)
            .replace(/\n\s*\n/g, '\n\n') // Clean up extra empty lines
            .trim();
    }
    
    mergeShortLines(text) {
        const lines = text.split('\n');
        const result = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (!line) {
                result.push('');
                i++;
                continue;
            }
            
            if (this.isTimestamp(line)) {
                result.push(line);
                i++;
                continue;
            }
            
            // If line is short and next line exists and is not timestamp
            if (line.length < 40 && i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                if (nextLine && !this.isTimestamp(nextLine) && nextLine.length < 40) {
                    result.push(line + ' ' + nextLine);
                    i += 2;
                    continue;
                }
            }
            
            result.push(line);
            i++;
        }
        
        return result.join('\n');
    }
    
    isTimestamp(line) {
        // Check for SRT timestamp format: 00:00:00,000 --> 00:00:00,000
        return /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(line);
    }
}