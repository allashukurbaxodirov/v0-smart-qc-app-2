// KPI Data
export const kpiData = {
  gca: {
    name: 'GCA (Umumiy Konstruksiya Sifati)',
    current: 96.5,
    target: 98.0,
    previous: 95.2,
    status: 'good',
    trend: 'up',
  },
  drr: {
    name: 'DRR (Defekt Qayta Ishlash)',
    current: 92.3,
    target: 95.0,
    previous: 91.1,
    status: 'good',
    trend: 'up',
  },
  drl: {
    name: 'DRL (Defekt Qayta Ishlash Xaraji)',
    current: 8.7,
    target: 5.0,
    previous: 9.2,
    status: 'warning',
    trend: 'up',
  },
  ftq: {
    name: 'FTQ (Birinchi Marta Sifat)',
    current: 88.4,
    target: 92.0,
    previous: 86.5,
    status: 'warning',
    trend: 'up',
  },
  cmm: {
    name: 'CMM (Ishlab chiqarish quvvati)',
    current: 94.2,
    target: 96.0,
    previous: 93.8,
    status: 'good',
    trend: 'up',
  },
  d10: {
    name: 'D10 (Dastlab 10 ta defekt)',
    current: 156,
    target: 80,
    previous: 178,
    status: 'warning',
    trend: 'down',
  },
  d20: {
    name: 'D20 (Dastlab 20 ta defekt)',
    current: 243,
    target: 150,
    previous: 267,
    status: 'warning',
    trend: 'down',
  },
  incoming: {
    name: 'Kelayotgan Defektlar',
    current: 45,
    target: 30,
    previous: 52,
    status: 'warning',
    trend: 'down',
  },
}

// Workshop Performance Data
export const workshopPerformance = [
  { name: 'Umumiy Montaj', gca: 97.2, ftq: 89.5, drr: 93.1, rank: 1 },
  { name: 'Elektr Tizimi', gca: 96.8, ftq: 88.2, drr: 91.9, rank: 2 },
  { name: 'Mexanika', gca: 96.1, ftq: 87.9, drr: 91.4, rank: 3 },
  { name: 'Boyama', gca: 95.4, ftq: 86.7, drr: 90.2, rank: 4 },
  { name: 'Qaynash', gca: 94.8, ftq: 85.3, drr: 89.1, rank: 5 },
]

// Shift Performance Data
export const shiftPerformance = [
  { name: '1-Shift', output: 145, defects: 12, efficiency: 94.2 },
  { name: '2-Shift', output: 138, defects: 15, efficiency: 89.7 },
  { name: '3-Shift', output: 132, defects: 18, efficiency: 85.5 },
]

// Top Defects Data
export const topDefects = [
  { id: 1, name: 'Paint scratch', count: 34, percent: 15.2, workshop: 'Boyama' },
  { id: 2, name: 'Electrical malfunction', count: 28, percent: 12.5, workshop: 'Elektr' },
  { id: 3, name: 'Alignment issue', count: 24, percent: 10.7, workshop: 'Umumiy Montaj' },
  { id: 4, name: 'Missing component', count: 21, percent: 9.4, workshop: 'Montaj' },
  { id: 5, name: 'Weld defect', count: 18, percent: 8.0, workshop: 'Qaynash' },
  { id: 6, name: 'Seal failure', count: 15, percent: 6.7, workshop: 'Mexanika' },
  { id: 7, name: 'Door gap variance', count: 13, percent: 5.8, workshop: 'Umumiy Montaj' },
  { id: 8, name: 'Thread damage', count: 11, percent: 4.9, workshop: 'Mexanika' },
]

