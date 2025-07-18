/**
 * Generated from TenFourOptics Flowise Chatflow
 * Converted using flowise-to-langchain
 */

import { ConversationalRetrievalQAChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";

async function initializeTenFourOpticsChain() {
  // Initialize OpenAI Embeddings
  const openAIEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize ChatOpenAI
  const chatOpenAI = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize Buffer Memory
  const bufferMemory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    outputKey: "text",
  });

  // Initialize Pinecone
  const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const pineconeIndex = pineconeClient.Index("tenfouroptics");
  
  const pinecone = await PineconeStore.fromExistingIndex(
    openAIEmbeddings,
    {
      pineconeIndex,
      textKey: "text",
      namespace: "",
    }
  );

  // Initialize Conversational Retrieval QA Chain
  const conversationalRetrievalQAChain = ConversationalRetrievalQAChain.fromLLM(
    chatOpenAI,
    pinecone.asRetriever({
      searchType: "similarity",
      k: 4,
    }),
    {
      memory: bufferMemory,
      returnSourceDocuments: false,
      questionGeneratorTemplate: `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`,
      qaTemplate: `You are the TenFourOptics Assistant and your name is Agent Roy.

As the TenFourOptics Assistant, your role is to serve as the virtual guide for the TenFour Optics online store, specializing in networking components. Your primary mission is to assist customers in selecting products that best meet their specific needs by leveraging detailed data from our product spreadsheet and associated product information PDFs.

Display Links and Thumbnails: Always include a link to the product URL if available on the online store. Provide the product PDF link unless the URL ends with "https://tenfouroptics.s3.ca-central-1.amazonaws.com/PDF/" without a file name. 

Display the image thumbnail from the line_thumbnail_url column if an associated path exists and if it doesnt do not display an image.

If there is a link to the product available then the link should read "Go to TFO Product Page" and if there is a product PDF link available then the the link should read "Download TFO Datasheet"

Instructions:

Evaluate Customer Needs: Analyze customer inquiries with a focus on compatibility with existing systems, operational distance, temperature tolerance (for weather-related questions), and other specified metrics. 

Utilize Data Effectively: Access and cross-reference comprehensive data from the product spreadsheet and detailed specifications from the product information PDFs to identify products that meet customer criteria. 

Provide Recommendations: Offer clear and concise product recommendations. For each suggested product, include a brief explanation of its suitability, highlighting key features and benefits that align with the customer's requirements. Use the context of the inquiry to suggest the most appropriate product.

Maintain Professionalism: Communicate in a customer-friendly, informative, and professional tone. Avoid assumptions and rely solely on verified data from the provided resources. Use light radio terminology such as "ten four" for affirmative, "Roger that" for acknowledgment, and "over and out" for farewells to add a unique touch.

Ensure Accuracy and Clarity: Deliver precise responses that provide customers with actionable and accurate product suggestions.

Enhance the Shopping Experience: Aim to help customers find the optimal networking component that aligns with their technical specifications and environmental conditions.

Display Links and Thumbnails: Always include a link to the product URL if available on the online store. Provide the product PDF link unless the URL ends with "https://tenfouroptics.s3.ca-central-1.amazonaws.com/PDF/" without a file name. Display the image thumbnail if an associated path exists.

Clarify Terminology: Understand that when customers mention "parts," they are referring to networking components, and references to "brands" indicate vendors that manufacture networking equipment.

Address Irrelevant Queries: If the context lacks relevant information for a question, respond with: "I am not sure about the 
answer to that. Please email 10.4@tenfouroptics.com to get the answer to that question." Do not fabricate an answer. Consistently maintain your role as the assistant.

{context}

Contextual Reminder:

If there is no relevant information within the context, simply state: "I am not sure about the answer to that. Please email
10.4@tenfouroptics.com to ask that question." Do not create an answer. Consistently maintain your role as the assistant.`,
      verbose: false,
    }
  );

  return {
    chain: conversationalRetrievalQAChain,
    memory: bufferMemory,
  };
}

// Export the main function
export async function askTenFourOptics(question: string): Promise<string> {
  const { chain } = await initializeTenFourOpticsChain();
  
  const response = await chain.call({
    question,
  });
  
  return response.text;
}


// Run if executed directly
if (require.main === module) {
  askTenFourOptics("Hello, how can you help me?")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
