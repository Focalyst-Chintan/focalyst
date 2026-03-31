from PIL import Image

f5 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994769104.png"
img5 = Image.open(f5).convert("RGBA")
bg = img5.getpixel((0,0))
w, h = img5.size

visited = set()
islands = []
for y in range(h):
    for x in range(w):
        if (x,y) not in visited:
            r,g,b,a = img5.getpixel((x,y))
            if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
                island = []
                stack = [(x,y)]
                while stack:
                    px, py = stack.pop()
                    if (px,py) in visited: continue
                    visited.add((px,py))
                    r,g,b,a = img5.getpixel((px,py))
                    if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
                        island.append((px,py))
                        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                            nx, ny = px+dx, py+dy
                            if 0<=nx<w and 0<=ny<h: stack.append((nx,ny))
                if island:
                    bbox = (min(p[0] for p in island), min(p[1] for p in island),
                            max(p[0] for p in island), max(p[1] for p in island))
                    islands.append((bbox, len(island)))

print(f"Total islands in Image 5: {len(islands)}")
for b, s in sorted(islands, key=lambda x: x[0][1]): # Sort by y coordinate
    if s > 100: # Ignore noise
        print(f"  Island: bbox={b}, size={s}")
