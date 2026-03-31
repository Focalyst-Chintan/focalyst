from PIL import Image

f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"
f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"

# Since I can't use OCR easily without tesseract binary, 
# I will try to find the "FOCALYST" text by looking for patterns or just assuming the bbox.
# But wait, I can save a small version of it to a file and tell the user I'm working on it?
# Actually, I'll just try to find the text color and bounding box.

def analyze(path, name):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    bg = img.getpixel((0,0))
    # find all islands
    visited = set()
    islands = []
    for y in range(h):
        for x in range(w):
            if (x,y) not in visited:
                r,g,b,a = img.getpixel((x,y))
                if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
                    island = []
                    stack = [(x,y)]
                    while stack:
                        px, py = stack.pop()
                        if (px,py) in visited: continue
                        visited.add((px,py))
                        r,g,b,a = img.getpixel((px,py))
                        if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
                            island.append((px,py))
                            for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                                nx, ny = px+dx, py+dy
                                if 0<=nx<w and 0<=ny<h: stack.append((nx,ny))
                    if island:
                        bbox = (min(p[0] for p in island), min(p[1] for p in island),
                                max(p[0] for p in island), max(p[1] for p in island))
                        islands.append((bbox, len(island)))
    print(f"Image {name} ({path}):")
    for b, s in sorted(islands, key=lambda x: x[1], reverse=True)[:10]:
        print(f"  Island: bbox={b}, size={s}")

analyze(f5, "image_5")
analyze(f6, "image_6")
