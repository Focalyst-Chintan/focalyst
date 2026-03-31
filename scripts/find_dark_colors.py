from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
w, h = img6.size

# Scan bottom half for dark colors
colors = {}
for y in range(h//2, h):
    for x in range(w):
        r,g,b,a = img6.getpixel((x,y))
        if r < 100 and g < 100 and b < 100: # Dark-ish
            c = (r,g,b,a)
            colors[c] = colors.get(c, 0) + 1

sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
print("Dark colors in bottom half:")
for c, count in sorted_colors[:10]:
    print(f"  {c}: {count}")
