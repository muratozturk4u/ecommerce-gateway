export interface IServiceConfig {
  name: string;
  url: string;
  pathPrefixes: string[];
}

export interface IServiceRegistry {
  resolve(path: string): IServiceConfig | null;
  getAllServices(): IServiceConfig[];
}
