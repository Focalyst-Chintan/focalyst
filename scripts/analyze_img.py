import cv2
import pytesseract
from PIL import Image

files = [
    "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png",
    "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
]

for f in files:
    try:
        img = Image.open(f)
        text = pytesseract.image_to_string(img)
        print(f"File {f.split('/')[-1]}: size {img.size}")
        print("Text:", text.strip().replace("\n", " | "))
    except Exception as e:
        print(f"Error reading {f}: {e}")