// Daily Production Data
export const dailyProduction = [
  { date: '1-kun', produced: 420, target: 425, defects: 24 },
  { date: '2-kun', produced: 415, target: 425, defects: 20 },
  { date: '3-kun', produced: 432, target: 425, defects: 28 },
  { date: '4-kun', produced: 418, target: 425, defects: 19 },
  { date: '5-kun', produced: 425, target: 425, defects: 22 },
  { date: '6-kun', produced: 438, target: 425, defects: 25 },
  { date: '7-kun', produced: 428, target: 425, defects: 23 },
  { date: '8-kun', produced: 422, target: 425, defects: 21 },
  { date: '9-kun', produced: 435, target: 425, defects: 26 },
  { date: '10-kun', produced: 430, target: 425, defects: 24 },
]

// IRAS (Issue Resolution and Status) Data
export const irasData = [
  { id: 'IRAS-001', title: 'Door Assembly Misalignment', priority: 'critical', status: 'open', daysOpen: 5 },
  { id: 'IRAS-002', title: 'Electrical Connection Failure', priority: 'high', status: 'in-progress', daysOpen: 3 },
  { id: 'IRAS-003', title: 'Paint Quality Issue', priority: 'high', status: 'open', daysOpen: 2 },
  { id: 'IRAS-004', title: 'Welding Parameter Drift', priority: 'medium', status: 'in-progress', daysOpen: 1 },
  { id: 'IRAS-005', title: 'Sensor Calibration', priority: 'medium', status: 'resolved', daysOpen: 0 },
]

// Notifications
export const notifications = [
  { id: 1, type: 'critical', message: 'GCA ko\'rsatkichi xuy yangi pastroq: 96.5%', time: '5 soat oldin' },
  { id: 2, type: 'warning', message: 'General Assembly defekt soni ko\'paydi: 34 ta', time: '2 soat oldin' },
  { id: 3, type: 'info', message: 'Kunlik hisobot tayyor: 2024-04-11', time: '1 soat oldin' },
  { id: 4, type: 'critical', message: 'D10 ko\'rsatkichi maqsad ortimdan: 156', time: '30 min oldin' },
]

// Chart Data for Analytics
export const monthlyTrendData = [
  { month: 'Jan', gca: 94.2, ftq: 85.3, drr: 89.1 },
  { month: 'Feb', gca: 94.8, ftq: 86.1, drr: 89.9 },
  { month: 'Mar', gca: 95.3, ftq: 87.2, drr: 90.5 },
  { month: 'Apr', gca: 96.5, ftq: 88.4, drr: 92.3 },
]

// Defect Heatmap Data (Workshop x Shift)
export const defectHeatmapData = {
  workshops: ['Umumiy Montaj', 'Elektr Tizimi', 'Boyama', 'Qaynash', 'Mexanika'],
  shifts: ['1-Shift', '2-Shift', '3-Shift'],
  data: [
    [8, 12, 14],    // General Assembly
    [5, 7, 9],      // Electrical
    [6, 9, 11],     // Paint
    [4, 6, 8],      // Welding
    [3, 5, 7],      // Mechanics
  ],
}

// User List
export const users = [
  { id: 1, name: 'Admin User', email: 'admin@uzauto.uz', role: 'Admin', status: 'active' },
  { id: 2, name: 'Workshop Manager', email: 'workshop@uzauto.uz', role: 'Manager', status: 'active' },
  { id: 3, name: 'QC Inspector', email: 'qc@uzauto.uz', role: 'Inspector', status: 'active' },
  { id: 4, name: 'Shift Lead', email: 'shift@uzauto.uz', role: 'Lead', status: 'active' },
]

// Production Defect Analytics by Workshop and Shift
export const productionWorkshops = [
  { id: 'press', name: 'PRESS SHOP', defects: 24, status: 'good', trend: 'up', prevDefects: 28, shift: 'A' },
  { id: 'weld1', name: 'WELDING 1', defects: 31, status: 'warning', trend: 'down', prevDefects: 29, shift: 'A' },
  { id: 'weld2', name: 'WELDING 2', defects: 28, status: 'warning', trend: 'up', prevDefects: 24, shift: 'A' },
  { id: 'paint', name: 'PAINT SHOP', defects: 42, status: 'critical', trend: 'up', prevDefects: 38, shift: 'A' },
  { id: 'ga', name: 'GA', defects: 35, status: 'warning', trend: 'down', prevDefects: 39, shift: 'A' },
]

