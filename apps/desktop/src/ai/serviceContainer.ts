
import {
    AIProviderRouter,
    OpenAIProvider,
    AnthropicProvider,
    GeminiProvider,
    ContextService,
    WorkspaceService,
    QuickEditService,
    ChatService,
    AgentService
} from '@synapse/ai-core';
import { SynapseFileSystem } from './adapters';

class AICoreServices {
    private static instance: AICoreServices;

    public router: AIProviderRouter;
    public contextService: ContextService;
    public workspaceService: WorkspaceService;
    public quickEditService: QuickEditService;
    public chatService: ChatService;
    public agentService: AgentService;

    private constructor() {
        // Initialize Router
        this.router = new AIProviderRouter();
        this.router.registerProvider(new OpenAIProvider());
        this.router.registerProvider(new AnthropicProvider());
        this.router.registerProvider(new GeminiProvider());

        // Initialize Context
        const fs = new SynapseFileSystem();
        this.workspaceService = new WorkspaceService(fs);
        this.contextService = new ContextService(fs);

        // Initialize Operations
        this.quickEditService = new QuickEditService(this.router, this.contextService);
        this.chatService = new ChatService(this.router, this.contextService);
        this.agentService = new AgentService(this.router, this.workspaceService);

        console.log('[AICore] Services Initialized');
    }

    public static getInstance(): AICoreServices {
        if (!AICoreServices.instance) {
            AICoreServices.instance = new AICoreServices();
        }
        return AICoreServices.instance;
    }
}

export const aiCore = AICoreServices.getInstance();
