const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (!['node_modules', '.expo', 'dist', '.next', 'out', 'ios', 'android', 'public', '.git'].includes(file)) {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const dirs = ['./src', './Focalyst/src', './Focalyst/app', './Focalyst/components', './Focalyst/hooks', './Focalyst/utils'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = walkSync(dir, []);
    files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      const original = content;
      
      // Simple regex to remove console.log, console.debug on single lines
      content = content.replace(/^[ \t]*console\.(log|debug)\(.*?\);?[ \t]*$/gm, '');
      
      if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.error(`Cleaned ${file}`);
      }
    });
  }
});
