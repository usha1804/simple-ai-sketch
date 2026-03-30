"""
Run this in backend folder:
  python check_video_endpoints.py

Checks if video streaming endpoints are registered in main.py
"""
import pathlib

main_content = pathlib.Path("main.py").read_text(encoding="utf-8")

checks = {
    "/api/video/stream/{job_id}": 'video/stream/{job_id}' in main_content,
    "/api/video/animate":         'video/animate'         in main_content,
    "input_path in job dict":     '"input_path"'          in main_content,
    "VideoAnimate handler":       'VideoAnimate'          in main_content,
    "VideoStream handler":        'VideoStream'           in main_content,
    "port 8002":                  'port=8002'             in main_content,
}

print("main.py endpoint check:")
all_ok = True
for name, ok in checks.items():
    print(f"  {'OK  ' if ok else 'MISS'} {name}")
    if not ok:
        all_ok = False

print()
if all_ok:
    print("All OK — restart backend and try again")
else:
    print("MISSING endpoints — download new main.py and replace backend\\main.py")
    print("Then restart: python main.py")