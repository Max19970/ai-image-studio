export interface EnvReader {
  get(name: string, fallback?: string): string;
}

export const processEnvReader: EnvReader = {
  get(name, fallback = '') {
    return process.env[name] || fallback;
  }
};

export function env(name: string, fallback = ''): string {
  return processEnvReader.get(name, fallback);
}
