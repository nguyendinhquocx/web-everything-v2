export class App {
    constructor(toolRegistry) {
        this.toolRegistry = toolRegistry;
        this.currentTool = null;
        this.currentToolId = 'subtitle-processor'; // Default tool
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        this.render();
        this.bindEvents();
    }

    render() {
        const tools = this.toolRegistry.getAll();
        
        this.container.innerHTML = `
            <div class="container">
                <header class="header">
                    <h1>Everything Tool</h1>
                </header>
                
                ${tools.length > 1 ? this.renderNavigation(tools) : ''}
                
                <div id="tool-content" class="tool-container">
                    <!-- Tool content will be rendered here -->
                </div>
            </div>
        `;

        this.renderCurrentTool();
    }

    renderNavigation(tools) {
        return `
            <nav class="nav-pills">
                ${tools.map(tool => `
                    <button class="nav-pill ${tool.id === this.currentToolId ? 'active' : ''}" 
                            data-tool="${tool.id}">
                        ${tool.name}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    renderCurrentTool() {
        const toolClass = this.toolRegistry.get(this.currentToolId);
        if (toolClass) {
            this.currentTool = new toolClass();
            this.currentTool.mount('#tool-content');
        }
    }

    bindEvents() {
        // Navigation events
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-pill')) {
                const toolId = e.target.dataset.tool;
                this.switchTool(toolId);
            }
        });
    }

    switchTool(toolId) {
        if (this.currentToolId === toolId) return;

        // Cleanup current tool
        if (this.currentTool && this.currentTool.destroy) {
            this.currentTool.destroy();
        }

        this.currentToolId = toolId;
        
        // Update navigation
        this.container.querySelectorAll('.nav-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.tool === toolId);
        });

        // Render new tool
        this.renderCurrentTool();
    }
}