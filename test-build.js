const { spawn } = require('child_process');

const build = spawn('npm', ['run', 'build'], {
  cwd: '/Users/muriloparrillo/bia-web/frontend',
  stdio: 'inherit'
});

build.on('close', (code) => {
  console.log(`Build finished with code ${code}`);
});

build.on('error', (err) => {
  console.error('Build error:', err);
});
