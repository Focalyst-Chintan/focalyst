from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
w6, h6 = img6.size
bg6 = img6.getpixel((0,0))

# find text color below logo (y > 511)
colors = {}
for y in range(512, h6):
    for x in range(w6):
        r, g, b, a = img6.getpixel((x,y))
        if abs(r-bg6[0])>15 or abs(g-bg6[1])>15 or abs(b-bg6[2])>15:
            c = (r,g,b,a)
            colors[c] = colors.get(c, 0) + 1

# Most frequent non-bg color
best_color = None
max_count = 0
for c, count in colors.items():
    if count > max_count:
        max_count = count
        best_color = c

print("Most frequent text color:", best_color)
