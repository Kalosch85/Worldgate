"""Pure-stdlib PNG decode/encode + background keying + connected-component slice.

Only handles 8-bit non-interlaced PNGs (RGB color type 2 / RGBA type 6),
which is what the art-src sheets are. No third-party deps.
"""
import struct, zlib, sys
from collections import deque

def decode(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', "not a png"
    i = 8
    w = h = bd = ct = itl = None
    idat = bytearray()
    while i < len(data):
        ln = struct.unpack('>I', data[i:i+4])[0]
        typ = data[i+4:i+8]
        chunk = data[i+8:i+8+ln]
        if typ == b'IHDR':
            w, h, bd, ct, comp, filt, itl = struct.unpack('>IIBBBBB', chunk)
        elif typ == b'IDAT':
            idat += chunk
        i += 12 + ln
    assert bd == 8 and itl == 0, f"unsupported bd={bd} interlace={itl}"
    ch = {2: 3, 6: 4, 0: 1, 4: 2}[ct]
    raw = zlib.decompress(bytes(idat))
    stride = w * ch
    out = bytearray(w * h * ch)
    prev = bytearray(stride)
    pos = 0
    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
        if pa <= pb and pa <= pc: return a
        if pb <= pc: return b
        return c
    for y in range(h):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos+stride]); pos += stride
        if ft == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x-ch]) & 255
        elif ft == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 255
        elif ft == 3:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255
        elif ft == 4:
            for x in range(stride):
                a = line[x-ch] if x >= ch else 0
                c = prev[x-ch] if x >= ch else 0
                line[x] = (line[x] + paeth(a, prev[x], c)) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    # normalize to RGBA
    rgba = bytearray(w*h*4)
    for p in range(w*h):
        if ch == 3:
            rgba[p*4:p*4+3] = out[p*3:p*3+3]; rgba[p*4+3] = 255
        elif ch == 4:
            rgba[p*4:p*4+4] = out[p*4:p*4+4]
        elif ch == 1:
            v = out[p]; rgba[p*4:p*4+3] = bytes([v,v,v]); rgba[p*4+3]=255
        else:
            v = out[p*2]; rgba[p*4:p*4+3]=bytes([v,v,v]); rgba[p*4+3]=out[p*2+1]
    return w, h, rgba

def encode(path, w, h, rgba):
    stride = w*4
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += rgba[y*stride:(y+1)*stride]
    comp = zlib.compress(bytes(raw), 9)
    def chunk(typ, payload):
        c = struct.pack('>I', len(payload)) + typ + payload
        return c + struct.pack('>I', zlib.crc32(typ+payload) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', comp))
        f.write(chunk(b'IEND', b''))

def crop(w, h, rgba, x0, y0, cw, ch):
    """Copy an (x0,y0,cw,ch) sub-rectangle out of an RGBA buffer, preserving the
    existing alpha channel (no keying)."""
    out = bytearray(cw * ch * 4)
    for yy in range(ch):
        srow = ((y0 + yy) * w + x0) * 4
        out[yy * cw * 4 : (yy + 1) * cw * 4] = rgba[srow : srow + cw * 4]
    return out


def bg_mask(w, h, rgba, tol):
    """Flood-fill from all borders; a neighbor joins background if within `tol`
    (per-channel max) of any border-sampled reference color. Returns bytearray
    mask, 1=background."""
    refs = []
    seen = set()
    def sample(x, y):
        p = (y*w+x)*4
        col = (rgba[p], rgba[p+1], rgba[p+2])
        q = (col[0]>>3, col[1]>>3, col[2]>>3)
        if q not in seen:
            seen.add(q); refs.append(col)
    for x in range(w):
        sample(x, 0); sample(x, h-1)
    for y in range(h):
        sample(0, y); sample(w-1, y)
    def is_bg(p):
        r, g, b = rgba[p], rgba[p+1], rgba[p+2]
        for cr, cg, cb in refs:
            if abs(r-cr) <= tol and abs(g-cg) <= tol and abs(b-cb) <= tol:
                return True
        return False
    mask = bytearray(w*h)
    dq = deque()
    for x in range(w):
        for y in (0, h-1):
            idx = y*w+x
            if not mask[idx] and is_bg(idx*4):
                mask[idx] = 1; dq.append(idx)
    for y in range(h):
        for x in (0, w-1):
            idx = y*w+x
            if not mask[idx] and is_bg(idx*4):
                mask[idx] = 1; dq.append(idx)
    while dq:
        idx = dq.popleft()
        x, y = idx % w, idx // w
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny*w+nx
                if not mask[nidx] and is_bg(nidx*4):
                    mask[nidx] = 1; dq.append(nidx)
    return mask

def components(w, h, mask, min_area):
    """Connected components of foreground (mask==0). Returns list of
    (area, x0, y0, x1, y1, set_of_indices) sorted by area desc."""
    seen = bytearray(w*h)
    comps = []
    for start in range(w*h):
        if mask[start] or seen[start]:
            continue
        dq = deque([start]); seen[start] = 1
        pix = []
        x0 = y0 = 10**9; x1 = y1 = -1
        while dq:
            idx = dq.popleft()
            pix.append(idx)
            x, y = idx % w, idx // w
            if x < x0: x0 = x
            if y < y0: y0 = y
            if x > x1: x1 = x
            if y > y1: y1 = y
            for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nidx = ny*w+nx
                    if not mask[nidx] and not seen[nidx]:
                        seen[nidx] = 1; dq.append(nidx)
        if len(pix) >= min_area:
            comps.append((len(pix), x0, y0, x1, y1, pix))
    comps.sort(key=lambda c: -c[0])
    return comps

def dilate_mask_into(w, h, rgba, comp_pixset, pad):
    pass

def extract(w, h, rgba, mask, comp, pad=6):
    """Return (cw, ch, rgba_crop) for one component: pixels in the component's
    bbox, alpha 0 where mask==background, plus a small padding border."""
    area, x0, y0, x1, y1, pix = comp
    x0 = max(0, x0-pad); y0 = max(0, y0-pad)
    x1 = min(w-1, x1+pad); y1 = min(h-1, y1+pad)
    cw, ch = x1-x0+1, y1-y0+1
    out = bytearray(cw*ch*4)
    for yy in range(ch):
        for xx in range(cw):
            sx, sy = x0+xx, y0+yy
            sidx = sy*w+sx
            di = (yy*cw+xx)*4
            out[di:di+3] = rgba[sidx*4:sidx*4+3]
            out[di+3] = 0 if mask[sidx] else 255
    return cw, ch, out
