/**
 * After running the SQL migration in Supabase, run this script once
 * to re-enable image_url/image_path in all API selects.
 * 
 * It patches sareeController.js and dashboardController.js automatically.
 */
const fs = require('fs');
const path = require('path');

const sareeCtrl = path.join(__dirname, '../server/controllers/sareeController.js');
let content = fs.readFileSync(sareeCtrl, 'utf8');

// Add image fields back to getAll select
content = content.replace(
  /id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order,\r?\n(\s+)combination_colors/g,
  'id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order,\n$1image_url, image_path,\n$1combination_colors'
);

// Add image fields to the inline select strings
content = content.replace(
  /combinations\(id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order, combination_colors/g,
  'combinations(id, combination_name, current_stock, minimum_stock, notes, status, brand, sort_order, image_url, image_path, combination_colors'
);

fs.writeFileSync(sareeCtrl, content, 'utf8');
console.log('✅ sareeController.js patched with image columns');

const dashCtrl = path.join(__dirname, '../server/controllers/dashboardController.js');
let dashContent = fs.readFileSync(dashCtrl, 'utf8');

dashContent = dashContent.replace(
  /combinations\(id, combination_name, current_stock, minimum_stock, brand, status\)/,
  'combinations(id, combination_name, current_stock, minimum_stock, brand, status, image_url)'
);

fs.writeFileSync(dashCtrl, dashContent, 'utf8');
console.log('✅ dashboardController.js patched with image_url');

console.log('\nDone! Restart the server to apply.');
