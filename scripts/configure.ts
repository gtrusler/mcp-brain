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

  // Determine installation type
  console.log('Installation Type:');
  console.log('1. Primary Installation (new Supabase project)');
  console.log('2. Secondary Installation (use existing Supabase project)\n');

  const installType = await prompt('Select installation type (1/2): ');

  if (installType === '1') {
    console.log('\nPrimary Installation');
    console.log('1. Create a new project at https://supabase.com if you haven\'t already');
    console.log('2. Get your credentials from Project Settings > API');
    console.log('3. Save these credentials for any secondary installations\n');
  } else if (installType === '2') {
    console.log('\nSecondary Installation');
    console.log('Use the Supabase credentials from your primary installation\n');
  } else {
    console.error('Invalid selection');
    process.exit(1);
  }

  console.log('Please enter your Supabase credentials:');
  const url = await prompt('Supabase URL: ');
  const key = await prompt('Supabase Key: ');

  if (!url || !key) {
    console.error('Both URL and Key are required');
    process.exit(1);
  }

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

    // Display restart instructions
    console.log('\nTo apply changes:');
    console.log('1. If VSCode is open:');
    console.log('   - Close all Claude conversations');
    console.log('   - Run "Developer: Reload Window" (Cmd/Ctrl + Shift + P, then type "reload")');
    console.log('\n2. If VSCode is closed:');
    console.log('   - Simply start VSCode and the new configuration will be loaded automatically');
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
