# Dashboard รายงานสถานะแผนงาน/โครงการ ปีงบประมาณ 2569

Web Dashboard แบบ static สำหรับเผยแพร่ผ่าน GitHub Pages

## เปิดใช้งาน
เปิด `index.html` ในเว็บเบราว์เซอร์ หรืออัปโหลดไฟล์ทั้งหมดเข้า GitHub repository แล้วเปิด Settings → Pages → Deploy from a branch → `main` / `(root)`.

## ไฟล์
- `index.html` หน้า Dashboard
- `style.css` ธีมเขียว–ครีม–ทอง
- `data.js` ข้อมูลโครงการจาก Excel
- `script.js` KPI, กราฟ, การค้นหาและตัวกรอง

> หมายเหตุ: ใช้ Chart.js ผ่าน CDN จึงต้องเชื่อมต่ออินเทอร์เน็ตเพื่อแสดงกราฟ
