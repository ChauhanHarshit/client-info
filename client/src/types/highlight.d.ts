// Highlight.io TypeScript declarations
declare global {
  interface Window {
    H: {
      init: (projectId: string, options?: {
        environment?: string;
        version?: string;
        networkRecording?: {
          enabled?: boolean;
          recordHeadersAndBody?: boolean;
          urlBlocklist?: string[];
        };
      }) => void;
      identify: (userId: string, userProperties?: Record<string, any>) => void;
    };
  }
}

export {};