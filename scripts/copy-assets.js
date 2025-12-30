const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/vditor/dist');
const dest = path.join(__dirname, '../assets/vditor/dist');
const buildDestDev = path.join(__dirname, '../build/chrome-mv3-dev/assets/vditor/dist');
const buildDestProd = path.join(__dirname, '../build/chrome-mv3-prod/assets/vditor/dist');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('Initializing Vditor assets script...');

function runCopy() {
    console.log('Copying Vditor assets...');
    try {
        // Copy to source assets folder
        copyDir(src, dest);
        console.log('Copied to src assets');
    
        // Dynamically copy to all build targets in build/ folder
        const buildRoot = path.join(__dirname, '../build');
        if (fs.existsSync(buildRoot)) {
            const targets = fs.readdirSync(buildRoot, { withFileTypes: true });
            
            for (const target of targets) {
                if (target.isDirectory()) {
                    const targetPath = path.join(buildRoot, target.name);
                    
                    // Copy Vditor assets
                    const targetVditorDest = path.join(targetPath, 'assets/vditor/dist');
                    copyDir(src, targetVditorDest);
                    console.log(`Copied Vditor assets to ${target.name}`);

                    // Copy _locales
                    const localesSrc = path.join(__dirname, '../_locales');
                    const localesDest = path.join(targetPath, '_locales');
                    if (fs.existsSync(localesSrc)) {
                        copyDir(localesSrc, localesDest);
                        console.log(`Copied _locales to ${target.name}`);
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('Error copying assets:', e);
        process.exit(1);
    }

    console.log('Asset copy complete.');
}

if (require.main === module) {
    runCopy();
}

module.exports = runCopy;