const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const runCopy = require('./copy-assets');

// 1. Initial copy to ensure src assets exist
console.log('[Dev Script] Running initial asset copy...');
runCopy();

// 2. Start Plasmo Dev
console.log('[Dev Script] Starting Plasmo Dev...');
const plasmo = spawn('npx', ['plasmo', 'dev'], { 
    stdio: 'inherit', 
    shell: true,
    cwd: path.join(__dirname, '..')
});

// 3. Watch for build directory creation/recreation
const buildDir = path.join(__dirname, '../build/chrome-mv3-dev');
const manifestPath = path.join(buildDir, 'manifest.json');

// Poll every 2 seconds
const checkInterval = setInterval(() => {
    if (fs.existsSync(manifestPath)) {
        // Build exists and likely finished initial build
        const buildAssetsDir = path.join(buildDir, 'assets/vditor/dist');
        const buildLocalesDir = path.join(buildDir, '_locales');
        
        // If assets or locales don't exist in build, copy them
        if (!fs.existsSync(buildAssetsDir) || !fs.existsSync(buildLocalesDir)) {
            console.log('[Dev Script] Build directory detected. Injecting assets and locales...');
            try {
                runCopy(); 
            } catch (e) {
                console.error('[Dev Script] Failed to inject assets:', e);
            }
        }
    }
}, 2000);

plasmo.on('close', (code) => {
    clearInterval(checkInterval);
    process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
    plasmo.kill();
    process.exit();
});
