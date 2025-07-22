/**
 * AgentFlow V2 Node Converters
 *
 * Converts Flowise AgentFlow V2 nodes into LangChain implementations
 * Supports Agent, Tool, CustomFunction, and Subflow nodes
 */

import { BaseConverter } from '../registry.js';
import { IRNode, CodeFragment, GenerationContext } from '../../ir/types.js';

/**
 * Base AgentFlow V2 converter with common functionality
 */
abstract class BaseAgentFlowV2Converter extends BaseConverter {
  readonly category = 'agentflow-v2';

  /**
   * Override getParameterValue to handle both parameter array and data object patterns
   */
  protected override getParameterValue<T = unknown>(
    node: IRNode,
    paramName: string,
    defaultValue?: T
  ): T | undefined {
    // First try the standard parameters array approach
    if (node.parameters && Array.isArray(node.parameters)) {
      const param = node.parameters.find((p) => p.name === paramName);
      if (param !== undefined) {
        return (param?.value as T) ?? defaultValue;
      }
    }

    // Fallback to data object approach for AgentFlow V2 nodes
    if ((node as any).data && typeof (node as any).data === 'object') {
      const value = (node as any).data[paramName];
      if (value !== undefined) {
        return value as T;
      }
    }

    return defaultValue;
  }

  protected generateV2NodeConfiguration(
    node: IRNode,
    _context: GenerationContext
  ): {
    imports: string[];
    packageName: string;
    className: string;
    config: Record<string, unknown>;
    state: Record<string, unknown>;
  } {
    return {
      imports: this.getRequiredImports(),
      packageName: this.getPackageName(),
      className: this.getClassName(),
      config: this.extractNodeConfig(node),
      state: this.extractNodeState(node),
    };
  }

  protected abstract getRequiredImports(): string[];
  protected abstract getPackageName(): string;
  protected abstract getClassName(): string;
  protected abstract extractNodeConfig(node: IRNode): Record<string, unknown>;
  protected abstract extractNodeState(node: IRNode): Record<string, unknown>;
  protected abstract getNodeType(): string;

  convert(node: IRNode, context: GenerationContext): CodeFragment[] {
    const variableName = this.generateVariableName(
      node,
      `${this.getNodeType()}_node`
    );
    const config = this.generateV2NodeConfiguration(node, context);
    const fragments: CodeFragment[] = [];

    // Import fragment
    fragments.push(
      this.createCodeFragment(
        `${node.id}_import`,
        'import',
        this.generateImport(config.packageName, config.imports),
        [config.packageName],
        node.id,
        1
      )
    );

    // Additional imports for complex configurations
    const additionalImports = this.getAdditionalImports(node, context);
    if (additionalImports.length > 0) {
      fragments.push(
        this.createCodeFragment(
          `${node.id}_additional_imports`,
          'import',
          additionalImports.join('\n'),
          additionalImports,
          node.id,
          2
        )
      );
    }

    // State management fragment (if needed)
    if (Object.keys(config.state).length > 0) {
      const stateCode = this.generateStateManagementCode(
        config.state,
        variableName
      );
      fragments.push(
        this.createCodeFragment(
          `${node.id}_state`,
          'initialization' as any,
          stateCode,
          ['state'],
          node.id,
          50
        )
      );
    }

    // Pre-initialization setup
    const setupCode = this.generateSetupCode(node, context, variableName);
    if (setupCode) {
      fragments.push(
        this.createCodeFragment(
          `${node.id}_setup`,
          'setup' as any,
          setupCode,
          ['setup'],
          node.id,
          75
        )
      );
    }

    // Configuration fragment
    const configStr = this.generateConfigurationString(config.config);
    const initCode = this.generateInitializationCode(
      node,
      context,
      variableName,
      config,
      configStr
    );

    fragments.push(
      this.createCodeFragment(
        `${node.id}_init`,
        'initialization',
        initCode,
        [config.className],
        node.id,
        100
      )
    );

    // Post-initialization configuration - always add to ensure consistent fragment count
    const postInitCode = this.generatePostInitializationCode(
      node,
      context,
      variableName
    );
    fragments.push(
      this.createCodeFragment(
        `${node.id}_post_init`,
        'initialization',
        postInitCode || `// ${variableName} post-initialization complete`,
        ['post-init'],
        node.id,
        125
      )
    );

    return fragments;
  }

  protected generateStateManagementCode(
    state: Record<string, unknown>,
    variableName: string
  ): string {
    const stateEntries = Object.entries(state);
    if (stateEntries.length === 0) return '';

    const stateInit = stateEntries
      .map(([key, value]) => {
        return `  ${key}: ${this.formatParameterValue(value)}`;
      })
      .join(',\n');

    return `// State management for ${variableName}\nconst ${variableName}_state = {\n${stateInit}\n};`;
  }

  /**
   * Get additional imports required for complex node configurations
   */
  protected getAdditionalImports(
    _node: IRNode,
    _context: GenerationContext
  ): string[] {
    return [];
  }

  /**
   * Generate setup code that runs before node initialization
   */
  protected generateSetupCode(
    _node: IRNode,
    _context: GenerationContext,
    _variableName: string
  ): string {
    return '';
  }

  /**
   * Generate initialization code with enhanced configuration handling
   */
  protected generateInitializationCode(
    _node: IRNode,
    _context: GenerationContext,
    variableName: string,
    config: any,
    configStr: string
  ): string {
    if (configStr) {
      return `const ${variableName} = new ${config.className}(${configStr});`;
    } else {
      return `const ${variableName} = new ${config.className}();`;
    }
  }

  /**
   * Generate post-initialization configuration code
   */
  protected generatePostInitializationCode(
    _node: IRNode,
    _context: GenerationContext,
    _variableName: string
  ): string {
    return '';
  }

