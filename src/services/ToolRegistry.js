export class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    register(id, toolClass) {
        this.tools.set(id, toolClass);
    }

    get(id) {
        return this.tools.get(id);
    }

    getAll() {
        return Array.from(this.tools.entries()).map(([id, toolClass]) => ({
            id,
            name: toolClass.name,
            description: toolClass.description,
            toolClass
        }));
    }
}