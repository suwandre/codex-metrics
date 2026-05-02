declare module "node:fs/promises" {
  type Dirent = {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  };

  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}
