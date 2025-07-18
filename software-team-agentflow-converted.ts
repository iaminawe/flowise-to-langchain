/**
 * Generated from Software Team Flowise AgentFlow
 * Multi-agent workflow with coordination
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { BufferMemory } from "langchain/memory";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// Flow state interface
interface FlowState {
  next: string;
  instruction: string;
}

// Initialize flow state
const flowState: FlowState = {
  next: "",
  instruction: ""
};


// Supervisor output schema
const supervisorOutputSchema = z.object({
  next: z.enum(["FINISH", "SOFTWARE", "REVIEWER"]).describe("next worker to act"),
  instructions: z.string().describe("The specific instructions of the sub-task the next worker should accomplish."),
  reasoning: z.string().describe("The reason why next worker is tasked to do the job")
});

type SupervisorOutput = z.infer<typeof supervisorOutputSchema>;

// Supervisor configuration
const supervisorModel = new ChatOpenAI({
  modelName: "gpt-4.1",
  temperature: 0.9,
  streaming: true
});

const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ["system", `<p>You are a supervisor tasked with managing a conversation between the following workers:</p><p>- Software Engineer</p><p>- Code Reviewer</p><p>Given the following user request, respond with the worker to act next.</p><p>Each worker will perform a task and respond with their results and status.</p><p>When finished, respond with FINISH.</p><p>Select strategically to minimize the number of steps taken.</p>`],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"]
]);

// Supervisor execution
async function runSupervisor(input: string, chatHistory: any[] = []): Promise<SupervisorOutput> {
  const outputParser = StructuredOutputParser.fromZodSchema(supervisorOutputSchema);
  
  const chain = supervisorPrompt
    .pipe(supervisorModel)
    .pipe(outputParser);
  
  const result = await chain.invoke({
    input,
    chat_history: chatHistory
  });
  
  // Update flow state
  if (result.next) flowState.next = result.next;
  if (result.instructions) flowState.instruction = result.instructions;
  
  return result;
}
// Main workflow orchestration
async function runSoftwareTeamWorkflow(initialInput: string): Promise<string> {
  console.log('Starting Software Team workflow...');
  
  let currentInput = initialInput;
  let iteration = 0;
  const maxIterations = 10;
  const conversationHistory: any[] = [];
  
  while (iteration < maxIterations) {
    iteration++;
    console.log(`\nIteration ${iteration}`);
    
    // Run supervisor to determine next action
    const decision = await runSupervisor(currentInput, conversationHistory);
    console.log('Supervisor decision:', decision);
    
    // Update conversation history
    conversationHistory.push({
      role: 'human',
      content: currentInput
    });
    conversationHistory.push({
      role: 'assistant',
      content: `Next: ${decision.next}, Instructions: ${decision.instructions}`
    });
    
    // Check if workflow should finish
    if (decision.next === 'FINISH') {
      console.log('Workflow completed');
      break;
    }
    
    // Route to appropriate agent
    let agentResult;
    switch (decision.next) {
      case 'ENGINEER':
        console.log('Routing to Software Engineer...');
        agentResult = await runSoftwareEngineer();
        break;
      case 'REVIEWER':
        console.log('Routing to Code Reviewer...');
        agentResult = await runCodeReviewer();
        break;
      case 'ANSWER':
        console.log('Routing to Generate Final Answer...');
        agentResult = await runGenerateFinalAnswer();
        break;
      default:
        console.log('Unknown agent:', decision.next);
        agentResult = { output: 'Unknown agent specified' };
    }
    
    // Update current input with agent output
    currentInput = agentResult.output || JSON.stringify(agentResult);
  }
  
  // Generate final result
  const finalResult = await runGenerateFinalAnswer(conversationHistory);
  return finalResult;
}

// Generate final answer (placeholder - implement based on your needs)
async function runGenerateFinalAnswer(history: any[]): Promise<string> {
  const summaryPrompt = `Given the above conversation history, provide a comprehensive summary of the work completed.`;
  
  const model = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7
  });
  
  const result = await model.invoke([
    ...history,
    { role: 'human', content: summaryPrompt }
  ]);
  
  return result.content.toString();
}

// Software Engineer Agent
async function runSoftwareEngineer(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "gpt-4.1",
    temperature: 0.9,
    streaming: true
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `<p>As a Senior Software Engineer, you are a pivotal part of our innovative development team. Your expertise and leadership drive the creation of robust, scalable software solutions that meet the needs of our diverse clientele. By applying best practices in software development, you ensure that our products are reliable, efficient, and maintainable.</p><p>Your goal is to lead the development of high-quality software solutions.</p><p>Utilize your deep technical knowledge and experience to architect, design, and implement software systems that address complex problems. Collaborate closely with other engineers, reviewers to ensure that the solutions you develop align with business objectives and user needs.</p><p>Design and implement new feature for the given task, ensuring it integrates seamlessly with existing systems and meets performance requirements. Use your understanding of {technology} to build this feature. Make sure to adhere to our coding standards and follow best practices.</p><p>The output should be a fully functional, well-documented feature that enhances our product's capabilities. Include detailed comments in the code. Pass the code to Quality Assurance Engineer for review if neccessary. Once ther review is good enough, produce a finalized version of the code.</p>`],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"]
  ]);
  
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history"
  });
  
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    prompt,
    tools: [] // Add tools if needed
  });
  
  const executor = new AgentExecutor({
    agent,
    tools: [],
    memory,
    verbose: true
  });
  
  const userInput = input || `<p><span class="variable" data-type="mention" data-id="$flow.state.instruction" data-label="$flow.state.instruction">${flowState.instruction}</span></p>`;
  
  const result = await executor.invoke({
    input: userInput
  });
  
  return result;
}

// Code Reviewer Agent
async function runCodeReviewer(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "deepseek-reasoner",
    temperature: 0.7,
    streaming: true,
    baseURL: "https://api.deepseek.com/v1"
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `<p>As a Quality Assurance Engineer, you are an integral part of our development team, ensuring that our software products are of the highest quality. Your meticulous attention to detail and expertise in testing methodologies are crucial in identifying defects and ensuring that our code meets the highest standards.</p><p>Your goal is to ensure the delivery of high-quality software through thorough code review and testing.</p><p>Review the codebase for the new feature designed and implemented by the Senior Software Engineer. Your expertise goes beyond mere code inspection; you are adept at ensuring that developments not only function as intended but also adhere to the team's coding standards, enhance maintainability, and seamlessly integrate with existing systems.</p><p>With a deep appreciation for collaborative development, you provide constructive feedback, guiding contributors towards best practices and fostering a culture of continuous improvement. Your meticulous approach to reviewing code, coupled with your ability to foresee potential issues and recommend proactive solutions, ensures the delivery of high-quality software that is robust, scalable, and aligned with the team's strategic goals.</p><p>Always pass back the review and feedback to Senior Software Engineer.</p>`],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"]
  ]);
  
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history"
  });
  
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    prompt,
    tools: [] // Add tools if needed
  });
  
  const executor = new AgentExecutor({
    agent,
    tools: [],
    memory,
    verbose: true
  });
  
  const userInput = input || `<p><span class="variable" data-type="mention" data-id="$flow.state.instruction" data-label="$flow.state.instruction">${flowState.instruction}</span></p>`;
  
  const result = await executor.invoke({
    input: userInput
  });
  
  return result;
}

// Generate Final Answer Agent
async function runGenerateFinalAnswer(input?: string): Promise<any> {
  const model = new ChatAnthropic({
    modelName: "claude-3-7-sonnet-latest",
    temperature: 0.9,
    streaming: true
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", ``],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"]
  ]);
  
  const memory = new BufferMemory({
    returnMessages: true,
    memoryKey: "chat_history"
  });
  
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    prompt,
    tools: [] // Add tools if needed
  });
  
  const executor = new AgentExecutor({
    agent,
    tools: [],
    memory,
    verbose: true
  });
  
  const userInput = input || `<p>Given the above conversations, generate a detail solution developed by the software engineer and code reviewer. Include full code, improvements and review.</p>`;
  
  const result = await executor.invoke({
    input: userInput
  });
  
  return result;
}

// Check next worker evaluation
function evaluateChecknextworker(): number {
  if (flowState.next === "SOFTWARE") {
    return 0; // SOFTWARE route
  } else   if (flowState.next === "REVIEWER") {
    return 1; // REVIEWER route
  }
  return 2; // Else route
}

// Export main function
export { runSoftwareTeamWorkflow };
