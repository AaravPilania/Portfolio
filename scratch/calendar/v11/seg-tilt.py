"""Person masks for the rolled-camera shot after the occlusion (orig A..B), on frames turned 90 degrees clockwise so the
kid stands upright for YOLO. -> C:/cal4work/segtilt_A_B.npz (masks in the rotated 480x640 frame, packed bits)."""
import numpy as np, sys, cv2, os
from ultralytics import YOLO
W = r'C:\cal4work'
A, B = int(sys.argv[1]), int(sys.argv[2])
orig = np.load(W + r'\orig480.npy', mmap_mode='r')
model = YOLO(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'v4', 'yolo11x-seg.pt'))
out = {}
for i in range(A, B):
    img = cv2.rotate(np.ascontiguousarray(orig[i][:, :, ::-1]), cv2.ROTATE_90_CLOCKWISE)
    r = model.predict(img, imgsz=640, conf=0.15, classes=[0], retina_masks=True, verbose=False)[0]
    if r.masks is None:
        out[f'm{i}'] = np.zeros((0, 640, 60), np.uint8); out[f'b{i}'] = np.zeros((0, 5)); continue
    m = r.masks.data.cpu().numpy() > 0.5
    out[f'm{i}'] = np.packbits(m, axis=-1)
    out[f'b{i}'] = np.concatenate([r.boxes.xyxy.cpu().numpy(), r.boxes.conf.cpu().numpy()[:, None]], 1)
    if i % 20 == 0: print(i, len(m), flush=True)
np.savez_compressed(W + rf'\segtilt_{A}_{B}.npz', **out)
print('done')
