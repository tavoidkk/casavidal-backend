import OpenAI from 'openai';
import { env } from '../config/env';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': env.FRONTEND_URL || 'https://casavidal.com',
        'X-Title': 'CasaVidal',
      },
    });
  }
  return client;
}

export class AIService {

  static getModel(): string {
    return env.OPENROUTER_MODEL;
  }

  static async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const fullMessages: any[] = [];
    if (options?.systemPrompt) {
      fullMessages.push({ role: 'system', content: options.systemPrompt });
    }
    fullMessages.push(...messages);

    const response = await getClient().chat.completions.create({
      model: this.getModel(),
      messages: fullMessages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return response.choices[0]?.message?.content || '';
  }

  static async chatWithTools(
    messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string }>,
    tools: any[],
    options?: { systemPrompt?: string; temperature?: number }
  ) {
    const fullMessages: any[] = [];
    if (options?.systemPrompt) {
      fullMessages.push({ role: 'system', content: options.systemPrompt });
    }
    fullMessages.push(...messages);

    const response = await getClient().chat.completions.create({
      model: this.getModel(),
      messages: fullMessages,
      tools: tools,
      tool_choice: 'auto',
      temperature: options?.temperature ?? 0.3,
    });

    return response.choices[0]?.message;
  }

  static async chatStream(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    onToken: (token: string) => void,
    options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const fullMessages: any[] = [];
    if (options?.systemPrompt) {
      fullMessages.push({ role: 'system', content: options.systemPrompt });
    }
    fullMessages.push(...messages);

    const stream = await getClient().chat.completions.create({
      model: this.getModel(),
      messages: fullMessages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullContent += token;
        onToken(token);
      }
    }
    return fullContent;
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    const response = await getClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0]?.embedding || [];
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  }
}
