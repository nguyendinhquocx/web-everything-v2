// This file is no longer needed as initialization is handled in index.html
// But keeping it for compatibility
import { ToolRegistry } from './services/ToolRegistry.js';
import { SubtitleProcessor } from './tools/SubtitleProcessor.js';
import { App } from './components/App.js';

// Initialize tool registry
const toolRegistry = new ToolRegistry();

// Register tools
toolRegistry.register('subtitle-processor', SubtitleProcessor);

// Initialize app
const app = new App(toolRegistry);
app.mount('#app');

export { app, toolRegistry };