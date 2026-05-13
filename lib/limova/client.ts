const DEFAULT_BASE_URL = "https://api.new.limova.ai";

export type LimovaClientConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export type LimovaError = {
  status: number;
  message: string;
  body: unknown;
};

class LimovaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: LimovaClientConfig = {}) {
    const apiKey = config.apiKey ?? process.env.LIMOVA_API_KEY;
    if (!apiKey) {
      throw new Error("LIMOVA_API_KEY manquante (process.env ou config)");
    }
    this.apiKey = apiKey;
    this.baseUrl = (config.baseUrl ?? process.env.LIMOVA_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        ...(init.headers ?? {}),
      },
    });

    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // garde le texte brut si pas du JSON
    }

    if (!res.ok) {
      const err: LimovaError = {
        status: res.status,
        message: `Limova API ${res.status} ${res.statusText} sur ${path}`,
        body,
      };
      throw err;
    }

    return body as T;
  }

  get(path: string) {
    return this.request(path, { method: "GET" });
  }

  post<T>(path: string, body: T) {
    return this.request(path, { method: "POST", body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: T) {
    return this.request(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }
}

let singleton: LimovaClient | null = null;

export function getLimovaClient(): LimovaClient {
  if (!singleton) {
    singleton = new LimovaClient();
  }
  return singleton;
}

export { LimovaClient };
