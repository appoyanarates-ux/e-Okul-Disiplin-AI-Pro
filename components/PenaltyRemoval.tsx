
import React, { useState, useEffect, useRef } from 'react';
import {
    RotateCcw, Search, Calendar, MapPin, FileText, Printer, Download,
    Users, ChevronRight, Loader2, ZoomIn, ZoomOut, CheckCircle, AlertCircle
} from 'lucide-react';
import { useIncidents } from '../context/IncidentContext';
import { useStudents } from '../context/StudentContext';
import { useSettings } from '../context/SettingsContext';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { Student, Incident, InvolvedStudent, BoardMember } from '../types';

const PenaltyRemoval = () => {
    const { incidents } = useIncidents();
    const { students } = useStudents();
    const { institution, boardMembers } = useSettings();
    const previewRef = useRef<HTMLDivElement>(null);

    // --- STATE ---
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
    const [zoom, setZoom] = useState(1.0);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    // Meeting Details
    const [meetingData, setMeetingData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '15:30',
        location: 'Müdür Yardımcısı Odası',
        number: '2025/2', // Toplantı Sayısı
        term: '2. Dönem Sonu'
    });

    const [generatedDoc, setGeneratedDoc] = useState<{ header: string, body: string } | null>(null);

    // --- DATA HELPERS ---

    // Sadece ceza almış öğrencileri ve ilgili olayları bul
    const penalizedStudents = students.filter((s: Student) => {
        return incidents.some((inc: Incident) =>
            inc.involvedStudents.some((inv: InvolvedStudent) =>
                inv.studentId === s.id &&
                inv.decision &&
                !inv.decision.includes('YER OLMADIĞINA') && // Ceza almamışlar hariç
                inv.role === 'suspect'
            )
        );
    });

    // Seçilen öğrencinin cezalı olaylarını getir
    const studentIncidents = incidents.filter((inc: Incident) =>
        inc.involvedStudents.some((inv: InvolvedStudent) =>
            inv.studentId === selectedStudentId &&
            inv.decision &&
            !inv.decision.includes('YER OLMADIĞINA') &&
            inv.role === 'suspect'
        )
    );

    // Auto-select incident if only one exists
    useEffect(() => {
        if (studentIncidents.length === 1) {
            setSelectedIncidentId(studentIncidents[0].id);
        } else {
            setSelectedIncidentId('');
        }
    }, [selectedStudentId]);


    // --- DOCUMENT GENERATORS ---

    const generateMeetingCall = () => {
        if (!selectedStudentId || !selectedIncidentId) {
            alert("Lütfen önce öğrenci ve ceza aldığı olayı seçiniz.");
            return;
        }

        const student = students.find((s: Student) => s.id === selectedStudentId);
        const incident = incidents.find((i: Incident) => i.id === selectedIncidentId);
        const involvement = incident?.involvedStudents.find((s: InvolvedStudent) => s.studentId === selectedStudentId);

        if (!student || !involvement) return;

        const regulationArticle = institution.type === 'Ortaokul'
            ? 'Milli Eğitim Bakanlığı Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliğinin 58. Maddesi'
            : 'Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliğinin 171. Maddesi';

        const header = `
      <div style="text-align:center; font-weight:bold; margin-bottom:1.5rem; line-height:1.4;">
        T.C.<br>
        ${institution.province.toUpperCase()} VALİLİĞİ<br>
        ${institution.district} İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜ<br>
        ${institution.name}
      </div>`;

        const body = `
        ${header}
        <br>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
             <div><b>Sayı</b> : ${institution.ebysCode}<br><b>Konu</b> : Disiplin Cezasının Kaldırılması<br>(Kurul Toplantı Çağrısı)</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <br>
        <div style="text-align:center; font-weight:bold; margin:20px 0;">ÖĞRENCİ DAVRANIŞLARINI DEĞERLENDİRME KURULU ÜYELERİNE</div>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
           Okulumuz <b>${student.grade}</b> sınıfı, <b>${student.number}</b> numaralı öğrencisi <b>${student.name}</b>'in, daha önce almış olduğu <b>"${involvement.decision}"</b> cezasının; öğrencinin ders yılı içerisindeki davranışlarında görülen olumlu gelişmeler nedeniyle kaldırılması (davranış puanının iadesi) hususunu görüşmek üzere toplanılacaktır.
        </p>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
           <b>${regulationArticle}</b> gereğince yapılacak olan toplantıya aşağıda belirtilen gün ve saatte teşriflerinizi rica ederim.
        </p>
        
        <div style="text-align:right; margin-top:30px; margin-bottom:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>

        <table style="width:100%; border:1px solid black; margin-bottom:20px; font-size:10pt;">
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; width:30%; background-color:#f9f9f9;">Toplantı Tarihi</td>
                <td style="border:1px solid black; padding:8px;">${new Date(meetingData.date).toLocaleDateString('tr-TR')}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; background-color:#f9f9f9;">Toplantı Saati</td>
                <td style="border:1px solid black; padding:8px;">${meetingData.time}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; background-color:#f9f9f9;">Toplantı Yeri</td>
                <td style="border:1px solid black; padding:8px;">${meetingData.location}</td>
            </tr>
             <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; background-color:#f9f9f9;">Gündem</td>
                <td style="border:1px solid black; padding:8px;">
                    1. Açılış ve Yoklama<br>
                    2. Disiplin cezası alan öğrencinin durumunun görüşülmesi<br>
                    3. Karar ve Kapanış
                </td>
            </tr>
        </table>
        
        <br>
        <div style="font-weight:bold; margin-bottom:10px;">TEBLİĞ LİSTESİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:9pt; text-align:center;">
             <tr style="background-color:#f0f0f0; font-weight:bold;">
                <td style="border:1px solid black; padding:5px;">ÜYE ADI SOYADI</td>
                <td style="border:1px solid black; padding:5px;">GÖREVİ</td>
                <td style="border:1px solid black; padding:5px;">İMZA</td>
             </tr>
             ${boardMembers.map((m: BoardMember) => `
             <tr>
                <td style="border:1px solid black; padding:8px;">${m.mainName}</td>
                <td style="border:1px solid black; padding:8px;">${m.role}</td>
                <td style="border:1px solid black; padding:8px;"></td>
             </tr>`).join('')}
        </table>
      `;
        setGeneratedDoc({ header: '', body });
    };

    const generateObservationRequest = () => {
        if (!selectedStudentId) { alert("Öğrenci seçiniz."); return; }
        const student = students.find((s: Student) => s.id === selectedStudentId);
        if (!student) return;

        const header = `
      <div style="text-align:center; font-weight:bold; margin-bottom:1.5rem; line-height:1.4;">
        T.C.<br>
        ${institution.province.toUpperCase()} VALİLİĞİ<br>
        ${institution.name} MÜDÜRLÜĞÜ
      </div>`;

        const body = `
      ${header}
        <br>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
             <div><b>Sayı</b> : ${institution.ebysCode}<br><b>Konu</b> : Öğrenci Davranış Gözlem Raporu</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <br><br>
        <div style="text-align:center;"><b>${student.grade} SINIFI REHBER ÖĞRETMENLİĞİNE</b></div>
        <br>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
            Sınıfınız öğrencilerinden <b>${student.number}</b> numaralı <b>${student.name}</b> hakkında daha önce uygulanmış olan disiplin cezasının kaldırılıp kaldırılmayacağının değerlendirilmesi amacıyla Öğrenci Davranışlarını Değerlendirme Kurulu toplanacaktır.
        </p>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
            İlgili yönetmelik gereği; öğrencinin ceza aldıktan sonraki süreçteki davranışları, ders içi tutumları ve arkadaşlık ilişkilerindeki olumlu/olumsuz değişimler hakkındaki görüşlerinizi içeren raporun hazırlanarak idareye teslim edilmesi hususunda;
        </p>
        <p style="text-indent:30px;">Gereğini rica ederim.</p>
        
        <div style="text-align:right; margin-top:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
    `;
        setGeneratedDoc({ header: '', body });
    };


    // --- UTILS ---
    const handleDownloadPdf = async () => {
        const docElement = document.getElementById('document-preview');
        if (!docElement) return;
        setIsPdfGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const canvas = await html2canvas(docElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            doc.save(`Ceza_Kaldirma_Evrak_${selectedStudentId}.pdf`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[#f3f4f6]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-500">Karar ve Evrak</h1>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                    <h2 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                        <RotateCcw className="w-6 h-6" /> Disiplin Cezası Kaldırma (İade)
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isPdfGenerating || !generatedDoc}
                        className="text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        PDF İndir
                    </button>
                    <button onClick={() => window.print()} className="text-sm bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                        <Printer className="w-4 h-4" /> Yazdır
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">

                {/* LEFT SIDEBAR: INPUTS */}
                <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col z-0 overflow-y-auto">
                    <div className="p-6 space-y-6">

                        {/* 1. Student Selection */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                1. Cezalı Öğrenci Seçimi
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="">-- Ceza Alan Öğrenci Seçiniz --</option>
                                    {penalizedStudents.length === 0 && <option disabled>Sistemde cezalı öğrenci bulunmamaktadır.</option>}
                                    {penalizedStudents.map((s: Student) => (
                                        <option key={s.id} value={s.id}>{s.number} - {s.name} ({s.grade})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedStudentId && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                                    <label className="block text-xs font-bold text-blue-800 mb-1">Kaldırılacak Ceza (Olay)</label>
                                    <select
                                        value={selectedIncidentId}
                                        onChange={(e) => setSelectedIncidentId(e.target.value)}
                                        className="w-full p-2 border rounded text-xs bg-white"
                                    >
                                        <option value="">-- Olay Seç --</option>
                                        {studentIncidents.map((inc: Incident) => {
                                            const inv = inc.involvedStudents.find((s: InvolvedStudent) => s.studentId === selectedStudentId);
                                            return (
                                                <option key={inc.id} value={inc.id}>
                                                    {inc.date} - {inv?.decision} ({inc.title})
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* 2. Meeting Details */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                                <Calendar className="w-5 h-5 text-emerald-600" />
                                2. Toplantı Bilgileri
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Tarih</label>
                                    <input type="date" value={meetingData.date} onChange={e => setMeetingData({ ...meetingData, date: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Saat</label>
                                    <input type="time" value={meetingData.time} onChange={e => setMeetingData({ ...meetingData, time: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Toplantı Yeri</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input type="text" value={meetingData.location} onChange={e => setMeetingData({ ...meetingData, location: e.target.value })} className="w-full pl-9 p-2 border rounded text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Actions */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={generateMeetingCall}
                                disabled={!selectedIncidentId}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white p-3 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Users className="w-5 h-5" />
                                Kurul Toplantı Çağrısı Oluştur
                            </button>

                            <button
                                onClick={generateObservationRequest}
                                disabled={!selectedIncidentId}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Öğretmen Görüş Yazısı (Gözlem)
                            </button>

                            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>
                                    <strong>Bilgi:</strong> Disiplin cezalarının kaldırılması; {institution.type === 'Ortaokul' ? 'Md. 58' : 'Md. 171'} gereği dönem/ders yılı sonunda kurul kararıyla yapılır.
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT CONTENT: PREVIEW */}
                <div className="flex-1 bg-slate-50/50 p-8 overflow-y-auto flex flex-col items-center relative">

                    {generatedDoc ? (
                        <div
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
                            className="mb-20"
                        >
                            <div
                                id="document-preview"
                                ref={previewRef}
                                className="bg-white shadow-2xl text-black p-[20mm] font-serif w-[210mm] min-h-[297mm] h-auto relative"
                            >
                                <div
                                    contentEditable
                                    suppressContentEditableWarning
                                    className="outline-none h-full"
                                    dangerouslySetInnerHTML={{ __html: generatedDoc.body }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300">
                            <RotateCcw className="w-16 h-16 mb-4 opacity-50" />
                            <p>Önizleme için soldan seçim yapıp evrak oluştur butonuna basınız.</p>
                        </div>
                    )}

                    <ZoomControls
                        zoom={zoom}
                        onZoomIn={() => setZoom(z => Math.min(2.0, z + 0.1))}
                        onZoomOut={() => setZoom(z => Math.max(0.5, z - 0.1))}
                    />
                </div>

            </div>
        </div>
    );
};


interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
}

const ZoomControls = ({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) => (
    <div className="fixed bottom-8 bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-4 z-50 opacity-90 hover:opacity-100 transition-opacity print:hidden">
        <button onClick={onZoomOut} className="hover:text-blue-300 transition-colors" title="Uzaklaş"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="hover:text-blue-300 transition-colors" title="Yaklaş"><ZoomIn className="w-4 h-4" /></button>
    </div>
);

export default PenaltyRemoval;
