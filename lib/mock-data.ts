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
