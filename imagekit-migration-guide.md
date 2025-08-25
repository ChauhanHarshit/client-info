# ImageKit Migration Guide

## Files to Upload to ImageKit

Upload these files to your ImageKit Media Library in the `/app-assets/` folder:

### 1. Core Application Images
- **Source:** `./favicon.png` 
- **Upload to:** `/app-assets/favicon.png`
- **Description:** Main favicon with money bag character

- **Source:** `./generated-icon.png`
- **Upload to:** `/app-assets/generated-icon.png` 
- **Description:** Blue gear icon for app branding

### 2. Banner Assets
- **Source:** `./uploads/banners/cherry-blossoms.svg`
- **Upload to:** `/app-assets/cherry-blossoms.svg`
- **Description:** Pink gradient banner with cherry blossom petals

- **Source:** `./uploads/banners/money.svg`
- **Upload to:** `/app-assets/money.svg`
- **Description:** Green gradient banner with dollar signs

### 3. Animation Thumbnails
- **Source:** `./animations/thumbs/glowing-frame.svg`
- **Upload to:** `/app-assets/glowing-frame.svg`
- **Description:** Animated blue glowing frame

- **Source:** `./animations/thumbs/pulsing-blue.svg`
- **Upload to:** `/app-assets/pulsing-blue.svg`
- **Description:** Animated pulsing blue element

- **Source:** `./animations/thumbs/shimmer-title.svg`
- **Upload to:** `/app-assets/shimmer-title.svg`
- **Description:** Animated shimmer text effect

## Code Changes Already Applied

### Updated Files:
1. **client/index.html** - All favicon references now use ImageKit URLs with optimization
2. **client/src/pages/content-viewer.tsx** - Banner asset URLs updated to ImageKit

### ImageKit URLs Being Used:
- Favicon (32x32): `https://ik.imagekit.io/pbb8ymnwg/app-assets/favicon.png?tr=w-32,h-32,f-auto`
- Favicon (16x16): `https://ik.imagekit.io/pbb8ymnwg/app-assets/favicon.png?tr=w-16,h-16,f-auto`
- Apple Touch Icon: `https://ik.imagekit.io/pbb8ymnwg/app-assets/favicon.png?tr=w-180,h-180,f-auto`
- Cherry Blossoms: `https://ik.imagekit.io/pbb8ymnwg/app-assets/cherry-blossoms.svg?tr=f-auto`
- Money Banner: `https://ik.imagekit.io/pbb8ymnwg/app-assets/money.svg?tr=f-auto`

## Next Steps:
1. Upload all 7 files to ImageKit in the `/app-assets/` folder
2. Test the application to ensure all images load correctly
3. Remove local image files once confirmed working

## Optimization Benefits:
- Automatic format optimization (WebP/AVIF when supported)
- Responsive image sizing
- CDN delivery for faster loading
- Reduced server storage usage