
export interface Student {
  id: string;
  number: string; // Okul No
  name: string; // Adı + Soyadı
  grade: string; // Kabul Ed. Sınıf
  
  // Kimlik Bilgileri
  tcNo?: string; // T.C. Kimlik No
  fatherName?: string; // Baba Adı
  motherName?: string; // Anne Adı
  birthPlaceDate?: string; // Doğum Yeri , Tarihi
  province?: string; // İli
  district?: string; // İlçesi
  neighborhood?: string; // Mahalle / Köy
  volumeNo?: string; // Cilt No
  familyOrderNo?: string; // Aile Sıra No
  orderNo?: string; // Sıra No
  
  // Okul Bilgileri
  registrationType?: string; // Yeni Kayıt / Nakil
  previousSchoolInfo?: string; // Get. Öğr. Belgesi
  registrationDate?: string; // Tarih / Numarası
  parentName?: string; // Veli Adı, Soyadı
  examStatus?: string; // Sınavlı/Sınavsız
  boardingStatus?: string; // Yatılı/Gündüzlü
  scholarshipStatus?: string; // Bursluluk Durumu
  address?: string; // Adresi
  parentPhone?: string; // Telefon
}

export interface InvolvedStudent {
  studentId: string;
  role: 'suspect' | 'witness' | 'victim'; // Fail, Tanık, Mağdur
  notes?: string; // Öğrenciye özel not
  
  // Karar Bilgileri (Yaptırım)
  decision?: string; // Örn: KINAMA, UYARI, OKULDAN UZAKLAŞTIRMA, CEZA ALMADI
  decisionNo?: string; // Karar No
  decisionDate?: string; // Karar Tarihi
  decisionReason?: string; // Gerekçe / Nedenler
  penaltyScore?: string; // Davranış Puanı İndirimi (Örn: 10)

  // AI Analiz Sonucu
  aiAnalysis?: string; 
}

export interface Incident {
  id: string;
  code: string; // OLAY2024-001
  title: string; // Olay Adı
  date: string;
  time: string;
  location: string;
  description: string; // Olayın Özeti
  status: 'pending' | 'investigating' | 'decided' | 'archived';
  involvedStudents: InvolvedStudent[]; // Olaya karışanlar
  petitioner?: string; // Dilekçeyi veren kişi
  petitionerInfo?: string; // Dilekçe Tarih/Sayı
}

export interface RegulationArticle {
  id: string;
  code: string;
  title: string;
  description: string;
  penaltyLevel: string;
}

// Chart data types
export interface StatData {
  name: string;
  value: number;
}

// Institution Settings
export interface Institution {
  name: string;
  code: string;
  type: string; // Ortaokul, Lise
  year: string; // 2023-2024
  province: string;
  district: string;
  managerName: string; // Müdür Adı
  address: string;
  phone: string;
  fax: string;
  headerText: string; // Kurum Anteti
  ebysCode: string; // Yazılı Uyarı Bildirimi EBYS Sayısı
}

export interface BoardMember {
  id: string;
  role: string; // Başkan, Üye 1, Üye 2, Veli Üye
  mainName: string; // Asil Adı Soyadı
  mainTitle: string; // Asil Ünvan
  reserveName: string; // Yedek Adı Soyadı
  reserveTitle: string; // Yedek Ünvan
}
