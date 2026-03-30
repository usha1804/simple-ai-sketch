import numpy as np
import cv2

print("=" * 50)
print("AI Sketch Studio - Diagnostic Test")
print("=" * 50)
print()

# Test 1: detect_screen_photo
print("1. Testing detect_screen_photo...")
try:
    from pipeline import detect_screen_photo
    bgr = np.zeros((100, 100, 3), dtype=np.uint8)
    result = detect_screen_photo(bgr)
    print("   OK:", result)
except Exception as e:
    print("   FAILED:", e)

# Test 2: auto_detect_style
print("2. Testing auto_detect_style...")
try:
    from pipeline import auto_detect_style
    bgr = np.zeros((100, 100, 3), dtype=np.uint8)
    result = auto_detect_style(bgr)
    print("   OK:", result['label'])
except Exception as e:
    print("   FAILED:", e)

# Test 3: run_pipeline signature
print("3. Testing run_pipeline signature...")
try:
    import inspect
    from pipeline import run_pipeline
    sig    = inspect.signature(run_pipeline)
    params = list(sig.parameters.keys())
    print("   Parameters:", params)
    needed = ['coloring_book','crosshatch','remove_bg','paper_texture','watercolour']
    for p in needed:
        print(f"   {'OK  ' if p in params else 'MISS'}: {p}")
except Exception as e:
    print("   FAILED:", e)

# Test 4: full run_pipeline with dummy image
print("4. Testing full run_pipeline call...")
try:
    import tempfile, os
    from pipeline import run_pipeline
    test_img = np.random.randint(50, 200, (200, 200, 3), dtype=np.uint8)
    tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    cv2.imwrite(tmp.name, test_img)
    tmp.close()
    result = run_pipeline(tmp.name, detail_level=3, max_strokes=100,
                          use_hed=False, remove_bg=False,
                          coloring_book=False, crosshatch=False,
                          paper_texture=False, watercolour=False)
    os.unlink(tmp.name)
    print(f"   OK: {result['total']} paths, engine={result['engine']}")
except Exception as e:
    print("   FAILED:", e)
    import traceback; traceback.print_exc()

# Test 5: backend on 8002
print("5. Testing backend on port 8002...")
try:
    import urllib.request
    with urllib.request.urlopen("http://127.0.0.1:8002/api/health", timeout=3) as r:
        print("   OK:", r.read().decode())
except Exception as e:
    print("   FAILED:", e)
    print("   Start backend first: python main.py")

# Test 6: packages
print("6. Checking packages...")
packages = [
    ("cv2","OpenCV"),("numpy","NumPy"),("PIL","Pillow"),
    ("skimage","scikit-image"),("aiofiles","aiofiles"),
    ("rembg","rembg"),("onnxruntime","onnxruntime"),
    ("imageio","imageio"),("reportlab","reportlab"),
]
missing = []
for mod, name in packages:
    try:
        __import__(mod)
        print(f"   OK   {name}")
    except ImportError:
        print(f"   MISS {name}")
        missing.append(mod)

print()
print("=" * 50)
if missing:
    print("Run: pip install", " ".join(missing))
else:
    print("All packages OK!")
print("=" * 50)