
import React, { useState, useEffect, useRef } from 'react';
import {
    Bot, FileText, ChevronRight, Loader2, PenTool, User, AlertCircle,
    Calendar, List, Printer, Users, Scale, Mail, Save, Download, FilePlus, Calculator, ZoomIn, ZoomOut, RotateCcw, MessageSquare, ScrollText, Sparkles, CheckCircle, X, RefreshCw
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { analyzeIncident, generateDecisionReason } from '../services/geminiService';
import { Incident } from '../types';
import { useStudents } from '../context/StudentContext';
import { useIncidents } from '../context/IncidentContext';
import { useSettings } from '../context/SettingsContext';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

const DecisionAssistant = () => {
    const { students } = useStudents();
    const { incidents, updateIncidentStudent } = useIncidents();
    const { institution, boardMembers } = useSettings();
    const [searchParams] = useSearchParams();
    const previewRef = useRef<HTMLDivElement>(null);

    // --- GLOBAL STATE ---
    // Default tab changed from 'tracking' to 'analysis'
    const [activeTab, setActiveTab] = useState<'analysis' | 'meeting' | 'forms' | 'decision'>('analysis');
    const [generatedDoc, setGeneratedDoc] = useState<{
        header: string;
        body: string;
        type?: string;
    } | null>(null);

    // New State for Blank Template Mode
    const [isBlankMode, setIsBlankMode] = useState(false);

    // --- ZOOM STATE ---
    const [zoom, setZoom] = useState(1.0);

    // --- SUCCESS MESSAGE STATE ---
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Listen for tab changes in URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'analysis') setActiveTab('analysis');
        else if (tab === 'meeting') setActiveTab('meeting');
        else if (tab === 'forms') setActiveTab('forms');
        else if (tab === 'decision') setActiveTab('decision');
        else if (!tab) setActiveTab('analysis'); // Default fallback

        // Reset zoom on tab change
        setZoom(1.0);
        setSuccessMessage(null);
    }, [searchParams]);

    // Helper to display current section title
    const getSectionTitle = () => {
        switch (activeTab) {
            case 'analysis': return '1. Yapay Zeka Analizi';
            case 'meeting': return '2. Toplantı Yönetimi';
            case 'forms': return '3. Tutanak ve Formlar';
            case 'decision': return '4. Karar ve Tebligat';
            default: return 'Süreç Yönetimi';
        }
    }

    // Helper to format YYYY-MM-DD to DD.MM.YYYY
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '.../.../....';
        try {
            const [y, m, d] = dateStr.split('-');
            if (y && m && d) return `${d}.${m}.${y}`;
            return dateStr;
        } catch (e) {
            return dateStr;
        }
    };

    // Helper to format YYYY-MM-DD to DD.MM.YYYY for display text
    const formatDateForDisplay = (dateStr: string) => {
        if (!dateStr) return '.../.../....';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('tr-TR').format(date);
    };

    // --- SHARED SELECTION STATE ---
    const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // --- MEETING STATE (Çağrı Pusulası) ---
    const [meetingData, setMeetingData] = useState({
        number: '2025/1',
        subject: 'Disiplin Kurulu Toplantısı',
        date: new Date().toISOString().split('T')[0],
        time: '12:30',
        location: 'Müdür Yardımcısı Odası',
        agenda: [
            'Açılış ve yoklama',
            'Kurula sevk edilen disiplin dosyalarının görüşülmesi',
            'Dilek ve temenniler',
            'Kapanış'
        ]
    });

    // --- DECISION FORM STATE ---
    const [decisionForm, setDecisionForm] = useState({
        decisionNo: '',
        decisionDate: new Date().toISOString().split('T')[0],
        penalty: 'KINAMA',
        reason: '',
        score: '10' // Default deduction
    });
    // State to track if data came from Penalty Catalog proposal
    const [isProposalLoaded, setIsProposalLoaded] = useState(false);

    // --- AI ANALYSIS & GENERATION STATE ---
    const [analysisDescription, setAnalysisDescription] = useState('');
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [isGeneratingReason, setIsGeneratingReason] = useState(false);

    // --- LOAD DATA EFFECTS ---

    // 1. Reset specific states when Incident changes
    useEffect(() => {
        setSelectedStudentId('');
        setAiResult(null);
        setAnalysisDescription('');
        setIsProposalLoaded(false);
        setGeneratedDoc(null);
        setSuccessMessage(null);
    }, [selectedIncidentId]);

    // 2. Load Student Data (Decision & Analysis) when Student changes
    useEffect(() => {
        setIsProposalLoaded(false);
        setSuccessMessage(null);

        if (selectedIncidentId && selectedStudentId && !isBlankMode) {
            const incident = incidents.find(i => i.id === selectedIncidentId);
            const involvement = incident?.involvedStudents.find(s => s.studentId === selectedStudentId);

            if (involvement) {
                // Load Decision Data
                if (involvement.decision) {
                    setDecisionForm({
                        decisionNo: involvement.decisionNo || '',
                        decisionDate: involvement.decisionDate || new Date().toISOString().split('T')[0],
                        penalty: involvement.decision,
                        reason: involvement.decisionReason || '',
                        score: involvement.penaltyScore || '10'
                    });

                    // Logic: If there is a decision/reason but NO decisionNo, it is likely a Proposal from the Catalog
                    if (!involvement.decisionNo && involvement.decisionReason) {
                        setIsProposalLoaded(true);
                        // Auto-suggest score based on proposal if not set
                        if (!involvement.penaltyScore) {
                            const p = involvement.decision;
                            let s = '0';
                            if (p.includes('KINAMA')) s = '10';
                            else if (p.includes('UZAKLAŞTIRMA')) s = '20';
                            else if (p.includes('DEĞİŞTİRME')) s = '40';
                            else if (p.includes('ÖRGÜN')) s = '80';
                            setDecisionForm(prev => ({ ...prev, score: s }));
                        }
                    }
                } else {
                    setDecisionForm({
                        decisionNo: '',
                        decisionDate: new Date().toISOString().split('T')[0],
                        penalty: 'KINAMA',
                        reason: '',
                        score: '10'
                    });
                }

                // Load Analysis Data
                if (activeTab === 'analysis') {
                    setAnalysisDescription(incident.description || ''); // Default to incident desc
                    if (involvement.aiAnalysis) {
                        setAiResult(involvement.aiAnalysis);
                    } else {
                        setAiResult(null);
                    }
                }
            }
        }
    }, [selectedIncidentId, selectedStudentId, incidents, activeTab, isBlankMode]);

    // --- HELPER VARS ---
    const selectedIncident = incidents.find(i => i.id === selectedIncidentId);
    const incidentStudents = selectedIncident
        ? selectedIncident.involvedStudents.map(rel => ({
            ...students.find(s => s.id === rel.studentId),
            role: rel.role,
            decision: rel.decision // Include decision info
        })).filter(s => s.id)
        : [];

    const boardPresident = boardMembers.find(m => m.role.includes('BAŞKAN'))?.mainName || '.......................................';

    // --- HANDLERS ---
    const handlePenaltyChange = (val: string) => {
        // Auto-suggest score based on penalty type
        let s = decisionForm.score;
        if (val.includes('UYARMA')) s = '0';
        else if (val.includes('KINAMA')) s = '10';
        else if (val.includes('UZAKLAŞTIRMA')) s = '20';
        else if (val.includes('DEĞİŞTİRME')) s = '40';
        else if (val.includes('ÖRGÜN')) s = '80';

        setDecisionForm(prev => ({ ...prev, penalty: val, score: s }));
    };

    const handleSaveDecision = () => {
        if (!selectedIncidentId || !selectedStudentId) {
            alert("Lütfen önce listeden olay ve öğrenci seçiniz.");
            return;
        }
        updateIncidentStudent(selectedIncidentId, selectedStudentId, {
            decision: decisionForm.penalty,
            decisionNo: decisionForm.decisionNo,
            decisionDate: decisionForm.decisionDate,
            decisionReason: decisionForm.reason,
            penaltyScore: decisionForm.score
        });

        // Success feedback
        setSuccessMessage("Karar başarıyla kaydedildi.");
        setTimeout(() => setSuccessMessage(null), 3000);
        setIsProposalLoaded(false);
    };

    const handleAnalyze = async () => {
        if (!selectedIncidentId || !selectedStudentId) return;
        const student = students.find(x => x.id === selectedStudentId);
        const incident = incidents.find(x => x.id === selectedIncidentId);
        if (!student || !incident) return;
        setLoading(true);
        const analysisIncident: Incident = { ...incident, description: analysisDescription };
        const res = await analyzeIncident(analysisIncident, student);
        setAiResult(res);
        setLoading(false);
        if (res) updateIncidentStudent(selectedIncidentId, selectedStudentId, { aiAnalysis: res });
    };

    // AI Decision Reason Generator
    const handleAutoGenerateReason = async () => {
        if (!selectedIncidentId || !selectedStudentId) return;
        const student = students.find(x => x.id === selectedStudentId);
        const incident = incidents.find(x => x.id === selectedIncidentId);
        if (!student || !incident) return;

        setIsGeneratingReason(true);
        const result = await generateDecisionReason(incident, student, decisionForm.penalty, institution.type);
        if (result) {
            setDecisionForm(prev => ({ ...prev, reason: result }));
        }
        setIsGeneratingReason(false);
    };

    const handleDownloadPdf = async () => {
        const docElement = document.getElementById('document-preview');
        if (!docElement && !aiResult) {
            alert("İndirilecek belge bulunamadı.");
            return;
        }
        setIsPdfGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const elementToPrint = docElement;

            if (elementToPrint) {
                const canvas = await html2canvas(elementToPrint, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowHeight: elementToPrint.scrollHeight,
                    windowWidth: elementToPrint.scrollWidth
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                // Handle multi-page with tolerance to prevent blank pages from tiny overflow
                while (heightLeft > 5) {
                    position = heightLeft - imgHeight;
                    doc.addPage();
                    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                doc.save(`evrak_${new Date().toISOString().split('T')[0]}.pdf`);
            }
        } catch (err) {
            console.error(err);
            alert("PDF oluşturulurken bir hata oluştu.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    const handleDocUpdate = (value: string) => {
        setGeneratedDoc(prev => prev ? { ...prev, body: value } : null);
    };

    // --- ZOOM CONTROLS ---
    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2.0));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setZoom(1.0);


    // --- DOCUMENT RENDERER ---
    const renderDocumentPreview = () => {
        if (activeTab === 'analysis' && aiResult) {
            return (
                <div id="document-preview" className="bg-white shadow-lg border border-slate-200 text-black mx-auto p-12 w-[210mm] min-h-[297mm]">
                    <h3 className="text-lg font-bold border-b border-black mb-6 pb-2 text-center">AI ANALİZ VE MEVZUAT RAPORU</h3>
                    <div className="whitespace-pre-wrap text-justify font-serif text-sm leading-relaxed">{aiResult}</div>
                    <div className="mt-12 text-center text-xs text-slate-400 border-t pt-4">*** Yapay Zeka (AI) tarafından bilgi amaçlı oluşturulmuştur. ***</div>
                </div>
            );
        }
        if (!generatedDoc) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <FileText className="w-16 h-16 mb-4" />
                <p>Önizleme için soldan seçim yapıp yukarıdan belge türüne tıklayınız.</p>
            </div>
        );

        // --- WORD FORMAT PAGE VISUALIZATION ---
        const totalPages = 5; // Support up to 5 visual pages loop
        const pageMarkers = Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const topPos = `${pageNum * 297}mm`;

            return (
                <React.Fragment key={i}>
                    {/* Page Break Visual Gap (The grey bar between pages) */}
                    <div
                        data-html2canvas-ignore="true"
                        className="absolute left-0 w-full h-4 bg-slate-100 border-y border-dashed border-slate-300 flex items-center justify-center z-10 print:hidden pointer-events-none"
                        style={{ top: topPos, transform: 'translateY(-50%)' }}
                    >
                        <span className="bg-slate-100 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Sayfa {pageNum} Sonu / Sayfa {pageNum + 1}
                        </span>
                    </div>

                    {/* Page Number Footer Indicator (Bottom Right of each page) */}
                    <div
                        data-html2canvas-ignore="true"
                        className="absolute right-8 text-[10px] text-slate-300 font-medium print:hidden pointer-events-none z-10"
                        style={{ top: `calc(${topPos} - 20px)` }}
                    >
                        Sayfa {pageNum}
                    </div>
                </React.Fragment>
            );
        });

        return (
            <div
                className="relative group mx-auto w-[210mm] mb-12"
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease-out'
                }}
            >
                {/* Edit Hint */}
                <div className="absolute top-4 -right-12 hidden group-hover:flex flex-col gap-2 z-20 pointer-events-none animate-fade-in">
                    <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1.5 rounded-l-md shadow-sm flex items-center gap-2">
                        <PenTool className="w-3 h-3" /> Düzenle
                    </div>
                </div>

                {/* The Page Container */}
                <div
                    id="document-preview"
                    ref={previewRef}
                    className="bg-white shadow-2xl text-black p-[20mm] font-serif min-h-[297mm] h-auto overflow-hidden relative"
                >
                    {/* Render Page Markers Layer */}
                    {pageMarkers}

                    {/* Header */}
                    {generatedDoc.header && (
                        <div className="text-center font-bold mb-4 whitespace-pre-wrap leading-tight relative z-0">{generatedDoc.header}</div>
                    )}

                    {/* Content - HTML Table Supported */}
                    <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleDocUpdate(e.currentTarget.innerHTML)}
                        className="outline-none hover:bg-yellow-50/10 focus:bg-yellow-100/20 transition-colors rounded px-2 h-auto cursor-text border border-transparent focus:border-yellow-200 text-[11pt] leading-normal relative z-0 min-h-[200mm]"
                        dangerouslySetInnerHTML={{ __html: generatedDoc.body }}
                    />
                </div>

                {/* Bottom Label */}
                <div className="text-center mt-2 text-xs text-slate-400 font-medium">
                    A4 Görünümü (Ön İzleme) - İçerik taştığında otomatik olarak sonraki sayfaya geçer.
                </div>
            </div>
        );
    };

    // --- TEMPLATE GENERATOR ---
    const generateTemplate = (type: string, studentOverride?: any) => {
        // -- Data Variables --
        let s = {
            name: "..............................................", grade: "..........", number: "..........",
            parent: "..............................................", dob: "..../..../.......", tc: ".....................",
            school: institution.name, address: "..........................................................."
        };
        let i = { date: "..../..../20....", time: "..... : .....", location: "..............................", title: "..............................", desc: "..................................................................................................." };
        let d = { no: "..........", date: "..../..../20....", penalty: "..............................", reason: "...................................................................................................", score: "...." };

        // Determine which student to use: passed override OR globally selected
        let targetStudentId = selectedStudentId;
        if (studentOverride) {
            targetStudentId = studentOverride.id;
        }

        if (!isBlankMode) {
            const student = students.find(s => s.id === targetStudentId);
            const incident = incidents.find(i => i.id === selectedIncidentId);

            if ((!student || !incident) && type !== 'ek1_meeting') {
                alert("Lütfen önce olay ve öğrenci seçiniz veya 'Boş Şablon' modunu açınız.");
                return;
            }

            if (student) s = {
                name: student.name, grade: student.grade, number: student.number,
                parent: student.parentName || 'Veli', dob: student.birthPlaceDate || '', tc: student.tcNo || '', school: institution.name,
                address: student.address || ''
            };
            if (incident) i = {
                date: formatDateForDisplay(incident.date), time: incident.time, location: incident.location,
                title: incident.title, desc: incident.description
            };
            d = { no: decisionForm.decisionNo, date: formatDateForDisplay(decisionForm.decisionDate), penalty: decisionForm.penalty, reason: decisionForm.reason, score: decisionForm.score };
        }

        // Common HTML Snippets
        const headerHtml = `
    <div style="text-align:center; font-weight:bold; margin-bottom:1.5rem; line-height:1.4;">
        T.C.<br>
        ${institution.province.toUpperCase()} VALİLİĞİ<br>
        ${institution.district} İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜ<br>
        ${institution.name}
    </div>`;

        // Header for Kaymakamlık based hierarchy (Some forms require Kaymakamlık instead of Valilik if it's district level)
        const headerHtmlV2 = `
    <div style="text-align:center; font-weight:bold; margin-bottom:1.5rem; line-height:1.4;">
        T.C.<br>
        ${institution.district ? institution.district.toUpperCase() + ' KAYMAKAMLIĞI' : institution.province.toUpperCase() + ' VALİLİĞİ'}<br>
        İLÇE MİLLİ EĞİTİM MÜDÜRLÜĞÜ<br>
        ${institution.name}
    </div>`;

        // Use V2 for specific forms if District name exists
        const useHeader = institution.district ? headerHtmlV2 : headerHtml;

        let currentBody = "";

        // --- TEMPLATE LOGIC ---
        if (type === 'student_summons') {
            const isSuspect = studentOverride?.role === 'suspect';
            const roleText = isSuspect
                ? 'Okul Disiplin Kurulunda görüşülecek olan disiplin dosyanızla ilgili <b>savunmanızı vermek üzere</b>'
                : 'Okul Disiplin Kurulunda görüşülecek olan bir olayla ilgili <b>görgü tanığı olarak bilginize başvurulmak üzere</b>';

            currentBody = `
        ${useHeader}
        <br>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
             <div><b>Sayı</b> : ...<br><b>Konu</b> : Çağrı Pusulası</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <br><br>
        <div style="text-align:center; font-weight:bold; font-size:12pt; text-decoration:underline; margin-bottom:20px;">ÖĞRENCİ ÇAĞRI PUSULASI</div>
        <br>
        <div style="margin-bottom:20px;">
            <b>Sayın ${s.name},</b><br>
            ${s.grade} Sınıfı / ${s.number} Nolu Öğrencisi
        </div>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
           ${i.date} tarihinde ${i.location} yerinde meydana gelen "${i.title}" olayı ile ilgili olarak, ${roleText} aşağıda belirtilen gün ve saatte Kurul Toplantı Salonunda hazır bulunmanız gerekmektedir.
        </p>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
           Belirtilen gün ve saatte gelmediğiniz takdirde; ${isSuspect ? 'savunma hakkınızdan vazgeçmiş sayılacağınızı ve dosyanızın mevcut bilgi ve belgelere göre karara bağlanacağını' : 'ifadenize başvurulamayacağını'} bilmenizi rica ederim.
        </p>
        <br>
        <table style="width:100%; border:1px solid black; margin-top:20px; font-size:10pt;">
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; width:30%; background-color:#f9f9f9;">Toplantı Tarihi</td>
                <td style="border:1px solid black; padding:8px;">${formatDate(meetingData.date)}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; background-color:#f9f9f9;">Toplantı Saati</td>
                <td style="border:1px solid black; padding:8px;">${meetingData.time}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:8px; font-weight:bold; background-color:#f9f9f9;">Toplantı Yeri</td>
                <td style="border:1px solid black; padding:8px;">${meetingData.location}</td>
            </tr>
        </table>
        
        <div style="text-align:right; margin-top:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
        
        <div style="margin-top:50px; border-top:1px dashed black; padding-top:10px; font-size:9pt;">
            <div style="text-align:center; margin-bottom:10px;"><b>TEBLİĞ - TEBELLÜĞ BELGESİ</b></div>
            <p>Yukarıdaki çağrı pusulasını elden teslim aldım. .../.../20...</p>
            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <div style="text-align:center;">
                    <b>Tebliğ Eden</b><br>
                    (İmza)<br><br>
                    ...................................<br>
                    Müdür Yardımcısı
                </div>
                <div style="text-align:center;">
                    <b>Tebellüğ Eden (Öğrenci)</b><br>
                    (İmza)<br><br>
                    <b>${s.name}</b>
                </div>
            </div>
        </div>
        `;
        }
        else if (type === 'ek10_decision') {
            currentBody = `
        ${headerHtml}
        <div style="text-align:center; font-weight:bold; margin-bottom:5px; margin-top:5px; border:1px solid black; padding:3px; font-size:10pt;">ÖĞRENCİ DAVRANIŞLARINI DEĞERLENDİRME KURULU KARARI<br><span style="font-weight:normal;">(Değişik: 02.05.2006/26156 RG)</span> <span style="float:right;">EK - 10</span></div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:9pt; page-break-inside:auto;">
            <tr>
                <td style="border:1px solid black; padding:3px; font-weight:bold; width:15%;">Karar No</td>
                <td style="border:1px solid black; padding:3px; width:35%;">: ${d.no}</td>
                <td style="border:1px solid black; padding:3px; font-weight:bold; width:15%;">Karar Tarihi</td>
                <td style="border:1px solid black; padding:3px; width:35%;">: ${d.date}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px; font-weight:bold;">Öğrencinin</td>
                <td colspan="3" style="border:1px solid black; padding:0;">
                   <table style="width:100%; border-collapse:collapse; border:none;">
                       <tr><td style="padding:3px; border-bottom:1px solid black;">Adı ve Soyadı</td><td style="padding:3px; border-bottom:1px solid black;">: ${s.name}</td></tr>
                       <tr><td style="padding:3px; border-bottom:1px solid black;">Sınıfı - No</td><td style="padding:3px; border-bottom:1px solid black;">: ${s.grade} - ${s.number} <span style="float:right;">Doğum Tarihi : ${s.dob}</span></td></tr>
                       <tr><td style="padding:3px; border-bottom:1px solid black;">Yarı Yıl</td><td style="padding:3px; border-bottom:1px solid black;">: ... <span style="float:right;">Cinsiyeti : ...</span></td></tr>
                       <tr><td style="padding:3px;">Sağlık durumu</td><td style="padding:3px;">: ... <span style="float:right;">Parasız yatılı ya da gündüzlü olduğu : ...</span></td></tr>
                   </table>
                </td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px; font-weight:bold;">Anne-Babanın</td>
                <td colspan="3" style="border:1px solid black; padding:0;">
                     <table style="width:100%; border-collapse:collapse; border:none; text-align:center;">
                        <tr>
                            <td style="border-right:1px solid black; border-bottom:1px solid black; width:50%; font-weight:bold;">Anne</td>
                            <td style="border-bottom:1px solid black; font-weight:bold;">Baba</td>
                        </tr>
                        <tr>
                            <td style="border-right:1px solid black; padding:3px;">...</td>
                            <td style="padding:3px;">${s.parent.split(' ')[0]}</td>
                        </tr>
                     </table>
                </td>
            </tr>
             <tr>
                <td colspan="4" style="border:1px solid black; padding:3px;">
                   Yaşı : ......................  Hayatta mı? ( )Evet ( )Hayır ............ ( )Evet ( )Hayır<br>
                   Öz mü? ( )Evet ( )Hayır ............ ( )Evet ( )Hayır<br>
                   Birlikte mi? ( )Evet ( )Hayır ............ ( )Evet ( )Hayır
                </td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Ailenin ekonomik durumu</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: </td>
            </tr>
             <tr>
                <td style="border:1px solid black; padding:3px;">Kardeş sayısı ve yaşları</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: </td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Ailesinin oturduğu yer ve açık adresi</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: ${s.address}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Şimdiye kadar aldığı yaptırımlar</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: </td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Yaptırımı gerektiren davranışın yer ve tarihi</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: ${i.location} / ${i.date}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Yaptırımı gerektiren davranışın çeşidi</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: ${i.title}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Yaptırımı gerektiren davranışın nedeni</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: </td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:3px;">Olayla ilgili olarak</td>
                <td colspan="3" style="border:1px solid black; padding:3px; vertical-align:top;">
                    a) Yaptırım uygulanacak öğrencinin ifadesi :<br><br>
                    b) Tanıkların ifadesinin özeti :<br><br>
                    c) Varsa yaptırımı gerektiren diğer deliller :<br><br>
                    d) Olayın Özeti (Geniş Açıklama) : <br>${i.desc}
                </td>
            </tr>
             <tr>
                <td style="border:1px solid black; padding:3px;">Yaptırımı hafifleten/şiddetlendiren nedenler</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: </td>
            </tr>
             <tr>
                <td style="border:1px solid black; padding:3px;">Verilen yaptırımın dayandığı yönetmelik mad.</td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: ${d.reason.split(')')[0] + ')'}</td>
            </tr>
             <tr>
                <td style="border:1px solid black; padding:3px; background-color:#f9f9f9;"><b>Öğr. davranışlarını değ. kurulunun kanaati</b></td>
                <td colspan="3" style="border:1px solid black; padding:3px;">: <b>${d.penalty}</b> ile cezalandırılmasına karar verilmiştir.</td>
            </tr>
        </table>
        
        <table style="width:100%; margin-top:20px; border:none; text-align:center; font-size:9pt; page-break-inside:avoid;">
            <tr>
               ${boardMembers.map(m => `<td style="width:${100 / boardMembers.length}%">${m.role}</td>`).join('')}
            </tr>
            <tr>
               ${boardMembers.map(m => `<td style="padding-top:20px;">${m.mainName}</td>`).join('')}
            </tr>
        </table>
        <div style="margin-top:30px; text-align:center; font-size:10pt; page-break-inside:avoid;">
            Uyğundur<br>..../..../20....<br><br>
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
        `;
        }
        else if (type === 'ek1_student_info') {
            currentBody = `
        <div style="text-align:right; font-weight:bold; margin-bottom:5px;">EK - 1</div>
        <div style="text-align:center; font-weight:bold; margin-bottom:10px; font-size:12pt;">
            ÖĞRENCİ DAVRANIŞLARINI DEĞERLENDİRME KURULU ÜYELERİNE<br>
            ÖĞRENCİ BİLGİLERİ
        </div>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ccc; font-size:10pt;">
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold; width:200px;">Okul No</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.number}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Sınıfı ve Şubesi</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.grade}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Adı Soyadı</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.name}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">T.C. No</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.tc}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Uyruğu</td>
                <td style="border:1px solid #ccc; padding:6px;">: T.C.</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Cinsiyeti</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Baba Adı</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.parent.split(' ')[0]}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Anne Adı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Doğum Yeri</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.dob.split('/')[0] || '...'}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Doğum Tarihi</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.dob}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Yaşı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Yatılı/Gündüzlü</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Baba Telefon No</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Anne Telefon No</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Kardeş Sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Maddi Durumu</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Sınıf Reh. Öğretmeni</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Sözlü Uyarı Sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Uyarı Sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Kınama Sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Uzaklaştırma Say.</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Okul Değiş. Sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Olayın Tarihi</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${i.date}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Olayın Saati</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${i.time}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Olayın Tekrar sayısı</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Tanık Öğretmen</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Tanık Öğrenci</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Davranış karşılığı</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${d.penalty}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Mevzuat karşılığı</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${d.reason.substring(0, 50)}...</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Verilen Ceza</td>
                <td style="border:1px solid #ccc; padding:6px;">:</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Adres</td>
                <td style="border:1px solid #ccc; padding:6px;">: ${s.address}</td>
            </tr>
            <tr>
                <td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Davr. Açıklaması</td>
                <td style="border:1px solid #ccc; padding:6px; height:50px; vertical-align:top;">: ${i.title}</td>
            </tr>
        </table>
        `;
        }
        else if (type === 'dizi_pusulasi') {
            currentBody = `
        <div style="text-align:center; font-weight:bold; margin-bottom:1rem;">ÖĞRENCİ DAVRANIŞLARINI DEĞERLENDİRME KURULU DOSYASI<br>DİZİ PUSULASI</div>
        
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:10pt;">
            <tr><td style="border:1px solid black; padding:5px;"><b>OKULU :</b> ${institution.name}</td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:5px;"><b>ADI SOYADI :</b> ${s.name}</td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:5px;"><b>SINIFI :</b> ${s.grade}</td><td style="border:1px solid black; padding:5px;"><b>NUMARASI :</b> ${s.number}</td></tr>
        </table>
        <br>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:9pt;">
            <tr style="background-color:#f0f0f0; text-align:center; font-weight:bold;">
                <td style="border:1px solid black; padding:5px; width:50%;">GÖNDERİLECEK EVRAKLAR</td>
                <td style="border:1px solid black; padding:5px; width:10%;">VAR</td>
                <td style="border:1px solid black; padding:5px; width:40%;">AÇIKLAMA</td>
            </tr>
            <tr><td style="border:1px solid black; padding:3px;">1) Okul Öğrenci Davranışları Değr. Kurulu Kararının Onaylı Örneği (Yön. 61)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">2) İtiraz Dilekçesi veya Yazısı (Yön. 61-c) (Sadece itiraz dosyalarında)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">3) Verilen Cezanın Öğrenci Velisine Tebliği (Yön. 61) (İtiraz dosyalarında)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">4) Kurula Sevk Edilen Öğrenci ve Tanıkların Yazılı İfadeleri (Yön. 61)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">5) Yazılı Savunma (Yön. 61)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">6) Sınıf Rehber Öğretmeninin Öğrenci İle İlgili Görüşü</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">7) Öğrenci Velisinin Öğrenci İle İlgili Görüşü</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">8) Okul Rehberlik Servisinin Öğrenci İle İlgili Görüşü</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">9) E-Okuldan Alınacak Öğrencinin Başarısını Gösterir Çizelge</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">10) E-Okuldan Alınacak Öğrenci Belgesi</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">11) Öğrencinin Adres Bilgisini Gösteren Belge</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">12) Mahkeme Kararı ve/veya Safahatı (Varsa)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
            <tr><td style="border:1px solid black; padding:3px;">13) Diğer Evraklar (....... Sayfa)</td><td style="border:1px solid black;"></td><td style="border:1px solid black;"></td></tr>
        </table>
        <div style="margin-top:30px; text-align:right; font-weight:bold;">
             ${institution.managerName}<br>Okul Müdürü
        </div>
        `;
        }
        else if (type === 'ek1_meeting') {
            currentBody = `
        ${headerHtml}
        <br>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
             <div><b>Sayı</b> : ${institution.ebysCode}<br><b>Konu</b> : Öğrenci Davranışları Kurulu<br>Toplantısı Çağrısı</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <div style="text-align:center; font-weight:bold; margin:20px 0;">ÖĞRENCİ DAVRANIŞLARINI DEĞERLENDİRME KURULU ÜYELERİNE</div>
        <p style="text-indent:30px; text-align:justify; line-height:1.6;">
           Öğrenci Davranışlarını Değerlendirme Kurulu'muz <b>${formatDate(meetingData.date)}</b> tarihinde saat <b>${meetingData.time}</b>'da toplanacaktır. 
           Kurulda bulunan öğretmenlerimizin aşağıdaki gündem maddelerini görüşmek üzere belirtilen gün ve saatte hazır bulunmaları, Asil üyelerden gelemeyenlerin yerine yedek üyelerin hazır bulunmaları hususunda gereğini rica ederim.
        </p>
        <div style="text-align:right; margin-top:30px; margin-bottom:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
        
        <b>GÜNDEM</b>
        <ol style="margin-top:5px;">
            <li>Açılış ve yoklama.</li>
            <li>Öğrenci Davranışları Değerlendirme Kurulu'ndaki dosyaların görüşülmesi.</li>
            <li>Dilek, temenniler ve kapanış.</li>
        </ol>
        <br>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:10pt; text-align:center;">
             <tr style="background-color:#f0f0f0; font-weight:bold;">
                <td style="border:1px solid black; padding:5px;">ÖĞRETMENİN ADI SOYADI</td>
                <td style="border:1px solid black; padding:5px;">GÖREVİ</td>
                <td style="border:1px solid black; padding:5px;">TARİH</td>
                <td style="border:1px solid black; padding:5px;">İMZA</td>
             </tr>
             ${boardMembers.map(m => `
             <tr>
                <td style="border:1px solid black; padding:8px;">${m.mainName}</td>
                <td style="border:1px solid black; padding:8px;">${m.role}</td>
                <td style="border:1px solid black; padding:8px;">${formatDate(meetingData.date)}</td>
                <td style="border:1px solid black; padding:8px;"></td>
             </tr>`).join('')}
        </table>
        `;
        }
        else if (type === 'sanction_student') {
            const remaining = 100 - (parseInt(d.score) || 0);

            currentBody = `
        ${useHeader}
        <br>
        <table style="width:100%; border:none;">
            <tr>
                <td style="width:10px;">Sayı</td><td>: ...</td>
                <td style="text-align:right;">${d.date}</td>
            </tr>
            <tr>
                <td>Konu</td><td>: Öğrencimize Uygulanan Yaptırım</td>
            </tr>
        </table>
        <br>
        <div style="text-align:center;"><b>.......<br>.... Sınıfının .... numaralı öğrencisi</b></div>
        <br>
        <p style="text-indent:30px; text-align:justify; line-height:1.5;">
            Aşağıda belirtilen uygunsuz davranışı yapmanız nedeniyle okulumuz Öğrenci Davranışlarını Değerlendirme Kurulu'nca suçlu bulunarak, şahsınıza aşağıdaki yaptırımın uygulanması uygun görülmüştür.
        </p>
        <p style="text-indent:30px; text-align:justify; line-height:1.5;">
             Bilgilerinize sunar, okul içinde ve dışında daha kötü sonuçlar doğurabilecek davranışlara yönelmemenizi, bu konuda okul idaresi, rehberlik servisi ve öğretmenlerinizden destek istemenizi, aksi takdirde bundan sonra yapacağınız her olumsuz davranıştan dolayı yaptırımın ağırlaşabileceğini bilmenizi rica ederim.
        </p>
        <div style="text-align:right; margin-top:30px; margin-bottom:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
        <div style="text-align:center; font-weight:bold; margin-bottom:5px;">ÖĞRENCİYE UYGULANAN YAPTIRIM TEBLİĞİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:10pt;">
            <tr>
                <td style="border:1px solid black; padding:5px; width:40%; font-weight:bold;">Yaptırım Gerektiren Davranış</td>
                <td style="border:1px solid black; padding:5px;">${i.title}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Verilen Yaptırım</td>
                <td style="border:1px solid black; padding:5px;">${d.penalty}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Yaptırımı Veren</td>
                <td style="border:1px solid black; padding:5px;">Öğrenci Davranışlarını Değerlendirme Kurulu</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Kırılan Davranış Notu</td>
                <td style="border:1px solid black; padding:5px;">${d.score}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold; background-color:#e0f2f1;">Kalan Davranış Notu</td>
                <td style="border:1px solid black; padding:5px; background-color:#e0f2f1;">${remaining}</td>
            </tr>
        </table>
        <br><br><br>
        <table style="width:100%; border:none; text-align:center;">
            <tr>
                <td></td>
                <td>Tarih : ..../..../20....<br>Öğrenci İmzası : ........................</td>
            </tr>
            <tr>
                <td></td>
                <td><br>Öğrenci Adı Soyadı : <b>${s.name}</b></td>
            </tr>
        </table>
        `;
        }
        else if (type === 'sanction_parent') {
            const remaining = 100 - (parseInt(d.score) || 0);
            currentBody = `
        ${useHeader}
        <br>
        <table style="width:100%; border:none;">
            <tr>
                <td style="width:10px;">Sayı</td><td>: ...</td>
                <td style="text-align:right;">${d.date}</td>
            </tr>
            <tr>
                <td>Konu</td><td>: Öğrencimize Uygulanan Yaptırım</td>
            </tr>
        </table>
        <br>
        <div style="text-align:center;"><b>.......<br>Öğrenci Velisi</b></div>
        <br>
        <p style="text-indent:30px; text-align:justify; line-height:1.5;">
            Velisi olduğunuz ................. sınıfından ....... no'lu .............................................................. aşağıda belirtilen kusurlu davranışı yapması nedeniyle okulumuz Öğrenci Davranışlarını Değerlendirme Kurulu'nca suçlu bulunarak, kendisine aşağıdaki yaptırımın uygulanması uygun görülmüştür.
        </p>
        <p style="text-indent:30px; text-align:justify; line-height:1.5;">
             Bilgilerinize sunar, öğrencimizin daha kötü sonuçlar doğurabilecek davranışlara yönelmesini önlemek için okul yönetimi, rehberlik servisi ve öğretmenleri ile işbirliği yapmanızı önerir, bundan sonra yapacağı her olumsuz davranıştan dolayı cezasının ağırlaşabileceğini bilmenizi rica ederim.
        </p>
        <div style="text-align:right; margin-top:30px; margin-bottom:40px;">
            <b>${institution.managerName}</b><br>Okul Müdürü
        </div>
        <div style="text-align:center; font-weight:bold; margin-bottom:5px;">UYGULANAN YAPTIRIMIN ÖĞRENCİ VELİSİNE TEBLİĞİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black; font-size:10pt;">
            <tr>
                <td style="border:1px solid black; padding:5px; width:40%; font-weight:bold;">Yaptırım Gerektiren Davranış</td>
                <td style="border:1px solid black; padding:5px;">${i.title}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Verilen Yaptırım</td>
                <td style="border:1px solid black; padding:5px;">${d.penalty}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Yaptırımı Veren</td>
                <td style="border:1px solid black; padding:5px;">Öğrenci Davranışlarını Değerlendirme Kurulu</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold;">Kırılan Davranış Notu</td>
                <td style="border:1px solid black; padding:5px;">${d.score}</td>
            </tr>
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold; background-color:#e0f2f1;">Kalan Davranış Notu</td>
                <td style="border:1px solid black; padding:5px; background-color:#e0f2f1;">${remaining}</td>
            </tr>
        </table>
        <br><br><br>
        <table style="width:100%; border:none; text-align:center;">
            <tr>
                <td></td>
                <td>Tarih : ..../..../20....<br>Öğrenci İmzası : ........................</td>
            </tr>
            <tr>
                <td></td>
                <td><br>Öğrenci Adı Soyadı : <b>${s.name}</b></td>
            </tr>
        </table>
        `;
        }
        // ... [Other templates remain same] ...
        else if (type === 'opinion_counselor') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="display:flex; justify-content:space-between;">
             <div><b>Sayı</b> : ...<br><b>Konu</b> : Bilgi Talebi</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <br><br>
        <div style="text-align:center;"><b>..........<br>Psikolojik Danışman / Rehberlik Öğretmeni</b></div>
        <br>
        <p style="text-indent:30px; text-align:justify;">
            Öğrenci Davranışlarını Değerlendirme Kurulu'nda görüşülmesi için gönderilen <b>${s.grade}</b> sınıfından <b>${s.name}</b> adlı öğrenciye ait dosya ile ilgili olarak adı geçen öğrenci ve velisiyle ilgili varsa görüşme tarih ve saatlerini ve öğrenci hakkındaki genel yorumlarınızı belirtmenizi rica ederim.
        </p>
        <div style="text-align:right; margin-top:30px; margin-bottom:30px;">
            <b>${boardPresident}</b><br>Öğr. Dav. Değ. Kur. Başkanı
        </div>
        
        <b>NOT: Öğrenci hakkındaki görüşlerinizi şu başlıklarda sunabilirsiniz:</b>
        <div style="border:1px solid #ddd; padding:10px; margin-top:10px;">
            <ol>
                <li>Öğrenci ile görüşme zamanları</li>
                <li>Veli ile görüşme zamanları</li>
                <li>Öğrencinin kişisel özellikleri</li>
                <li>Davranışın niteliği, önemi ve ne gibi şartlar altında yapıldığı</li>
                <li>Davranışın yapıldığı zamanki öğrencinin psikolojik durumu</li>
                <li>Öğrencinin okul içinde ve dışındaki genel durumu</li>
                <li>Öğrencinin derslerdeki ilgi ve başarısı</li>
                <li>Öğrencinin aynı öğretim yılı içinde daha önce ceza alıp almadığı</li>
                <li>Rehberlik servisinin görüş ve önerileri</li>
                <li>Diğer: ..........</li>
            </ol>
        </div>
        <div style="margin-top:40px; text-align:center;">
             Tarih : ..../..../20....<br>
             İmza : ........................<br><br>
             Adı Soyadı : ........................<br>
             Psikolojik Danışman / Rehberlik Öğretmeni
        </div>
        `;
        }
        else if (type === 'witness_student') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="text-align:center; font-weight:bold; margin:15px 0;">GÖRGÜ TANIĞI İFADE İSTEMİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
            <tr><td style="width:150px; font-weight:bold; padding:5px; border-bottom:1px solid #eee;">Suçlanan Öğrenci</td><td style="border-bottom:1px solid #eee;"></td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Adı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.name.split(' ')[0]}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Soyadı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">TC No</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.tc}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Sınıfı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.grade}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Numarası</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.number}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-top:2px solid #ccc;">Olay / İddia</td><td style="padding:5px; border-top:2px solid #ccc;">: ${i.title}</td></tr>
        </table>
        <br>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ccc;">
            <tr><td style="border:1px solid #ccc; padding:5px; font-weight:bold; background-color:#f9f9f9;">Tanık Öğrenci / Öğrenciler</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğrenci - 1 :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğrenci - 2 :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğrenci - 3 :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğrenci - 4 :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğrenci - 5 :</td></tr>
        </table>
        <br>
        <p style="text-indent:30px;">Yukarıda açıkça bilgileri verilen öğrencimizin iddia edilen olumsuz davranışlarıyla ilgili olmak üzere konu hakkında kesin olarak gördüğünüz, bildiğiniz tüm bilgileri en baştan başlayarak ve ayrıntılı olarak aşağıya yazınız ve imzalayınız.</p>
        <div style="border:1px solid black; min-height:300px; margin-top:10px; padding:10px;">
             Buradan başlayabilirsiniz. Ek kağıt kullanabilirsiniz.
        </div>
        `;
        }
        else if (type === 'witness_teacher') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="text-align:center; font-weight:bold; margin:15px 0;">TANIK ÖĞRETMEN/ÖĞRETMENLERDEN İFADE İSTEMİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
            <tr><td style="width:150px; font-weight:bold; padding:5px; border-bottom:1px solid #eee;">Suçlanan Öğrenci</td><td style="border-bottom:1px solid #eee;"></td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Adı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.name.split(' ')[0]}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Soyadı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">TC No</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.tc}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Sınıfı</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.grade}</td></tr>
            <tr><td style="padding:5px; border-bottom:1px solid #eee;">Numarası</td><td style="padding:5px; border-bottom:1px solid #eee;">: ${s.number}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-top:2px solid #ccc;">Olay / İddia</td><td style="padding:5px; border-top:2px solid #ccc;">: ${i.title}</td></tr>
        </table>
        <br>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ccc;">
            <tr><td style="border:1px solid #ccc; padding:5px; font-weight:bold; background-color:#f9f9f9;">Tanık Öğretmen / Öğretmenler</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğretmen :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğretmen :</td></tr>
            <tr><td style="border:1px solid #ccc; padding:5px; height:25px;">Tanık Öğretmen :</td></tr>
        </table>
        <br>
        <p style="text-indent:30px;">Yukarıda açıkça bilgileri verilen öğrencimizin iddia edilen olumsuz davranışlarıyla ilgili bilgi, belge ve tutanakların, yaptığınız çalışmalar ve rehberlik faaliyetleri raporlarının Öğrenci Davranışlarını Değerlendirme Kuruluna sevk edilmek üzere dosya halinde Müdürlüğümüze teslim edilmesini rica ederim.</p>
        <div style="border:1px solid black; min-height:400px; margin-top:20px; padding:10px;">
             <!-- Space for teacher's report -->
        </div>
        `;
        }
        else if (type === 'statement_request') {
            currentBody = `
        ${useHeader}
        <br><br>
        <div style="text-align:center; font-weight:bold; margin-bottom:20px;">İFADE TALEBİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
             <tr><td style="padding:5px; width:150px; font-weight:bold;">Öğrencinin</td><td></td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Adı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.name.split(' ')[0]}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Soyadı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">TC No</td><td style="padding:5px; border:1px solid #ccc;">: ${s.tc}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Sınıfı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.grade}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Numarası</td><td style="padding:5px; border:1px solid #ccc;">: ${s.number}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Velisinin Adresi</td><td style="padding:5px; border:1px solid #ccc;">: ${s.address}</td></tr>
             <tr><td style="padding:5px; font-weight:bold; border-top:2px solid #ccc;">İddia</td><td style="padding:5px; border-top:2px solid #ccc;">: ${i.title}</td></tr>
        </table>
        <br>
        <p style="margin-top:20px; text-indent:30px;">Öğrenci Davranışlarını Değerlendirme Kuruluna intikal eden dosyalarda size isnat edilen yukarıdaki suçlamalar ile ilgili yapacağınız tüm açıklama ve bilgileri içeren ifadenizi aşağıya yazarak imzalayınız.</p>
        <div style="border:1px solid black; min-height:200px; padding:10px; margin-top:10px;">
             Buradan başlayabilirsiniz. Ek kağıt kullanabilirsiniz.
        </div>
        <div style="margin-top:30px; text-align:center;">
             Tarih : ..../..../20....<br>
             İmza : ........................<br><br>
             Adı Soyadı : ${s.name}<br>
             ..... Sınıfının ..... numaralı öğrencisi
        </div>
        `;
        }
        else if (type === 'defense_request') {
            currentBody = `
        ${useHeader}
        <br><br>
        <div style="text-align:center; font-weight:bold; margin-bottom:20px;">SAVUNMA TALEBİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
             <tr><td style="padding:5px; width:150px; font-weight:bold;">Öğrencinin</td><td></td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Adı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.name.split(' ')[0]}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Soyadı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">TC No</td><td style="padding:5px; border:1px solid #ccc;">: ${s.tc}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Sınıfı</td><td style="padding:5px; border:1px solid #ccc;">: ${s.grade}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Numarası</td><td style="padding:5px; border:1px solid #ccc;">: ${s.number}</td></tr>
             <tr><td style="padding:5px; border:1px solid #ccc;">Velisinin Adresi</td><td style="padding:5px; border:1px solid #ccc;">: ${s.address}</td></tr>
             <tr><td style="padding:5px; font-weight:bold; border-top:2px solid #ccc;">Olay</td><td style="padding:5px; border-top:2px solid #ccc;">: ${i.title}</td></tr>
        </table>
        <br>
        <p style="margin-top:20px; text-indent:30px;">Öğrenci Davranışlarını Değerlendirme Kuruluna intikal eden dosyalarda size isnat edilen ve yukarıda açıkça belirtilen suçlamalar bulunmaktadır. Konuyla ilgili Savunmanızı aşağıya yazarak imzalayınız.</p>
        <div style="border:1px solid black; min-height:200px; padding:10px; margin-top:10px;">
             Buradan başlayabilirsiniz. Ek kağıt kullanabilirsiniz.
        </div>
        <div style="margin-top:30px; text-align:center;">
             Tarih : ..../..../20....<br>
             İmza : ........................<br><br>
             Adı Soyadı : ${s.name}<br>
             ..... Sınıfının ..... numaralı öğrencisi
        </div>
        `;
        }
        else if (type === 'verbal_warning') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="text-align:center; font-weight:bold; font-size:12pt; margin:15px 0;">SÖZLÜ UYARI TUTANAĞI</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black;">
            <tr><td style="padding:5px; border:1px solid black; font-weight:bold;">Öğrenci/Öğrencilerin</td><td></td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Adı</td><td style="padding:5px; border:1px solid black;">: ${s.name.split(' ')[0]}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Soyadı</td><td style="padding:5px; border:1px solid black;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">TC No</td><td style="padding:5px; border:1px solid black;">: ${s.tc}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Sınıfı</td><td style="padding:5px; border:1px solid black;">: ${s.grade}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Numarası</td><td style="padding:5px; border:1px solid black;">: ${s.number}</td></tr>
        </table>
        <br>
        <p style="line-height:2em;">
            Yukarıda bilgileri bulunan öğrencimiz/öğrencilerimiz ..................................... tarihinde, ........................................................................................................................................................................................................................................................................................................................................................................
        </p>
        <p>Adı geçen öğrenci/öğrenciler tarafımca sözlü uyarılarak bu tutanak imza altına alınmıştır. .../.../20...</p>
        <br><br>
        <div style="display:flex; justify-content:space-between; text-align:center; padding:0 50px;">
            <div>
                <b>...................</b><br>
                ......... Sınıfı Öğrencisi
            </div>
             <div>
                <b>...................</b><br>
                ......... Öğretmeni
            </div>
        </div>
        <br><br>
        <table style="width:100%; border:1px solid black; margin-top:20px;">
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold; width:20%;">Olayın Özeti</td>
                <td style="border:1px solid black; padding:5px; height:60px;">: (Öğrenci tarafından doldurulacaktır)<br><br></td>
            </tr>
        </table>
        `;
        }
        else if (type === 'contract') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="text-align:center; font-weight:bold; font-size:12pt; margin:15px 0;">ÖĞRENCİ SÖZLEŞMESİ</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black;">
            <tr><td style="padding:5px; border:1px solid black; font-weight:bold;">Öğrencinin</td><td></td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Adı</td><td style="padding:5px; border:1px solid black;">: ${s.name.split(' ')[0]}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Soyadı</td><td style="padding:5px; border:1px solid black;">: ${s.name.split(' ').slice(1).join(' ')}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">TC No</td><td style="padding:5px; border:1px solid black;">: ${s.tc}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Sınıfı</td><td style="padding:5px; border:1px solid black;">: ${s.grade}</td></tr>
            <tr><td style="padding:5px; border:1px solid black;">Numarası</td><td style="padding:5px; border:1px solid black;">: ${s.number}</td></tr>
        </table>
        <br>
        <p style="line-height:2em;">
            Ben ................................................................<br>
            .................................... tarihinde, .............................................................................................................................................................................................................................................. davranışında bulundum.<br>
            Sınıf Rehber Öğretmenim ................................................... tarafından ................................. tarihinde uyarıldım ve hatalı olduğumu anladım. Olumsuz davranışımın yinelenmesi durumunda uygulanabilecek yaptırımlar konusunda bilgilendirildim. Aynı tür davranışı bir kez daha yapmayacağıma söz veriyorum.
        </p>
        <br><br>
        <div style="display:flex; justify-content:space-between; text-align:center;">
             <div>
                <b>.....................................</b><br>
                ..... Sınıfı Öğrencisi
            </div>
            <div>
                <b>.....................................</b><br>
                ..... Öğretmeni
            </div>
        </div>
        <br><br>
        <table style="width:100%; border:1px solid black; margin-top:20px;">
            <tr>
                <td style="border:1px solid black; padding:5px; font-weight:bold; width:20%;">Olayın Özeti</td>
                <td style="border:1px solid black; padding:5px; height:60px;">: (Öğrenci tarafından doldurulacaktır)<br><br></td>
            </tr>
        </table>
        `;
        }
        else if (type === 'parent_meeting') {
            currentBody = `
        ${useHeader}
        <br>
        <div style="display:flex; justify-content:space-between;">
             <div><b>Sayı</b> : ...<br><b>Konu</b> : ................. Hakkında</div>
             <div>${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <br>
        <div style="text-align:center; font-weight:bold; font-size:12pt; margin-bottom:10px;">VELİ GÖRÜŞME TUTANAĞI</div>
        <table style="width:100%; border-collapse:collapse; border:1px solid black;">
            <tr>
                <td style="padding:5px; border:1px solid black; font-weight:bold; width:25%;">Öğrencinin</td>
                <td style="padding:5px; border:1px solid black;"></td>
            </tr>
            <tr>
                <td style="padding:5px; border:1px solid black;">Adı</td>
                <td style="padding:5px; border:1px solid black;">: ${s.name.split(' ')[0]}</td>
            </tr>
            <tr>
                <td style="padding:5px; border:1px solid black;">Soyadı</td>
                <td style="padding:5px; border:1px solid black;">: ${s.name.split(' ').slice(1).join(' ')}</td>
            </tr>
            <tr>
                <td style="padding:5px; border:1px solid black;">TC No</td><td style="padding:5px; border:1px solid black;">: ${s.tc}</td>
            </tr>
            <tr>
                <td style="padding:5px; border:1px solid black;">Sınıfı</td>
                <td style="padding:5px; border:1px solid black;">: ${s.grade}</td>
            </tr>
             <tr>
                <td style="padding:5px; border:1px solid black;">Numarası</td><td style="padding:5px; border:1px solid black;">: ${s.number}</td>
            </tr>
        </table>
        <br>
        <p>Yukarıda bilgileri bulunan öğrencim ............................................................................ tarafından gerçekleştirilen olumsuz davranışlarla ilgili .......................................................................... tarihinde, Okul Müdür Yardımcısı ...................................................... nezaretinde konu hakkında ve öğrencimin olumsuz davranışının devam etmesi durumunda yapılacak işlemler hakkında da ayrıca bilgilendirildim. .../.../20...</p>
        <br><br>
        <div style="display:flex; justify-content:space-between; text-align:center;">
             <div style="border-top:1px solid black; padding-top:5px; width:40%;">
                <b>................................</b><br>
                Öğrenci Velisi
            </div>
            <div style="border-top:1px solid black; padding-top:5px; width:40%;">
                <b>................................</b><br>
                .............. Öğretmeni
            </div>
        </div>
        <br><br>
        <div style="text-align:center;">
            <b>....................................</b><br>
            Öğr. Dav. Değ. Kur. Başkanı
        </div>
        <br>
        <div style="border-top:1px solid black; padding-top:5px;">
             Veli'nin görüşü (Varsa): (Veli tarafından doldurulacaktır)
        </div>
        `;
        }

        setGeneratedDoc({ header: '', body: currentBody, type });
    };

    return (
        <div className="flex flex-col h-screen bg-[#f3f4f6]">
            {/* HEADER ACTIONS */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-500">Süreç Yönetimi</h1>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                    <h2 className="text-xl font-bold text-blue-700">{getSectionTitle()}</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isPdfGenerating}
                        className="text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-2 disabled:opacity-50 transition-colors"
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

                {/* --- TAB 1: AI ANALYSIS --- */}
                {activeTab === 'analysis' && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mb-6 flex gap-3">
                                <Bot className="w-6 h-6 text-indigo-600 shrink-0" />
                                <p className="text-xs text-indigo-800">Yapay zeka asistanı, seçilen olay ve öğrenci için disiplin maddelerini analiz eder.</p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Seçiniz</label>
                                    <select value={selectedIncidentId} onChange={e => { setSelectedIncidentId(e.target.value); }} className="w-full p-2.5 border rounded-lg bg-slate-50 outline-none text-sm">
                                        <option value="">-- Listeden Seç --</option>
                                        {incidents.map(inc => <option key={inc.id} value={inc.id}>{inc.code} - {inc.title}</option>)}
                                    </select>
                                </div>
                                {selectedIncident && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">İlgili Öğrenci</label>
                                        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-2.5 border rounded-lg bg-slate-50 outline-none text-sm">
                                            <option value="">-- Öğrenci Seç --</option>
                                            {incidentStudents.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button onClick={handleAnalyze} disabled={loading || !selectedStudentId} className={`w-full text-white py-2.5 rounded-lg flex justify-center items-center gap-2 ${aiResult ? 'bg-orange-500' : 'bg-indigo-600'}`}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analiz Başlat'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto flex justify-center">{renderDocumentPreview()}</div>
                    </div>
                )}

                {/* --- TAB 2: MEETING --- */}
                {activeTab === 'meeting' && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto">

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Seçimi (Çağrı İçin)</label>
                                <select value={selectedIncidentId} onChange={e => { setSelectedIncidentId(e.target.value); }} className="w-full p-2.5 border rounded-lg bg-slate-50 outline-none text-sm">
                                    <option value="">-- Olay Seç --</option>
                                    {incidents.map(inc => <option key={inc.id} value={inc.id}>{inc.code} - {inc.title}</option>)}
                                </select>
                            </div>

                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" /> Toplantı Bilgileri
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Toplantı Tarihi</label>
                                    <input type="date" value={meetingData.date} onChange={e => setMeetingData({ ...meetingData, date: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Toplantı Saati</label>
                                    <input type="time" value={meetingData.time} onChange={e => setMeetingData({ ...meetingData, time: e.target.value })} className="w-full p-2 border rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Toplantı Yeri</label>
                                    <input type="text" value={meetingData.location} onChange={e => setMeetingData({ ...meetingData, location: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Toplantı Yeri" />
                                </div>

                                {/* NEW UPDATE BUTTON */}
                                <button
                                    onClick={() => {
                                        if (window.confirm('Toplantı tarihi ve saati evraka işlenecektir. Onaylıyor musunuz?')) {
                                            generateTemplate('ek1_meeting');
                                        }
                                    }}
                                    className="w-full mt-2 bg-indigo-50 text-indigo-700 border border-indigo-200 p-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-indigo-100 transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Bilgileri Çağrı Yazısına İşle (Güncelle)
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col bg-slate-50/50">
                            <div className="p-4 bg-white border-b border-slate-200">
                                <button onClick={() => generateTemplate('ek1_meeting')} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                                    <List className="w-4 h-4" /> Kurul Çağrı Yazısı (Genel)
                                </button>
                            </div>

                            <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center">
                                {renderDocumentPreview()}

                                {/* Student Summons List Area */}
                                {selectedIncident && (
                                    <div className="w-[210mm] mt-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm print:hidden">
                                        <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                                            <Mail className="w-5 h-5 text-indigo-600" />
                                            Öğrenci Çağrı Pusulaları
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {incidentStudents.map((s: any) => (
                                                <div key={s.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                                                    <div>
                                                        <div className="font-bold text-sm">{s.name}</div>
                                                        <div className="text-xs flex gap-2 mt-1">
                                                            <span className="text-slate-500">{s.number}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${s.role === 'suspect' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {s.role === 'suspect' ? 'Fail (Savunma)' : s.role === 'witness' ? 'Tanık (İfade)' : 'Mağdur'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => generateTemplate('student_summons', s)}
                                                        className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                                                    >
                                                        Pusula Oluştur
                                                    </button>
                                                </div>
                                            ))}
                                            {incidentStudents.length === 0 && (
                                                <div className="text-center text-slate-400 text-sm py-4">Bu olaya eklenmiş öğrenci bulunmamaktadır.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <ZoomControls
                                    zoom={zoom}
                                    onZoomIn={handleZoomIn}
                                    onZoomOut={handleZoomOut}
                                    onReset={handleResetZoom}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: FORMS --- */}
                {activeTab === 'forms' && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Seçiniz</label>
                                <select value={selectedIncidentId} onChange={e => { setSelectedIncidentId(e.target.value); setSelectedStudentId(''); }} className="w-full p-2 border rounded text-sm">
                                    <option value="">-- Olay Seç --</option>
                                    {incidents.map(inc => <option key={inc.id} value={inc.id}>{inc.title}</option>)}
                                </select>
                            </div>
                            {selectedIncident && (
                                <div className="flex-1 overflow-y-auto border rounded-lg">
                                    {incidentStudents.map((s: any) => (
                                        <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${selectedStudentId === s.id ? 'bg-blue-50' : ''}`}>
                                            <div className="font-bold text-sm">{s.name}</div>
                                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                {s.role === 'suspect' ? 'Fail' : s.role === 'witness' ? 'Tanık' : 'Mağdur'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setIsBlankMode(!isBlankMode)} className="mt-4 w-full border border-slate-300 p-2 rounded text-xs hover:bg-slate-50">
                                {isBlankMode ? 'Matbu Modu Kapat' : 'Matbu (Boş) Modu Aç'}
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col bg-slate-50/50">
                            <div className="p-4 bg-white border-b border-slate-200 overflow-x-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {/* Grup 1: İfade ve Savunma */}
                                    <button onClick={() => generateTemplate('statement_request')} className="p-2 border rounded hover:bg-blue-50 text-xs flex gap-1"><FileText className="w-3 h-3" /> İfade Talebi</button>
                                    <button onClick={() => generateTemplate('defense_request')} className="p-2 border rounded hover:bg-blue-50 text-xs flex gap-1"><Scale className="w-3 h-3" /> Savunma Talebi</button>
                                    <button onClick={() => generateTemplate('witness_student')} className="p-2 border rounded hover:bg-blue-50 text-xs flex gap-1"><Users className="w-3 h-3" /> Görgü Tanığı</button>
                                    <button onClick={() => generateTemplate('witness_teacher')} className="p-2 border rounded hover:bg-blue-50 text-xs flex gap-1"><User className="w-3 h-3" /> Tanık Öğretmen</button>

                                    {/* Grup 2: Görüşler */}
                                    <button onClick={() => generateTemplate('opinion_counselor')} className="p-2 border rounded hover:bg-purple-50 text-xs flex gap-1"><MessageSquare className="w-3 h-3" /> Rehberlik Görüş</button>
                                    <button onClick={() => generateTemplate('opinion_counselor')} className="p-2 border rounded hover:bg-purple-50 text-xs flex gap-1"><MessageSquare className="w-3 h-3" /> Sınıf Rehb. Görüş</button>

                                    {/* Grup 3: Tutanaklar */}
                                    <button onClick={() => generateTemplate('verbal_warning')} className="p-2 border rounded hover:bg-orange-50 text-xs flex gap-1"><AlertCircle className="w-3 h-3" /> Sözlü Uyarı</button>
                                    <button onClick={() => generateTemplate('contract')} className="p-2 border rounded hover:bg-orange-50 text-xs flex gap-1"><ScrollText className="w-3 h-3" /> Öğrenci Sözleşmesi</button>
                                    <button onClick={() => generateTemplate('parent_meeting')} className="p-2 border rounded hover:bg-orange-50 text-xs flex gap-1"><Users className="w-3 h-3" /> Veli Görüşme</button>
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto flex justify-center">
                                {renderDocumentPreview()}
                                <ZoomControls
                                    zoom={zoom}
                                    onZoomIn={handleZoomIn}
                                    onZoomOut={handleZoomOut}
                                    onReset={handleResetZoom}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 4: DECISION --- */}
                {activeTab === 'decision' && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col overflow-y-auto">

                            {/* INCIDENT & STUDENT SELECTOR (Added for Tab 4) */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Seçiniz</label>
                                <select value={selectedIncidentId} onChange={e => { setSelectedIncidentId(e.target.value); setSelectedStudentId(''); }} className="w-full p-2 border rounded text-sm">
                                    <option value="">-- Olay Seç --</option>
                                    {incidents.map(inc => <option key={inc.id} value={inc.id}>{inc.title}</option>)}
                                </select>
                            </div>
                            {selectedIncident && (
                                <div className="mb-6 border rounded-lg max-h-40 overflow-y-auto">
                                    {incidentStudents.map((s: any) => (
                                        <div key={s.id} onClick={() => setSelectedStudentId(s.id)} className={`p-2 border-b cursor-pointer hover:bg-slate-50 text-sm ${selectedStudentId === s.id ? 'bg-blue-50 font-bold' : ''}`}>
                                            {s.name} <span className="text-[10px] text-slate-500">({s.role})</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* NEW BUTTON */}
                            <button
                                onClick={() => setIsBlankMode(!isBlankMode)}
                                className={`mb-6 w-full border p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isBlankMode ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {isBlankMode ? 'Matbu Modu Kapat' : 'Matbu (Boş) Modu Aç'}
                            </button>

                            {/* Simplified Form */}
                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Karar No</label>
                                        <input type="text" value={decisionForm.decisionNo} onChange={e => setDecisionForm({ ...decisionForm, decisionNo: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="2025/1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Calculator className="w-3 h-3" /> Ceza Puanı</label>
                                        <input
                                            type="number"
                                            value={decisionForm.score}
                                            onChange={e => setDecisionForm({ ...decisionForm, score: e.target.value })}
                                            className="w-full p-2 border rounded text-sm font-bold text-blue-700 bg-blue-50 focus:bg-white"
                                            placeholder="10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Verilen Ceza</label>
                                    <select value={decisionForm.penalty} onChange={e => handlePenaltyChange(e.target.value)} className="w-full p-2 border rounded text-sm">
                                        <option value="KINAMA">KINAMA</option>
                                        <option value="UYARMA">UYARMA</option>
                                        <option value="KISA SÜRELİ UZAKLAŞTIRMA">KISA SÜRELİ UZAKLAŞTIRMA</option>
                                        <option value="OKUL DEĞİŞTİRME">OKUL DEĞİŞTİRME</option>
                                        <option value="ÖRGÜN EĞİTİM DIŞINA ÇIKARMA">ÖRGÜN EĞİTİM DIŞINA ÇIKARMA</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Gerekçe / Madde</label>
                                        <button
                                            onClick={handleAutoGenerateReason}
                                            disabled={isGeneratingReason || !selectedIncidentId}
                                            className="text-[10px] flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 hover:bg-purple-100 disabled:opacity-50 transition-colors"
                                        >
                                            {isGeneratingReason ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            AI ile Gerekçe Yaz
                                        </button>
                                    </div>
                                    <textarea value={decisionForm.reason} onChange={e => setDecisionForm({ ...decisionForm, reason: e.target.value })} className="w-full p-2 border rounded text-sm" placeholder="Gerekçe" rows={5}></textarea>
                                </div>

                                {/* Success Message Banner */}
                                {successMessage && (
                                    <div className="bg-green-50 text-green-700 px-3 py-2 rounded text-xs font-bold flex items-center gap-2 animate-fade-in border border-green-100 mb-2">
                                        <CheckCircle className="w-4 h-4" />
                                        {successMessage}
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveDecision}
                                    disabled={isBlankMode}
                                    className={`w-full py-2 rounded text-sm font-medium transition-colors shadow-sm ${isBlankMode ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                >
                                    Kararı Kaydet
                                </button>
                                <div className="text-[10px] text-slate-400 italic text-center mt-1">Ceza puanını manuel düzenleyebilirsiniz.</div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-slate-50/50">
                            <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2">
                                <button onClick={() => generateTemplate('ek10_decision')} className="p-2 border rounded hover:bg-red-50 text-red-700 text-xs font-bold">EK-10 Karar</button>
                                <button onClick={() => generateTemplate('dizi_pusulasi')} className="p-2 border rounded hover:bg-slate-50 text-xs">Dizi Pusulası</button>
                                <button onClick={() => generateTemplate('sanction_student')} className="p-2 border rounded hover:bg-slate-50 text-xs">Yaptırım Tebliği (Öğr)</button>
                                <button onClick={() => generateTemplate('sanction_parent')} className="p-2 border rounded hover:bg-slate-50 text-xs">Yaptırım Tebliği (Veli)</button>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto flex justify-center">
                                {renderDocumentPreview()}
                                <ZoomControls
                                    zoom={zoom}
                                    onZoomIn={handleZoomIn}
                                    onZoomOut={handleZoomOut}
                                    onReset={handleResetZoom}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ZoomControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-4 z-50 transition-opacity hover:opacity-100 opacity-80 print:hidden">
        <button onClick={onZoomOut} className="hover:text-blue-300 transition-colors" title="Uzaklaş"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs font-mono w-10 text-center font-bold">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="hover:text-blue-300 transition-colors" title="Yaklaş"><ZoomIn className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-slate-600 mx-1"></div>
        <button onClick={onReset} className="hover:text-blue-300 transition-colors" title="Sıfırla"><RotateCcw className="w-3 h-3" /></button>
    </div>
);

export default DecisionAssistant;
