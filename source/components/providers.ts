export type ProviderConfig = {
  name: string;
  envVar: string;
  baseUrl: string;
  models: Array<{
    model: string;
    nickname: string;
    context: number;
  }>;
  testModel: string;
};

export const PROVIDERS = {
  synthetic: {
    name: "Synthetic",
    envVar: "SYNTHETIC_API_KEY",
    baseUrl: "https://api.synthetic.new/v1",
    models: [
      {
        model: "hf:moonshotai/Kimi-K2-Instruct",
        nickname: "Kimi K2",
        context: 64 * 1024,
      },
      {
        model: "hf:Qwen/Qwen3-235B-A22B-Thinking-2507",
        nickname: "Qwen3 Thinking-2507",
        context: 64 * 1024,
      },
      {
        model: "hf:deepseek-ai/DeepSeek-R1-0528",
        nickname: "DeepSeek R1-0528",
        context: 64 * 1024,
      },
    ],
    testModel: "hf:moonshotai/Kimi-K2-Instruct",
  } satisfies ProviderConfig,

  openai: {
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { model: "gpt-4.1-2025-04-14", nickname: "GPT-4.1", context: 64 * 1024 },
      { model: "o3-2025-04-16", nickname: "o3", context: 128 * 1024 },
    ],
    testModel: "gpt-4.1-latest",
  } satisfies ProviderConfig,

  moonshot: {
    name: "Moonshot",
    envVar: "MOONSHOT_API_KEY",
    baseUrl: "https://api.moonshot.ai/v1",
    models: [
      { model: "kimi-k2-0711-preview", nickname: "Kimi K2", context: 64 * 1024 },
    ],
    testModel: "kimi-k2-0711-preview",
  } satisfies ProviderConfig,

  grok: {
    name: "xAI",
    envVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { model: "grok-4-latest", nickname: "Grok 4", context: 64 * 1024 },
    ],
    testModel: "grok-4-latest",
  } satisfies ProviderConfig,
};

export type ProviderKey = keyof typeof PROVIDERS;

export const SYNTHETIC_PROVIDER = PROVIDERS.synthetic;

export function keyFromName(name: string): keyof typeof PROVIDERS {
  for(const [key, value] of Object.entries(PROVIDERS)) {
    if(value.name === name) return key as keyof typeof PROVIDERS;
  }
  throw new Error(`No provider named ${name} found`);
}
