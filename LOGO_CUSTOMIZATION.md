# Logo Customization Guide

The application includes a company logo that appears on all pages. You can easily replace it with your own logo.

## Logo Location

The logo file is located at:
```
frontend/public/logo.svg
```

## How to Replace the Logo

### Option 1: Replace the SVG file (Recommended)
1. Replace `frontend/public/logo.svg` with your own logo file
2. Keep the filename as `logo.svg` (or update all references in the code)
3. Recommended dimensions: 120x40px or similar aspect ratio
4. The logo will automatically scale to fit

### Option 2: Use a PNG/JPG logo
1. Place your logo file in `frontend/public/` (e.g., `logo.png` or `logo.jpg`)
2. Update the image source in the following files:
   - `frontend/src/ui/KanbanApp.tsx` (line ~323)
   - `frontend/src/ui/CustomersApp.tsx` (line ~77 and ~195)
   - `frontend/src/ui/AuthApp.tsx` (line ~90)

   Change `/logo.svg` to `/logo.png` (or your filename)

3. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```

## Logo Display Locations

The logo appears in:
- **Login/Register page**: Centered at the top (height: 48px)
- **Kanban view header**: Left side of header (height: 40px)
- **Customers list header**: Left side of header (height: 40px)
- **Customer detail header**: Left side of header (height: 40px)

## Logo Specifications

- **Format**: SVG (recommended for scalability) or PNG/JPG
- **Recommended size**: 120x40px or similar aspect ratio (3:1)
- **Background**: Transparent (for best results)
- **File size**: Keep under 50KB for fast loading

## Current Logo

The current logo is a placeholder SVG with:
- Blue background (#2563EB)
- White text "Quote Portal"
- Rounded corners

Replace this with your company's actual logo.

## After Replacing

1. Rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Test locally to ensure the logo displays correctly

3. Deploy to Railway - the logo will be included in the build

## Troubleshooting

**Logo not showing?**
- Check that the file is in `frontend/public/`
- Verify the filename matches the code references
- Check browser console for 404 errors
- Ensure the file is included in the build (check `frontend/dist/` after building)

**Logo too large/small?**
- Adjust the `h-10` or `h-12` classes in the component files
- For login page: change `h-12` to your preferred size
- For headers: change `h-10` to your preferred size

**Logo looks blurry?**
- Use SVG format for best quality at all sizes
- If using PNG, use a high-resolution version (2x or 3x)