export const productionWorkshopsShiftB = [
  { id: 'press', name: 'PRESS SHOP', defects: 20, status: 'good', trend: 'down', prevDefects: 24, shift: 'B' },
  { id: 'weld1', name: 'WELDING 1', defects: 26, status: 'good', trend: 'up', prevDefects: 23, shift: 'B' },
  { id: 'weld2', name: 'WELDING 2', defects: 32, status: 'warning', trend: 'down', prevDefects: 35, shift: 'B' },
  { id: 'paint', name: 'PAINT SHOP', defects: 38, status: 'warning', trend: 'down', prevDefects: 42, shift: 'B' },
  { id: 'ga', name: 'GA', defects: 29, status: 'good', trend: 'up', prevDefects: 27, shift: 'B' },
]

export const productionWorkshopsShiftD = [
  { id: 'press', name: 'PRESS SHOP', defects: 28, status: 'good', trend: 'down', prevDefects: 32, shift: 'D' },
  { id: 'weld1', name: 'WELDING 1', defects: 35, status: 'warning', trend: 'up', prevDefects: 31, shift: 'D' },
  { id: 'weld2', name: 'WELDING 2', defects: 29, status: 'warning', trend: 'down', prevDefects: 33, shift: 'D' },
  { id: 'paint', name: 'PAINT SHOP', defects: 45, status: 'critical', trend: 'up', prevDefects: 41, shift: 'D' },
  { id: 'ga', name: 'GA', defects: 38, status: 'warning', trend: 'up', prevDefects: 35, shift: 'D' },
]

// GA Sectors
export const gaSectors = {
  A: [
    { name: 'TRIM', defects: 12, rating: 'A', trend: 'up', status: 'good' },
    { name: 'SHOSSE', defects: 8, rating: 'A+', trend: 'down', status: 'good' },
    { name: 'FINAL', defects: 10, rating: 'A', trend: 'up', status: 'good' },
    { name: 'SUB', defects: 5, rating: 'A+', trend: 'down', status: 'good' },
  ],
  B: [
    { name: 'TRIM', defects: 9, rating: 'A+', trend: 'down', status: 'good' },
    { name: 'SHOSSE', defects: 6, rating: 'A+', trend: 'down', status: 'good' },
    { name: 'FINAL', defects: 8, rating: 'A', trend: 'up', status: 'good' },
    { name: 'SUB', defects: 6, rating: 'A+', trend: 'up', status: 'good' },
  ],
  D: [
    { name: 'TRIM', defects: 14, rating: 'A', trend: 'up', status: 'warning' },
    { name: 'SHOSSE', defects: 10, rating: 'A', trend: 'up', status: 'warning' },
    { name: 'FINAL', defects: 9, rating: 'A+', trend: 'down', status: 'good' },
    { name: 'SUB', defects: 5, rating: 'A+', trend: 'down', status: 'good' },
  ],
}

