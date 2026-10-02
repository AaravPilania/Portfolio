"""Read / write the GCD2 dance file (gzip; header, palette, frame 0 raw then XOR deltas)."""
import gzip, struct, numpy as np

PAL = ['#53b44b', '#0b8043', '#616161', '#fbfbfb', '#a6c1f6', '#7986cb', '#5482eb', '#3f51b5', '#039be5',
       '#d50000', '#f4511e', '#f6bf26', '#e67c73']


def load(path):
    b = gzip.decompress(open(path, 'rb').read())
    assert b[:4] == b'GCD2'
    _, w, h, n, fps100, np_ = struct.unpack('<BHHHHB', b[4:14])
    p = 14 + np_ * 3
    raw = np.frombuffer(b[p:p + n * w * h], np.uint8).reshape(n, h * w).copy()
    for f in range(1, n): raw[f] ^= raw[f - 1]
    return raw.reshape(n, h, w), fps100 / 100


def save(path, frames, fps=30):
    frames = np.asarray(frames, np.uint8)
    n, h, w = frames.shape
    head = b'GCD2' + struct.pack('<BHHHHB', 2, w, h, n, int(round(fps * 100)), len(PAL))
    pal = bytes(sum(([int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in PAL), []))
    body = bytearray(); prev = None
    for q in frames:
        flat = q.ravel()
        body += (flat ^ prev).tobytes() if prev is not None else flat.tobytes()
        prev = flat
    gz = gzip.compress(head + pal + bytes(body), 9)
    open(path, 'wb').write(gz)
    return len(gz)
