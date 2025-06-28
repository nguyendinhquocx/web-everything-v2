/**
 * Format large numbers with K, M suffixes for compact display
 */
export function formatCompactNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
}

/**
 * Format stats text with compact numbers
 */
export function formatStatsText(lines, characters) {
    const linesText = formatCompactNumber(lines);
    const charsText = formatCompactNumber(characters);
    
    // Show both or just lines if characters is too long
    if ((linesText + charsText).length > 20) {
        return `${linesText} lines`;
    }
    
    return `${linesText} lines • ${charsText} chars`;
}

/**
 * Create stats element with tooltip for full info
 */
export function createStatsElement(lines, characters) {
    const statsEl = document.createElement('div');
    statsEl.className = 'output-stats';
    statsEl.textContent = formatStatsText(lines, characters);
    
    // Add tooltip with full numbers
    statsEl.title = `${lines.toLocaleString()} lines • ${characters.toLocaleString()} characters`;
    
    return statsEl;
}