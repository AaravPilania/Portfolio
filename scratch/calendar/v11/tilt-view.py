"""Sheet of the rolled shot turned upright with the tracked kid's mask outlined, to judge whether it can continue the
dance. Kid track: seeded by the largest instance near the frame centre at frame SEED, then max IoU frame to frame."""
import numpy as np, cv2, sys
W = r'C:\cal4work'
A, B = 1016, 1200
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 1060
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
seg = np.load(W + rf'\segtilt_{A}_{B}.npz')
def inst(i):
    m = seg[f'm{i}']
    return np.unpackbits(m, axis=-1)[..., :480].astype(bool) if len(m) else np.zeros((0, 640, 480), bool)
kid = {}
ms = inst(SEED)
cy, cx = 320, 240
sc = [m.sum() - 5 * np.hypot(*(np.argwhere(m).mean(0) - (cy, cx))) for m in ms]
kid[SEED] = ms[int(np.argmax(sc))]
for rng in (range(SEED + 1, B), range(SEED - 1, A - 1, -1)):
    prev = kid[SEED]
    for i in rng:
        ms = inst(i)
        if not len(ms): kid[i] = np.zeros((640, 480), bool); continue
        s = [(m & prev).sum() / max(1, (m | prev).sum()) for m in ms]
        j = int(np.argmax(s))
        kid[i] = ms[j] if s[j] > 0.3 else np.zeros((640, 480), bool)
        if s[j] > 0.3: prev = ms[j]
np.savez_compressed(W + r'\tiltkid.npz', **{f'k{i}': np.packbits(kid[i], axis=-1) for i in kid})
tiles = []
for i in range(A, B, 4):
    img = cv2.rotate(np.ascontiguousarray(orig[i][:, :, ::-1]), cv2.ROTATE_90_CLOCKWISE)
    cnt, _ = cv2.findContours(kid[i].astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(img, cnt, -1, (0, 255, 255), 2)
    t = cv2.resize(img, (120, 160), interpolation=cv2.INTER_AREA)
    cv2.putText(t, f'{i} {kid[i].sum() // 1000}k', (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 0), 1, cv2.LINE_AA)
    tiles.append(t)
cols = 12
while len(tiles) % cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(W + r'\tilt_kid_sheet.png', np.vstack([np.hstack(tiles[k:k + cols]) for k in range(0, len(tiles), cols)]))
print({i: int(kid[i].sum()) for i in range(A, B, 8)})
