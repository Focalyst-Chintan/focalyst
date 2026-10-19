const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'src', 'app');
const apiDir = path.join(appDir, 'api');
const authDir = path.join(appDir, 'auth');
const apiBackup = path.join(root, 'api_backup');
const authBackup = path.join(root, 'auth_backup');

// Check if we are running in Vercel production environment
if (process.env.VERCEL === '1') {
  console.log('--- Production build on Vercel detected. Running standard SSR next build ---');
  try {
    execSync('npx next build', { stdio: 'inherit', cwd: root });
    console.log('Vercel build completed successfully!');
  } catch (error) {
    console.error('Vercel build failed:', error);
    process.exit(1);
  }
} else {
  console.log('--- Local Mobile Build for Capacitor detected ---');
  let apiRenamed = false;
  let authRenamed = false;

  try {
    // 1. Rename API and Auth folders so they are not statically parsed by next build
    if (fs.existsSync(apiDir)) {
      console.log('Hiding API routes directory...');
      fs.renameSync(apiDir, apiBackup);
      apiRenamed = true;
    }
    if (fs.existsSync(authDir)) {
      console.log('Hiding Auth route handler directory...');
      fs.renameSync(authDir, authBackup);
      authRenamed = true;
    }

    // 2. Set EXPORT_MOBILE=true to force static export in next.config.ts
    console.log('Compiling static Next.js application...');
    execSync('npx next build', {
      stdio: 'inherit',
      cwd: root,
      env: { ...process.env, EXPORT_MOBILE: 'true' }
    });

    console.log('Next.js static export build completed successfully!');
  } catch (error) {
    console.error('Mobile build compilation failed:', error);
    process.exitCode = 1;
  } finally {
    // 3. Always restore directories to maintain workspace integrity
    console.log('Restoring project directory structure...');
    if (apiRenamed && fs.existsSync(apiBackup)) {
      fs.renameSync(apiBackup, apiDir);
      console.log('Restored API directory.');
    }
    if (authRenamed && fs.existsSync(authBackup)) {
      fs.renameSync(authBackup, authDir);
      console.log('Restored Auth directory.');
    }
  }
}
