#!/usr/bin/env node

console.log('🔍 Environment Variable Debug');
console.log('============================');

console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET);

console.log('\nAll Cloudinary env vars:');
Object.keys(process.env).filter(key => key.includes('CLOUDINARY')).forEach(key => {
  console.log(`${key}: ${process.env[key]}`);
});