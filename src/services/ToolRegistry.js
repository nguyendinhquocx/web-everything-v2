export class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    register(id, toolClass) {
        this.tools.set(id, toolClass);
        console.log(`✅ Registered tool: ${id}`);
    }

    get(id) {
        return this.tools.get(id);
    }

    getAll() {
        return Array.from(this.tools.entries()).map(([id, toolClass]) => ({
            id,
            name: this.getToolName(id),
            class: toolClass
        }));
    }

    getToolName(id) {
        const names = {
            'subtitle-processor': 'Subtitle Processor'
        };
        return names[id] || id;
    }

    has(id) {
        return this.tools.has(id);
    }

    unregister(id) {
        return this.tools.delete(id);
    }

    clear() {
        this.tools.clear();
    }
}