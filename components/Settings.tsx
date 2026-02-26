
import React, { useState, useEffect } from 'react';
import { Save, Building, Users, Info, AlertTriangle, Sparkles, Eye, EyeOff, CheckCircle, XCircle, Loader2, ExternalLink, RefreshCw, Trash2, Plus, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { validateApiKey, fetchBoardInfoFromUrl } from '../services/geminiService';
import { BoardMember } from '../types';

const Settings = () => {
    const { institution, boardMembers, apiKey, updateInstitution, updateBoardMembers, updateApiKey } = useSettings();
    const [activeTab, setActiveTab] = useState<'institution' | 'board' | 'ai'>('institution');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    // AI Key State
    const [tempKey, setTempKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Board Regulation Info State
    const [regulationInfo, setRegulationInfo] = useState<string>('');
    const [isFetchingInfo, setIsFetchingInfo] = useState(false);

    // Delete Confirmation Modal State
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

    useEffect(() => {
        setTempKey(apiKey);
    }, [apiKey]);

    // Set default regulation text based on school type on mount if empty
    useEffect(() => {
        if (!regulationInfo) {
            if (institution.type === 'Ortaokul') {
                setRegulationInfo("Öğrenci Davranışlarını Değerlendirme Kurulu (Ortaokul): Müdürün görevlendireceği müdür yardımcısının başkanlığında, her ders yılının ilk öğretmenler kurulu toplantısında gizli oyla seçilecek üç öğretmen ve Okul-Aile Birliğinin kendi üyeleri arasından seçeceği bir öğrenci velisinden oluşturulur.");
            } else {
                setRegulationInfo("Disiplin Kurulu (Lise): Müdürün görevlendireceği müdür başyardımcısı veya müdür yardımcısının başkanlığında, öğretmenler kurulunca gizli oyla seçilecek iki öğretmen, onur kurulu ikinci başkanı ve okul-aile birliği başkanından oluşturulur.");
            }
        }
    }, [institution.type, regulationInfo]);

    const handleSave = () => {
        // Context updates automatically save to localStorage
        // Just show feedback
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 3000);
    };

    const handleInstitutionChange = (field: string, value: string) => {
        updateInstitution({ ...institution, [field]: value });
    };

    const handleBoardMemberChange = (id: string, field: keyof BoardMember, value: string) => {
        const updatedMembers = boardMembers.map(member =>
            member.id === id ? { ...member, [field]: value } : member
        );
        updateBoardMembers(updatedMembers);
    };

    const handleAddBoardMember = () => {
        const newMember: BoardMember = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'ÜYE',
            mainName: '',
            mainTitle: 'Öğretmen',
            reserveName: '',
            reserveTitle: 'Öğretmen'
        };
        updateBoardMembers([...boardMembers, newMember]);
    };

    const handleDeleteRequest = (id: string) => {
        if (boardMembers.length <= 3) {
            alert("Kurul en az 3 kişiden oluşmalıdır.");
            return;
        }
        setMemberToDelete(id);
    };

    const confirmDeleteMember = () => {
        if (memberToDelete) {
            const updatedMembers = boardMembers.filter(m => m.id !== memberToDelete);
            updateBoardMembers(updatedMembers);
            setMemberToDelete(null);
        }
    };

    const handleTestKey = async () => {
        if (!tempKey) return;
        setTestStatus('testing');
        const isValid = await validateApiKey(tempKey);
        setTestStatus(isValid ? 'success' : 'error');
    };

    const handleSaveKey = () => {
        updateApiKey(tempKey);
        handleSave();
    };

    const handleUpdateRegulationWithAI = async () => {
        if (!apiKey) {
            alert("Lütfen önce Yapay Zeka (AI) sekmesinden API anahtarınızı giriniz.");
            return;
        }

        setIsFetchingInfo(true);
        let url = "";

        if (institution.type === 'Ortaokul') {
            // İlköğretim Kurumları Yönetmeliği
            url = "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=18812&MevzuatTur=7&MevzuatTertip=5";
        } else {
            // Ortaöğretim Kurumları Yönetmeliği
            url = "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=19942&MevzuatTur=7&MevzuatTertip=5";
        }

        const result = await fetchBoardInfoFromUrl(url, institution.type);
        if (result) {
            setRegulationInfo(result);
        }
        setIsFetchingInfo(false);
    };

    // Generate 10 years starting from 2025
    const academicYears = Array.from({ length: 10 }, (_, i) => {
        const start = 2025 + i;
        return `${start}-${start + 1}`;
    });

    return (
        <div className="p-8 max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Kurum Ayarları</h1>
                    <p className="text-slate-500">Okul bilgileri ve disiplin kurulu yapılandırması.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Save className="w-4 h-4" />
                    Kaydet
                </button>
            </div>

            {showSaveSuccess && (
                <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center animate-fade-in">
                    <Save className="w-5 h-5 mr-2" />
                    Ayarlar başarıyla kaydedildi.
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('institution')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'institution'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Building className="w-4 h-4" />
                    Kurum Bilgileri
                </button>
                <button
                    onClick={() => setActiveTab('board')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'board'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Kurul Üyeleri
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'ai'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Yapay Zeka (AI)
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[500px]">

                {/* TAB 1: KURUM BİLGİLERİ */}
                {activeTab === 'institution' && (
                    <div className="animate-fade-in">
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-yellow-800 text-sm flex items-start gap-3">
                            <Info className="w-5 h-5 shrink-0" />
                            <p className="font-medium mt-0.5">Burada girdiğiniz bilgiler; tutanaklarda, karar formlarında ve üst yazılarda otomatik olarak başlık ve içerik olarak kullanılacaktır.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Okul Türü</label>
                                    <select
                                        value={institution.type}
                                        onChange={(e) => handleInstitutionChange('type', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Lise">Lise / Anadolu Lisesi</option>
                                        <option value="Meslek Lisesi">Mesleki ve Teknik Anadolu Lisesi</option>
                                        <option value="İmam Hatip">İmam Hatip Lisesi</option>
                                        <option value="Ortaokul">Ortaokul</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Öğretim Yılı</label>
                                    <select
                                        value={institution.year}
                                        onChange={(e) => handleInstitutionChange('year', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {academicYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kurum Kodu</label>
                                    <input
                                        type="text"
                                        value={institution.code}
                                        onChange={(e) => handleInstitutionChange('code', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bulunduğu İl</label>
                                    <input
                                        type="text"
                                        value={institution.province}
                                        onChange={(e) => handleInstitutionChange('province', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">İlçe</label>
                                    <input
                                        type="text"
                                        value={institution.district}
                                        onChange={(e) => handleInstitutionChange('district', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Okul Adı</label>
                                <input
                                    type="text"
                                    value={institution.name}
                                    onChange={(e) => handleInstitutionChange('name', e.target.value)}
                                    placeholder="Örn: Cumhuriyet Anadolu Lisesi"
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Müdür Adı Soyadı</label>
                                <input
                                    type="text"
                                    value={institution.managerName}
                                    onChange={(e) => handleInstitutionChange('managerName', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kurum Resmi Yazışma Kodu</label>
                                <input
                                    type="text"
                                    value={institution.ebysCode}
                                    onChange={(e) => handleInstitutionChange('ebysCode', e.target.value)}
                                    placeholder="Örn: 12345678"
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kurum Anteti (Üst Yazılar İçin)</label>
                                <textarea
                                    rows={3}
                                    value={institution.headerText}
                                    onChange={(e) => handleInstitutionChange('headerText', e.target.value)}
                                    placeholder="Örn: T.C.&#10;ANKARA VALİLİĞİ&#10;Cumhuriyet Anadolu Lisesi Müdürlüğü"
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                ></textarea>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kurum Adresi</label>
                                <textarea
                                    rows={2}
                                    value={institution.address}
                                    onChange={(e) => handleInstitutionChange('address', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon No</label>
                                <input
                                    type="text"
                                    value={institution.phone}
                                    onChange={(e) => handleInstitutionChange('phone', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fax No</label>
                                <input
                                    type="text"
                                    value={institution.fax}
                                    onChange={(e) => handleInstitutionChange('fax', e.target.value)}
                                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: KURUL ÜYELERİ */}
                {activeTab === 'board' && (
                    <div className="animate-fade-in">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm mb-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                                        <th className="p-4 font-semibold border-b border-slate-700 w-32">Üye / Rol</th>
                                        <th className="p-4 font-semibold border-b border-slate-700">Asil Adı Soyadı</th>
                                        <th className="p-4 font-semibold border-b border-slate-700">Asil Ünvan</th>
                                        <th className="p-4 font-semibold border-b border-slate-700 bg-slate-700/50">Yedek Adı Soyadı</th>
                                        <th className="p-4 font-semibold border-b border-slate-700 bg-slate-700/50">Yedek Ünvan</th>
                                        <th className="p-4 font-semibold border-b border-slate-700 text-center w-16">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100">
                                    {boardMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className={`w-full p-2 border border-slate-200 rounded focus:border-blue-500 outline-none bg-slate-50 font-bold text-xs ${member.role.includes('BAŞKAN') ? 'text-blue-600' : 'text-slate-700'}`}
                                                    value={member.role}
                                                    onChange={(e) => handleBoardMemberChange(member.id, 'role', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-slate-200 rounded focus:border-blue-500 outline-none bg-white"
                                                    value={member.mainName}
                                                    onChange={(e) => handleBoardMemberChange(member.id, 'mainName', e.target.value)}
                                                    placeholder="Ad Soyad Giriniz"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-slate-200 rounded focus:border-blue-500 outline-none bg-slate-50 text-slate-600"
                                                    value={member.mainTitle}
                                                    onChange={(e) => handleBoardMemberChange(member.id, 'mainTitle', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 bg-slate-50/50">
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-slate-200 rounded focus:border-blue-500 outline-none bg-white"
                                                    value={member.reserveName}
                                                    onChange={(e) => handleBoardMemberChange(member.id, 'reserveName', e.target.value)}
                                                    placeholder="Yedek Üye"
                                                />
                                            </td>
                                            <td className="p-3 bg-slate-50/50">
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border border-slate-200 rounded focus:border-blue-500 outline-none bg-slate-50 text-slate-600"
                                                    value={member.reserveTitle}
                                                    onChange={(e) => handleBoardMemberChange(member.id, 'reserveTitle', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleDeleteRequest(member.id)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                    title="Üyeyi Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end mb-8">
                            <button
                                onClick={handleAddBoardMember}
                                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold"
                            >
                                <Plus className="w-4 h-4" /> Yeni Üye Ekle
                            </button>
                        </div>

                        {/* Regulation Info Box */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    MEB İlköğretim ve Ortaöğretim Kurumları Yönetmeliği - Kuruluş Esasları
                                </h4>
                                <button
                                    onClick={handleUpdateRegulationWithAI}
                                    disabled={isFetchingInfo}
                                    className="text-xs flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    {isFetchingInfo ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Mevzuattan Güncelle (AI)
                                </button>
                            </div>
                            <div className="text-sm text-slate-600 space-y-2 leading-relaxed whitespace-pre-wrap">
                                {regulationInfo}
                            </div>
                            <p className="text-xs text-slate-400 mt-3 italic border-t border-slate-200 pt-2">
                                * {institution.type === 'Ortaokul' ? '18812' : '19942'} Sayılı Resmi Gazete mevzuatına göre yapay zeka tarafından özetlenmiştir. Mevzuat değişikliklerini Resmi Gazete üzerinden takip ediniz.
                            </p>
                        </div>
                    </div>
                )}

                {/* TAB 3: AI AYARLARI */}
                {activeTab === 'ai' && (
                    <div className="animate-fade-in space-y-8">

                        {/* Info Card */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-blue-600 p-3 rounded-lg text-white shrink-0">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">Google Gemini API Entegrasyonu</h3>
                                    <p className="text-blue-800/80 text-sm leading-relaxed mb-4">
                                        Disiplin Asistanı, olayları analiz etmek ve evrak taslakları oluşturmak için Google Gemini yapay zekasını kullanır.
                                        Kendi ücretsiz API anahtarınızı girerek bu özelliklerden sınırsız faydalanabilirsiniz.
                                    </p>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg font-medium text-sm border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        API Anahtarı Al (Google AI Studio)
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="max-w-2xl">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                API Anahtarınız (Gemini API Key)
                            </label>
                            <div className="flex gap-2 mb-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={tempKey}
                                        onChange={(e) => setTempKey(e.target.value)}
                                        placeholder="AIzaSy..."
                                        className="w-full p-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                    >
                                        {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <button
                                    onClick={handleTestKey}
                                    disabled={!tempKey || testStatus === 'testing'}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${testStatus === 'success'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : testStatus === 'error'
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    {testStatus === 'testing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                        testStatus === 'success' ? <div className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Çalışıyor</div> :
                                            testStatus === 'error' ? <div className="flex items-center gap-1"><XCircle className="w-4 h-4" /> Hatalı</div> :
                                                'Test Et'}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                Anahtarınız sadece tarayıcınızda (Local Storage) saklanır ve sunucularımıza gönderilmez.
                            </p>
                        </div>

                        {/* Save Button for this section specific logic */}
                        <div className="pt-6 border-t border-slate-100">
                            <button
                                onClick={handleSaveKey}
                                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                API Anahtarını Kaydet
                            </button>
                        </div>

                    </div>
                )}

            </div>

            {/* Delete Confirmation Modal */}
            {memberToDelete && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-slate-100 bg-red-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="font-bold text-red-900">Silme İşlemi</h3>
                            </div>
                            <button onClick={() => setMemberToDelete(null)}><X className="w-5 h-5 text-red-400 hover:text-red-700" /></button>
                        </div>
                        <div className="p-6 text-slate-600 text-sm">
                            <p>Bu kurul üyesini silmek istediğinize emin misiniz?</p>
                            <p className="mt-2 text-xs text-slate-400">Bu işlem evraklardaki imza sirkülerini etkileyecektir.</p>
                        </div>
                        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                            <button
                                onClick={() => setMemberToDelete(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                            >
                                İptal
                            </button>
                            <button
                                onClick={confirmDeleteMember}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                            >
                                Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Settings;
