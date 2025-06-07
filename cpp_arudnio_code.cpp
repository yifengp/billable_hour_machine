/*******************************
 *  Lawyer-Timer  v1.1  (Mega 2560)
 *  TC1602A-21T3  |  DS3231  |  MC206H
 *  2025-06-02
 * Creator Yvonne Peng
 *******************************/
#include <Wire.h>
#include <RTClib.h>
#include <Bounce2.h>
#include <Adafruit_Thermal.h>

// suprising
#include <avr/pgmspace.h>          // 放到 flash，省 SRAM

const char PROGMEM surprise0[] = "Wife always wins.";
const char PROGMEM surprise1[] = "Coffee is billed separately ☕";
const char PROGMEM surprise2[] = "Time is money—literally!";
const char PROGMEM surprise3[] = "Your wife is missing you.";
const char PROGMEM surprise4[] = "Case closed. Have a nice day.";

const char* const SURPRISE_TABLE[] PROGMEM = {
  surprise0, surprise1, surprise2, surprise3, surprise4
};
const uint8_t SURPRISE_COUNT = sizeof(SURPRISE_TABLE)/sizeof(SURPRISE_TABLE[0]);


// ====  LCD  ====
#ifdef LCD_I2C
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(0x27, 16, 2); 
#else
  #include <LiquidCrystal.h>
  LiquidCrystal lcd(33, 31, 29, 27, 25, 23); // RS,E,D4,D5,D6,D7
#endif

const char *DOW_SHORT[7] = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};

// ====  RTC  ====
RTC_DS3231 rtc;

/* ========  Auto-Calibrate helpers  ======== */
bool rtcNeedsCalib() {
  if (rtc.lostPower()) return true;          
  DateTime nowRTC  = rtc.now();
  DateTime buildTS = DateTime(F(__DATE__), F(__TIME__));
  return (buildTS.unixtime() - nowRTC.unixtime()) > 120;  // if the difference ≥2 min
}

void calibrateRTC() {
  rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));         // adjust the local time if needed
}


// ====  Thermal printer  ====
#define PRINTER_RX 18              // Mega TX1 → Printer RX
Adafruit_Thermal printer(&Serial1);

// ====  Button (pulldown)  ====
const uint8_t BTN_PIN = 2;
Bounce debouncer;                  // define the object
// ============================

enum State {IDLE, RUNNING};
State state = IDLE;

DateTime startTime, endTime;
const uint16_t MIN_UNIT = 6;       // Billable unit is 6 min

void setup() {
  // ---- Printer ----
  Serial1.begin(9600);             // using the default serial
  printer.begin();

  // ---- I²C devices ----
  Wire.begin();
  if (!rtc.begin()) for(;;);       // if RTC is not well-connected, loop; 
   if (rtcNeedsCalib()) calibrateRTC();  // check local time

  // ---- Button ----
  pinMode(BTN_PIN, INPUT);         // outside 1 k resistor → LOW as idle
  debouncer.attach(BTN_PIN);
  debouncer.interval(25);          // 25 ms removing shaking

   randomSeed(analogRead(A15));     // 任意悬空 A 引脚即可

  // ---- LCD ----
#ifdef LCD_I2C
  lcd.init(); lcd.backlight();
#else
  lcd.begin(16, 2);
#endif
  lcd.clear();
  lcd.print("TIMER-PRINTER");
  delay(1200);
}

void loop() {
  debouncer.update();
  if (debouncer.rose()) {          // LOW→HIGH ＝ push the button
    handleButtonPress();
  }
  updateLCD();
  delay(200);
}

/* -----------  处理按键  ----------- */
void handleButtonPress() {
  if (state == IDLE) {                           // ⇒ Startcounting! @YvonnePeng
    startTime = rtc.now();
    state = RUNNING;

    lcd.clear();                                 // flashing START
    lcd.print("START");
    delay(800);                                  // 0.8 s
  }
  else {                                         // ⇒ End and Print
    endTime = rtc.now();

    uint32_t elapsedMin = (endTime.unixtime() - startTime.unixtime()) / 60;
    uint32_t units = (elapsedMin + MIN_UNIT - 1) / MIN_UNIT; // around UP
    if (units == 0) units = 1;                   // At least 1

    printSlip(startTime, endTime, units);        // print altogether

    // LCD flash END for 2 seconds
    lcd.clear();
    lcd.print("END units:");
    lcd.print(units);
    delay(2000);                                 

    state = IDLE;                                // back to idle
  }
}

/* -----------  refresh LCD  ----------- */
void updateLCD() {
  DateTime now = rtc.now();
  char line1[17], line2[17];

  // Line 1: Weekday + Date
  snprintf(line1, sizeof(line1), "%s %04u/%02u/%02u",
           DOW_SHORT[now.dayOfTheWeek()],
           now.year(), now.month(), now.day());

  // Line 2: Time and Units
  if (state == RUNNING) {
    uint32_t elapsed = (now.unixtime() - startTime.unixtime()) / 60;
    uint32_t units   = (elapsed + MIN_UNIT - 1) / MIN_UNIT;
    if (units == 0) units = 1;
    snprintf(line2, sizeof(line2), "%02u:%02u:%02u RUN %3lu",
             now.hour(), now.minute(), now.second(),units);
  } else {
    snprintf(line2, sizeof(line2), "%02u:%02u:%02u units:0",
             now.hour(), now.minute(),now.second());
  }

  lcd.setCursor(0,0); lcd.print(line1); lcd.print("   ");   
  lcd.setCursor(0,1); lcd.print(line2); lcd.print("   ");
}
// suprising function
void maybePrintSurprise(uint8_t pctChance = 30) {   // 默认 30% 概率
  if (random(100) < pctChance) {                    // 0–99
    printer.feed(1);
    printer.inverseOn();                            // 反白标题
    printer.println(F(">>> SURPRISE <<<"));
    printer.inverseOff();

    // --- 从 Flash 取一句 ---
    char buf[64];                                   // 临时缓冲
    uint8_t idx = random(SURPRISE_COUNT);
    strcpy_P(buf, (PGM_P)pgm_read_ptr(&SURPRISE_TABLE[idx]));
    printer.boldOn();
    printer.println(buf);
    printer.boldOff();
    printer.feed(1);
  }
}

/* -----------  printer  ----------- */
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
  printer.println(F("Project:"));
  printer.println(F("Notes  :"));
  printer.println(F(""));
  printer.println(F(">> 【Lawyer Name】."));
  printer.println(F(">> Yvonne Peng LLP"));

  printer.boldOff();               
  printer.write(0x1B); printer.write(0x34);   // Italic ON
  printer.println(F("Happy Wife Happy Life"));
  printer.write(0x1B); printer.write(0x35);   // Italic OFF
  printer.println(F("==========================="));

  printer.feed(3);
  maybePrintSurprise(); 
}
