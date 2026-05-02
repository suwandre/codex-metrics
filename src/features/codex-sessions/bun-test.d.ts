declare module "bun:test" {
  type Matcher = {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
  };

  export function describe(name: string, testGroup: () => void): void;
  export function expect(actual: unknown): Matcher;
  export function test(name: string, testCase: () => Promise<void> | void): void;
}