  protected generateConfigurationString(
    config: Record<string, unknown>
  ): string {
    const entries = Object.entries(config);
    if (entries.length === 0) return '';

    const configPairs = entries.map(([key, value]) => {
      return `${key}: ${this.formatParameterValue(value)}`;
    });

    return `{\n  ${configPairs.join(',\n  ')}\n}`;
  }
}

/**
 * Agent Node Converter
 * Central reasoning and planning node
 */
export class AgentNodeConverter extends BaseAgentFlowV2Converter {
  readonly flowiseType = 'agentNode';

  protected getRequiredImports(): string[] {
    return ['AgentExecutor', 'createOpenAIFunctionsAgent'];
  }

  protected getPackageName(): string {
    return 'langchain/agents';
  }

  protected getClassName(): string {
    return 'AgentExecutor';
  }

  protected getNodeType(): string {
    return 'agent';
  }

  protected extractNodeConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Agent configuration
    const maxIterations = this.getParameterValue(node, 'maxIterations', 10);
    const verboseMode = this.getParameterValue(node, 'verbose', false);
    const handleParsingErrors = this.getParameterValue(
      node,
      'handleParsingErrors',
      true
    );
    const returnIntermediateSteps = this.getParameterValue(
      node,
      'returnIntermediateSteps',
      false
    );

    // Tools and LLM references
    const llmRef = this.getParameterValue(node, 'llm', null);
    const toolsRef = this.getParameterValue(node, 'tools', []);
    const memoryRef = this.getParameterValue(node, 'memory', null);

    config['maxIterations'] = maxIterations;
    config['verbose'] = verboseMode;
    config['handleParsingErrors'] = handleParsingErrors;
    config['returnIntermediateSteps'] = returnIntermediateSteps;

    // Add input references (to be resolved at runtime)
    if (llmRef) {
      config['llm'] = '/* LLM_REFERENCE_PLACEHOLDER */';
    }

    if (toolsRef && Array.isArray(toolsRef) && toolsRef.length > 0) {
      config['tools'] = '/* TOOLS_REFERENCE_PLACEHOLDER */';
    }

    if (memoryRef) {
      config['memory'] = '/* MEMORY_REFERENCE_PLACEHOLDER */';
    }

