
import React from 'react';
import {
  Users, AlertTriangle, FileCheck, Scale,
  FileText, TrendingUp, Book, UserX, Mail, FilePlus, Settings, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Card = ({ title, icon: Icon, color, to, description }: { title: string, icon: any, color: string, to: string, description: string }) => (
  <Link to={to} className="group relative bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all hover:-translate-y-1 h-full flex flex-col justify-between">
    <div>
      <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
    <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
      <span className={`text-xs font-bold ${color.replace('bg-', 'text-')} bg-slate-50 px-2 py-1 rounded`}>Git &rarr;</span>
    </div>
  </Link>
);

const Dashboard = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Kontrol Paneli</h1>
        <p className="text-slate-500">Disiplin süreçlerini yönetmek için aşağıdaki menüleri kullanabilirsiniz.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
          <span className="w-2 h-6 bg-slate-800 rounded-full"></span>
          <h2 className="text-lg font-bold text-slate-700">GENEL İŞLEMLER</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 0. Kurum Ayarları (En Başa Taşındı) */}
          <Card
            title="Kurum Ayarları"
            icon={Settings}
            color="bg-gray-600"
            to="/settings"
            description="Okul bilgileri, müdür ve disiplin kurulu üyelerini yapılandır."
          />

          {/* 1. Veri Tabanı */}
          <Card
            title="Öğrenci Listesi"
            icon={Users}
            color="bg-blue-600"
            to="/students"
            description="Öğrenci veritabanını görüntüle, yeni kayıt ekle veya Excel'den aktar."
          />

          {/* 2. Olay Girişleri */}
          <Card
            title="Olay Kaydı Oluştur"
            icon={AlertTriangle}
            color="bg-red-500"
            to="/incidents"
            description="Yeni bir disiplin olayını sisteme kaydet ve detaylarını gir."
          />
          <Card
            title="Olaya Öğrenci Ekle"
            icon={FilePlus}
            color="bg-orange-500"
            to="/incidents"
            description="Mevcut bir olaya fail veya tanık öğrenci eklemesi yap."
          />

          {/* 3. Süreç ve Karar */}
          <Card
            title="Tutanak Hazırla"
            icon={FileText}
            color="bg-indigo-500"
            to="/decisions"
            description="İfade tutanağı ve savunma isteme yazılarını otomatik oluştur."
          />
          <Card
            title="AI Karar Destek"
            icon={Scale}
            color="bg-emerald-600"
            to="/decisions"
            description="Yapay zeka ile olayı analiz et ve kurul kararı taslağı çıkar."
          />
          <Card
            title="Veli Bildirimi"
            icon={Mail}
            color="bg-amber-500"
            to="/decisions"
            description="Veli çağrı pusulası ve bilgilendirme evraklarını hazırla."
          />
          <Card
            title="Ceza Tebligatı"
            icon={FileCheck}
            color="bg-teal-500"
            to="/decisions"
            description="Kesinleşen cezaların resmi tebliğ evraklarını görüntüle."
          />

          {/* 4. Referans ve Rapor */}
          <Card
            title="Ceza Silme İşlemleri"
            icon={RotateCcw}
            color="bg-cyan-600"
            to="/penalty-removal"
            description="Ceza alan öğrencilerin durumunu görüşmek için toplantı evrağı hazırla."
          />

          <Card
            title="Mevzuat Asistanı"
            icon={Book}
            color="bg-slate-600"
            to="/regulations"
            description="Yönetmelik maddeleri ve disiplin cezaları hakkında arama yap."
          />
          <Card
            title="İstatistikler"
            icon={TrendingUp}
            color="bg-purple-600"
            to="/statistics"
            description="Olay türleri, sınıf dağılımları ve ceza oranlarını incele."
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