// Top 10 Defects with Codes and Uzbek Names
export const topDefectsList = [
  // PAINT SHOP
  { code: '86', name: 'Bo\'yoq oqishi', workshop: 'PAINT SHOP', shift: 'A', count: 28, severity: 'high' },
  { code: '81', name: 'Bo\'yoq notekis sepilgan', workshop: 'PAINT SHOP', shift: 'A', count: 24, severity: 'high' },
  { code: '77', name: 'Bo\'yoq yuzasida kir bor', workshop: 'PAINT SHOP', shift: 'B', count: 18, severity: 'high' },
  { code: '75', name: 'Germetik nuqsoni bor', workshop: 'PAINT SHOP', shift: 'D', count: 15, severity: 'high' },
  // GA
  { code: '18', name: 'Detalda nuqsoni bor', workshop: 'GA', shift: 'A', count: 22, severity: 'high' },
  { code: '20', name: 'Sifatsiz o\'rnatilgan', workshop: 'GA', shift: 'B', count: 19, severity: 'high' },
  { code: '24', name: 'Detalga shikast yetgan', workshop: 'GA', shift: 'D', count: 17, severity: 'medium' },
  { code: '44', name: 'Butlovchi qism to\'liq qotirilmagan', workshop: 'GA', shift: 'A', count: 14, severity: 'medium' },
  { code: '32', name: 'Detal funksiyasini bajarmayabdi', workshop: 'GA', shift: 'B', count: 12, severity: 'medium' },
  { code: '35', name: 'Regirilovka qilinmagan', workshop: 'GA', shift: 'D', count: 11, severity: 'low' },
]

// Shift Rankings
export const shiftRankings = {
  A: { defects: 160, rank: 2, status: 'good' },
  B: { defects: 145, rank: 1, status: 'good' },
  D: { defects: 175, rank: 3, status: 'warning' },
}

// Production Analytics Chart Data
export const productionAnalyticsChart = [
  { workshop: 'PRESS SHOP', defects: 24, limit: 25 },
  { workshop: 'WELDING 1', defects: 31, limit: 28 },
  { workshop: 'WELDING 2', defects: 28, limit: 30 },
  { workshop: 'PAINT SHOP', defects: 42, limit: 30 },
  { workshop: 'GA', defects: 35, limit: 32 },
]

// Defect Trend Over Time
export const defectTrendData = [
  { date: 'Mon', press: 26, weld1: 29, weld2: 27, paint: 40, ga: 38 },
  { date: 'Tue', press: 25, weld1: 30, weld2: 28, paint: 41, ga: 37 },
  { date: 'Wed', press: 23, weld1: 32, weld2: 26, paint: 43, ga: 35 },
  { date: 'Thu', press: 24, weld1: 31, weld2: 29, paint: 42, ga: 36 },
  { date: 'Fri', press: 24, weld1: 31, weld2: 28, paint: 42, ga: 35 },
  { date: 'Sat', press: 22, weld1: 30, weld2: 27, paint: 40, ga: 34 },
  { date: 'Sun', press: 21, weld1: 29, weld2: 26, paint: 38, ga: 33 },
]

// Shift Comparison Data
export const shiftComparisonData = [
  { workshop: 'PRESS SHOP', A: 24, B: 20, D: 28 },
  { workshop: 'WELDING 1', A: 31, B: 26, D: 35 },
  { workshop: 'WELDING 2', A: 28, B: 32, D: 29 },
  { workshop: 'PAINT SHOP', A: 42, B: 38, D: 45 },
  { workshop: 'GA', A: 35, B: 29, D: 38 },
]

