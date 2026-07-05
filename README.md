ฉันได้ศึกษาโปรเจค OBS Football Scoreboard Controller แล้ว นี่คือภาพรวมของระบบ:

## โครงสร้างโปรเจค

### 1. **index.html** - หน้าควบคุมคะแนน
- UI สำหรับควบคุมคะแนนฟุตบอลแบบเรียลไทม์
- รองรับหลายภาษา (ไทย, อังกฤษ, เกาหลี, ลาว, เขมร, โปรตุเกส, สเปน)
- ฟีเจอร์หลัก:
  - แก้ไขชื่อทีม A/B พร้อมโลโก้
  - เลือกสีชุดทีม (Color 1, Color 2) พร้อมปุ่ม Quick Color
  - ควบคุมคะแนน (+/-)
  - จับเวลาแมตช์ (นับขึ้น/นับถอยหลัง)
  - ครึ่งแรก/ครึ่งหลัง พักครึ่ง จบเกม
  - Injury Time (+/-)
  - โหลดข้อมูลจาก Excel (Match ID)
  - บันทึกผลการแข่งขันไปยัง Firebase

### 2. **fcp_v2_assets/main.js** - Logic หลัก
- **การจัดการ Excel:**
  - Auto-detect column mapping (รองรับชื่อคอลัมน์หลากหลาย)
  - อ่านข้อมูลแมตช์จากชีต Matching/Matches/Match
  - อ่านสีทีมจากชีต Team (ใช้ ExcelJS อ่าน fill color)
  - อ่าน Firebase config จากชีต FirebaseRealtimeDatabase

- **การเชื่อมต่อ OBS:**
  - ใช้ obs-websocket-js v5
  - อัพเดท Text Sources (ชื่อทีม, คะแนน, เวลา, ครึ่ง)
  - อัพเดท Image Sources (โลโก้ทีม)
  - อัพเดท Color Sources (สีชุดทีม)
  - รับ Custom Events จาก OBS Hotkeys (play1, halfpause, swap, score+/-, etc.)

- **Firebase Integration:**
  - รองรับหลาย Firebase Database (ตามที่กำหนดใน Excel)
  - บันทึกผลแมตช์: teamA, teamB, scoreA, scoreB, roundLabel, date
  - สร้างปุ่มบันทึกอัตโนมัติตาม Firebase config

- **Team Management:**
  - จดจำสีชุดแต่ละทีม (localStorage)
  - เปิด Team Selector Popup เลือกทีมจาก Excel
  - แก้ไชื่อทีมแบบ inline

### 3. **VAR 38+.xlsx** - ไฟล์ตัวอย่าง
มี 4 ชีต:
- **Matching**: ข้อมูลคู่แข่ง (Match ID, Team A/B, Logo, Colors, Labels)
- **Team**: รายชื่อทีมพร้อมสีชุด (Color_1, Color_2)
- **FirebaseRealtimeDatabase**: Firebase config หลายลีก (League Name + JavaScript firebaseConfig object)
- **Sheet4**: ข้อมูลเพิ่มเติม

## Flow การใช้งาน

1. **โหลด Excel** → อ่านข้อมูลแมตช์ + สีทีม + Firebase config
2. **เลือก Match ID** → โหลดข้อมูลทีม A/B, โลโก้, สี, labels
3. **ควบคุมในเกม** → คะแนน, เวลา, ครึ่ง → ส่งไป OBS
4. **บันทึกผล** → เลือกลีก → บันทึกไป Firebase Realtime Database

## จุดเด่น

✅ รองรับสีชุดจาก Excel (ExcelJS อ่าน fill color theme/ARGB/tint)  
✅ บันทึกสีที่ใช้ล่าสุดของแต่ละทีม  
✅ Auto-detect Excel column names (ยืดหยุ่นมาก)  
✅ OBS Hotkey bridge (ควบคุมด้วย keyboard ผ่าน OBS)  
✅ Multi-language support  
✅ Multi-Firebase database support  
