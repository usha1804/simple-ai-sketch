import sys
from pipeline import run_pipeline

img = "models/pexels-pixabay-157661.jpg"

try:
    r = run_pipeline(img, detail_level=3, max_strokes=600,
                     use_hed=False, remove_bg=False, coloring_book=False,
                     crosshatch=False, paper_texture=False, watercolour=False, webcam=False)
    print(f"CANNY  OK  paths={r['total']}  engine={r['engine']}")
except Exception as e:
    print(f"CANNY  FAIL  {e}")

try:
    r2 = run_pipeline(img, detail_level=3, max_strokes=600,
                      use_hed=True, remove_bg=False, coloring_book=False,
                      crosshatch=False, paper_texture=False, watercolour=False, webcam=False)
    print(f"HED    OK  paths={r2['total']}  engine={r2['engine']}")
except Exception as e:
    print(f"HED    FAIL  {e}")

try:
    r3 = run_pipeline(img, detail_level=5, max_strokes=2200,
                      use_hed=False, remove_bg=False, coloring_book=False,
                      crosshatch=False, paper_texture=True, watercolour=True, webcam=False)
    print(f"WC+PT  OK  paths={r3['total']}  engine={r3['engine']}")
except Exception as e:
    print(f"WC+PT  FAIL  {e}")

try:
    r4 = run_pipeline(img, detail_level=5, max_strokes=2200,
                      use_hed=True, remove_bg=True, coloring_book=False,
                      crosshatch=False, paper_texture=True, watercolour=True, webcam=False)
    print(f"HED+RBG+WC OK  paths={r4['total']}  engine={r4['engine']}")
except Exception as e:
    print(f"HED+RBG+WC FAIL  {e}")
