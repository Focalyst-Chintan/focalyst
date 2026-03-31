from PIL import Image

f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"
img5 = Image.open(f5).convert("RGBA")
bg = img5.getpixel((0,0))
w, h = img5.size

colors = {}
for y in range(h):
    for x in range(w):
        r,g,b,a = img5.getpixel((x,y))
        if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
            c = (r,g,b,a)
            colors[c] = colors.get(c, 0) + 1

sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
print("Foreground colors in image_5:")
for c, count in sorted_colors[:10]:
    print(f"  {c}: {count}")
