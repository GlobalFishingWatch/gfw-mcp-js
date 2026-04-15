import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';

const CONFIG_DIR = path.join(os.homedir(), '.gfw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  token: string;
}

function readConfig(): Config | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return null;
  }
}

function writeConfig(config: Config): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

/**
 * Resolve the GFW API token with this priority:
 *   1. GFW_TOKEN env var (also accepts API_KEY for compat with the MCP server)
 *   2. ~/.gfw/config.json
 * Throws if no token is found.
 */
export function resolveToken(): string {
  const token =
    process.env.GFW_TOKEN ?? process.env.API_KEY ?? readConfig()?.token;
  if (!token) {
    throw new Error(
      'No GFW API token configured.\n' +
        '  Set the GFW_TOKEN env var, or run:  gfw auth login',
    );
  }
  return token;
}

export async function authLogin(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const token = await new Promise<string>((resolve) => {
    rl.question(
      'Get your token at: https://globalfishingwatch.org/our-apis/tokens\nEnter your GFW API token: ',
      (answer) => {
        rl.close();
        resolve(answer.trim());
      },
    );
  });

  if (!token) {
    console.error('Token cannot be empty.');
    process.exit(1);
  }

  writeConfig({ token });
  console.log(`Token saved to ${CONFIG_FILE}`);
}

export function authLogout(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
    console.log('Token removed.');
  } else {
    console.log('No token stored.');
  }
}

export function authStatus(): void {
  const envToken = process.env.GFW_TOKEN ?? process.env.API_KEY;
  if (envToken) {
    console.log(
      `Token source: env var (${process.env.GFW_TOKEN ? 'GFW_TOKEN' : 'API_KEY'})`,
    );
    return;
  }
  const config = readConfig();
  if (config?.token) {
    console.log(`Token source: ${CONFIG_FILE}`);
  } else {
    console.log('No token configured. Run: gfw auth login');
  }
}
