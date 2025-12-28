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
    
        // Copy to build folders if parent exists (meaning build has run/started)
        // For dev build
        const devBuildRoot = path.join(__dirname, '../build/chrome-mv3-dev');
        if (fs.existsSync(devBuildRoot)) {
             copyDir(src, buildDestDev);
             console.log('Copied to dev build');
        }
    
        // For prod build
        const prodBuildRoot = path.join(__dirname, '../build/chrome-mv3-prod');
        if (fs.existsSync(prodBuildRoot)) {
             copyDir(src, buildDestProd);
             console.log('Copied to prod build');
        }

        // Copy _locales
        const localesSrc = path.join(__dirname, '../_locales');
        const localesDestDev = path.join(__dirname, '../build/chrome-mv3-dev/_locales');
        const localesDestProd = path.join(__dirname, '../build/chrome-mv3-prod/_locales');
        
        if (fs.existsSync(localesSrc)) {
             // Copy to dev build
            if (fs.existsSync(devBuildRoot)) {
                copyDir(localesSrc, localesDestDev);
                console.log('Copied _locales to dev build');
            }
            
            // Copy to prod build
            if (fs.existsSync(prodBuildRoot)) {
                copyDir(localesSrc, localesDestProd);
                console.log('Copied _locales to prod build');
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