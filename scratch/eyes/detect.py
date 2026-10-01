# Locates the face and both eyes in the slide 04 portrait frame and writes an annotated crop.
import cv2

img = cv2.imread('scratch/eyes/frame.png')
H, W = img.shape[:2]
gray = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
base = cv2.data.haarcascades
faces = cv2.CascadeClassifier(base + 'haarcascade_frontalface_default.xml').detectMultiScale(gray, 1.1, 6, minSize=(200, 200))
print('frame', W, H, 'faces', [tuple(int(v) for v in f) for f in faces])
fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
roi = gray[fy:fy + fh // 2 + fh // 8, fx:fx + fw]
found = []
for name in ('haarcascade_eye.xml', 'haarcascade_eye_tree_eyeglasses.xml'):
    eyes = cv2.CascadeClassifier(base + name).detectMultiScale(roi, 1.05, 5, minSize=(fw // 10, fw // 10))
    for (x, y, w, h) in eyes:
        found.append((name, fx + x + w / 2, fy + y + h / 2, w))
for f in found:
    print('%-36s centre %.0f,%.0f  size %d  uv %.4f,%.4f' % (f[0], f[1], f[2], f[3], f[1] / W, f[2] / H))
out = img.copy()
cv2.rectangle(out, (fx, fy), (fx + fw, fy + fh), (0, 255, 0), 2)
for f in found:
    cv2.circle(out, (int(f[1]), int(f[2])), int(f[3] / 2), (0, 0, 255), 2)
cv2.imwrite('scratch/eyes/detect.png', out[fy - 40:fy + fh // 2 + 120, fx - 40:fx + fw + 40])
