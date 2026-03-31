from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"

img6 = Image.open(f6).convert("RGBA")
img5 = Image.open(f5).convert("RGBA")

# Find the darkest pixel in img6 that is NOT the background
w, h = img6.size
bg_color = img6.getpixel((0,0))
darkest = None
min_luma = 255*3

for y in range(h):
    for x in range(w):
        r, g, b, a = img6.getpixel((x,y))
        if a > 100:
            if abs(r-bg_color[0])>10 or abs(g-bg_color[1])>10 or abs(b-bg_color[2])>10:
                luma = r + g + b
                if luma < min_luma:
                    min_luma = luma
                    darkest = (r,g,b,a)

print("Darkest color in screen:", darkest)
