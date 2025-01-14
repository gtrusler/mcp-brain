import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function configure() {
  console.log('MCP Brain Configuration\n');
  console.log('Please enter your Supabase credentials:');

  const url = await prompt('Supabase URL: ');
  const key = await prompt('Supabase Key: ');

  // Determine the correct settings file path based on OS
  let settingsPath: string;
  if (process.platform === 'darwin') {
    // macOS
    settingsPath = path.join(
      os.homedir(),
      'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'
    );
  } else if (process.platform === 'linux') {
    // Linux
    settingsPath = path.join(
      os.homedir(),
      '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'
    );
  } else if (process.platform === 'win32') {
    // Windows
    settingsPath = path.join(
      os.homedir(),
      'AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'
    );
  } else {
    console.error('Unsupported operating system');
    process.exit(1);
  }

  // Create settings directory if it doesn't exist
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // Read existing settings or create new ones
  let settings = { mcpServers: {} };
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.error('Error reading existing settings:', error);
      process.exit(1);
    }
  }

  // Add or update mcp-brain configuration
  settings.mcpServers = {
    ...settings.mcpServers,
    'mcp-brain': {
      command: 'node',
      args: [path.join(process.cwd(), 'dist/index.js')],
      env: {
        SUPABASE_URL: url,
        SUPABASE_KEY: key,
        DEBUG: 'false'
      }
    }
  };

  // Write settings file
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('\nConfiguration saved successfully!');
    console.log(`Settings file: ${settingsPath}`);
  } catch (error) {
    console.error('Error saving settings:', error);
    process.exit(1);
  }

  rl.close();
}

configure().catch(error => {
  console.error('Configuration failed:', error);
  process.exit(1);
});
