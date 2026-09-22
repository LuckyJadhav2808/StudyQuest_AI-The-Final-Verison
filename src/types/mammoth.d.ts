// Ambient TypeScript definitions for mammoth .docx parser
declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: 'warning' | 'error';
      message: string;
    }>;
  }

  export interface MammothOptions {
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer | ArrayBuffer;
    path?: string;
  }

  export function convertToHtml(
    input: MammothOptions,
    options?: Record<string, unknown>
  ): Promise<MammothResult>;

  export function extractRawText(
    input: MammothOptions
  ): Promise<MammothResult>;
}
