import math
from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"

img6 = Image.open(f6).convert("RGBA")
img5 = Image.open(f5).convert("RGBA")

w5, h5 = img5.size
bg5 = img5.getpixel((0,0))

# Find the bounding box of non-background pixels in img5
min_x = w5
min_y = h5
max_x = 0
max_y = 0

for y in range(h5):
    for x in range(w5):
        r, g, b, a = img5.getpixel((x,y))
        if abs(r-bg5[0])>5 or abs(g-bg5[1])>5 or abs(b-bg5[2])>5:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

if min_x > max_x:
    print("No logo found in img5!")
else:
    print(f"Logo bbox in img5: ({min_x}, {min_y}) to ({max_x}, {max_y})")
    
# Find the bounding box of the old logo in img6 (top-left area)
w6, h6 = img6.size
bg6 = img6.getpixel((0,0))

# Let's search top-left area: e.g. x < w6//2, y < h6//4
min_x6 = w6
min_y6 = h6
max_x6 = 0
max_y6 = 0

for y in range(h6//4):
    for x in range(w6//2):
        r, g, b, a = img6.getpixel((x,y))
        if abs(r-bg6[0])>15 or abs(g-bg6[1])>15 or abs(b-bg6[2])>15:
            if x < min_x6: min_x6 = x
            if x > max_x6: max_x6 = x
            if y < min_y6: min_y6 = y
            if y > max_y6: max_y6 = y

if min_x6 > max_x6:
    print("No old logo found in top-left of img6!")
else:
    print(f"Old logo bbox in img6: ({min_x6}, {min_y6}) to ({max_x6}, {max_y6})")
