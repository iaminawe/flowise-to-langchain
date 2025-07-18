#!/usr/bin/env node

/**
 * Standalone script to convert Flowise AgentFlows to LangChain TypeScript
 * This bypasses the TypeScript build issues in the main converter
 */

const fs = require('fs');
const path = require('path');

// AgentFlow converter implementation
class AgentFlowConverter {
  convert(flowData, filename) {
    const nodes = flowData.nodes || [];
    const edges = flowData.edges || [];
    
    // Extract agents
    const agents = nodes.filter(n => n.data?.type === 'Agent');
    const conditions = nodes.filter(n => n.data?.type === 'Condition');
    const loops = nodes.filter(n => n.data?.type === 'Loop');
    const llms = nodes.filter(n => n.data?.type === 'LLM');
    
    // Generate imports
    const imports = this.generateImports();
    
    // Generate agent implementations
    const agentImplementations = agents.map(agent => this.generateAgent(agent)).join('\n\n');
    
    // Generate supervisor
    const supervisor = this.generateSupervisor(agents, llms);
    
    // Generate main orchestration
    const orchestration = this.generateOrchestration(agents, conditions, loops);
    
    // Combine all parts
    return `/**
 * Generated from ${filename} Flowise AgentFlow
 * Converted using flowise-to-langchain
 */

${imports}

// Define the state interface
interface FlowState {
  messages: BaseMessage[];
  currentAgent?: string;
  loopCount?: number;
  finalAnswer?: string;
  [key: string]: any;
}

${agentImplementations}

${supervisor}

${orchestration}

// Export the main function
export async function run${this.toPascalCase(filename.replace('.json', ''))}(input: string): Promise<string> {
  const result = await runAgentFlow(input);
  return result.finalAnswer || "No answer generated";
}

// Run if executed directly
if (require.main === module) {
  run${this.toPascalCase(filename.replace('.json', ''))}("Hello, please help me with a software development task")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
`;
  }

  generateImports() {
    return `import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { 
  AgentExecutor, 
  createOpenAIFunctionsAgent,
  createReactAgent 
} from "langchain/agents";
import { 
  ChatPromptTemplate, 
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate
} from "@langchain/core/prompts";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { Tool } from "@langchain/core/tools";
import { BufferMemory } from "langchain/memory";`;
  }

  generateAgent(agentNode) {
    const agentName = agentNode.data.label || 'Agent';
    const functionName = this.toCamelCase(agentName);
    
    return `// ${agentName} Agent
async function create${this.toPascalCase(agentName)}Agent() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      \`You are a ${agentName}. Your role is to:
      - ${this.getAgentDescription(agentName)}
      - Collaborate with other agents when needed
      - Provide clear and actionable responses
      
      Current context: {context}\`
    ),
    new MessagesPlaceholder("chat_history"),
    HumanMessagePromptTemplate.fromTemplate("{input}"),
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm,
    prompt,
    tools: [], // Add tools as needed
  });

  return new AgentExecutor({
    agent,
    tools: [],
    verbose: true,
  });
}`;
  }

  generateSupervisor(agents, llms) {
    const supervisorLLM = llms.find(llm => llm.data.label?.toLowerCase().includes('supervisor')) || llms[0];
    
    return `// Supervisor for coordinating agents
async function createSupervisor() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const agentNames = [${agents.map(a => `"${a.data.label}"`).join(', ')}];
  
  const systemPrompt = \`You are a supervisor coordinating the following agents: \${agentNames.join(', ')}.
  
  Based on the user's request, determine which agent should handle the task next.
  Consider the current progress and what needs to be done.
  
  Respond with a JSON object containing:
  - nextAgent: the name of the agent to invoke next (or "FINISH" if the task is complete)
  - reasoning: brief explanation of your decision
  - instructions: specific instructions for the next agent\`;

  const outputParser = StructuredOutputParser.fromZodSchema(
    z.object({
      nextAgent: z.string(),
      reasoning: z.string(),
      instructions: z.string(),
    })
  );

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemPrompt),
    new MessagesPlaceholder("messages"),
    HumanMessagePromptTemplate.fromTemplate("Based on the above conversation, decide which agent should act next."),
  ]);

  return { llm, prompt, outputParser };
}`;
  }

