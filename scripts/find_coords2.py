from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")

w6, h6 = img6.size
bg6 = img6.getpixel((0,0))

min_x6 = w6
min_y6 = h6
max_x6 = 0
max_y6 = 0

for y in range(h6//2):
    for x in range(w6):
        r, g, b, a = img6.getpixel((x,y))
        if abs(r-bg6[0])>15 or abs(g-bg6[1])>15 or abs(b-bg6[2])>15:
            if x < min_x6: min_x6 = x
            if x > max_x6: max_x6 = x
            if y < min_y6: min_y6 = y
            if y > max_y6: max_y6 = y

if min_x6 > max_x6:
    print("No non-bg pixels in top half!")
else:
    print(f"Top half non-bg bbox in img6: ({min_x6}, {min_y6}) to ({max_x6}, {max_y6})")
