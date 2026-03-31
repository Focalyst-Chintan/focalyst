from PIL import Image, ImageFilter

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("L")
edges = img6.filter(ImageFilter.FIND_EDGES)
w, h = edges.size
edata = list(edges.getdata())

# Define edge threshold
th = 50
found = []
for i, val in enumerate(edata):
    if val > th:
        y = i // w
        x = i % w
        # Search top-left (e.g. x < w2, y < h4)
        if x < w//2 and y < h//4:
            found.append((x, y))

if not found:
    print("No sharp edges found in top-left!")
else:
    min_x = min(p[0] for p in found)
    max_x = max(p[0] for p in found)
    min_y = min(p[1] for p in found)
    max_y = max(p[1] for p in found)
    print(f"Sharp edges detected in bbox: ({min_x}, {min_y}) to ({max_x}, {max_y}) (count: {len(found)})")

# Search whole top half
found_all = []
for i, val in enumerate(edata):
    if val > th:
        y = i // w
        x = i % w
        if y < h//2:
            found_all.append((x, y))
print(f"Top half sharp edges bbox: ({min(p[0] for p in found_all)}, {min(p[1] for p in found_all)}) to ({max(p[0] for p in found_all)}, {max(p[1] for p in found_all)}) (total count: {len(found_all)})")
