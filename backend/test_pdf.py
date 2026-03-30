from reportlab.pdfgen import canvas as rl_canvas
import io

def paths_to_pdf_bytes(paths, width, height):
    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=(width, height))
    c.setStrokeColorRGB(0.1, 0.1, 0.15)
    c.setLineWidth(1.2)
    c.setLineCap(1)
    for path in paths:
        if len(path) < 2:
            continue
        pts = [(p[0], height - p[1]) for p in path]
        c.moveTo(pts[0][0], pts[0][1])
        for pt in pts[1:]:
            c.lineTo(pt[0], pt[1])
        c.stroke()
    c.save()
    return buf.getvalue()

# Test with dummy paths
test_paths = [
    [[10,10],[50,50],[100,30]],
    [[200,200],[250,180],[300,220]],
]
result = paths_to_pdf_bytes(test_paths, 800, 600)
print(f"PDF OK: {len(result)} bytes")

# Save test PDF
with open("test_output.pdf", "wb") as f:
    f.write(result)
print("Saved test_output.pdf — open it to verify")