from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
bg = img6.getpixel((0,0))

# Scan top-left 150x150 for ANY difference
found = []
for y in range(150):
    for x in range(150):
        r,g,b,a = img6.getpixel((x,y))
        if (r,g,b,a) != bg:
            found.append((x,y))

if not found:
    print("Absolutely no pixels different from (0,0) in top-left 150x150")
else:
    min_x = min(p[0] for p in found)
    max_x = max(p[0] for p in found)
    min_y = min(p[1] for p in found)
    max_y = max(p[1] for p in found)
    print(f"Different pixels in top-left bbox: ({min_x}, {min_y}) to ({max_x}, {max_y}) (count: {len(found)})")
    # show first 5 different colors
    colors = set(img6.getpixel(p) for p in found)
    print(f"Unique colors found: {list(colors)[:10]}")
