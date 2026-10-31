const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'src', 'app');
// Web-only routes, hidden from the static export: API and auth handlers, and the
// blog (database-backed, ISR, web only) plus llms.txt, which lists blog posts
const WEB_ONLY = ['api', 'auth', 'blog', 'llms.txt'].map((name) => ({
  name,
  dir: path.join(appDir, name),
  backup: path.join(root, `${name.replace('.', '_')}_backup`),
}));

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
  const hidden = [];

  try {
    // 1. Rename web-only folders so they are not statically parsed by next build
    for (const route of WEB_ONLY) {
      if (fs.existsSync(route.dir)) {
        console.log(`Hiding ${route.name} route directory...`);
        fs.renameSync(route.dir, route.backup);
        hidden.push(route);
      }
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
    for (const route of hidden) {
      if (fs.existsSync(route.backup)) {
        fs.renameSync(route.backup, route.dir);
        console.log(`Restored ${route.name} directory.`);
      }
    }
  }
}
