const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({ 
  cloud_name: 'dm3glrwax', 
  api_key: '662363788356794', 
  api_secret: 'FB-mJ-oYx6x9t3Wc_lO95u8sHQc' 
});

const folderPath = path.join(__dirname, 'public', 'assets');
const files = fs.readdirSync(folderPath);

async function uploadAll() {
  const urlMap = {};
  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.svg')) {
      const filePath = path.join(folderPath, file);
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'mozbet_assets',
          public_id: file.split('.')[0]
        });
        urlMap[file] = result.secure_url;
        console.log('Uploaded ' + file + ' -> ' + result.secure_url);
      } catch (err) {
        console.error('Failed to upload ' + file, err);
      }
    }
  }
  fs.writeFileSync('cloudinary_urls.json', JSON.stringify(urlMap, null, 2));
}

uploadAll();
