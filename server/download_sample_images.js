const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

// Create directory if it doesn't exist
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Sample camping images from Unsplash
const campingImages = [
  {
    url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4',
    filename: 'camping-image-1.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1537905569824-f89f14cceb68',
    filename: 'camping-image-2.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75',
    filename: 'camping-image-3.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7',
    filename: 'camping-image-4.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b',
    filename: 'camping-image-5.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d',
    filename: 'camping-image-6.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1526491109672-74740652b963',
    filename: 'camping-image-7.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1496080174650-637e3f22fa03',
    filename: 'camping-image-8.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7',
    filename: 'camping-image-9.jpg'
  }
];

// Create uploads directory structure
async function createDirectories() {
  const uploadsDir = path.join(__dirname, 'uploads');
  const campingDir = path.join(uploadsDir, 'camping');
  
  try {
    // Check if uploads directory exists
    if (!await existsAsync(uploadsDir)) {
      await mkdirAsync(uploadsDir);
      console.log('Created uploads directory');
    }
    
    // Check if camping directory exists
    if (!await existsAsync(campingDir)) {
      await mkdirAsync(campingDir);
      console.log('Created camping directory');
    }
    
    return campingDir;
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

// Download an image from URL
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    // Add Unsplash API parameters for better quality
    const fullUrl = `${url}?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=800`;
    
    https.get(fullUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${filepath}`);
        resolve(filepath);
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Delete the file if there was an error
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function downloadAllImages() {
  try {
    const campingDir = await createDirectories();
    
    console.log('Starting download of camping images...');
    
    // Download all images in parallel
    const downloadPromises = campingImages.map(image => {
      const filepath = path.join(campingDir, image.filename);
      return downloadImage(image.url, filepath);
    });
    
    await Promise.all(downloadPromises);
    
    console.log('All images downloaded successfully!');
    console.log('Image files available in server/uploads/camping/');
  } catch (error) {
    console.error('Error downloading images:', error);
  }
}

// Run the script
downloadAllImages();
