# 🎨 AI Sketch Studio

AI Sketch Studio is a full-stack application that transforms images, videos, webcam input, and text into artistic sketch-style outputs using advanced computer vision and deep learning techniques.

---

## 🚀 Features

* 🖼️ **Image to Sketch** – Convert images into clean pencil sketches
* 🎥 **Video Processing** – Transform videos into sketch animations
* 📷 **Webcam Sketching** – Real-time sketch generation using webcam
* ✍️ **Text to Sketch** – Generate sketches from text prompts
* 🎨 **Drawing Canvas** – Interactive sketch drawing and coloring
* ⚡ **Real-time Processing** – Fast and efficient pipeline using optimized algorithms

---

## 🧠 Tech Stack

### 🔹 Frontend

* React.js (Vite)
* HTML, CSS, JavaScript
* Axios (API calls)

### 🔹 Backend

* FastAPI (Python)
* OpenCV (Image Processing)
* NumPy, SciPy
* HED (Holistically-Nested Edge Detection)

### 🔹 Tools & Libraries

* WebSocket (real-time updates)
* rembg (background removal)
* FFmpeg (video processing)

---

## 🏗️ Project Structure

```
simple-ai-sketch/
│
├── backend/
│   ├── models/
│   ├── uploads/
│   ├── outputs/
│   ├── pipeline.py
│   ├── video_pipeline.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```
git clone https://github.com/usha1804/simple-ai-sketch.git
cd simple-ai-sketch
```

---

### 2️⃣ Backend Setup

```
cd backend
python -m venv venv
venv\Scripts\activate   # Windows

pip install -r requirements.txt
uvicorn main:app --reload
```

---

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

---

## 🔄 Workflow / Pipeline

1. Input (Image / Video / Webcam / Text)
2. Preprocessing (Resize, Normalize)
3. Edge Detection (Canny / HED Model)
4. Region Segmentation
5. Stroke Rendering
6. Output Generation (Sketch)

---

## 📊 Real-World Applications

* 🎬 Video Editing & Animation
* 🎨 Digital Art & Design Tools
* 📚 Education & Learning Tools
* 📱 Social Media Filters
* 🧑‍💻 Creative AI Applications

---

## 📸 Screenshots (Add yours)

> Add UI screenshots here for better presentation

---

## 📌 Future Enhancements

* 🧠 AI Style Transfer (cartoon, anime)
* ☁️ Cloud Deployment (AWS / Docker)
* 📱 Mobile App (React Native)
* ⚡ Performance Optimization

---

## 🤝 Contributing

Feel free to fork this repo and submit a pull request.

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👤 Author

**Surapally Usha**

* GitHub: https://github.com/usha1804

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
