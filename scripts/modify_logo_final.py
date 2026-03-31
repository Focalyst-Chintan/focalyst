from PIL import Image, ImageDraw

f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"
f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"

img5 = Image.open(f5).convert("RGBA")
bg5 = img5.getpixel((0,0))
img6 = Image.open(f6).convert("RGBA")
bg6 = img6.getpixel((0,0))

# 1. Isolate islands from img5 in range y > 300
w5, h5 = img5.size
# Find bounds of all branding pixels in y > 300
min_bx, min_by, max_bx, max_by = w5, h5, 0, 0
branding_pixels = []

for y in range(300, h5):
    for x in range(w5):
        r, g, b, a = img5.getpixel((x,y))
        if abs(r-bg5[0])>15 or abs(g-bg5[1])>15 or abs(b-bg5[2])>15:
            min_bx = min(min_bx, x)
            max_bx = max(max_bx, x)
            min_by = min(min_by, y)
            max_by = max(max_by, y)
            branding_pixels.append((x, y, (r, g, b, a)))

if not branding_pixels:
    print("No branding found in img5 y > 300!")
    exit(1)

# Create a transparent canvas for the new logo
logo_w = max_bx - min_bx + 1
logo_h = max_by - min_by + 1
new_logo = Image.new("RGBA", (logo_w, logo_h), (0, 0, 0, 0))

# Put pixels in (shifted to origin)
target_color = (23, 49, 72, 255) # Dark navy
for x, y, (r, g, b, a) in branding_pixels:
    # Recolor to target
    new_logo.putpixel((x - min_bx, y - min_by), target_color)

# 2. Clear old logo from img6
# Area: (152, 337, 424, 621)
# We use draw.rectangle with the background color to erase
draw = ImageDraw.Draw(img6)
# Sample background around the area to be safe (it's blurred, so maybe local avg?)
# But (45,84,120) was the global bg6. Let's use that.
draw.rectangle([150, 330, 430, 630], fill=bg6)

# 3. Scale and Place the new logo
# Current logo width: logo_w
# Screen width: 576. Professional top-left width approx 30% of screen = 170px.
target_width = 170
scale = target_width / logo_w
target_height = int(logo_h * scale)

new_logo_scaled = new_logo.resize((target_width, target_height), Image.Resampling.LANCZOS)

# Paste in top-left with padding
img6.paste(new_logo_scaled, (30, 30), new_logo_scaled)

# 4. Save
out_path = "/Users/sohantamang/Focalyst/public/modified_welcome_screen.png"
img6.save(out_path)
print(f"Saved modified image to {out_path}")
