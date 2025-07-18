# Flowise to LangChain Converter - Production Ready 🚀

A comprehensive, production-ready TypeScript system that converts Flowise visual workflows and AgentFlow multiagent teams into executable LangChain code with full observability, monitoring, and deployment support.

## 🎯 Quick Start

```bash
# Development installation
git clone https://github.com/yourusername/flowise-to-langchain.git
cd flowise-to-langchain
npm install && npm run build

# Convert Flowise export to LangChain TypeScript
npm run start -- convert my-flow.json output

# Convert to Python with monitoring
npm run start -- convert my-flow.json output --target python --with-monitoring

# Convert with Langfuse observability
npm run start -- convert flow.json output --with-langfuse

# Deploy to production
./scripts/deploy-production.sh production docker

# Use standalone converters for quick conversions
node convert-all-chatflows.cjs    # Convert traditional chatflows
node convert-all-agentflows.cjs   # Convert multi-agent workflows
```

## 🚀 Production Features (v2.0.0)

### 🏗️ **Complete Conversion System**
- **100+ Node Types** across all Flowise categories with production patterns (including ConversationalRetrievalQAChain and DocumentStoreVS)
- **AgentFlow v2.0 Support**: Full multiagent workflow conversion
- **Multi-Language**: TypeScript and Python LangChain code generation
- **Type Safety**: Fully typed with comprehensive error handling

### 🔍 **Enterprise Observability**
- **Langfuse Integration**: Prompt versioning, execution tracing, and evaluation
- **Performance Monitoring**: Real-time metrics with bottleneck analysis
- **Error Tracking**: Structured error handling with recovery strategies
- **Resource Monitoring**: CPU, memory, and network usage tracking

### 🌐 **Production Deployment**
- **Docker & Kubernetes**: Complete containerization support
- **Cloud Ready**: AWS, GCP, Azure deployment scripts
- **Load Balancing**: Production-grade scaling and distribution
- **Health Checks**: Comprehensive monitoring and alerting

### 🤖 **Advanced Multiagent Support**
- **7 Real-world Examples**: Complete industry-specific workflows
- **Team Coordination**: Hierarchical and mesh coordination patterns
- **Performance Optimization**: Optimized multiagent execution
- **Specialized Roles**: Customer support, development, finance, healthcare teams

### 🛠️ **Enhanced Developer Experience**
- **Interactive Web Interface**: Next.js 14 with real-time monitoring
- **Professional CLI**: Convert, validate, test, watch, batch, and run commands
- **Package Distribution**: Complete release packaging with validation
- **Integration Tests**: Comprehensive test suites for all components

## 📁 Project Structure

```
flowise-langchain/
├── flowise-to-langchain/     # Main converter package (production ready)
│   ├── src/                  # TypeScript source (98+ converters)
│   │   ├── converters/       # Node type converters
│   │   ├── emitters/         # Code generation (TypeScript/Python)
│   │   ├── utils/            # Error handling, logging, monitoring
│   │   └── registry/         # Converter registry
│   ├── dist/                 # Compiled JavaScript & types
│   ├── bin/                  # CLI executables
│   ├── examples/             # 7 real-world multiagent examples
│   ├── docs/                 # Comprehensive documentation
│   └── tests/                # Integration & unit tests
├── tester-bot-frontend/      # Next.js 14 interface with monitoring
│   ├── src/                  # React components & hooks
│   │   ├── components/       # UI components with shadcn/ui
│   │   ├── lib/              # Langfuse integration
│   │   └── hooks/            # React hooks for tracing
│   └── public/               # Static assets
├── scripts/                  # Production deployment scripts
│   ├── deploy-production.sh  # Docker, PM2, cloud deployment
│   └── package-release.js    # Release packaging
├── docs/                     # Repository documentation  
├── coordination/             # Claude Flow coordination patterns
└── memory/                   # Persistent agent memory
```

📖 **Detailed Guide**: See [./flowise-to-langchain/README.md](./flowise-to-langchain/README.md) for comprehensive documentation.

## 🔍 Observability & Monitoring

### Langfuse Integration
```bash
# Environment setup
export LANGFUSE_PUBLIC_KEY=your_public_key
export LANGFUSE_SECRET_KEY=your_secret_key

# Convert with Langfuse tracking
npm run start -- convert flow.json output --with-langfuse

# View traces in web interface
open http://localhost:3000/langfuse
```

### Performance Monitoring
```typescript
// Generated code with monitoring
import { performanceMonitor } from './monitoring/performance-monitor';

export async function runFlow(input: string): Promise<string> {
  const tracker = performanceMonitor.track('workflow.execution');
  
  try {
    const result = await agent.call({ input });
    tracker.measure('execution_time');
    return result;
  } finally {
    const snapshot = tracker.end();
    performanceMonitor.recordSnapshot(snapshot);
  }
}
```

## 🤖 Multiagent Examples

### Real-world Team Workflows
```bash
# Customer Support Team
npm run start -- convert examples/multiagent/customer-support/flowise/customer-support-agentflow.json output

# Software Development Team  
npm run start -- convert examples/multiagent/software-development/flowise/software-development-agentflow.json output

# Financial Analysis Team
npm run start -- convert examples/multiagent/financial-analysis/flowise/financial-analysis-agentflow.json output
```

