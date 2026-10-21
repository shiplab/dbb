// Assembles index.html from src/. Run: node build.js
const fs = require('fs');
const path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const html = [
  '<!doctype html>', '<html lang="en">', '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<title>DBB Block Editor</title>',
  '<meta name="description" content="A small 3D editor for teaching the Design Building Block (DBB) approach.">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">',
  '<style>', 'html,body{margin:0;height:100%}body{font:14px system-ui,sans-serif}', r('style.css'), '</style>',
  '</head>', '<body>', r('body.html'),
  '<script src="vendor/three.min.js"></script>',
  '<script src="vendor/OrbitControls.js"></script>',
  '<script src="vendor/TransformControls.js"></script>',
  '<script>', r('core.js'), '</script>',
  '<script>', r('app.js'), '</script>',
  '</body>', '</html>'
].join('\n');
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('built index.html', html.length, 'bytes');
