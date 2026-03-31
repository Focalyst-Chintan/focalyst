from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
bbox = (152, 337, 424, 621)
crop = img6.crop(bbox)

colors = {}
for y in range(crop.height):
    for x in range(crop.width):
        c = crop.getpixel((x,y))
        colors[c] = colors.get(c, 0) + 1

# Most frequent colors (excluding bg)
bg6 = (45, 84, 120, 255) # assumed bg
sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
print("Top colors in logo area:")
for c, count in sorted_colors[:20]:
    print(f"  {c}: {count}")
