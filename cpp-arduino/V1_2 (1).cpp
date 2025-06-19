/*******************************
 *  Lawyer‑Timer  v1.2  (Mega 2560)
 *  TC1602A‑21T3  |  DS3231  |  MC206H
 *  2025‑06‑17
 *  Based on Yvonne Peng v1.1
 *  ----------------------------------
 *  ‣ 主循环无阻塞：取消 delay(200)，用 millis() 节拍刷新 LCD
 *  ‣ 仍使用外部下拉电阻：BTN_PIN 维持 INPUT，按下检测 debouncer.rose()
 *  ‣ Units 仅两位显示，>99 时界面封顶显示 99；打印 slip 保留真实值
 *  ‣ line2 缓冲区仍为 17 字节（"HH:MM:SS RUN 99" =15）
 *******************************/
#include <Wire.h>
#include <RTClib.h>
#include <Bounce2.h>
#include <Adafruit_Thermal.h>
#include <avr/pgmspace.h>

/******** Surprise messages ********/
const char PROGMEM surprise0[] = "Wife always wins.";
const char PROGMEM surprise1[] = "Coffee is billed separately";
const char PROGMEM surprise2[] = "Time is money—literally!";
const char PROGMEM surprise3[] = "Your wife is missing you.";
const char PROGMEM surprise4[] = "Case closed. Have a nice day.";
const char* const SURPRISE_TABLE[] PROGMEM = {
  surprise0, surprise1, surprise2, surprise3, surprise4
};
const uint8_t SURPRISE_COUNT = sizeof(SURPRISE_TABLE)/sizeof(SURPRISE_TABLE[0]);

/********  LCD  ********/
#define LCD_PARALEL                  // 注：若用 I2C，注释掉此行并定义 LCD_I2C
#ifdef LCD_I2C
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(0x27, 16, 2);
#else
  #include <LiquidCrystal.h>
  LiquidCrystal lcd(33, 31, 29, 27, 25, 23); // RS,E,D4,D5,D6,D7
#endif
const char *DOW_SHORT[7] = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};

/********  RTC  ********/
RTC_DS3231 rtc;

/* ========  Auto‑Calibrate helpers  ======== */
bool rtcNeedsCalib() {
  if (!rtc.lostPower()) return false;              // OSF=0 → 正常运行
  DateTime buildTS = DateTime(F(__DATE__), F(__TIME__));
  DateTime nowRTC  = rtc.now();
  return (buildTS.unixtime() - nowRTC.unixtime()) > 120; // 编译时间比 RTC 至少新 2 分钟才写
}
void calibrateRTC() {
  rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
}

/********  Printer  ********/
#define PRINTER_RX 18                // Mega TX1 → Printer RX
Adafruit_Thermal printer(&Serial1);

/********  Button (external pulldown)  ********/
const uint8_t BTN_PIN = 2;           // LOW 空闲，HIGH 按下
Bounce debouncer;

/********  State & globals  ********/
enum State {IDLE, RUNNING};
State state = IDLE;
DateTime startTime, endTime;
const uint16_t MIN_UNIT = 6;         // 6 分钟为一个计费单元

unsigned long lastLcdRefresh = 0;    // millis 节拍
const uint16_t LCD_PERIOD_MS = 250;  // LCD 每 250 ms 刷一次

/********  Forward declarations  ********/
void updateLCD();
void handleButtonPress();
void printSlip(const DateTime&, const DateTime&, uint32_t);
void maybePrintSurprise(uint8_t pctChance = 30);

/********  Setup  ********/
void setup() {
  /* Serial for debug */
  Serial.begin(115200);

  /* Printer */
  Serial1.begin(9600);
  printer.begin();

  /* I2C devices */
  Wire.begin();
  if (!rtc.begin()) while(true);     // 卡死以提示硬件问题
  if (rtcNeedsCalib()) calibrateRTC();

  /* Button with external 1 kΩ pulldown */
  pinMode(BTN_PIN, INPUT);           // 默认 LOW，按下 HIGH
  debouncer.attach(BTN_PIN);
  debouncer.interval(25);

  randomSeed(analogRead(A15));       // 随机种子

#ifdef LCD_I2C
  lcd.init(); lcd.backlight();
#else
  lcd.begin(16, 2);
#endif
  lcd.clear();
  lcd.print("TIMER‑PRINTER");
  delay(1200);
}

