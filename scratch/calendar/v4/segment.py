"""Person instance masks for the original's dance shot (frames A..B) -> C:/cal4work/seg.npz."""
import numpy as np, sys
from ultralytics import YOLO
W = r'C:\cal4work'
A, B = int(sys.argv[1]) if len(sys.argv) > 1 else 597, int(sys.argv[2]) if len(sys.argv) > 2 else 1010
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
model = YOLO('yolo11x-seg.pt')
out = {}
for i in range(A, B):
    img = np.ascontiguousarray(orig[i][:, :, ::-1])
    r = model.predict(img, imgsz=640, conf=0.15, classes=[0], retina_masks=True, verbose=False)[0]
    if r.masks is None:
        out[f'm{i}'] = np.zeros((0, 480, 640), bool); out[f'b{i}'] = np.zeros((0, 5)); continue
    m = r.masks.data.cpu().numpy() > 0.5
    b = np.concatenate([r.boxes.xyxy.cpu().numpy(), r.boxes.conf.cpu().numpy()[:, None]], 1)
    out[f'm{i}'] = np.packbits(m, axis=-1); out[f'b{i}'] = b
    if i % 25 == 0:
        print(i, len(b), flush=True)
np.savez_compressed(W + rf'\seg_{A}_{B}.npz', **out)
print('done')
