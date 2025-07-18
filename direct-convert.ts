import fs from 'fs';
import path from 'path';

// Read the JSON
const jsonContent = fs.readFileSync('tenfouroptics-modified.json', 'utf8');
const flowData = JSON.parse(jsonContent);

// Generate TypeScript code based on the Flowise nodes
const imports: string[] = [];
const code: string[] = [];

// Process nodes
for (const node of flowData.nodes) {
  const nodeType = node.data.name;
  const nodeId = node.id;
  const variableName = nodeId.replace(/_\d+$/, '');
  
  switch (nodeType) {
    case 'chatOpenAI':
      imports.push('import { ChatOpenAI } from "@langchain/openai";');
      const temperature = node.data.inputs.temperature || 0.9;
      const modelName = node.data.inputs.modelName || 'gpt-4o-mini';
      const streaming = node.data.inputs.streaming !== false;
      
      code.push(`const ${variableName} = new ChatOpenAI({
  modelName: "${modelName}",
  temperature: ${temperature},
  streaming: ${streaming},
  openAIApiKey: process.env.OPENAI_API_KEY,
});`);
      break;
      
    case 'openAIEmbeddings':
      imports.push('import { OpenAIEmbeddings } from "@langchain/openai";');
      const embeddingModel = node.data.inputs.modelName || 'text-embedding-ada-002';
      
      code.push(`const ${variableName} = new OpenAIEmbeddings({
  modelName: "${embeddingModel}",
  openAIApiKey: process.env.OPENAI_API_KEY,
});`);
      break;
      
    case 'pinecone':
      imports.push('import { PineconeStore } from "@langchain/pinecone";');
      imports.push('import { Pinecone } from "@pinecone-database/pinecone";');
      const pineconeIndex = node.data.inputs.pineconeIndex || 'default';
      
      code.push(`// Initialize Pinecone
const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = pineconeClient.Index("${pineconeIndex}");

// Create vector store
const ${variableName} = await PineconeStore.fromExistingIndex(
  openAIEmbeddings,
  {
    pineconeIndex,
    textKey: "text",
    namespace: "",
  }
);`);
      break;
      
    case 'bufferMemory':
      imports.push('import { BufferMemory } from "langchain/memory";');
      const memoryKey = node.data.inputs.memoryKey || 'chat_history';
      
      code.push(`const ${variableName} = new BufferMemory({
  memoryKey: "${memoryKey}",
  returnMessages: true,
  outputKey: "text",
});`);
      break;
      
    case 'retrievalQAChain':
      imports.push('import { RetrievalQAChain } from "langchain/chains";');
      
      code.push(`const ${variableName} = RetrievalQAChain.fromLLM(
  chatOpenAI,
  pinecone.asRetriever({
    searchType: "similarity",
    k: 4,
  }),
  {
    returnSourceDocuments: false,
    verbose: false,
  }
);`);
      break;
  }
}

// Generate the final code
const finalCode = `/**
 * Generated from TenFourOptics Flowise Chatflow
 * This code implements a retrieval-based QA system using LangChain
 */

${[...new Set(imports)].join('\n')}

// Initialize environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

async function initializeChain() {
${code.map(line => '  ' + line).join('\n\n')}

  return {
    chain: retrievalQAChain,
    memory: bufferMemory,
    vectorStore: pinecone,
  };
}

// Example usage
export async function askQuestion(question: string): Promise<string> {
  const { chain } = await initializeChain();
  
  try {
    const response = await chain.call({
      query: question,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error processing question:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  askQuestion("What networking components do you have for outdoor use?")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
`;

// Write the generated code
fs.writeFileSync('tenfouroptics-converted.ts', finalCode);

console.log('Successfully generated tenfouroptics-converted.ts');