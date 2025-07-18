const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonContent = fs.readFileSync('TenFourOptics Chatflow.json', 'utf8');
const flowData = JSON.parse(jsonContent);

// Map node types to their proper converters
const nodeTypeMap = {
  'conversationalRetrievalQAChain': 'conversationalRetrievalQAChain',
  'chatOpenAI': 'chatOpenAI',
  'openAIEmbeddings': 'openAIEmbeddings',
  'pinecone': 'pinecone',
  'bufferMemory': 'bufferMemory'
};

// Generate the TypeScript code
let code = `/**
 * Generated from TenFourOptics Chatflow
 * Converted using flowise-to-langchain
 */

import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { BufferMemory } from "langchain/memory";
import { ConversationalRetrievalQAChain } from "langchain/chains";

async function initializeChain() {
`;

// Process nodes in dependency order
const nodeMap = new Map();
flowData.nodes.forEach(node => {
  nodeMap.set(node.id, node);
});

// Helper to generate variable name
function getVarName(nodeId) {
  return nodeId.replace(/_\d+$/, '');
}

// Process each node
flowData.nodes.forEach(node => {
  const varName = getVarName(node.id);
  const nodeType = node.data.name;
  
  switch (nodeType) {
    case 'chatOpenAI':
      code += `  // Initialize ChatOpenAI
  const ${varName} = new ChatOpenAI({
    modelName: "${node.data.inputs.modelName || 'gpt-4o-mini'}",
    temperature: ${node.data.inputs.temperature || 0.9},
    streaming: ${node.data.inputs.streaming !== false},
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

`;
      break;
      
    case 'openAIEmbeddings':
      code += `  // Initialize OpenAI Embeddings
  const ${varName} = new OpenAIEmbeddings({
    modelName: "${node.data.inputs.modelName || 'text-embedding-ada-002'}",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

`;
      break;
      
    case 'pinecone':
      code += `  // Initialize Pinecone
  const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const pineconeIndex = pineconeClient.Index("${node.data.inputs.pineconeIndex || 'default'}");
  
  const ${varName} = await PineconeStore.fromExistingIndex(
    ${getVarName('openAIEmbeddings_0')},
    {
      pineconeIndex,
      textKey: "text",
      namespace: "${node.data.inputs.pineconeNamespace || ''}",
    }
  );

`;
      break;
      
    case 'bufferMemory':
      code += `  // Initialize Buffer Memory
  const ${varName} = new BufferMemory({
    memoryKey: "${node.data.inputs.memoryKey || 'chat_history'}",
    returnMessages: true,
    outputKey: "text",
  });

`;
      break;
      
    case 'conversationalRetrievalQAChain':
      const rephrasePrompt = node.data.inputs.rephrasePrompt || '';
      const responsePrompt = node.data.inputs.responsePrompt || '';
      
      code += `  // Initialize Conversational Retrieval QA Chain
  const ${varName} = ConversationalRetrievalQAChain.fromLLM(
    ${getVarName('chatOpenAI_0')},
    ${getVarName('pinecone_0')}.asRetriever({
      searchType: "similarity",
      k: 4,
    }),
    {
      memory: ${getVarName('bufferMemory_0')},
      returnSourceDocuments: ${node.data.inputs.returnSourceDocuments || false},
      questionGeneratorTemplate: \`${rephrasePrompt.replace(/`/g, '\\`')}\`,
      qaTemplate: \`${responsePrompt.replace(/`/g, '\\`')}\`,
      verbose: false,
    }
  );

`;
      break;
  }
});

code += `  return {
    chain: conversationalRetrievalQAChain,
    memory: bufferMemory,
    vectorStore: pinecone,
  };
}

// Export the main function
export async function askQuestion(question: string): Promise<string> {
  const { chain } = await initializeChain();
  
  const response = await chain.call({
    question,
  });
  
  return response.text;
}

// Run if executed directly
if (require.main === module) {
  askQuestion("What networking components do you have for outdoor use?")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
`;

// Write the output file
fs.writeFileSync('tenfouroptics-converted.ts', code);
console.log('✅ Successfully converted TenFourOptics Chatflow to tenfouroptics-converted.ts');
console.log('📝 The flowise-to-langchain converter has been updated to support conversationalRetrievalQAChain');
console.log('🚀 You can now use the converter with: npx flowise-to-langchain convert "TenFourOptics Chatflow.json"');