# Installing "Our Adventure Log" as a PWA on iPhone 17 Pro Max

## What is a PWA?
A Progressive Web App (PWA) allows you to install this web app on your iPhone home screen and use it like a native app, with offline support and a full-screen experience.

## Installation Steps

### 1. Open the App in Safari
- Make sure you're using **Safari** browser (not Chrome or other browsers)
- Navigate to your app URL (e.g., `http://localhost:5173` for development or your deployed URL)

### 2. Add to Home Screen
1. Tap the **Share** button (square with arrow pointing up) at the bottom of Safari
2. Scroll down and tap **"Add to Home Screen"**
3. You'll see a preview with the app icon and name "Adventure Log"
4. Tap **"Add"** in the top right corner

### 3. Launch the App
- Find the "Adventure Log" icon on your home screen
- Tap it to launch the app in full-screen mode
- The app will now work like a native iOS app!

## Features Optimized for iPhone 17 Pro Max

✅ **Full Screen Experience** - No browser UI, just your app
✅ **Dynamic Island Support** - Proper spacing for the Dynamic Island
✅ **Safe Area Handling** - Content respects notch and home indicator
✅ **Offline Support** - Works without internet connection (via Service Worker)
✅ **Touch-Optimized** - All buttons are at least 44x44px for easy tapping
✅ **Perfect Sizing** - Optimized for 430 x 932 pixel display (6.9" screen)
✅ **Smooth Animations** - Hardware-accelerated animations
✅ **iOS Keyboard Friendly** - Proper input handling and zoom prevention

## Screen Specifications
- **Device**: iPhone 17 Pro Max
- **Resolution**: 430 x 932 pixels
- **Display**: 6.9" Super Retina XDR
- **Pixel Ratio**: 3x (@3x)

## Troubleshooting

### App doesn't appear in "Add to Home Screen"
- Make sure you're using Safari (not Chrome or Firefox)
- Check that you're on a secure connection (HTTPS or localhost)
- Try refreshing the page

### App looks zoomed or cut off
- The app is specifically optimized for iPhone 17 Pro Max
- If using a different device, the responsive design will adapt
- Clear Safari cache and reinstall if issues persist

### Offline mode not working
- Make sure the service worker registered successfully
- Check browser console for any errors
- Try reinstalling the app

### Icons not showing
- Icons use the existing vite.svg temporarily
- You can replace with custom icons by updating:
  - `/public/icon-192.png` (192x192)
  - `/public/icon-512.png` (512x512)
  - `/public/apple-touch-icon.png` (180x180)

## Development Notes

### Testing PWA Features
```bash
# Run the development server
npm run dev

# Access from your iPhone on the same network
# Use your computer's local IP address
# Example: http://192.168.1.100:5173
```

### Building for Production
```bash
# Build the app
npm run build

# Preview the production build
npm run preview
```

### Updating the App
When you make changes:
1. The service worker will automatically update
2. Users will see the new version on next app launch
3. Or they can manually refresh by closing and reopening the app

## Customization

### Change App Name
Edit `public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "Short Name"
}
```

### Change Theme Color
Edit `public/manifest.json` and `index.html`:
```json
{
  "theme_color": "#your-color",
  "background_color": "#your-color"
}
```

### Add Custom Icons
Replace the icon files in `/public/`:
- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels  
- `apple-touch-icon.png` - 180x180 pixels

## Resources
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [iOS PWA Support](https://developer.apple.com/documentation/webkit/safari_web_extensions)
- [Manifest Generator](https://www.simicart.com/manifest-generator.html/)

---

**Enjoy your optimized iPhone 17 Pro Max experience! 🚀**