### Generated Multiagent Code
```typescript
// Production-ready multiagent coordination
import { SupervisorAgent, WorkerAgent } from './agents';
import { performanceMonitor } from './monitoring';

export class CustomerSupportTeam {
  private supervisor: SupervisorAgent;
  private workers: WorkerAgent[];

  async processInquiry(inquiry: string): Promise<string> {
    const tracker = performanceMonitor.track('team.inquiry');
    
    // Classify → Route → Respond → Escalate if needed
    const classification = await this.workers[0].classify(inquiry);
    const response = await this.supervisor.delegate(inquiry, classification);
    
    tracker.end();
    return response;
  }
}
```

## 🚀 Production Deployment

### Docker Deployment
```bash
# Production deployment with monitoring
./scripts/deploy-production.sh production docker

# Services included:
# - API service with health checks
# - Frontend with real-time monitoring
# - Redis cache for performance
# - Prometheus metrics
# - Grafana dashboards
```

### Health Monitoring
```bash
# Health check endpoints
curl http://localhost:8080/health          # API health
curl http://localhost:3000/api/health      # Frontend health
curl http://localhost:8080/metrics         # Prometheus metrics

# Access dashboards
open http://localhost:3000/monitoring      # Performance dashboard
open http://localhost:3001/grafana         # Grafana dashboard
```

## 📊 Supported Node Types (98+)

### Language Models & Agents
- ✅ **LLM Providers**: OpenAI, Anthropic, Google, Cohere, HuggingFace, Azure
- ✅ **Agent Types**: Supervisor, Worker, Coordinator, Specialist teams
- ✅ **Memory Systems**: Buffer, Window, Summary, Vector Store, Persistent

### Advanced Workflows  
- ✅ **Multiagent Teams**: Customer Support, Development, Finance, Healthcare
- ✅ **RAG Chains**: Retrieval Augmented Generation patterns
- ✅ **Function Calling**: Enhanced function calling with monitoring
- ✅ **Streaming**: Real-time response capabilities

### Production Features
- ✅ **Error Handling**: Structured errors with recovery strategies
- ✅ **Performance**: Monitoring, optimization, bottleneck analysis
- ✅ **Observability**: Langfuse integration with tracing and evaluation
- ✅ **Deployment**: Docker, Kubernetes, cloud deployment support

## 📈 Development Status

- **Version**: 2.0.0 Production Ready ✅
- **CLI**: ✅ Full-featured with all commands
- **TypeScript**: ✅ Production-ready with monitoring
- **Python**: ✅ Complete async/await support
- **Testing**: ✅ Comprehensive integration tests
- **Documentation**: ✅ Complete with deployment guides
- **Observability**: ✅ Langfuse integration
- **Deployment**: ✅ Docker, Kubernetes, cloud ready

## 🚀 Latest Features (v2.0.0)

### ✅ **Production Ready**
- Complete Docker, Kubernetes, and cloud deployment support
- Comprehensive error handling with recovery strategies
- Real-time performance monitoring with optimization suggestions
- Integration tests for all components and workflows
- Production-ready security configuration

### ✅ **Enhanced Observability**
- Langfuse integration with prompt versioning and evaluation
- Performance dashboard with real-time metrics
- Structured error reporting and recovery
- Resource monitoring (CPU, memory, network)

### ✅ **Advanced Multiagent Support**
- 7 real-world multiagent workflow examples
- Enhanced team coordination patterns
- Performance-optimized multiagent execution
- Specialized teams for different industries

### ✅ **Expanded Language Support**
- Complete Python LangChain code generation
- Enhanced TypeScript with monitoring integration
- Modern async/await patterns in both languages

## 🤝 Contributing

Priority areas for contributions:
1. **Additional Node Converters**: Implement more specialized Flowise node types
2. **Enhanced Monitoring**: Advanced monitoring and alerting features
3. **Performance Optimization**: Code optimization and best practices
4. **Documentation**: More examples and tutorials
5. **Testing**: Expand test coverage and scenarios

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- **Original Creator**: Gregg Coppen <gregg@iaminawe.com>
- **Claude Flow Development Team**: Enhanced multiagent and production features
- **Contributors**: All community contributors and testers
- **Special Thanks**: Claude Code for development assistance

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/flowise-to-langchain/issues)
- **Documentation**: [./flowise-to-langchain/README.md](./flowise-to-langchain/README.md) for comprehensive guides
- **Community**: Join discussions in the Issues section
- **Enterprise Support**: Contact for production deployment assistance

---

**Status**: Production Ready ✅ | **Version**: 2.0.0 | **Node Coverage**: 98+ Types | **Languages**: TypeScript + Python | **Multiagent**: 7 Real-world Examples | **Observability**: Langfuse Integration | **Deployment**: Docker + Kubernetes Ready

This comprehensive, production-ready toolkit successfully converts Flowise visual workflows and AgentFlow multiagent teams into executable LangChain code with full observability, monitoring, error handling, and deployment support for both TypeScript and Python environments.
