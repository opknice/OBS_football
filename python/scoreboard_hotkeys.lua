--[[
Scoreboard Hotkeys Bridge (Lua Version)
-----------------------------------------
ลงทะเบียน OBS Hotkeys (Settings > Hotkeys) สำหรับแต่ละปุ่มใน Scoreboard Dock
แล้วส่งคำสั่งผ่าน file-based IPC ให้หน้า dock (main.js) รับไปกดปุ่มแทน

วิธีใช้:
1. Tools > Scripts > + > เลือกไฟล์นี้
2. ไปที่ Settings > Hotkeys จะเห็นหมวด "Scoreboard: ..." ครบทุกปุ่ม
3. ตั้งปุ่มลัดที่ต้องการ
4. แนะนำ: Settings > General > Advanced > Hotkey Focus Behavior ให้เลือก "Never Disable Hotkeys"
]]

obs = obslua

-- Path ของไฟล์ที่จะใช้สื่อสารกับ JavaScript
local COMMAND_FILE = os.getenv("TEMP") .. "\\obs_scoreboard_command.txt"
local TIMESTAMP_FILE = os.getenv("TEMP") .. "\\obs_scoreboard_timestamp.txt"

-- action_id -> (คำอธิบายที่จะไปโชว์ใน Settings>Hotkeys, ชื่อ action ที่จะส่งให้ JS)
local ACTIONS = {
    {id = "sb_play1",        desc = "Scoreboard: เริ่มครึ่งแรก",      action = "play1"},
    {id = "sb_halfpause",    desc = "Scoreboard: พักครึ่งแรก",        action = "halfpause"},
    {id = "sb_play2",        desc = "Scoreboard: เริ่มครึ่งหลัง",      action = "play2"},
    {id = "sb_fullend",      desc = "Scoreboard: จบเกม",             action = "fullend"},
    {id = "sb_swap",         desc = "Scoreboard: สลับทีม",            action = "swap"},
    {id = "sb_scoreAplus",   desc = "Scoreboard: เพิ่มคะแนน A",        action = "scoreAplus"},
    {id = "sb_scoreAminus",  desc = "Scoreboard: ลดคะแนน A",          action = "scoreAminus"},
    {id = "sb_scoreBplus",   desc = "Scoreboard: เพิ่มคะแนน B",        action = "scoreBplus"},
    {id = "sb_scoreBminus",  desc = "Scoreboard: ลดคะแนน B",          action = "scoreBminus"},
    {id = "sb_hidetimer",    desc = "Scoreboard: ซ่อน/แสดงเวลา",       action = "hidetimer"},
    {id = "sb_injuryplus",   desc = "Scoreboard: เพิ่มทดเวลา",         action = "injuryplus"},
    {id = "sb_injuryminus",  desc = "Scoreboard: ลดทดเวลา",           action = "injuryminus"},
}

local hotkey_ids = {}

-- ส่งคำสั่งผ่าน file
function send_command(action_name)
    -- เขียนคำสั่งลงไฟล์
    local file = io.open(COMMAND_FILE, "w")
    if file then
        file:write(action_name)
        file:close()
        print("[scoreboard_hotkeys] Sent command: " .. action_name)
        
        -- อัปเดต timestamp เพื่อให้ JS รู้ว่ามีคำสั่งใหม่
        local ts_file = io.open(TIMESTAMP_FILE, "w")
        if ts_file then
            ts_file:write(tostring(os.time()))
            ts_file:close()
        end
    else
        print("[scoreboard_hotkeys] Failed to write command file")
    end
end

-- สร้าง callback สำหรับแต่ละ hotkey
function create_callback(action_name)
    return function(pressed)
        if pressed then
            send_command(action_name)
        end
    end
end

-- ฟังก์ชันที่ OBS เรียกเมื่อโหลด script
function script_load(settings)
    for i, action_data in ipairs(ACTIONS) do
        local hk_id = obs.obs_hotkey_register_frontend(
            action_data.id,
            action_data.desc,
            create_callback(action_data.action)
        )
        hotkey_ids[action_data.id] = hk_id
        
        -- โหลด hotkey bindings ที่บันทึกไว้
        local hotkey_save_array = obs.obs_data_get_array(settings, action_data.id)
        obs.obs_hotkey_load(hk_id, hotkey_save_array)
        obs.obs_data_array_release(hotkey_save_array)
    end
    
    print("[scoreboard_hotkeys] Lua script loaded successfully")
    print("[scoreboard_hotkeys] Command file: " .. COMMAND_FILE)
end

-- ฟังก์ชันที่ OBS เรียกเมื่อบันทึก settings
function script_save(settings)
    for i, action_data in ipairs(ACTIONS) do
        local hk_id = hotkey_ids[action_data.id]
        if hk_id then
            local hotkey_save_array = obs.obs_hotkey_save(hk_id)
            obs.obs_data_set_array(settings, action_data.id, hotkey_save_array)
            obs.obs_data_array_release(hotkey_save_array)
        end
    end
end

-- ฟังก์ชันที่ OBS เรียกเมื่อถอน script
function script_unload()
    -- ลบไฟล์คำสั่ง
    os.remove(COMMAND_FILE)
    os.remove(TIMESTAMP_FILE)
    print("[scoreboard_hotkeys] Lua script unloaded")
end

-- คำอธิบาย script
function script_description()
    return [[
<h2>Scoreboard Hotkeys Bridge (Lua)</h2>
<p>เชื่อม OBS Hotkeys เข้ากับปุ่มใน Scoreboard Dock ผ่าน file-based IPC</p>
<p><strong>ไม่ต้องติดตั้งอะไรเพิ่ม!</strong> Lua script ทำงานได้ทันที</p>
<br>
<p><strong>วิธีใช้:</strong></p>
<ol>
<li>ไปที่ Settings → Hotkeys</li>
<li>หาหมวด "Scoreboard: ..."</li>
<li>ตั้งปุ่มลัดที่ต้องการ</li>
<li>Settings → General → Advanced → Hotkey Focus Behavior เลือก "Never Disable Hotkeys"</li>
</ol>
<br>
<p><strong>หมายเหตุ:</strong> ไฟล์คำสั่งจะถูกเขียนที่ %TEMP%\obs_scoreboard_command.txt</p>
]]
end

-- ไม่มี properties ให้ตั้งค่า
function script_properties()
    local props = obs.obs_properties_create()
    return props
end
