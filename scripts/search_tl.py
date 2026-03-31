from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
w, h = img6.size
bg = img6.getpixel((0,0))

# Scan top-left 150x150 for any non-bg clusters
islands = []
visited = set()

def get_island(start_x, start_y):
    stack = [(start_x, start_y)]
    island = []
    while stack:
        x, y = stack.pop()
        if (x, y) in visited: continue
        visited.add((x, y))
        r, g, b, a = img6.getpixel((x,y))
        if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
            island.append((x,y))
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < 150 and 0 <= ny < 150: # Limit to top-left
                    stack.append((nx, ny))
    return island

for y in range(150):
    for x in range(150):
        if (x,y) not in visited:
            r,g,b,a = img6.getpixel((x,y))
            if abs(r-bg[0])>15 or abs(g-bg[1])>15 or abs(b-bg[2])>15:
                island = get_island(x, y)
                if island:
                    bbox = (min(p[0] for p in island), min(p[1] for p in island),
                            max(p[0] for p in island), max(p[1] for p in island))
                    islands.append((bbox, len(island)))

for b, s in islands:
    print(f"Top-left island: bbox={b}, size={s}")
