/**
 * Generated from Strategy Team Agents.json Flowise AgentFlow
 * Converted using flowise-to-langchain
 */

import { ChatOpenAI } from "@langchain/openai";
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
import { BufferMemory } from "langchain/memory";

// Define the state interface
interface FlowState {
  messages: BaseMessage[];
  currentAgent?: string;
  loopCount?: number;
  finalAnswer?: string;
  [key: string]: any;
}

// Researcher Agent
async function createResearcherAgent() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a Researcher. Your role is to:
      - Perform specialized tasks in your domain
      - Collaborate with other agents when needed
      - Provide clear and actionable responses
      
      Current context: {context}`
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
}

// Strategist Agent
async function createStrategistAgent() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a Strategist. Your role is to:
      - Perform specialized tasks in your domain
      - Collaborate with other agents when needed
      - Provide clear and actionable responses
      
      Current context: {context}`
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
}

// Analyst Agent
async function createAnalystAgent() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a Analyst. Your role is to:
      - Perform specialized tasks in your domain
      - Collaborate with other agents when needed
      - Provide clear and actionable responses
      
      Current context: {context}`
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
}

// Reporter (4) Agent
async function createReporterAgent() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are a Reporter (4). Your role is to:
      - Perform specialized tasks in your domain
      - Collaborate with other agents when needed
      - Provide clear and actionable responses
      
      Current context: {context}`
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
}

// Supervisor for coordinating agents
async function createSupervisor() {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const agentNames = ["Researcher", "Strategist", "Analyst", "Reporter (4)"];
  
  const systemPrompt = `You are a supervisor coordinating the following agents: ${agentNames.join(', ')}.
  
  Based on the user's request, determine which agent should handle the task next.
  Consider the current progress and what needs to be done.
  
  Respond with a JSON object containing:
  - nextAgent: the name of the agent to invoke next (or "FINISH" if the task is complete)
  - reasoning: brief explanation of your decision
  - instructions: specific instructions for the next agent`;

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
}

// Main orchestration function
async function runAgentFlow(initialInput: string): Promise<FlowState> {
  const state: FlowState = {
    messages: [new HumanMessage(initialInput)],
    loopCount: 0,
  };

  // Create supervisor
  const { llm: supervisorLLM, prompt: supervisorPrompt, outputParser } = await createSupervisor();

  // Create agents
  const agentExecutors: Record<string, AgentExecutor> = {};
  agentExecutors["Researcher"] = await createResearcherAgent();
  agentExecutors["Strategist"] = await createStrategistAgent();
  agentExecutors["Analyst"] = await createAnalystAgent();
  agentExecutors["Reporter (4)"] = await createReporterAgent();

  // Main orchestration loop
  const maxIterations = 10;
  
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
      console.error(`Unknown agent: ${decision.nextAgent}`);
      break;
    }

    const agentResponse = await selectedAgent.invoke({
      input: decision.instructions,
      context: state.messages.map(m => m.content).join("\n"),
      chat_history: state.messages,
    });

    // Update state
    state.messages.push(new AIMessage(`[${decision.nextAgent}]: ${agentResponse.output}`));
    state.currentAgent = decision.nextAgent;
    state.loopCount!++;
  }

  return state;
}

// Export the main function
export async function runStrategyTeamAgents(input: string): Promise<string> {
  const result = await runAgentFlow(input);
  return result.finalAnswer || "No answer generated";
}

// Run if executed directly
if (require.main === module) {
  runStrategyTeamAgents("Hello, please help me with a software development task")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
