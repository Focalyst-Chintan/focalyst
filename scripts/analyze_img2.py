from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"

img6 = Image.open(f6)
img5 = Image.open(f5)

print("Screen size:", img6.size)
print("Logo size:", img5.size)

# sample a few pixels to find the background color of the logo and the text color of the screen
logo_bg = img5.getpixel((0,0))
screen_bg = img6.getpixel((0,0))
print("Logo bg:", logo_bg)
print("Screen bg:", screen_bg)