  generateOrchestration(agents, conditions, loops) {
    return `// Main orchestration function
async function runAgentFlow(initialInput: string): Promise<FlowState> {
  const state: FlowState = {
    messages: [new HumanMessage(initialInput)],
    loopCount: 0,
  };

  // Create supervisor
  const { llm: supervisorLLM, prompt: supervisorPrompt, outputParser } = await createSupervisor();

  // Create agents
  const agentExecutors: Record<string, AgentExecutor> = {};
  ${agents.map(a => `agentExecutors["${a.data.label}"] = await create${this.toPascalCase(a.data.label)}Agent();`).join('\n  ')}

  // Main orchestration loop
  const maxIterations = ${loops.length > 0 ? '10' : '5'};
  
  while (state.loopCount! < maxIterations) {
    // Get supervisor decision
    const supervisorResponse = await supervisorLLM.invoke(
      await supervisorPrompt.formatMessages({ messages: state.messages })
    );

    let decision;
    try {
      decision = await outputParser.parse(supervisorResponse.content as string);
    } catch (e) {
      console.error("Failed to parse supervisor response:", e);
      break;
    }

    if (decision.nextAgent === "FINISH") {
      state.finalAnswer = state.messages[state.messages.length - 1].content as string;
      break;
    }

    // Execute the selected agent
    const selectedAgent = agentExecutors[decision.nextAgent];
    if (!selectedAgent) {
      console.error(\`Unknown agent: \${decision.nextAgent}\`);
      break;
    }

    const agentResponse = await selectedAgent.invoke({
      input: decision.instructions,
      context: state.messages.map(m => m.content).join("\\n"),
      chat_history: state.messages,
    });

    // Update state
    state.messages.push(new AIMessage(\`[\${decision.nextAgent}]: \${agentResponse.output}\`));
    state.currentAgent = decision.nextAgent;
    state.loopCount!++;
  }

  return state;
}`;
  }

  getAgentDescription(agentName) {
    const descriptions = {
      'Software Engineer': 'Write clean, efficient code following best practices',
      'Code Reviewer': 'Review code for quality, security, and performance',
      'Product Strategist': 'Define product vision and strategy',
      'Market Analyst': 'Analyze market trends and competitive landscape',
      'User Researcher': 'Understand user needs and behaviors',
      'Generate Final Answer': 'Synthesize all inputs into a comprehensive response'
    };
    return descriptions[agentName] || 'Perform specialized tasks in your domain';
  }

  toCamelCase(str) {
    // Remove parentheses and numbers, then convert to camelCase
    return str.replace(/\s*\([^)]*\)\s*/g, '').replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }

  toPascalCase(str) {
    // Remove parentheses and numbers, then convert to PascalCase
    return str.replace(/\s*\([^)]*\)\s*/g, '').replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    }).replace(/\s+/g, '');
  }
}

// Main conversion logic
async function convertAgentFlows() {
  const chatflowsDir = path.join(__dirname, 'chatflows');
  const converter = new AgentFlowConverter();
  
  try {
    const files = fs.readdirSync(chatflowsDir);
    const agentFlowFiles = files.filter(f => 
      f.includes('Agent') && f.endsWith('.json')
    );
    
    console.log(`Found ${agentFlowFiles.length} AgentFlow files to convert:\n`);
    
    for (const file of agentFlowFiles) {
      console.log(`Converting ${file}...`);
      
      try {
        const filePath = path.join(chatflowsDir, file);
        const flowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const outputCode = converter.convert(flowData, file);
        const outputFile = file.replace('.json', '-agentflow-converted.ts').toLowerCase().replace(/ /g, '-');
        
        fs.writeFileSync(outputFile, outputCode, 'utf8');
        console.log(`✅ Converted to ${outputFile}`);
        
      } catch (err) {
        console.error(`❌ Failed to convert ${file}:`, err.message);
      }
    }
    
    console.log('\n✨ AgentFlow conversion complete!');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  convertAgentFlows();
}

module.exports = { AgentFlowConverter };