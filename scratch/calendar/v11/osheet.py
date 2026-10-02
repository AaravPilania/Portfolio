"""Contact sheet of original frames: python osheet.py A B step out.png [cols] [width]"""
import sys, numpy as np, cv2
A, B, S, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 8
w = int(sys.argv[6]) if len(sys.argv) > 6 else 200
orig = np.load(r'C:\cal4work\orig480.npy', mmap_mode='r')
tiles = []
for i in range(A, B, S):
    t = cv2.resize(np.ascontiguousarray(orig[i][:, :, ::-1]), (w, w * 3 // 4), interpolation=cv2.INTER_AREA)
    cv2.putText(t, str(i), (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
    tiles.append(t)
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[k:k + cols]) for k in range(0, len(tiles), cols)]
cv2.imwrite(out, np.vstack(rows))
