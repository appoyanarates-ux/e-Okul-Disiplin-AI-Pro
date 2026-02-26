
import React, { useState, useEffect } from 'react';
import {
  Save, Search, Plus, Trash2, Calendar, MapPin,
  FileText, UserPlus, X, AlertCircle, Clock, ChevronRight, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useStudents } from '../context/StudentContext';
import { useIncidents } from '../context/IncidentContext';
import { Incident } from '../types';

const IncidentLog = () => {
  const { students } = useStudents();
  const { incidents, addIncident, updateIncident, deleteIncident, getNextIncidentCode } = useIncidents();

  // UI State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState(''); // Added for student picker search
  const [filterYear, setFilterYear] = useState(true); // true: Current Year, false: All
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- DELETE CONFIRMATION STATE ---
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'incident' | 'student' | null;
    targetId: string | null;
  }>({ isOpen: false, type: null, targetId: null });

  // Form State
  const emptyIncident: Incident = {
    id: '',
    code: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    location: '',
    description: '',
    status: 'pending',
    involvedStudents: [],
    petitioner: '',
    petitionerInfo: ''
  };

  const [formData, setFormData] = useState<Incident>(emptyIncident);

  // When selection changes, update form data
  useEffect(() => {
    if (selectedIncidentId) {
      const found = incidents.find(i => i.id === selectedIncidentId);
      if (found) setFormData(found);
    } else {
      setFormData({ ...emptyIncident, code: getNextIncidentCode() });
    }
  }, [selectedIncidentId, incidents]);

  const handleNewIncident = () => {
    setSelectedIncidentId(null);
    setFormData({ ...emptyIncident, code: getNextIncidentCode() });
    setSuccessMessage(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIncidentId) {
      updateIncident(formData);
      setSuccessMessage('Olay kaydı başarıyla güncellendi.');
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      addIncident({ ...formData, id: newId });
      setSelectedIncidentId(newId);
      setSuccessMessage('Yeni olay kaydı başarıyla oluşturuldu.');
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- DELETE HANDLERS ---
  const requestDeleteIncident = () => {
    if (selectedIncidentId) {
      setDeleteModal({ isOpen: true, type: 'incident', targetId: selectedIncidentId });
    }
  };

  const requestDeleteStudent = (studentId: string) => {
    setDeleteModal({ isOpen: true, type: 'student', targetId: studentId });
  };

  const confirmDelete = () => {
    if (deleteModal.type === 'incident' && deleteModal.targetId) {
      deleteIncident(deleteModal.targetId);
      handleNewIncident();
      setSuccessMessage('Olay kaydı silindi.');
    }
    else if (deleteModal.type === 'student' && deleteModal.targetId) {
      const updatedInvolved = formData.involvedStudents.filter(s => s.studentId !== deleteModal.targetId);
      const updatedIncident = { ...formData, involvedStudents: updatedInvolved };
      setFormData(updatedIncident);
      if (selectedIncidentId) {
        updateIncident(updatedIncident);
        setSuccessMessage('Öğrenci olaydan çıkarıldı.');
      }
    }
    setDeleteModal({ isOpen: false, type: null, targetId: null });
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const addStudentToIncident = (studentId: string, role: 'suspect' | 'witness' | 'victim') => {
    // Check if already exists
    if (formData.involvedStudents.some(s => s.studentId === studentId)) {
      alert('Bu öğrenci zaten olaya eklenmiş.');
      return;
    }

    const updatedInvolved = [...formData.involvedStudents, { studentId, role }];
    const updatedIncident = { ...formData, involvedStudents: updatedInvolved };
    setFormData(updatedIncident);

    // Auto-save behavior similar to desktop apps
    if (selectedIncidentId) {
      updateIncident(updatedIncident);
      setSuccessMessage('Öğrenci olaya eklendi ve kayıt güncellendi.');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setShowStudentPicker(false);
  };

  // Helper to get student info
  const getStudentInfo = (id: string) => students.find(s => s.id === id);

  const filteredIncidents = incidents.filter(inc =>
    inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen pt-0 overflow-hidden bg-[#f3f4f6]">

      {/* LEFT PANEL: LIST */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col z-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            OLAY LİSTESİ
          </h2>

          <div className="flex items-center gap-4 mb-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={filterYear} onChange={() => setFilterYear(true)} className="text-blue-600" />
              <span>Bu Öğretim Yılı</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!filterYear} onChange={() => setFilterYear(false)} className="text-blue-600" />
              <span>Tümü</span>
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Olay ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Kayıtlı olay bulunamadı.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 border-b">Kod</th>
                  <th className="p-3 font-semibold text-slate-600 border-b">Olay Adı</th>
                  <th className="p-3 font-semibold text-slate-600 border-b text-center">Öğr.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map(inc => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`cursor-pointer transition-colors ${selectedIncidentId === inc.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <td className="p-3 font-mono text-xs">{inc.code}</td>
                    <td className="p-3 font-medium truncate max-w-[150px]">{inc.title}</td>
                    <td className="p-3 text-center">
                      <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-xs font-bold">
                        {inc.involvedStudents.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-center">
          Toplam {filteredIncidents.length} kayıt listelendi.
        </div>
      </div>

      {/* RIGHT PANEL: FORM & DETAILS */}
      <div className="w-2/3 flex flex-col h-full bg-[#f3f4f6]">

        {/* Header Actions */}
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-500">Olay İşlemleri</h1>
            <ChevronRight className="w-5 h-5 text-slate-300" />
            <h2 className="text-lg font-bold text-blue-700">Olay Kaydı & Öğrenciler</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNewIncident}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200"
            >
              <Plus className="w-4 h-4" /> Yeni Olay
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Save className="w-4 h-4" /> Kaydet
            </button>
            {selectedIncidentId && (
              <button
                onClick={requestDeleteIncident}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-100"
              >
                <Trash2 className="w-4 h-4" /> Sil
              </button>
            )}
          </div>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="mx-6 mt-4 bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 flex items-center animate-fade-in shadow-sm shrink-0">
            <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
            <span className="font-medium text-sm">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">

          <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm min-h-[500px]">

            {/* 1. INCIDENT FORM */}
            <form className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Kodu</label>
                  <input
                    type="text" disabled value={formData.code}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono text-sm cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Otomatik oluşturulur.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Adı (Kısa Tanım)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Örn: Koridorda Kavga"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tarih</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Saat</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olay Yeri</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Olayın Özeti</label>
                <textarea
                  rows={8}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Olayın gelişimi, görgü tanıkları ve detaylar..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dilekçeyi Veren Kişi</label>
                  <input
                    type="text"
                    value={formData.petitioner}
                    onChange={(e) => setFormData({ ...formData, petitioner: e.target.value })}
                    placeholder="Öğretmen / Öğrenci / Veli"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="hidePetitioner" className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="hidePetitioner" className="text-sm text-slate-700">Tutanaklarda Gizle</label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dilekçe Tarih ve Sayısı</label>
                <input
                  type="text"
                  value={formData.petitionerInfo}
                  onChange={(e) => setFormData({ ...formData, petitionerInfo: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </form>

            {/* 2. INVOLVED STUDENTS SECTION */}
            <div className="mt-10 border-t-2 border-slate-100 pt-8 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  Olaya Karışan Öğrenciler
                </h3>
                <button
                  onClick={() => {
                    setShowStudentPicker(true);
                    setStudentSearchTerm('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Öğrenci Ekle
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Rol</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Numara</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Adı Soyadı</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase">Sınıf</th>
                      <th className="p-3 text-xs font-bold text-slate-500 uppercase text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.involvedStudents.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">Bu olaya henüz öğrenci eklenmemiş.</td></tr>
                    ) : (
                      formData.involvedStudents.map((rel, idx) => {
                        const student = getStudentInfo(rel.studentId);
                        const roleBadge =
                          rel.role === 'suspect' ? 'bg-red-100 text-red-700 border-red-200' :
                            rel.role === 'witness' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-orange-100 text-orange-700 border-orange-200';

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold border uppercase ${roleBadge}`}>
                                {rel.role === 'suspect' ? 'Fail' : rel.role === 'witness' ? 'Tanık' : 'Mağdur'}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{student?.number || '???'}</td>
                            <td className="p-3 font-medium text-slate-800">{student?.name || 'Silinmiş Öğrenci'}</td>
                            <td className="p-3 text-slate-600">{student?.grade}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => requestDeleteStudent(rel.studentId)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800 leading-relaxed">
                  <p className="font-bold">Bilgilendirme:</p>
                  <p>"Fail" olarak eklenen öğrenciler için disiplin süreci başlatılabilir ve tutanak hazırlanabilir. "Tanık" olarak eklenenler ifade tutanağında yer alır.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL: Student Picker */}
      {showStudentPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Öğrenci Seç</h3>
              <button onClick={() => setShowStudentPicker(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Öğrenci ara..."
                  className="w-full pl-9 p-2 border rounded-lg outline-none"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                />
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                {students
                  .filter(s =>
                    s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                    s.number.includes(studentSearchTerm)
                  )
                  .map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div>
                        <div className="font-bold text-sm text-slate-800">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.number} - {student.grade}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addStudentToIncident(student.id, 'suspect')} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 hover:bg-red-100">Fail</button>
                        <button onClick={() => addStudentToIncident(student.id, 'witness')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">Tanık</button>
                        <button onClick={() => addStudentToIncident(student.id, 'victim')} className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100 hover:bg-orange-100">Mağdur</button>
                      </div>
                    </div>
                  ))}
                {students.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.number.includes(studentSearchTerm)).length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-sm">Öğrenci bulunamadı.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 bg-red-50 flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-bold text-red-900">Silme İşlemi Onayı</h3>
            </div>
            <div className="p-6 text-slate-600 text-sm">
              {deleteModal.type === 'incident'
                ? "Bu olay kaydını ve bağlı tüm verileri (ifadeler, analizler) silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                : "Seçili öğrenciyi bu olaydan çıkarmak istediğinize emin misiniz?"
              }
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setDeleteModal({ isOpen: false, type: null, targetId: null })}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
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

export default IncidentLog;
