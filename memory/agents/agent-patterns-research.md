# LangChain Agent Patterns Research
## OpenAI Functions Agent and Conversational Agent Implementation

### Research Summary
This document outlines the correct imports, parameters, and initialization patterns for LangChain agents based on 2024 documentation, specifically focusing on OpenAI Functions Agent and Conversational Agent patterns.

---

## 1. OpenAI Functions Agent

### Status: Active (2024)
The OpenAI Functions Agent uses the older OpenAI function calling API and is still supported but being superseded by the Tools Agent.

### Correct Imports (2024)
```typescript
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { ChatOpenAI } from "@langchain/openai";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
```

### Dependencies
- `langchain/agents` - Core agent functionality
- `langchain/hub` - For pulling standard prompts
- `@langchain/openai` - OpenAI model integration
- `@langchain/core/prompts` - Prompt templates
- `@langchain/core/messages` - Chat message types

### Initialization Pattern
```typescript
// 1. Define tools array
const tools = [
  // Tool instances go here
];

// 2. Get standard prompt from hub
const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");

// 3. Initialize LLM
const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo-1106",
  temperature: 0,
});

// 4. Create agent
const agent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt,
});

// 5. Create executor
const agentExecutor = new AgentExecutor({
  agent,
  tools,
});
```

### Configuration Parameters
- `llm`: ChatOpenAI instance
- `tools`: Array of tool instances
- `prompt`: ChatPromptTemplate (usually from hub)
- `maxIterations`: Maximum agent iterations (optional)
- `verbose`: Enable verbose logging (optional)

---

## 2. OpenAI Tools Agent (Recommended)

### Status: Recommended (2024)
The OpenAI Tools Agent uses the newer OpenAI tools API and is preferred over the Functions Agent.

### Correct Imports (2024)
```typescript
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import { ChatOpenAI } from "@langchain/openai";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
```

### Initialization Pattern
```typescript
// 1. Define tools array
const tools = [
  // Tool instances go here
];

// 2. Get standard prompt from hub
const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-tools-agent");

// 3. Initialize LLM
const llm = new ChatOpenAI({
  model: "gpt-3.5-turbo-1106", // or gpt-4
  temperature: 0,
});

// 4. Create agent
const agent = await createOpenAIToolsAgent({
  llm,
  tools,
  prompt,
});

// 5. Create executor
const agentExecutor = new AgentExecutor({
  agent,
  tools,
});
```

### Key Differences from Functions Agent
- Uses newer OpenAI tools API
- Better support for returning multiple tools at once
- Fewer roundtrips for complex questions
- Different prompt template from hub

---

## 3. Conversational Agent

### Status: DEPRECATED (2024)
The traditional ConversationalAgent is deprecated since LangChain v0.1.0.

### Replacement: createReactAgent
```typescript
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import type { PromptTemplate } from "@langchain/core/prompts";
import { OpenAI } from "@langchain/openai";

// Traditional React Agent
const prompt = await pull<PromptTemplate>("hwchase17/react");
const llm = new OpenAI({ temperature: 0 });
const agent = await createReactAgent({ llm, tools, prompt });
```

### Modern Replacement: LangGraph createReactAgent
```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// Modern LangGraph approach
const agentModel = new ChatOpenAI({ temperature: 0 });
const agentCheckpointer = new MemorySaver();

const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});
```

---

## 4. Agent Configuration Requirements

### Essential Parameters
1. **llm**: Language model instance (ChatOpenAI, OpenAI, etc.)
2. **tools**: Array of tool instances 
3. **prompt**: Prompt template (usually from hub)

### Optional Parameters
- `maxIterations`: Maximum execution steps (default: 15)
- `verbose`: Enable detailed logging (default: false)
- `memory`: Conversation memory instance
- `checkpointSaver`: State persistence (LangGraph only)

### Standard Hub Prompts
- `hwchase17/openai-functions-agent` - For OpenAI Functions Agent
- `hwchase17/openai-tools-agent` - For OpenAI Tools Agent
- `hwchase17/react` - For React Agent

---

## 5. Chat History Support

### Implementation Pattern
```typescript
import { AIMessage, HumanMessage } from "@langchain/core/messages";

const result = await agentExecutor.invoke({
  input: "what's my name?",
  chat_history: [
    new HumanMessage("hi! my name is cob"),
    new AIMessage("Hello Cob! How can I assist you today?"),
  ],
});
```

---

## 6. Flowise-to-LangChain Converter Requirements

### For OpenAI Functions Agent Node
```typescript
// Required imports
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";

// Configuration parameters from Flowise
const maxIterations = node.parameters.find(p => p.name === 'maxIterations')?.value || 15;
const verbose = node.parameters.find(p => p.name === 'verbose')?.value || false;
const agentType = node.parameters.find(p => p.name === 'agentType')?.value || 'openai-functions';

// Initialization code
const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-functions-agent");
const agent = await createOpenAIFunctionsAgent({
  llm: ${llmVariable},
  tools: ${toolsArray},
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools: ${toolsArray},
  maxIterations: ${maxIterations},
  verbose: ${verbose},
});
```

### For OpenAI Tools Agent Node
```typescript
// Similar pattern but with:
const prompt = await pull<ChatPromptTemplate>("hwchase17/openai-tools-agent");
const agent = await createOpenAIToolsAgent({
  llm: ${llmVariable},
  tools: ${toolsArray},
  prompt,
});
```

### For Conversational Agent Node (Legacy)
```typescript
// Should warn about deprecation and suggest React Agent
const prompt = await pull<PromptTemplate>("hwchase17/react");
const agent = await createReactAgent({
  llm: ${llmVariable},
  tools: ${toolsArray},
  prompt,
});
```

---

## 7. Dependencies for package.json

### Required Dependencies
```json
{
  "dependencies": {
    "langchain": "^0.2.17",
    "@langchain/core": "^0.2.30",
    "@langchain/openai": "^0.2.7",
    "@langchain/community": "^0.2.31"
  }
}
```

### Optional Dependencies
- `@langchain/langgraph`: "^0.1.0" (for modern agents)
- `@langchain/anthropic`: "^0.2.0" (for Anthropic models)

---

## 8. Error Handling and Validation

### Connection Validation
- **LLM Connection**: Required for all agents
- **Tools Connection**: At least one tool required
- **Memory Connection**: Optional for conversation persistence

### Parameter Validation
- `maxIterations`: Must be positive integer (1-50)
- `temperature`: Must be 0-2 for OpenAI models
- `model`: Must be valid OpenAI model name

---

## 9. Best Practices (2024)

1. **Prefer Tools Agent over Functions Agent** for new implementations
2. **Use LangGraph createReactAgent** for complex workflows
3. **Always include error handling** for agent execution
4. **Validate tool connections** before agent creation
5. **Use hub prompts** unless custom prompts are required
6. **Enable verbose logging** during development
7. **Implement proper chat history** for conversational agents

---

## 10. Migration Notes

### From Flowise AgentExecutor
- Map `agentType` parameter to appropriate create function
- Convert tool connections to tools array
- Handle memory connections appropriately
- Preserve maxIterations and verbose settings

### From Legacy Conversational Agent
- Replace with createReactAgent or LangGraph agent
- Update imports from deprecated paths
- Migrate to modern prompt templates
- Add deprecation warnings in generated code

---

*Research completed: 2025-07-15*
*Source: LangChain.js documentation v0.2.17*