/********  Main loop  ********/
void loop() {
  debouncer.update();
  if (debouncer.rose()) handleButtonPress();  // LOW→HIGH 检测

  unsigned long nowMs = millis();
  if (nowMs - lastLcdRefresh >= LCD_PERIOD_MS) {
    updateLCD();
    lastLcdRefresh = nowMs;
  }
}

/********  Handle button  ********/
void handleButtonPress() {
  if (state == IDLE) {
    startTime = rtc.now();
    state = RUNNING;

    lcd.clear();
    lcd.print("START");
    delay(300);                       // 视觉闪一下即可
  } else {
    endTime = rtc.now();
    uint32_t elapsedMin = (endTime.unixtime() - startTime.unixtime()) / 60;
    uint32_t units = (elapsedMin + MIN_UNIT - 1) / MIN_UNIT;
    if (units == 0) units = 1;

    /* UI 反馈 */
    lcd.clear();
    lcd.print("PRINT units:");
    uint8_t uiUnits = units > 99 ? 99 : units;  // UI 只显两位
    if (uiUnits < 10) lcd.print('0');
    lcd.print(uiUnits);

    /* 打印耗时动作放后面 */
    printSlip(startTime, endTime, units);

    state = IDLE;
  }
}

/********  LCD refresh  ********/
void updateLCD() {
  DateTime now = rtc.now();
  char line1[17];
  char line2[17];

  snprintf(line1, sizeof(line1), "%s %04u/%02u/%02u",
           DOW_SHORT[now.dayOfTheWeek()], now.year(), now.month(), now.day());

  if (state == RUNNING) {
    uint32_t elapsed = (now.unixtime() - startTime.unixtime()) / 60;
    uint32_t units   = (elapsed + MIN_UNIT - 1) / MIN_UNIT;
    if (units == 0) units = 1;
    uint8_t uiUnits = units > 99 ? 99 : units;
    snprintf(line2, sizeof(line2), "%02u:%02u:%02u RUN %02u",
             now.hour(), now.minute(), now.second(), uiUnits);
  } else {
    snprintf(line2, sizeof(line2), "%02u:%02u:%02u units:00",
             now.hour(), now.minute(), now.second());
  }

  lcd.setCursor(0,0); lcd.print(line1); lcd.print("   ");
  lcd.setCursor(0,1); lcd.print(line2); lcd.print("   ");
}

/********  Surprise  ********/
void maybePrintSurprise(uint8_t pctChance) {
  if (random(100) < pctChance) {
    printer.feed(1);
    printer.inverseOn();
    printer.println(F(">>> SURPRISE <<<"));
    printer.inverseOff();

    char buf[64];
    uint8_t idx = random(SURPRISE_COUNT);
    strcpy_P(buf, (PGM_P)pgm_read_ptr(&SURPRISE_TABLE[idx]));
    printer.boldOn();
    printer.println(buf);
    printer.boldOff();
    printer.feed(1);
  }
}

/********  Print slip  ********/
void printSlip(const DateTime& s, const DateTime& e, uint32_t units) {
  printer.feed(1);
  printer.println(F("==========================="));
  printer.println(F("TIMER REPORT"));

  printer.print(F("Start: "));
  printer.print(s.year());  printer.print('/');
  printer.print(s.month()); printer.print('/');
  printer.print(s.day());   printer.print(' ');
  printer.print(s.hour());  printer.print(':');
  printer.println(s.minute());

  printer.print(F("End  : "));
  printer.print(e.year());  printer.print('/');
  printer.print(e.month()); printer.print('/');
  printer.print(e.day());   printer.print(' ');
  printer.print(e.hour());  printer.print(':');
  printer.println(e.minute());

  printer.boldOn();
  printer.print(F("Units : "));
  printer.println(units);
  printer.boldOff();

  printer.println(F("Project:"));
  printer.println(F("Notes  :"));
  printer.println();
  printer.println(F(">> Yuqiao.H."));
  printer.println(F(">> Fields Howell LLP"));

  printer.write(0x1B); printer.write(0x34); // Italic ON
  printer.println(F("Happy Wife Happy Life"));
  printer.write(0x1B); printer.write(0x35); // Italic OFF
  printer.println(F("==========================="));

  printer.feed(3);
  maybePrintSurprise();
}
