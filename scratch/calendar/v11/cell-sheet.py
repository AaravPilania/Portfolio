"""Cell maps as palette tiles: main-shot continuation end (ours.npz) and the rolled shot (tilt_ours.npz), with the
warped source frame beside each rolled-shot tile. python cell-sheet.py out.png"""
import sys, numpy as np, cv2
from gcd import PAL
W = r'C:\cal4work'
rgb = np.array([[int(h[i:i + 2], 16) for i in (5, 3, 1)] for h in PAL], np.uint8)
rgb[0] = (41, 237, 255)
ours = np.load(W + r'\ours.npz'); tilt = np.load(W + r'\tilt_ours.npz'); warp = np.load(W + r'\tilt_warp.npz')
def tile(m, label):
    t = cv2.resize(rgb[m], (196, 160), interpolation=cv2.INTER_NEAREST)
    cv2.putText(t, label, (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)
    return t
tiles = [tile(ours[f'f{i}'], f'main {i}') for i in range(960, 982, 3)]
for i in range(1044, 1122, 3):
    tiles.append(tile(tilt[f'f{i}'], f'roll {i}'))
    w = cv2.resize(np.ascontiguousarray(warp[f'w{i}'][:, :, ::-1]), (196, 160), interpolation=cv2.INTER_AREA)
    tiles.append(w)
cols = 8
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(sys.argv[1], np.vstack([np.hstack(tiles[k:k + cols]) for k in range(0, len(tiles), cols)]))