    return config;
  }

  protected extractNodeState(node: IRNode): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    const persistState = this.getParameterValue(node, 'persistState', false);
    const stateKey = this.getParameterValue(node, 'stateKey', 'agent_state');

    if (persistState) {
      state['persist'] = true;
      state['key'] = stateKey;
    }

    return state;
  }

  override getDependencies(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const deps = ['langchain', '@langchain/core'];

    // Add memory dependencies if needed
    const memoryRef = this.getParameterValue(node, 'memory', null);
    if (memoryRef) {
      deps.push('@langchain/core/memory');
    }

    // Add callback dependencies if enabled
    const enableCallbacks = this.getParameterValue(
      node,
      'enableCallbacks',
      false
    );
    if (enableCallbacks) {
      deps.push('@langchain/core/callbacks');
    }

    // Add agent-specific dependencies based on agent type
    const agentType = this.getParameterValue(
      node,
      'agentType',
      'openai-functions'
    ) as string;
    switch (agentType) {
      case 'openai-functions':
        deps.push('@langchain/openai');
        break;
      case 'structured-chat':
      case 'react':
        deps.push('@langchain/core/prompts');
        break;
    }

    return [...new Set(deps)];
  }

  override canConvert(node: IRNode): boolean {
    if (!super.canConvert(node)) return false;

    // Validate required parameters for agent node
    const llmRef = this.getParameterValue(node, 'llm', null);
    const toolsRef = this.getParameterValue(node, 'tools', []);

    return llmRef !== null && Array.isArray(toolsRef);
  }

  /**
   * Get supported agent types
   */
  getSupportedAgentTypes(): string[] {
    return [
      'openai-functions',
      'structured-chat',
      'react',
      'conversational-react',
      'zero-shot-react',
    ];
  }

  /**
   * Validate agent configuration
   */
  validateConfiguration(node: IRNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check agent type
    const agentType = this.getParameterValue(
      node,
      'agentType',
      'openai-functions'
    ) as string;
    if (!this.getSupportedAgentTypes().includes(agentType)) {
      errors.push(`Unsupported agent type: ${agentType}`);
    }

    // Check max iterations
    const maxIterations = this.getParameterValue(node, 'maxIterations', 10);
    if (
      typeof maxIterations !== 'number' ||
      maxIterations < 1 ||
      maxIterations > 100
    ) {
      errors.push('maxIterations must be a number between 1 and 100');
    }

    // Check max execution time
    const maxExecutionTime = this.getParameterValue(
      node,
      'maxExecutionTime',
      30000
    );
    if (typeof maxExecutionTime !== 'number' || maxExecutionTime < 1000) {
      errors.push('maxExecutionTime must be at least 1000ms');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate setup code for agent configurations
   */
  protected override generateSetupCode(
    node: IRNode,
    _context: GenerationContext,
    variableName: string
  ): string {
    const setupLines: string[] = [];

    // Check for advanced features that require setup
    const enableCallbacks = this.getParameterValue(
      node,
      'enableCallbacks',
      false
    );
    const dynamicTools = this.getParameterValue(node, 'dynamicTools', false);
    const planningStrategy = this.getParameterValue(
      node,
      'planningStrategy',
      null
    );
    const errorHandlingStrategy = this.getParameterValue(
      node,
      'errorHandlingStrategy',
      null
    );

    if (enableCallbacks) {
      setupLines.push(`// Setup callback manager`);
      setupLines.push(
        `const ${variableName}_callbackManager = new CallbackManager();`
      );
    }

    if (dynamicTools) {
      setupLines.push(`// Setup dynamic tool loading`);
      setupLines.push(
        `const ${variableName}_toolLoader = new DynamicToolLoader();`
      );
    }

    if (planningStrategy) {
      setupLines.push(`// Configure planning strategy: ${planningStrategy}`);
      setupLines.push(
        `const ${variableName}_planner = new PlanningStrategy('${planningStrategy}');`
      );
    }

    if (errorHandlingStrategy) {
      setupLines.push(
        `// Configure error handling strategy: ${errorHandlingStrategy}`
      );
      setupLines.push(
        `const ${variableName}_errorHandler = new ErrorHandler('${errorHandlingStrategy}');`
      );
    }

    return setupLines.length > 0 ? setupLines.join('\n') : '';
  }
}

/**
 * Tool Node Converter
 * Direct tool execution in workflows
 */
export class ToolNodeConverter extends BaseAgentFlowV2Converter {
  readonly flowiseType = 'toolNode';
  override readonly category = 'agentflow-v2';

  protected getRequiredImports(): string[] {
    return ['DynamicTool', 'Tool'];
  }

  protected getPackageName(): string {
    return '@langchain/core/tools';
  }

  protected getClassName(): string {
    return 'DynamicTool';
  }

  protected getNodeType(): string {
    return 'tool';
  }

  protected override getAdditionalImports(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const imports: string[] = [];

    // Add validation imports if schema validation is enabled
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    if (
      (inputSchema && Object.keys(inputSchema).length > 0) ||
      (outputSchema && Object.keys(outputSchema).length > 0)
    ) {
      imports.push('import { z } from "zod";');
    }

    // Add async execution imports
    const asyncExecution = this.getParameterValue(node, 'async', false);
    if (asyncExecution) {
      imports.push(
        'import { AsyncCallbackManagerForToolRun } from "@langchain/core/callbacks/manager";'
      );
    }

    // Add error handling imports
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    if (enableRetry) {
      imports.push(
        'import { AsyncRetrier } from "@langchain/core/utils/async_caller";'
      );
    }

    return imports;
  }

  protected override generateSetupCode(
    node: IRNode,
    _context: GenerationContext,
    variableName: string
  ): string {
    const setupLines: string[] = [];

    // Setup input/output validation schemas
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});

    if (Object.keys(inputSchema || {}).length > 0) {
      setupLines.push(`// Input validation schema`);
      setupLines.push(
        `const ${variableName}_inputSchema = z.object(${JSON.stringify(inputSchema, null, 2)});`
      );
    }

    if (Object.keys(outputSchema || {}).length > 0) {
      setupLines.push(`// Output validation schema`);
      setupLines.push(
        `const ${variableName}_outputSchema = z.object(${JSON.stringify(outputSchema, null, 2)});`
      );
    }

    // Setup retry configuration
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    if (enableRetry) {
      const maxRetries = this.getParameterValue(node, 'maxRetries', 3);
      const retryDelay = this.getParameterValue(node, 'retryDelay', 1000);
      setupLines.push(`// Retry configuration`);
      setupLines.push(`const ${variableName}_retrier = new AsyncRetrier({`);
      setupLines.push(`  maxRetries: ${maxRetries},`);
      setupLines.push(`  retryDelay: ${retryDelay}`);
      setupLines.push(`});`);
    }

    return setupLines.length > 0 ? setupLines.join('\n') : '';
  }

  protected extractNodeConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Basic tool configuration
    const toolName = this.getParameterValue(node, 'name', 'custom_tool');
    const description = this.getParameterValue(
      node,
      'description',
      'A custom tool'
    );
    const returnDirect = this.getParameterValue(node, 'returnDirect', false);
    const toolFunction = this.getParameterValue(node, 'func', null);

    // Advanced configuration
    const timeout = this.getParameterValue(node, 'timeout', 10000);
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    const asyncExecution = this.getParameterValue(node, 'async', false);
    const enableCaching = this.getParameterValue(node, 'enableCaching', false);
    const enableLogging = this.getParameterValue(node, 'enableLogging', true);

    // Schema validation
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    const validateInput = this.getParameterValue(node, 'validateInput', false);
    const validateOutput = this.getParameterValue(
      node,
      'validateOutput',
      false
    );

    // Build configuration
    config['name'] = toolName;
    config['description'] = description;
    config['returnDirect'] = returnDirect;

    // Enhanced function with validation and error handling
    if (toolFunction) {
      const funcLines: string[] = [];

      if (asyncExecution) {
        funcLines.push(
          `async (input: string, runManager?: AsyncCallbackManagerForToolRun) => {`
        );
      } else {
        funcLines.push(`(input: string) => {`);
      }

      // Add input validation
      if (validateInput && Object.keys(inputSchema || {}).length > 0) {
        funcLines.push(`  // Validate input`);
        funcLines.push(
          `  const parsedInput = ${toolName}_inputSchema.parse(JSON.parse(input));`
        );
      }

      // Add logging
      if (enableLogging) {
        funcLines.push(
          `  console.log('Executing tool: ${toolName}', { input });`
        );
      }

      // Add timeout wrapper
      if (timeout && timeout > 0) {
        funcLines.push(`  const timeoutPromise = new Promise((_, reject) => {`);
        funcLines.push(
          `    setTimeout(() => reject(new Error('Tool execution timeout')), ${timeout});`
        );
        funcLines.push(`  });`);
      }

      // Add retry wrapper
      if (enableRetry) {
        funcLines.push(`  return await ${toolName}_retrier.call(async () => {`);
      }

      // Add the actual tool function
      funcLines.push(`    try {`);
      funcLines.push(
        `      const result = await (${toolFunction})(parsedInput || input);`
      );

      // Add output validation
      if (validateOutput && Object.keys(outputSchema || {}).length > 0) {
        funcLines.push(`      // Validate output`);
        funcLines.push(
          `      const validatedResult = ${toolName}_outputSchema.parse(result);`
        );
        funcLines.push(`      return JSON.stringify(validatedResult);`);
      } else {
        funcLines.push(
          `      return typeof result === 'string' ? result : JSON.stringify(result);`
        );
      }

      funcLines.push(`    } catch (error) {`);
      funcLines.push(`      console.error('Tool execution error:', error);`);
      funcLines.push(`      throw error;`);
      funcLines.push(`    }`);

      if (enableRetry) {
        funcLines.push(`  });`);
      }

      funcLines.push(`}`);

      config['func'] = funcLines.join('\n');
    }

    // Add metadata
    config['_metadata'] = {
      timeout,
      enableRetry,
      asyncExecution,
      enableCaching,
      enableLogging,
      validateInput,
      validateOutput,
    };

    return config;
  }

  protected extractNodeState(node: IRNode): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    // Caching configuration
    const enableCaching = this.getParameterValue(node, 'enableCaching', false);
    if (enableCaching) {
      state['cache'] = {
        enabled: true,
        maxSize: this.getParameterValue(node, 'cacheSize', 100),
        ttl: this.getParameterValue(node, 'cacheTTL', 3600000), // 1 hour
        keyStrategy: this.getParameterValue(
          node,
          'cacheKeyStrategy',
          'input-hash'
        ),
      };
    }

    // Metrics tracking
    const trackMetrics = this.getParameterValue(node, 'trackMetrics', false);
    if (trackMetrics) {
      state['metrics'] = {
        enabled: true,
        trackExecutionTime: true,
        trackSuccessRate: true,
        trackErrorCount: true,
        trackUsageCount: true,
      };
    }

    // Rate limiting
    const enableRateLimit = this.getParameterValue(
      node,
      'enableRateLimit',
      false
    );
    if (enableRateLimit) {
      state['rateLimit'] = {
        enabled: true,
        maxRequests: this.getParameterValue(node, 'maxRequests', 60),
        windowMs: this.getParameterValue(node, 'rateLimitWindow', 60000), // 1 minute
      };
    }

    return state;
  }

  override getDependencies(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const deps = ['@langchain/core'];

    // Add validation dependencies
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    if (
      Object.keys(inputSchema || {}).length > 0 ||
      Object.keys(outputSchema || {}).length > 0
    ) {
      deps.push('zod');
    }

    // Add async dependencies
    const asyncExecution = this.getParameterValue(node, 'async', false);
    if (asyncExecution) {
      deps.push('@langchain/core/callbacks');
    }

    // Add retry dependencies
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    if (enableRetry) {
      deps.push('@langchain/core/utils');
    }

    return [...new Set(deps)];
  }

  override canConvert(node: IRNode): boolean {
    if (!super.canConvert(node)) return false;

    // Validate required parameters for tool node
    const toolName = this.getParameterValue(node, 'name', null);
    const toolFunction = this.getParameterValue(node, 'func', null);

    return toolName !== null && toolFunction !== null;
  }

  /**
   * Get supported tool types
   */
  getSupportedToolTypes(): string[] {
    return [
      'dynamic',
      'structured',
      'calculator',
      'search',
      'api-call',
      'file-system',
      'custom',
    ];
  }

  /**
   * Validate tool configuration
   */
  validateConfiguration(node: IRNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check tool name
    const toolName = this.getParameterValue(node, 'name', null) as
      | string
      | null;
    if (
      !toolName ||
      typeof toolName !== 'string' ||
      toolName.trim().length === 0
    ) {
      errors.push('Tool name is required and must be a non-empty string');
    }

    // Check tool function
    const toolFunction = this.getParameterValue(node, 'func', null);
    if (!toolFunction) {
      errors.push('Tool function is required');
    }

    // Check timeout
    const timeout = this.getParameterValue(node, 'timeout', 10000);
    if (typeof timeout !== 'number' || timeout < 0) {
      errors.push('Timeout must be a non-negative number');
    }

    // Check retry configuration
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    const maxRetries = this.getParameterValue(node, 'maxRetries', null);

    // Check maxRetries if it's provided, regardless of enableRetry
    if (
      maxRetries !== null &&
      (typeof maxRetries !== 'number' || maxRetries < 0 || maxRetries > 10)
    ) {
      errors.push('maxRetries must be a number between 0 and 10');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Custom Function Node Converter
 * JavaScript execution with state modification
 */
export class CustomFunctionNodeConverter extends BaseAgentFlowV2Converter {
  readonly flowiseType = 'customFunctionNode';
  override readonly category = 'agentflow-v2';

  protected getRequiredImports(): string[] {
    return ['RunnableLambda'];
  }

  protected getPackageName(): string {
    return '@langchain/core/runnables';
  }

  protected getClassName(): string {
    return 'RunnableLambda';
  }

  protected getNodeType(): string {
    return 'function';
  }

  protected override getAdditionalImports(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const imports: string[] = [];

    // Add schema validation imports
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    if (
      (inputSchema && Object.keys(inputSchema).length > 0) ||
      (outputSchema && Object.keys(outputSchema).length > 0)
    ) {
      imports.push('import { z } from "zod";');
    }

    // Add state management imports
    const enableState = this.getParameterValue(node, 'enableState', false);
    if (enableState) {
      imports.push(
        'import { RunnablePassthrough } from "@langchain/core/runnables";'
      );
    }

    // Add error handling imports
    const enableErrorHandling = this.getParameterValue(
      node,
      'enableErrorHandling',
      true
    );
    if (enableErrorHandling) {
      imports.push(
        'import { RunnableConfig } from "@langchain/core/runnables";'
      );
    }

    // Add context imports
    const enableContext = this.getParameterValue(node, 'enableContext', false);
    if (enableContext) {
      imports.push(
        'import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";'
      );
    }

    return imports;
  }

  protected override generateSetupCode(
    node: IRNode,
    _context: GenerationContext,
    variableName: string
  ): string {
    const setupLines: string[] = [];

    // Setup validation schemas
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});

    if (Object.keys(inputSchema || {}).length > 0) {
      setupLines.push(`// Input validation schema`);
      setupLines.push(
        `const ${variableName}_inputSchema = z.object(${JSON.stringify(inputSchema, null, 2)});`
      );
    }

    if (Object.keys(outputSchema || {}).length > 0) {
      setupLines.push(`// Output validation schema`);
      setupLines.push(
        `const ${variableName}_outputSchema = z.object(${JSON.stringify(outputSchema, null, 2)});`
      );
    }

    // Setup state management
    const enableState = this.getParameterValue(node, 'enableState', false);
    if (enableState) {
      const stateVariables = this.getParameterValue(node, 'stateVariables', {});
      setupLines.push(`// State management`);
      setupLines.push(
        `const ${variableName}_state = ${JSON.stringify(stateVariables, null, 2)};`
      );
    }

    // Setup error handling configuration
    const enableErrorHandling = this.getParameterValue(
      node,
      'enableErrorHandling',
      true
    );
    if (enableErrorHandling) {
      const errorStrategy = this.getParameterValue(
        node,
        'errorStrategy',
        'throw'
      ) as string;
      const fallbackValue = this.getParameterValue(node, 'fallbackValue', null);
      setupLines.push(`// Error handling configuration`);
      setupLines.push(`const ${variableName}_errorConfig = {`);
      setupLines.push(`  strategy: '${errorStrategy}',`);
      setupLines.push(`  fallbackValue: ${JSON.stringify(fallbackValue)}`);
      setupLines.push(`};`);
    }

    return setupLines.length > 0 ? setupLines.join('\n') : '';
  }

  protected extractNodeConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Basic function configuration
    const functionCode = this.getParameterValue(node, 'code', '');
    const asyncExecution = this.getParameterValue(node, 'async', false);
    const name = this.getParameterValue(node, 'name', 'custom_function');

    // Validation and schema configuration
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    const validateInput = this.getParameterValue(node, 'validateInput', false);
    const validateOutput = this.getParameterValue(
      node,
      'validateOutput',
      false
    );

    // State and context configuration
    const enableState = this.getParameterValue(node, 'enableState', false);
    const enableContext = this.getParameterValue(node, 'enableContext', false);
    const enableLogging = this.getParameterValue(node, 'enableLogging', true);

    // Error handling configuration
    const enableErrorHandling = this.getParameterValue(
      node,
      'enableErrorHandling',
      true
    );
    const errorStrategy = this.getParameterValue(
      node,
      'errorStrategy',
      'throw'
    ) as string;
    const timeout = this.getParameterValue(node, 'timeout', 30000);

    // Performance configuration
    const enableCaching = this.getParameterValue(node, 'enableCaching', false);
    const enableMetrics = this.getParameterValue(node, 'enableMetrics', false);

    // Build the function with enhanced features
    if (functionCode) {
      const funcLines: string[] = [];

      // Function signature
      if (asyncExecution) {
        funcLines.push(`async (input: any, config?: RunnableConfig) => {`);
      } else {
        funcLines.push(`(input: any) => {`);
      }

      // Add function start logging
      if (enableLogging) {
        funcLines.push(
          `  console.log('[${name}] Function execution started', { input });`
        );
      }

      // Add metrics tracking
      if (enableMetrics) {
        funcLines.push(`  const startTime = performance.now();`);
      }

      // Add input validation
      if (validateInput && Object.keys(inputSchema || {}).length > 0) {
        funcLines.push(`  // Validate input`);
        funcLines.push(`  try {`);
        funcLines.push(`    input = ${name}_inputSchema.parse(input);`);
        funcLines.push(`  } catch (error) {`);
        funcLines.push(
          `    throw new Error('Input validation failed: ' + error.message);`
        );
        funcLines.push(`  }`);
      }

      // Add state initialization
      if (enableState) {
        funcLines.push(`  // Initialize state`);
        funcLines.push(`  const state = { ...${name}_state };`);
      }

      // Add context preparation
      if (enableContext) {
        funcLines.push(`  // Prepare execution context`);
        funcLines.push(`  const context = {`);
        funcLines.push(`    input,`);
        if (enableState) {
          funcLines.push(`    state,`);
        }
        funcLines.push(`    config,`);
        funcLines.push(`    timestamp: Date.now()`);
        funcLines.push(`  };`);
      }

      // Add timeout wrapper
      if (timeout && timeout > 0) {
        funcLines.push(`  // Timeout wrapper`);
        funcLines.push(`  const timeoutPromise = new Promise((_, reject) => {`);
        funcLines.push(
          `    setTimeout(() => reject(new Error('Function execution timeout')), ${timeout});`
        );
        funcLines.push(`  });`);
      }

      // Add error handling wrapper
      if (enableErrorHandling) {
        funcLines.push(`  try {`);
      }

      // Add the actual function code
      funcLines.push(`    // User function code`);
      const contextVars = [];
      if (enableState) contextVars.push('state');
      if (enableContext) contextVars.push('context');

      if (contextVars.length > 0) {
        funcLines.push(
          `    const userFunction = (input, ${contextVars.join(', ')}) => {`
        );
      } else {
        funcLines.push(`    const userFunction = (input) => {`);
      }

      funcLines.push(`      ${functionCode}`);
      funcLines.push(`    };`);

      // Execute the function
      if (timeout && timeout > 0) {
        if (contextVars.length > 0) {
          funcLines.push(`    const result = await Promise.race([`);
          funcLines.push(
            `      userFunction(input, ${contextVars.join(', ')}),`
          );
          funcLines.push(`      timeoutPromise`);
          funcLines.push(`    ]);`);
        } else {
          funcLines.push(`    const result = await Promise.race([`);
          funcLines.push(`      userFunction(input),`);
          funcLines.push(`      timeoutPromise`);
          funcLines.push(`    ]);`);
        }
      } else {
        if (contextVars.length > 0) {
          funcLines.push(
            `    const result = await userFunction(input, ${contextVars.join(', ')});`
          );
        } else {
          funcLines.push(`    const result = await userFunction(input);`);
        }
      }

      // Add output validation
      if (validateOutput && Object.keys(outputSchema || {}).length > 0) {
        funcLines.push(`    // Validate output`);
        funcLines.push(
          `    const validatedResult = ${name}_outputSchema.parse(result);`
        );
      }

      // Add metrics tracking
      if (enableMetrics) {
        funcLines.push(
          `    const executionTime = performance.now() - startTime;`
        );
        funcLines.push(
          `    console.log('[${name}] Execution metrics', { executionTime, success: true });`
        );
      }

      // Add success logging
      if (enableLogging) {
        funcLines.push(
          `    console.log('[${name}] Function execution completed', { result: ${validateOutput ? 'validatedResult' : 'result'} });`
        );
      }

      funcLines.push(
        `    return ${validateOutput && Object.keys(outputSchema || {}).length > 0 ? 'validatedResult' : 'result'};`
      );

      // Close error handling
      if (enableErrorHandling) {
        funcLines.push(`  } catch (error) {`);
        funcLines.push(
          `    console.error('[${name}] Function execution error:', error);`
        );

        if (errorStrategy && errorStrategy === 'fallback') {
          funcLines.push(
            `    if (${name}_errorConfig.fallbackValue !== null) {`
          );
          funcLines.push(`      return ${name}_errorConfig.fallbackValue;`);
          funcLines.push(`    }`);
        } else if (errorStrategy && errorStrategy === 'continue') {
          funcLines.push(`    return input; // Continue with original input`);
        }

        funcLines.push(`    throw error;`);
        funcLines.push(`  }`);
      }

      funcLines.push(`}`);

      config['func'] = funcLines.join('\n');
    }

    // Add metadata
    config['_metadata'] = {
      name,
      asyncExecution,
      validateInput,
      validateOutput,
      enableState,
      enableContext,
      enableLogging,
      enableErrorHandling,
      errorStrategy,
      timeout,
      enableCaching,
      enableMetrics,
    };

    return config;
  }

  protected extractNodeState(node: IRNode): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    // State management configuration
    const stateVariables = this.getParameterValue(node, 'stateVariables', {});
    const persistState = this.getParameterValue(node, 'persistState', false);
    const enableState = this.getParameterValue(node, 'enableState', false);
    const stateScope = this.getParameterValue(node, 'stateScope', 'local'); // local, global, session

    if (enableState || Object.keys(stateVariables || {}).length > 0) {
      state['variables'] = stateVariables;
      state['scope'] = stateScope;

      if (persistState) {
        state['persist'] = true;
        state['persistKey'] = this.getParameterValue(
          node,
          'persistKey',
          `custom_function_${node.id}`
        );
        state['persistTTL'] = this.getParameterValue(
          node,
          'persistTTL',
          86400000
        ); // 24 hours
      }
    }

    // Caching configuration
    const enableCaching = this.getParameterValue(node, 'enableCaching', false);
    if (enableCaching) {
      state['cache'] = {
        enabled: true,
        maxSize: this.getParameterValue(node, 'cacheSize', 100),
        ttl: this.getParameterValue(node, 'cacheTTL', 3600000), // 1 hour
        keyStrategy: this.getParameterValue(
          node,
          'cacheKeyStrategy',
          'input-hash'
        ),
        includeState: this.getParameterValue(node, 'cacheIncludeState', true),
      };
    }

    // Metrics configuration
    const enableMetrics = this.getParameterValue(node, 'enableMetrics', false);
    if (enableMetrics) {
      state['metrics'] = {
        enabled: true,
        trackExecutionTime: true,
        trackMemoryUsage: this.getParameterValue(
          node,
          'trackMemoryUsage',
          false
        ),
        trackStateChanges: this.getParameterValue(
          node,
          'trackStateChanges',
          enableState
        ),
        trackErrorRate: true,
        aggregateMetrics: this.getParameterValue(
          node,
          'aggregateMetrics',
          true
        ),
      };
    }

    return state;
  }

  override getDependencies(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const deps = ['@langchain/core'];

    // Add validation dependencies
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});
    if (
      Object.keys(inputSchema || {}).length > 0 ||
      Object.keys(outputSchema || {}).length > 0
    ) {
      deps.push('zod');
    }

    // Add async dependencies
    const asyncExecution = this.getParameterValue(node, 'async', false);
    if (asyncExecution) {
      deps.push('@langchain/core/runnables');
    }

    // Add callback dependencies for context
    const enableContext = this.getParameterValue(node, 'enableContext', false);
    if (enableContext) {
      deps.push('@langchain/core/callbacks');
    }

    return [...new Set(deps)];
  }

  override canConvert(node: IRNode): boolean {
    if (!super.canConvert(node)) return false;

    // Validate required parameters for custom function node
    const functionCode = this.getParameterValue(node, 'code', null) as
      | string
      | null;

    return (
      functionCode !== null &&
      typeof functionCode === 'string' &&
      functionCode.trim().length > 0
    );
  }

  /**
   * Get supported execution modes
   */
  getSupportedExecutionModes(): string[] {
    return ['synchronous', 'asynchronous', 'streaming', 'batch'];
  }

  /**
   * Get supported state scopes
   */
  getSupportedStateScopes(): string[] {
    return ['local', 'global', 'session', 'persistent'];
  }

  /**
   * Validate custom function configuration
   */
  validateConfiguration(node: IRNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check function code
    const functionCode = this.getParameterValue(node, 'code', null) as
      | string
      | null;
    if (
      !functionCode ||
      typeof functionCode !== 'string' ||
      functionCode.trim().length === 0
    ) {
      errors.push('Function code is required and must be a non-empty string');
    }

    // Check timeout
    const timeout = this.getParameterValue(node, 'timeout', 30000);
    if (typeof timeout !== 'number' || timeout < 0 || timeout > 300000) {
      errors.push(
        'Timeout must be a number between 0 and 300000ms (5 minutes)'
      );
    }

    // Check state scope
    const stateScope = this.getParameterValue(node, 'stateScope', 'local');
    if (!this.getSupportedStateScopes().includes(stateScope || '')) {
      errors.push(`Unsupported state scope: ${stateScope}`);
    }

    // Check error strategy
    const errorStrategy = this.getParameterValue(
      node,
      'errorStrategy',
      'throw'
    ) as string;
    const supportedStrategies = ['throw', 'fallback', 'continue', 'ignore'];
    if (!supportedStrategies.includes(errorStrategy || '')) {
      errors.push(`Unsupported error strategy: ${errorStrategy}`);
    }

    // Validate schemas if provided
    const inputSchema = this.getParameterValue(node, 'inputSchema', {});
    const outputSchema = this.getParameterValue(node, 'outputSchema', {});

    if (typeof inputSchema !== 'object' || Array.isArray(inputSchema)) {
      errors.push('Input schema must be an object');
    }

    if (typeof outputSchema !== 'object' || Array.isArray(outputSchema)) {
      errors.push('Output schema must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Subflow Node Converter
 * Nested workflow invocation
 */
export class SubflowNodeConverter extends BaseAgentFlowV2Converter {
  readonly flowiseType = 'subflowNode';

  protected getRequiredImports(): string[] {
    return ['RunnableSequence'];
  }

  protected getPackageName(): string {
    return '@langchain/core/runnables';
  }

  protected getClassName(): string {
    return 'RunnableSequence';
  }

  protected getNodeType(): string {
    return 'subflow';
  }

  protected override getAdditionalImports(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const imports: string[] = [];

    // Add parallel execution imports
    const parallelExecution = this.getParameterValue(node, 'parallel', false);
    if (parallelExecution) {
      imports.push(
        'import { RunnableParallel } from "@langchain/core/runnables";'
      );
    }

    // Add conditional execution imports
    const enableConditional = this.getParameterValue(
      node,
      'enableConditional',
      false
    );
    if (enableConditional) {
      imports.push(
        'import { RunnableBranch } from "@langchain/core/runnables";'
      );
    }

    // Add retry imports
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    if (enableRetry) {
      imports.push(
        'import { RetryOptions } from "@langchain/core/utils/async_caller";'
      );
    }

    return imports;
  }

  protected extractNodeConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    const subflowId = this.getParameterValue(node, 'subflowId', '');
    const inputMapping = this.getParameterValue(node, 'inputMapping', {});
    const outputMapping = this.getParameterValue(node, 'outputMapping', {});
    const parallelExecution = this.getParameterValue(node, 'parallel', false);

    config['subflowId'] = subflowId;
    config['steps'] = '/* SUBFLOW_STEPS_PLACEHOLDER */';

    if (Object.keys(inputMapping || {}).length > 0) {
      config['inputMapping'] = inputMapping;
    }

    if (Object.keys(outputMapping || {}).length > 0) {
      config['outputMapping'] = outputMapping;
    }

    config['parallel'] = parallelExecution;

    return config;
  }

  protected extractNodeState(node: IRNode): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    const shareContext = this.getParameterValue(node, 'shareContext', true);
    const isolateState = this.getParameterValue(node, 'isolateState', false);

    state['shareContext'] = shareContext;
    state['isolateState'] = isolateState;

    return state;
  }

  protected override generateSetupCode(
    node: IRNode,
    _context: GenerationContext,
    variableName: string
  ): string {
    const setupLines: string[] = [];

    // Setup input/output mapping
    const inputMapping = this.getParameterValue(node, 'inputMapping', {});
    const outputMapping = this.getParameterValue(node, 'outputMapping', {});

    if (Object.keys(inputMapping || {}).length > 0) {
      setupLines.push(`// Input mapping configuration`);
      setupLines.push(
        `const ${variableName}_inputMapping = ${JSON.stringify(inputMapping, null, 2)};`
      );
    }

    if (Object.keys(outputMapping || {}).length > 0) {
      setupLines.push(`// Output mapping configuration`);
      setupLines.push(
        `const ${variableName}_outputMapping = ${JSON.stringify(outputMapping, null, 2)};`
      );
    }

    // Setup conditional execution
    const enableConditional = this.getParameterValue(
      node,
      'enableConditional',
      false
    );
    if (enableConditional) {
      const conditionCode = this.getParameterValue(
        node,
        'conditionCode',
        'true'
      );
      setupLines.push(`// Conditional execution logic`);
      setupLines.push(`const ${variableName}_condition = (input: any) => {`);
      setupLines.push(`  return ${conditionCode};`);
      setupLines.push(`};`);
    }

    // Setup retry configuration
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    if (enableRetry) {
      const maxRetries = this.getParameterValue(node, 'maxRetries', 3);
      const retryDelay = this.getParameterValue(node, 'retryDelay', 1000);
      setupLines.push(`// Retry configuration`);
      setupLines.push(`const ${variableName}_retryConfig = {`);
      setupLines.push(`  maxRetries: ${maxRetries},`);
      setupLines.push(`  retryDelay: ${retryDelay}`);
      setupLines.push(`};`);
    }

    return setupLines.length > 0 ? setupLines.join('\n') : '';
  }

  protected override generateInitializationCode(
    node: IRNode,
    _context: GenerationContext,
    variableName: string,
    config: any,
    _configStr: string
  ): string {
    const parallelExecution = this.getParameterValue(node, 'parallel', false);
    const enableErrorHandling = this.getParameterValue(
      node,
      'enableErrorHandling',
      true
    );
    const enableRetry = this.getParameterValue(node, 'enableRetry', false);
    const enableConditional = this.getParameterValue(
      node,
      'enableConditional',
      false
    );

    const initLines: string[] = [];

    // Choose the appropriate runnable type
    // let runnableClass = 'RunnableSequence';
    // if (parallelExecution && !enableConditional) {
    //   runnableClass = 'RunnableParallel';
    // } else if (enableConditional) {
    //   runnableClass = 'RunnableBranch';
    // }

    // Create the base runnable
    if (enableConditional) {
      // Create conditional branch
      initLines.push(`// Create conditional subflow execution`);
      initLines.push(`let ${variableName} = RunnableBranch.from([`);
      initLines.push(
        `  [${variableName}_condition, /* CONDITIONAL_SUBFLOW_PLACEHOLDER */],`
      );
      initLines.push(`  /* DEFAULT_SUBFLOW_PLACEHOLDER */`);
      initLines.push(`]);`);
    } else if (config.steps && Array.isArray(config.steps)) {
      if (parallelExecution) {
        initLines.push(`// Create parallel subflow execution`);
        initLines.push(`let ${variableName} = RunnableParallel.from({`);
        config.steps.forEach((step: string, index: number) => {
          initLines.push(
            `  step${index}: ${step}${index < config.steps.length - 1 ? ',' : ''}`
          );
        });
        initLines.push(`});`);
      } else {
        initLines.push(`// Create sequential subflow execution`);
        initLines.push(`let ${variableName} = RunnableSequence.from([`);
        initLines.push(
          config.steps.map((step: string) => `  ${step}`).join(',\n')
        );
        initLines.push(`]);`);
      }
    } else {
      // Fallback to simple sequence
      initLines.push(
        `let ${variableName} = RunnableSequence.from([/* SUBFLOW_STEPS_PLACEHOLDER */]);`
      );
    }

    // Add error handling wrapper
    if (enableErrorHandling) {
      const errorStrategy = this.getParameterValue(
        node,
        'errorStrategy',
        'throw'
      ) as string;
      const fallbackSubflow = this.getParameterValue(
        node,
        'fallbackSubflow',
        null
      );

      if (errorStrategy === 'fallback' && fallbackSubflow) {
        initLines.push(`// Add error handling with fallback`);
        initLines.push(`${variableName} = ${variableName}.withFallbacks([`);
        initLines.push(`  /* FALLBACK_SUBFLOW_PLACEHOLDER */`);
        initLines.push(`]);`);
      }
    }

    // Add retry wrapper
    if (enableRetry) {
      initLines.push(`// Add retry capability`);
      initLines.push(
        `${variableName} = ${variableName}.withRetry(${variableName}_retryConfig);`
      );
    }

    return initLines.join('\n');
  }

  override getDependencies(
    node: IRNode,
    _context: GenerationContext
  ): string[] {
    const deps = ['@langchain/core'];

    // Add conditional execution dependencies
    const enableConditional = this.getParameterValue(
      node,
      'enableConditional',
      false
    );
    if (enableConditional) {
      deps.push('@langchain/core/runnables');
    }

    // Add error handling dependencies
    const enableErrorHandling = this.getParameterValue(
      node,
      'enableErrorHandling',
      true
    );
    if (enableErrorHandling) {
      deps.push('@langchain/core/runnables');
    }

    // Add monitoring dependencies
    const enableMonitoring = this.getParameterValue(
      node,
      'enableMonitoring',
      false
    );
    if (enableMonitoring) {
      deps.push('@langchain/core/callbacks');
    }

    return [...new Set(deps)];
  }

  override canConvert(node: IRNode): boolean {
    if (!super.canConvert(node)) return false;

    // Validate required parameters for subflow node
    const subflowId = this.getParameterValue(node, 'subflowId', null) as
      | string
      | null;

    return (
      subflowId !== null &&
      typeof subflowId === 'string' &&
      subflowId.trim().length > 0
    );
  }

  /**
   * Get supported execution modes
   */
  getSupportedExecutionModes(): string[] {
    return ['sequential', 'parallel', 'conditional', 'hybrid'];
  }

  /**
   * Get supported state scopes
   */
  getSupportedStateScopes(): string[] {
    return ['subflow', 'parent', 'global', 'isolated'];
  }

  /**
   * Validate subflow configuration
   */
  validateConfiguration(node: IRNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check subflow ID
    const subflowId = this.getParameterValue(node, 'subflowId', null) as
      | string
      | null;
    if (
      !subflowId ||
      typeof subflowId !== 'string' ||
      subflowId.trim().length === 0
    ) {
      errors.push('Subflow ID is required and must be a non-empty string');
    }

    // Check timeout
    const timeout = this.getParameterValue(node, 'timeout', 60000);
    if (typeof timeout !== 'number' || timeout < 1000 || timeout > 600000) {
      errors.push('Timeout must be between 1000ms and 600000ms (10 minutes)');
    }

    // Check state scope
    const stateScope = this.getParameterValue(node, 'stateScope', 'subflow');
    if (!this.getSupportedStateScopes().includes(stateScope || '')) {
      errors.push(`Unsupported state scope: ${stateScope}`);
    }

    // Check error strategy
    const errorStrategy = this.getParameterValue(
      node,
      'errorStrategy',
      'throw'
    ) as string;
    const supportedStrategies = ['throw', 'fallback', 'continue', 'ignore'];
    if (!supportedStrategies.includes(errorStrategy || '')) {
      errors.push(`Unsupported error strategy: ${errorStrategy}`);
    }

    // Check parallel execution configuration
    const parallelExecution = this.getParameterValue(node, 'parallel', false);
    const maxConcurrency = this.getParameterValue(node, 'maxConcurrency', null);

    // Check maxConcurrency if it's provided, regardless of parallel setting
    if (
      maxConcurrency !== null &&
      (typeof maxConcurrency !== 'number' ||
        maxConcurrency < 1 ||
        maxConcurrency > 20)
    ) {
      errors.push(
        'maxConcurrency must be between 1 and 20 for parallel execution'
      );
    }

    // Validate mapping configurations
    const inputMapping = this.getParameterValue(node, 'inputMapping', {});
    const outputMapping = this.getParameterValue(node, 'outputMapping', {});

    if (typeof inputMapping !== 'object' || Array.isArray(inputMapping)) {
      errors.push('Input mapping must be an object');
    }

    if (typeof outputMapping !== 'object' || Array.isArray(outputMapping)) {
      errors.push('Output mapping must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
