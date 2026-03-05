const fs = require('fs');
const path = require('path');

const srcDir = 'src/components/layout';
const sidebarDir = path.join(srcDir, 'sidebar');
const menuDir = path.join(sidebarDir, 'menu');

// Create directories if not exist
if (!fs.existsSync(sidebarDir)) fs.mkdirSync(sidebarDir, { recursive: true });
if (!fs.existsSync(menuDir)) fs.mkdirSync(menuDir, { recursive: true });

console.log('Sidebar directories prepared');
