/**
 * Generated from Strategy Team Flowise AgentFlow
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
  research: string;
  analysis: string;
  strategy: string;
  report: string;
  answers: string;
}

// Initialize flow state
const flowState: FlowState = {
  next: "",
  instruction: "",
  research: "\"placeholder for returned research\"",
  analysis: "\"placeholder for analysis\"",
  strategy: "\"placeholder for strategy\"",
  report: "\"placeholder for complete report\"",
  answers: "{{output}}"
};


// Supervisor output schema
const supervisorOutputSchema = z.object({
  next: z.enum(["FINISH", "RESEARCHER", "ANALYST", "STRATEGIST", "REPORTER"]).describe("next worker to act"),
  instructions: z.string().describe("The specific instructions of the sub-task the next worker should accomplish."),
  reasoning: z.string().describe("The reason why next worker is tasked to do the job")
});

type SupervisorOutput = z.infer<typeof supervisorOutputSchema>;

// Supervisor configuration
const supervisorModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.9,
  streaming: true
});

const supervisorPrompt = ChatPromptTemplate.fromMessages([
  ["system", `<p>You are an AI Strategy generator team tasked with defining a comprehensive, well-researched strategy for implementing AI in your organization. You have four workers: a Researcher, an Analyst, a Strategist, and a Reporter.</p><p>The work process should follow this order:</p><ol><li><p>The Researcher begins by gathering relevant information and data about AI implementation strategies.</p></li><li><p>Next, the Analyst analyzes the research data to identify key themes and insights that will inform the strategy.</p></li><li><p>The Strategist then crafts the strategic approach based on the analysis, outlining the implementation plan and objectives.</p></li><li><p>Finally, the Reporter documents the strategy in a clear and organized manner, ensuring it is suitable for distribution within the organization. If the reporter needs more info from the user then it should ask and can be updated with the response without going through the rest of the team</p></li></ol><p>Each worker should provide their results and status at the end of their task. The process should be streamlined to minimize the number of steps taken.</p><h1>Output Format</h1><p>Each worker's response should be a structured summary, ideally in bullet points or short paragraphs, clearly indicating their results and status. The final report should be a cohesive document that includes all contributions from the team</p><h1>Examples</h1><p><strong>Example 1:</strong></p><ul><li><p><strong>Researcher Input:</strong> "Gathered recent studies on AI implementation frameworks in organizations."</p></li><li><p><strong>Researcher Output:</strong> "Identified three key frameworks: Technology Adoption Model, AI Maturity Model, and Change Management Approach."</p></li><li><p><strong>Status:</strong> "Research complete."</p></li></ul><p><strong>Example 2:</strong></p><ul><li><p><strong>Analyst Input:</strong> "Reviewed Researcher's findings for patterns."</p></li><li><p><strong>Analyst Output:</strong> "AI Maturity Model is most commonly referenced in successful AI implementations; also noted challenges in change management."</p></li><li><p><strong>Status:</strong> "Analysis complete."</p></li></ul><p><strong>Example 3:</strong></p><ul><li><p><strong>Strategist Input:</strong> "Developed the strategic plan based on the Analysts' insights."</p></li><li><p><strong>Strategist Output:</strong> "The strategy aims to adopt the AI Maturity Model while addressing change management challenges. Key objectives include training staff and establishing guidelines."</p></li><li><p><strong>Status:</strong> "Strategy drafted."</p></li></ul><p><strong>Example 4:</strong></p><ul><li><p><strong>Reporter Input:</strong> "Compiled the research, analysis, and strategy into a single document."</p></li><li><p><strong>Reporter Output:</strong> "Document includes an introduction, methodology, strategic plan, and conclusion."</p></li><li><p><strong>Status:</strong> "Documentation complete."</p></li></ul><p>(Each example should generally reflect the complexity and depth expected in real tasks, where detailed findings or plans could be longer and more sophisticated.)</p><h1>Notes</h1><ul><li><p>Ensure that all steps are documented in a way that allows for easy tracking of each worker’s contributions.</p></li><li><p>Maintain a collaborative approach, facilitating communication among workers as needed to enhance the quality of the strategy.</p></li></ul>`],
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
async function runStrategyTeamWorkflow(initialInput: string): Promise<string> {
  console.log('Starting Strategy Team workflow...');
  
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
      case 'RESEARCHER':
        console.log('Routing to Researcher...');
        agentResult = await runResearcher();
        break;
      case 'STRATEGIST':
        console.log('Routing to Strategist...');
        agentResult = await runStrategist();
        break;
      case 'ANALYST':
        console.log('Routing to Analyst...');
        agentResult = await runAnalyst();
        break;
      case '(4)':
        console.log('Routing to Reporter (4)...');
        agentResult = await runReporter(4)();
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

// Researcher Agent
async function runResearcher(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "gpt-4.1",
    temperature: 0.5,
    streaming: true
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `<p>As a Researcher, your role is to conduct an in-depth exploration of the client's industry landscape to gather critical insights that will inform the AI implementation strategy. Utilize perplexity search and advanced web search tools to collect information on the client's industry, the tools they currently use, and any external services or APIs they have mentioned. Your research is foundational for developing a tailored AI implementation roadmap.</p><p><strong>Your goal is to:</strong></p><ul><li><p>Collect comprehensive and accurate data to assess the client's current technological environment and industry trends.</p></li><li><p>Conduct a thorough web search on the client's industry, focusing on prevalent technologies and tools.</p></li><li><p>Pay special attention to any external services or APIs the client has mentioned.</p></li><li><p>Compile your findings into a detailed research document, ensuring the information is relevant, up-to-date, and sourced from verified sources.</p></li><li><p>Avoid assumptions and rely solely on verified sources.</p></li><li><p>Pass the research document to the Data Analyst for further processing.</p></li><li><p>Use perplexity search for any research required</p></li></ul>`],
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
  
  const userInput = input || ``;
  
  const result = await executor.invoke({
    input: userInput
  });
  
  return result;
}

// Strategist Agent
async function runStrategist(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "gpt-4.1",
    temperature: 0.5,
    streaming: true
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `<p>As the AI Strategist, your task is to synthesize the analysis provided by the Data Analyst into a comprehensive AI implementation strategy report. This report will guide the client in building a robust implementation roadmap.</p><p><strong>Your goal is to:</strong></p><ul><li><p>Provide a clear, actionable, and strategic roadmap that aligns with the client's objectives and industry trends.</p></li><li><p>Using the analyst document, create a detailed AI implementation strategy report.</p></li><li><p>Begin with a 1-page summary that encapsulates the key findings and recommendations.</p></li><li><p>Follow with a full report that expands on the analysis, integrating insights from the research document.</p></li><li><p>Ensure the report is well-structured, logical, and tailored to the client's needs.</p></li><li><p>When complete hand it off to the reporter agent for packaging and distribution</p></li></ul>`],
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

// Analyst Agent
async function runAnalyst(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "gpt-4.1",
    temperature: 0.5,
    streaming: true
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `<p>As a Data Analyst, your role is to transform raw research data into actionable insights. Utilize the SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis technique to evaluate the research document provided by the Industry Researcher. Additionally, apply the PRICE (Priority, Relevance, Impact, Complexity, Ease) framework to prioritize the most critical insights for the client's AI implementation strategy.</p><p><strong>Your goal is to:</strong></p><ul><li><p>Distill the research into a concise and strategic analysis that highlights key areas for AI integration.</p></li><li><p>Analyze the research document, identifying the strengths, weaknesses, opportunities, and threats related to AI implementation.</p></li><li><p>Use the PRICE framework to prioritize insights based on their strategic importance.</p></li><li><p>Compile your analysis into a structured document, focusing on the most relevant and actionable information.</p></li><li><p>Ensure clarity and precision in your analysis.</p></li><li><p>Pass the analyst document to the AI Strategist for report structuring.</p></li></ul><p><strong>Annotations:</strong></p><ul><li><p>Clarified the role and goals to ensure the analyst understands the importance of strategic prioritization.</p></li><li><p>Structured instructions into bullet points for clarity and ease of understanding.</p></li></ul>`],
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

// Reporter (4) Agent
async function runReporter(4)(input?: string): Promise<any> {
  const model = new ChatOpenAI({
    modelName: "gpt-4.1",
    temperature: 0.6,
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
  
  const userInput = input || `<p>Given the above conversations, generate a detailed report package that includes md files for the research, the analysis and the strategy.</p><p>At the top level client page - create a summary of the strategy along with a condensed 3-5 action items to get their implementation started</p><p>Create a new google doc for each client strategy, research and analysis </p><p>Convert the formatting from Markdown to Google Docs formatting with headers, sub headers, bullet points and block quotes used for legibility - make sure there are so that there is no markdown markup rendered in the document but retain the formatting styles</p><p>Please post to Slack #strategy channel when you are done with links to the reports on option and google.<br><br>Please also update the chat with these links and links to download the md files</p>`;
  
  const result = await executor.invoke({
    input: userInput
  });
  
  return result;
}

// Check next worker evaluation
function evaluateChecknextworker(): number {
  if (flowState.next === "RESEARCHER") {
    return 0; // RESEARCHER route
  } else   if (flowState.next === "ANALYST") {
    return 1; // ANALYST route
  } else   if (STRATEGIST === "{{ $flow.state.next }}") {
    return 2; // {{ $flow.state.next }} route
  } else   if (REPORTER === "{{ $flow.state.next }}") {
    return 3; // {{ $flow.state.next }} route
  }
  return 4; // Else route
}

// Export main function
export { runStrategyTeamWorkflow };
