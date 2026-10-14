declare module 'gbk.js' {
  export function decode(input: number[] | Uint8Array): string;
  export function encode(input: string): number[];
  export const URI: any;
}
