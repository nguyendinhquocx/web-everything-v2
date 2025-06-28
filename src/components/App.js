export class App {
    constructor(toolRegistry) {
        this.toolRegistry = toolRegistry;
        this.currentTool = null;
        this.currentToolId = 'subtitle-processor'; // Default tool
    }

    mount(selector) {
        const container = document.querySelector(selector);
        if (!container) {
            throw new Error(`Container element not found: ${selector}`);
        }
        
        this.container = container;
        this.render();
        this.bindEvents();
        
        console.log('✅ App mounted successfully');
    }

    render() {
        const tools = this.toolRegistry.getAll();
        
        if (tools.length === 0) {
            this.container.innerHTML = `
                <div style="padding: 40px; text-align: center; font-family: Inter, sans-serif;">
                    <h1>Everything Tool</h1>
                    <p style="color: #666;">No tools available</p>
                </div>
            `;
            return;
        }
        
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

        // Render current tool after DOM is ready
        setTimeout(() => {
            this.renderCurrentTool();
        }, 0);
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
        const toolContentElement = document.getElementById('tool-content');
        if (!toolContentElement) {
            console.error('Tool content element not found');
            return;
        }

        const toolClass = this.toolRegistry.get(this.currentToolId);
        if (toolClass) {
            try {
                this.currentTool = new toolClass();
                this.currentTool.mount('#tool-content');
                console.log(`✅ Tool ${this.currentToolId} rendered successfully`);
            } catch (error) {
                console.error(`❌ Failed to render tool ${this.currentToolId}:`, error);
                toolContentElement.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #dc2626;">
                        <h3>Tool Error</h3>
                        <p>Failed to load ${this.currentToolId}: ${error.message}</p>
                    </div>
                `;
            }
        } else {
            console.error(`Tool not found: ${this.currentToolId}`);
            toolContentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #dc2626;">
                    <h3>Tool Not Found</h3>
                    <p>Tool "${this.currentToolId}" is not registered</p>
                </div>
            `;
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