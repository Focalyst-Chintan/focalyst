import numpy as np
from PIL import Image

f6 = "/Users/sohantamang/.gemini/antigravity/brain/c2a48db8-b875-425e-9c20-77b1362aed78/media__1774994824302.png"
img6 = Image.open(f6).convert("L") # Grayscale
data = np.array(img6)

# Use a simple way to find "sharp" edges without 
# many dependencies. 
# We'll compute the difference between pixel and its neighbors.
diff_x = np.abs(data[:, 1:] - data[:, :-1])
diff_y = np.abs(data[1:, :] - data[:-1, :])

# Threshold high differences
th = 30
edges = (diff_x[:, :-1] > th) & (diff_y[:-1, :] > th)

# Find clusters of edges in the top-left (e.g. y < 200, x < 200)
h, w = edges.shape
h_search = h // 4
w_search = w // 2

found = []
for y in range(h_search):
    for x in range(w_search):
        if edges[y, x]:
            found.append((x, y))

if not found:
    print("No sharp edges found in top-left!")
else:
    min_x = min(p[0] for p in found)
    max_x = max(p[0] for p in found)
    min_y = min(p[1] for p in found)
    max_y = max(p[1] for p in found)
    print(f"Sharp edges detected in bbox: ({min_x}, {min_y}) to ({max_x}, {max_y}) (count: {len(found)})")

# also search center etc. to confirm
h_search_full = h // 2
w_search_full = w
found_all = []
for y in range(h_search_full):
    for x in range(w_search_full):
        if edges[y, x]:
            found_all.append((x, y))
print(f"Sharp edges in top half bbox: ({min(p[0] for p in found_all)}, {min(p[1] for p in found_all)}) to ({max(p[0] for p in found_all)}, {max(p[1] for p in found_all)}) (total count: {len(found_all)})")
