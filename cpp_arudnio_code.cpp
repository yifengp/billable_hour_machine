/*******************************
 *  Lawyer-Timer  v1.1  (Mega 2560)
 *  TC1602A-21T3  |  DS3231  |  MC206H
 *  2025-06-02
 *******************************/
#include <Wire.h>
#include <RTClib.h>
#include <Bounce2.h>
#include <Adafruit_Thermal.h>

// ====  LCD  ====
// #define LCD_I2C                    // ← Uncomment if you have an I²C backpack
#ifdef LCD_I2C
  #include <LiquidCrystal_I2C.h>
  LiquidCrystal_I2C lcd(0x27, 16, 2); // Change to 0x3F if your module uses that address
#else
  #include <LiquidCrystal.h>
  LiquidCrystal lcd(33, 31, 29, 27, 25, 23); // RS, E, D4, D5, D6, D7
#endif

const char *DOW_SHORT[7] = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};

// ====  RTC  ====
RTC_DS3231 rtc;

// ====  Thermal printer  ====
#define PRINTER_RX 18              // Mega TX1 → Printer RX
Adafruit_Thermal printer(&Serial1);

// ====  Button (pulldown)  ====
const uint8_t BTN_PIN = 2;
Bounce debouncer;                  // Custom debouncer object
// ============================

enum State {IDLE, RUNNING};
State state = IDLE;

DateTime startTime, endTime;
const uint16_t MIN_UNIT = 6;       // Each billing unit = 6 minutes

void setup() {
  // ---- Printer ----
  Serial1.begin(9600);             // Change to 19200 if your MC206H uses that speed
  printer.begin();

  // ---- I²C devices ----
  Wire.begin();
  if (!rtc.begin()) for(;;);       // Halt here if the RTC is not detected

  // ---- Button ----
  pinMode(BTN_PIN, INPUT);         // External 10 kΩ pull-down → LOW when idle
  debouncer.attach(BTN_PIN);
  debouncer.interval(25);          // 25 ms debounce

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
  if (debouncer.rose()) {          // LOW → HIGH = button presse
