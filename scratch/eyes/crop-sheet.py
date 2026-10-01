# python scratch/eyes/crop-sheet.py out.png label=shot.png ... : the eyes' neighbourhood of 1920x1080 page shots,
# 2x nearest-neighbour so the grid cells stay crisp, stacked with labels
import sys, cv2, numpy as np
X0, X1, Y0, Y1 = 740, 1220, 40, 300
rows = []
for arg in sys.argv[2:]:
    label, path = arg.split('=', 1)
    im = cv2.imread(path)[Y0:Y1, X0:X1]
    im = cv2.resize(im, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
    cv2.putText(im, label, (12, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (41, 237, 255), 2, cv2.LINE_AA)
    rows.append(im)
cv2.imwrite(sys.argv[1], np.concatenate(rows, axis=0))
