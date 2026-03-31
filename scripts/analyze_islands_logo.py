from PIL import Image

def find_logo(screen_path, logo_path):
    screen = Image.open(screen_path).convert("RGBA")
    logo = Image.open(logo_path).convert("RGBA")
    
    # Resize logo to various sizes to find match?
    # Actually, let's just find the bounding box of non-bg in screen
    # and see if it looks like the logo.
    
    # We already found bbox (152, 337, 424, 621) in img6.
    # Let's check the pixels in that bbox.
    
    # Wait, I'll just assume the user means the clock icon.
    # But I'll search the WHOLE screen for the clock icon pattern.
    pass

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
logo_p = "/Users/sohantamang/Focalyst/public/logo.png"

# Load logo and find its aspect ratio
limg = Image.open(logo_p).convert("RGBA")
lw, lh = limg.size
# find bbox of logo
lpixels = list(limg.getdata())
l_min_x, l_min_y = lw, lh
l_max_x, l_max_y = 0, 0
for i, (r,g,b,a) in enumerate(lpixels):
    if a > 0:
        lx, ly = i % lw, i // lw
        l_min_x = min(l_min_x, lx)
        l_max_x = max(l_max_x, lx)
        l_min_y = min(l_min_y, ly)
        l_max_y = max(l_max_y, ly)
l_bbox = (l_min_x, l_min_y, l_max_x, l_max_y)
l_w = l_max_x - l_min_x + 1
l_h = l_max_y - l_min_y + 1
print(f"Original logo bbox: {l_bbox} (size {l_w}x{l_h})")

# Now look at img6
img6 = Image.open(f6).convert("RGBA")
w6, h6 = img6.size
# Find all islands again, but be more sensitive
bg6 = img6.getpixel((0,0))
visited = set()
islands = []
for y in range(h6):
    for x in range(w6):
        if (x,y) not in visited:
            r,g,b,a = img6.getpixel((x,y))
            if abs(r-bg6[0])>10 or abs(g-bg6[1])>10 or abs(b-bg6[2])>10:
                island = []
                stack = [(x,y)]
                while stack:
                    px, py = stack.pop()
                    if (px,py) in visited: continue
                    visited.add((px,py))
                    r,g,b,a = img6.getpixel((px,py))
                    if abs(r-bg6[0])>10 or abs(g-bg6[1])>10 or abs(b-bg6[2])>10:
                        island.append((px,py))
                        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                            nx, ny = px+dx, py+dy
                            if 0<=nx<w6 and 0<=ny<h6: stack.append((nx,ny))
                if island:
                    bbox = (min(p[0] for p in island), min(p[1] for p in island),
                            max(p[0] for p in island), max(p[1] for p in island))
                    islands.append((bbox, len(island)))

for b, s in sorted(islands, key=lambda x: x[1], reverse=True):
    bw = b[2]-b[0]+1
    bh = b[3]-b[1]+1
    ratio = bw/bh
    print(f"Island: bbox={b}, size={s}, dim={bw}x{bh}, ratio={ratio:.2f}")
