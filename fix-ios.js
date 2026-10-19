const { execSync } = require('child_process');

try {
  console.log('Forcing path and running CocoaPods...');
  const env = { 
    ...process.env, 
    PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:' + process.env.PATH 
  };
  
  execSync('cd ios && pod install', { stdio: 'inherit', env });
  
  console.log('Pods installed! Opening Xcode...');
  execSync('open ios/*.xcworkspace', { env });
  
} catch (error) {
  console.error('Script failed:', error.message);
}
