
import { GoogleGenAI } from "@google/genai";
import { Incident, Student } from "../types";

// Helper to check connection
const isOnline = () => navigator.onLine;

// Helper to get the API Key dynamically (User Setting > Environment Variable)
const getApiKey = (): string => {
  const localKey = localStorage.getItem('gemini_api_key');
  return localKey || process.env.API_KEY || '';
};

// Helper to get AI Client
const getClient = () => {
  if (!isOnline()) throw new Error("OFFLINE_MODE");
  const key = getApiKey();
  if (!key) throw new Error("API Key eksik. Lütfen Ayarlar sayfasından Gemini API anahtarınızı giriniz.");
  return new GoogleGenAI({ apiKey: key });
};

// System instruction for the "Discipline Expert" persona
const SYSTEM_INSTRUCTION = `
Sen Türk Milli Eğitim Bakanlığı yönetmeliklerine hakim, tecrübeli bir okul müdür yardımcısı ve disiplin kurulu uzmanısın. 
Görevin, okulda yaşanan disiplin olaylarını analiz etmek, ilgili yönetmelik maddelerini bulmak ve resmi evrak (tutanak, savunma isteme, karar) taslakları hazırlamaktır.
Her zaman resmi, tarafsız ve yapıcı bir dil kullan.
`;

export const validateApiKey = async (key: string): Promise<boolean> => {
  if (!isOnline()) return false;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Test',
    });
    return true;
  } catch (error) {
    console.error("API Key Validation Error:", error);
    return false;
  }
};

export const analyzeIncident = async (incident: Incident, student: Student) => {
  if (!isOnline()) {
    return "⚠️ İNTERNET BAĞLANTISI YOK\n\nCihazınız çevrimdışı olduğu için Yapay Zeka analizi yapılamıyor. Lütfen internet bağlantınızı kontrol ediniz veya manuel giriş yapınız.";
  }

  try {
    const ai = getClient();
    const prompt = `
      Aşağıdaki olayı analiz et:
      
      Öğrenci: ${student.name} (${student.grade} - ${student.number})
      Tarih: ${incident.date}
      Yer: ${incident.location}
      Olay Tanımı: ${incident.description}
      
      Lütfen bu olayın ciddiyetini değerlendir, hangi disiplin maddesinin ihlal edilmiş olabileceğini belirt ve izlenmesi gereken yasal süreci adım adım özetle.
      
      ÖNEMLİ: 
      1. Çıktı sadece "Analiz ve Yol Haritası" raporu olmalı.
      2. Asla tutanak, dilekçe veya savunma isteme yazısı gibi "boş belge taslakları" oluşturma.
      3. Doğrudan konuya gir, başlıkları net kullan.
      4. Rapor dili resmi ve teknik olsun.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error.message === "OFFLINE_MODE") return "⚠️ İnternet bağlantısı yok. AI analizi devre dışı.";
    return "Analiz sırasında bir hata oluştu. Lütfen Ayarlar kısmından API anahtarınızı kontrol edin.";
  }
};

export const generateDecisionReason = async (incident: Incident, student: Student, penalty: string, schoolType: string) => {
    if (!isOnline()) return "Bağlantı yok.";

    try {
        const ai = getClient();
        const prompt = `
          Öğrenci: ${student.name}
          Olay: ${incident.description}
          Verilen Ceza: ${penalty}
          Okul Türü: ${schoolType}

          Yukarıdaki bilgilere göre, MEB yönetmeliğine uygun, resmi bir karar gerekçesi ve ilgili madde metnini oluştur.
          Sadece gerekçe metnini ver.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });
        return response.text;
    } catch (error) {
        console.error("Reason Gen Error:", error);
        return null;
    }
};

export const generateDocument = async (type: 'defense' | 'summons' | 'decision', incident: Incident, student: Student) => {
    if (!isOnline()) {
        return "⚠️ İNTERNET YOK: Otomatik belge oluşturma servisi çevrimdışı. Lütfen 'Matbu (Boş) Modu' kullanarak taslak üzerinden ilerleyiniz.";
    }

    try {
        const ai = getClient();
        let typeText = "";
        if (type === 'defense') typeText = "Öğrenci Savunma İsteme Yazısı";
        else if (type === 'summons') typeText = "Veli Çağrı Pusulası";
        else if (type === 'decision') typeText = "Disiplin Kurulu Karar Tutanağı Taslağı";

        const prompt = `
          Aşağıdaki bilgiler ışığında resmi bir "${typeText}" hazırla. Metin boşluk doldurma formatında değil, doğrudan kullanılabilir bir taslak olmalı.
          
          Öğrenci: ${student.name}
          Sınıf/No: ${student.grade} / ${student.number}
          Olay: ${incident.description}
          Tarih: ${incident.date}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview', // Good for creative writing
          contents: prompt,
          config: {
             systemInstruction: SYSTEM_INSTRUCTION
          }
        });
        return response.text;
      } catch (error) {
        console.error("Gemini Doc Gen Error:", error);
        return "Belge oluşturulamadı.";
      }
}

export const searchRegulations = async (query: string) => {
  if (!isOnline()) {
      return "⚠️ İnternet bağlantısı olmadığı için mevzuat taraması yapılamıyor.";
  }

  try {
    const ai = getClient();
    const prompt = `
      Kullanıcı şu konuda mevzuat/yönetmelik bilgisi arıyor: "${query}".
      
      Lütfen cevabı verirken aşağıdaki İKİ resmi kaynağı temel al ve tarayarak cevapla:
      
      1. MEB Ortaöğretim Kurumları Yönetmeliği: 
         https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=19942&MevzuatTur=7&MevzuatTertip=5
         
      2. MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği: 
         https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18812&MevzuatTur=7&MevzuatTertip=5

      Sorunun içeriğine göre (ortaokul veya lise ayrımı varsa) ilgili yönetmeliği referans göster. Madde numaralarını belirterek (Örn: Madde 164'e göre...) net bir açıklama yap.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }] // Enable grounding for latest regulations from specific URLs
        }
    });
    return response.text;
  } catch (error) {
      console.error("Reg Search Error", error);
      return "Yönetmelik araması başarısız oldu. API anahtarınızı kontrol ediniz.";
  }
};

export const fetchBoardInfoFromUrl = async (url: string, schoolType: string) => {
  if (!isOnline()) {
      return "⚠️ İnternet bağlantısı yok. Mevzuat bilgisi çekilemedi.";
  }

  try {
    const ai = getClient();
    const prompt = `
      Sen bir mevzuat uzmanısın. Aşağıdaki resmi mevzuat bağlantısını referans alarak, "${schoolType}" türündeki okullar için oluşturulması gereken "Öğrenci Davranışlarını Değerlendirme Kurulu" veya "Disiplin Kurulu"nun:
      1. Kimin başkanlığında toplandığını,
      2. Hangi üyelerden oluştuğunu (asil ve yedek),
      3. Veli veya öğrenci temsilcisi durumunu
      
      Maddeler halinde, net ve kısa bir özet olarak Türkçe yaz.
      
      Mevzuat Adresi: ${url}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }] // Enable grounding to check the URL content
        }
    });
    return response.text;
  } catch (error) {
      console.error("Board Info Fetch Error", error);
      return "Mevzuat bilgisi alınamadı. Lütfen API anahtarınızı ve internet bağlantınızı kontrol ediniz.";
  }
};