// Sector Details with Mitigation Plans and Analysis
export const sectorDetails = {
  TRIM: {
    shifts: {
      A: {
        defects: 12,
        rating: 'A',
        measures: [
          'Trimm mashinasining markazlashtirilgan tekshirilishi',
          'Operatorlar uchun qo\'shimcha o\'quv sessiyalari',
          'Kunlik sifat nazoratlash taza'mirlash',
        ],
        rootCause: 'Operatorning texnik mahorati va mashina tekshirlashining nomuvofiqliги',
        nextSteps: [
          'Trim stansiyada sensorlar o\'rnatish',
          'Ish sifatining kundalik kuzatuvi',
          'Xodimlarning aftarepiligi kursini o\'tish',
        ],
      },
      B: {
        defects: 9,
        rating: 'A+',
        measures: [
          'Mavjud talimlarni saqlash va amalga oshirish',
          'Operatorlarning yaxshi amaliyotlari bilan murojaat',
          'Kunlik sifat ko\'rsatkichlarini qayd etish',
        ],
        rootCause: 'Samarali operatsion jarayonlar va o\'quv dasturlari',
        nextSteps: [
          'Mavjud jarayonlarni dokumentalab qolish',
          'A smena bilan o\'zaro bog\'lanish',
          'Sifat chuqurligini 5% ga oshirish',
        ],
      },
      D: {
        defects: 14,
        rating: 'A',
        measures: [
          'Mashinaning nozik sozlanishini tekshirish',
          'Soat oxiridagi operatorlar uchun monitiring',
          'Shiftning davomiyligi bilan bog\'langan muammo analizi',
        ],
        rootCause: 'Shiftning oxiridagi operatorlarning charchoqligi va ehtiyotkorliği',
        nextSteps: [
          'Shift pauzalarini optimallashtirish',
          'Shiftni davomli ishlashning ta\'siri analizi',
          'Qo\'shimcha texnik kolkalarni o\'rnatish',
        ],
      },
    },
  },
  SHOSSE: {
    shifts: {
      A: {
        defects: 8,
        rating: 'A+',
        measures: [
          'Hozirgi jarayonni o\'z holida saqlash',
          'Sifat standartlarini oshirish uchun yaqin ko\'zni ushlab turish',
          'Operatorlar bilan muntazam feedback sessiyalari',
        ],
        rootCause: 'Mukammal operatsion protokollari va yuqori mashina tekshirish',
        nextSteps: [
          'A smena protokollarini boshqa smenalarga kiritish',
          'Operatorlar bilan noma\'lum muammolarni aniqlash',
          'Sifat standartlarini A+ da saqlash',
        ],
      },
      B: {
        defects: 6,
        rating: 'A+',
        measures: [
          'Mavjud mukammal jarayonlarni saqlab qolish',
          'B smena operatorlarining mahorati tasdiqlovchi sessiyalari',
          'Kundalik sifat ko\'rsatkichlarini nazorat qilish',
        ],
        rootCause: 'Yaxshi o\'qitilgan operatorlar va samarali texnik xizmat ko\'rsatish',
        nextSteps: [
          'Mavjud o\'quv dasturini A va D smenalarga kengaytirish',
          'B smena amaliyotlarini standarti etish',
          'Sifatning barqarorligini ta\'minlash',
        ],
      },
      D: {
        defects: 10,
        rating: 'A',
        measures: [
          'Mashinaning o\'zining texnik xizmat ko\'rsatish jadvaliga rioya qilish',
          'Shiftda operatorlarning ehtiyotkorligini oshirish',
          'Kundalik texnik xizmat ko\'rsatish schedulini o\'tkazish',
        ],
        rootCause: 'Shiftning davomiyligi va mashinaning kundalik ehtiyojlari',
        nextSteps: [
          'Kundalik saharli tekshirvllarni amalga oshirish',
          'Shiftning tugamovida texnik xizmat ko\'rsatish',
          'Sensorlarning ish holatini tekshirish',
        ],
      },
    },
  },
  FINAL: {
    shifts: {
      A: {
        defects: 10,
        rating: 'A',
        measures: [
          'Final inspeksiya stansiyasida kattalik kontrol',
          'Operatorlar uchun o\'quv sessiyalari',
          'Defekt o\'rtalarining tahlili va tuzatish',
        ],
        rootCause: 'Sifat kontrol stansiyasining aniqligida o\'zgaruvchanlik',
        nextSteps: [
          'Final stansiyada avtomatlashgan sensorlarni o\'rnatish',
          'Kundalik QC auditini o\'tkazish',
          'Statistic SPC tahlili',
        ],
      },
      B: {
        defects: 8,
        rating: 'A',
        measures: [
          'Mavjud final tekshirvni saqlab qolish',
          'Final inspeksiyasi uchun standart protokollari kiritish',
          'Kundalik defekt qaydlari',
        ],
        rootCause: 'Yaxshi final tekshirish jarayonlari',
        nextSteps: [
          'Final stansiyaning texnik xizmatlashtirilishini oshirish',
          'Boshqa smenalarga best practices kiritish',
          'Defekt qaydlarini tahlil qilish',
        ],
      },
      D: {
        defects: 9,
        rating: 'A+',
        measures: [
          'D smena final stansiyasining yaxshi amaliyotlarini davom ettirilishi',
          'Muntazam operatorlar bilan feedback',
          'Kundalik sifat auditini saqlash',
        ],
        rootCause: 'Mukammal final tekshirvni jarayoni va attentiv operatorlar',
        nextSteps: [
          'D smena amaliyotlarini standart etish',
          'Boshqa smenalarga protokollari ko\'chirish',
          'Quality auditi har 2-kunda o\'tkazish',
        ],
      },
    },
  },
  SUB: {
    shifts: {
      A: {
        defects: 5,
        rating: 'A+',
        measures: [
          'Mavjud mukammal jarayonlarni saqlab qolish',
          'Operatorlar bilan ish yurisining jaryonini ta\'rsitlash',
          'Kundalik sifat chuqurligini saqlash',
        ],
        rootCause: 'Yaxshi assembly jarayonlari va attentiv operatorlar',
        nextSteps: [
          'SUB stansiyaning best practices ni dokumentalab qolish',
          'Boshqa smenalarga protokollari kiritish',
          'Sifatning barqarorligini ta\'minlash',
        ],
      },
      B: {
        defects: 6,
        rating: 'A+',
        measures: [
          'Mavjud jarayonlarni saqlab qolish',
          'Operatorlar bilan muntazam feedback sessiyalari',
          'Kundalik sifat ko\'rsatkichlarini qayd etish',
        ],
        rootCause: 'Mukammal assembly protocol va yaxshi texnik xizmat ko\'rsatish',
        nextSteps: [
          'Operatorlar bilan best practices taqlidi',
          'Protokollari tasdiqlovchi sessiyalar',
          'A+ ratingni saqlash',
        ],
      },
      D: {
        defects: 5,
        rating: 'A+',
        measures: [
          'Samarali assembly stansiyasini saqlash',
          'Kundalik operatorlar uchun control',
          'Sifat ko\'rsatkichlarini qayd etish',
        ],
        rootCause: 'Yuqori saqualikli assembly jarayoni va yaxshi operatorlar',
        nextSteps: [
          'D smena amaliyotlarini standart etish',
          'Saqualikni oshirish uchun training sessiyalari',
          'A+ ratingni saqlash',
        ],
      },
    },
  },
}

// Sector Rankings by Shift (for interactive display)
export const worstSectorsByShift = {
  A: [
    { sector: 'Trim', shift: 'A', defects: 12, rating: 'A' },
    { sector: 'Final', shift: 'A', defects: 10, rating: 'A' },
    { sector: 'Shosse', shift: 'A', defects: 8, rating: 'A+' },
    { sector: 'Sub', shift: 'A', defects: 5, rating: 'A+' },
  ],
  B: [
    { sector: 'Trim', shift: 'B', defects: 9, rating: 'A+' },
    { sector: 'Final', shift: 'B', defects: 8, rating: 'A' },
    { sector: 'Sub', shift: 'B', defects: 6, rating: 'A+' },
    { sector: 'Shosse', shift: 'B', defects: 6, rating: 'A+' },
  ],
  D: [
    { sector: 'Trim', shift: 'D', defects: 14, rating: 'A' },
    { sector: 'Shosse', shift: 'D', defects: 10, rating: 'A' },
    { sector: 'Final', shift: 'D', defects: 9, rating: 'A+' },
    { sector: 'Sub', shift: 'D', defects: 5, rating: 'A+' },
  ],
}
