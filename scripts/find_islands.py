from PIL import Image, ImageDraw

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("RGBA")
w6, h6 = img6.size
bg6 = img6.getpixel((0,0))

# Find non-background pixels in the top-left (e.g. top 200px, left 200px)
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
        if abs(r-bg6[0])>15 or abs(g-bg6[1])>15 or abs(b-bg6[2])>15:
            island.append((x,y))
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < w6 and 0 <= ny < h6:
                    stack.append((nx, ny))
    return island

for y in range(h6//2):
    for x in range(w6):
        if (x, y) not in visited:
            r, g, b, a = img6.getpixel((x,y))
            if abs(r-bg6[0])>15 or abs(g-bg6[1])>15 or abs(b-bg6[2])>15:
                island = get_island(x, y)
                if island:
                    min_ix = min(p[0] for p in island)
                    max_ix = max(p[0] for p in island)
                    min_iy = min(p[1] for p in island)
                    max_iy = max(p[1] for p in island)
                    islands.append(((min_ix, min_iy, max_ix, max_iy), len(island)))

for bbox, size in islands:
    print(f"Island: bbox={bbox}, size={size}")
