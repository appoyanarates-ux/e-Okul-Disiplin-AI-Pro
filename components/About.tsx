
import React from 'react';
import { User, Calendar, Shield, Code, Terminal, Mail } from 'lucide-react';

const About = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Hakkımızda</h1>
        <p className="text-slate-500">Uygulama ve geliştirici bilgileri.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-8 text-center">
            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-600">
                <Code className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">e-Okul Disiplin Ai</h2>
            <p className="text-slate-400 text-sm">Okul Yönetim ve Karar Destek Sistemi</p>
        </div>

        <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Developer Info */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Geliştirici Bilgileri
                    </h3>
                    
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                            AY
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Geliştirici</p>
                            <p className="text-slate-800 font-medium text-lg">Abdullah Yanarateş</p>
                            <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                                <Mail className="w-3.5 h-3.5" />
                                <a href="mailto:appo.yanarates@gmail.com" className="hover:text-blue-600 transition-colors">
                                    appo.yanarates@gmail.com
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Version Info */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-green-600" />
                        Sürüm Bilgileri
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                             <p className="text-xs text-slate-500 uppercase font-bold mb-1">Sürüm No</p>
                             <p className="text-slate-800 font-mono font-medium">v05.05.2025</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                             <p className="text-xs text-slate-500 uppercase font-bold mb-1">Durum</p>
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Aktif / Stable
                             </span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Proje Hakkında
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                    Bu yazılım, eğitim kurumlarındaki disiplin süreçlerini dijitalleştirmek, mevzuata uygun evrak üretimini sağlamak ve yapay zeka desteği ile karar süreçlerini hızlandırmak amacıyla geliştirilmiştir. Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'ne uygun olarak tasarlanmıştır.
                </p>
                <div className="mt-4 flex gap-2">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">React</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">TypeScript</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Google Gemini AI</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Tailwind CSS</span>
                </div>
            </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-200">
            &copy; 2026 Tüm Hakları Saklıdır.
        </div>
      </div>
    </div>
  );
};

export default About;
