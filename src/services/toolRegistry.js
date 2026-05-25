/**
 * Local Filesystem and Command Execution Tool Registry Blueprint
 * This enables our coding agent CLI to link directly to the local workspace for autonomous development.
 */
class ToolRegistry {
  constructor() {
    this.tools = {};
    
    // Register base developmental tools
    this.registerTool({
      name: 'filesystemTool',
      description: 'Read, write, update, or delete local source files and directory hierarchies.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['read', 'write', 'list', 'delete'] },
          path: { type: 'string', description: 'Absolute or relative target file/folder path.' },
          content: { type: 'string', description: 'Content payload to write to the file (required for write action).' }
        },
        required: ['action', 'path']
      },
      execute: async (args) => {
        // Blueprint mock execute block
        return `Filesystem action "${args.action}" on path "${args.path}" executed successfully.`;
      }
    });

    this.registerTool({
      name: 'terminalTool',
      description: 'Execute build processes, test commands, or clean scripts inside a secure local bash shell.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Raw shell command line to run.' }
        },
        required: ['command']
      },
      execute: async (args) => {
        // Blueprint mock execute block
        return `Terminal command "${args.command}" executed successfully.`;
      }
    });

    this.registerTool({
      name: 'searchTool',
      description: 'Search directories recursively using pattern queries to identify definitions or configurations.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Text phrase or pattern to search for.' },
          path: { type: 'string', description: 'Directory tree location to look inside.' }
        },
        required: ['query']
      },
      execute: async (args) => {
        // Blueprint mock execute block
        return `Search for query "${args.query}" completed. Found 0 matching occurrences.`;
      }
    });
  }

  /**
   * Registers a new developmental tool to the agent registry.
   * @param {Object} tool - Tool descriptor containing name, description, and execution logic
   */
  registerTool(tool) {
    if (!tool.name) throw new Error('Tool name is required.');
    this.tools[tool.name] = tool;
  }

  /**
   * Gets a registered tool descriptor.
   * @param {string} name - Name of the tool
   * @returns {Object} - Tool descriptor
   */
  getTool(name) {
    return this.tools[name];
  }

  /**
   * Lists all registered developmental tools with descriptions and specifications.
   * @returns {Array} - Array of tools
   */
  listTools() {
    return Object.values(this.tools).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}

export default new ToolRegistry();
