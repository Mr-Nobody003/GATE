import cv2
import numpy as np
import pymupdf


def get_page_images(page):
    """All embedded raster images on a page, with bbox in PDF point units."""
    return page.get_image_info()


def _looks_like_qr(info, min_size=20, aspect_tol=0.2):
    x0, y0, x1, y1 = info["bbox"]
    w, h = x1 - x0, y1 - y0
    if w < min_size or h < min_size:
        return False
    return abs(w - h) / max(w, h) <= aspect_tol


def render_region(page, bbox, zoom=4):
    """Render a page region at high zoom, return as an OpenCV BGR array."""
    mat = pymupdf.Matrix(zoom, zoom)
    clip = pymupdf.Rect(bbox)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 3:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    return img


def render_region_png_bytes(page, bbox, zoom=4, pad=2):
    """Render a page region at high zoom, return PNG bytes (for the vision call)."""
    x0, y0, x1, y1 = bbox
    padded = (x0 - pad, y0 - pad, x1 + pad, y1 + pad)
    mat = pymupdf.Matrix(zoom, zoom)
    clip = pymupdf.Rect(padded)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return pix.tobytes("png")


def decode_qr(page, info, zoom=6):
    """Try to decode a QR code image region. Returns the URL string or None."""
    img = render_region(page, info["bbox"], zoom=zoom)
    detector = cv2.QRCodeDetector()
    data, _, _ = detector.detectAndDecode(img)
    return data or None


def classify_page_images(page):
    """
    Split a page's embedded images into (qr_infos, glyph_infos).
    qr_infos are further resolved to their decoded URL where possible.
    """
    qr_results = []
    glyph_infos = []
    for info in get_page_images(page):
        if _looks_like_qr(info):
            url = decode_qr(page, info)
            qr_results.append({"bbox": info["bbox"], "url": url})
        else:
            glyph_infos.append(info)
    return qr_results, glyph_infos


def cluster_boxes(bboxes, gap=6.0):
    """
    Merge nearby/overlapping bounding boxes into larger regions -- turns a
    scatter of individual math-glyph images into per-formula crop regions.
    bboxes: list of (x0, y0, x1, y1). Returns list of merged (x0,y0,x1,y1).
    """
    boxes = [list(b) for b in bboxes]

    def expand(b):
        return (b[0] - gap, b[1] - gap, b[2] + gap, b[3] + gap)

    def overlaps(a, b):
        ax0, ay0, ax1, ay1 = expand(a)
        bx0, by0, bx1, by1 = b
        return not (ax1 < bx0 or bx1 < ax0 or ay1 < by0 or by1 < ay0)

    merged = True
    while merged:
        merged = False
        out = []
        used = [False] * len(boxes)
        for i in range(len(boxes)):
            if used[i]:
                continue
            cur = boxes[i]
            used[i] = True
            for j in range(i + 1, len(boxes)):
                if used[j]:
                    continue
                if overlaps(cur, boxes[j]):
                    cur = [
                        min(cur[0], boxes[j][0]), min(cur[1], boxes[j][1]),
                        max(cur[2], boxes[j][2]), max(cur[3], boxes[j][3]),
                    ]
                    used[j] = True
                    merged = True
            out.append(cur)
        boxes = out
    return [tuple(b) for b in boxes]


def math_regions_in_band(glyph_infos, y0, y1, gap=6.0):
    """Cluster only the glyph images whose bbox falls within [y0, y1] -- i.e.
    belonging to one specific question's vertical span on the page."""
    band_boxes = [
        info["bbox"] for info in glyph_infos
        if info["bbox"][1] >= y0 - 1 and info["bbox"][3] <= y1 + 1
    ]
    return cluster_boxes(band_boxes, gap=gap)
