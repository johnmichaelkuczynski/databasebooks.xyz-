
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ApiKeyStore {
  keys: {
    openai: string;
    anthropic: string;
    grok: string;
    perplexity: string;
    deepseek: string;
  };
  setKey: (provider: keyof ApiKeyStore["keys"], key: string) => void;
}

export const useApiKeys = create<ApiKeyStore>()(
  persist(
    (set) => ({
      keys: {
        openai: "",
        anthropic: "",
        grok: "",
        perplexity: "",
        deepseek: "",
      },
      setKey: (provider, key) =>
        set((state) => ({
          keys: { ...state.keys, [provider]: key },
        })),
    }),
    {
      name: "llm-api-keys",
    }
  )
);
