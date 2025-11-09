import * as xlsx from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Script to generate a sample XLSX file for testing imports
 */
function generateSampleXlsx() {
  console.log('📊 Generating sample XLSX file...');

  const sampleData = [
    { name: 'Charles Babbage', email: 'charles.babbage@c33.io', balance: 25000 },
    { name: 'Tim Berners-Lee', email: 'tim.berners-lee@c33.io', balance: 30000 },
    { name: 'Linus Torvalds', email: 'linus.torvalds@c33.io', balance: 22000 },
    { name: 'Dennis Ritchie', email: 'dennis.ritchie@c33.io', balance: 18500 },
    { name: 'Bjarne Stroustrup', email: 'bjarne.stroustrup@c33.io', balance: 16000 },
    { name: 'Guido van Rossum', email: 'guido.vanrossum@c33.io', balance: 19500 },
    { name: 'James Gosling', email: 'james.gosling@c33.io', balance: 21000 },
    { name: 'Brendan Eich', email: 'brendan.eich@c33.io', balance: 17500 },
  ];

  // Create a workbook and worksheet
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(sampleData);

  // Add the worksheet to the workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Customers');

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Write the file
  const filePath = path.join(dataDir, 'customers.sample.xlsx');
  xlsx.writeFile(workbook, filePath);

  console.log(`✅ Sample XLSX file created: ${filePath}`);
  console.log(`📝 Contains ${sampleData.length} sample customer records`);
}

generateSampleXlsx();
