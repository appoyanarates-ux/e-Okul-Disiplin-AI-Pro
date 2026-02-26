
import React, { useState, useRef, useMemo } from 'react';
import { Upload, Plus, Search, FileSpreadsheet, Trash2, Save, X, Eye, User, MapPin, FileText, Info, CheckCircle, AlertCircle, Users, ChevronRight, School } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../types';
import { useStudents } from '../context/StudentContext';

const Students = () => {
  const { students, setStudents, addStudent, removeStudent } = useStudents();
  const [isDragging, setIsDragging] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Seçili Sınıf State'i (null = Tümü)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  // Extended Manual Add Form State
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    number: '', name: '', grade: '', tcNo: '', parentName: '',
    fatherName: '', motherName: '', birthPlaceDate: '', 
    province: '', district: '', neighborhood: '',
    boardingStatus: 'GÜNDÜZLÜ', scholarshipStatus: 'BURSSUZ'
  });

  // --- HESAPLAMALAR ---
  
  // Sınıfları Grupla ve Sırala
  const classGroups = useMemo(() => {
      const groups: Record<string, number> = {};
      students.forEach(s => {
          // Normalize grade string (trim spaces)
          const g = s.grade ? s.grade.trim() : 'Belirsiz';
          groups[g] = (groups[g] || 0) + 1;
      });
      
      // Alfanumerik Sıralama (9-A, 9-B, 10-A...)
      return Object.entries(groups).sort((a, b) => 
          a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [students]);

  // Filtrelenmiş Öğrenci Listesi
  const filteredStudents = useMemo(() => {
      let list = students;

      // 1. Sınıf Filtresi
      if (selectedGrade) {
          list = list.filter(s => (s.grade ? s.grade.trim() : 'Belirsiz') === selectedGrade);
      }

      // 2. Arama Filtresi
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          list = list.filter(s => 
            s.name.toLowerCase().includes(lowerTerm) || 
            s.number.includes(searchTerm) ||
            s.tcNo?.includes(searchTerm)
          );
      }
      return list;
  }, [students, selectedGrade, searchTerm]);


  // --- HANDLERS ---

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Improved helper: looks for a cell containing `label`, then finds the next non-empty cell in that row
  const findValueByLabel = (row: any[], labelPart: string): string => {
    if (!row || row.length === 0) return '';
    const index = row.findIndex(cell => cell && String(cell).toLowerCase().includes(labelPart.toLowerCase()));
    
    if (index !== -1) {
       for (let i = index + 1; i < row.length; i++) {
         if (row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== '') {
           return String(row[i]).trim();
         }
       }
    }
    return '';
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      const parsedStudents: Student[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        const startCell = row.find(cell => cell && String(cell).trim().startsWith('Okul No'));
        
        if (startCell) {
          try {
            const number = findValueByLabel(jsonData[i], 'Okul No');
            const firstName = findValueByLabel(jsonData[i + 1] || [], 'Adı');
            const lastName = findValueByLabel(jsonData[i + 2] || [], 'Soyadı');
            const fatherName = findValueByLabel(jsonData[i + 3] || [], 'Baba Adı');
            const motherName = findValueByLabel(jsonData[i + 4] || [], 'Anne Adı');
            const birthPlaceDate = findValueByLabel(jsonData[i + 5] || [], 'Doğum Yeri');

            const rowTC = jsonData[i + 7] || [];
            const tcNo = findValueByLabel(rowTC, 'T.C. Kimlik No');
            const volumeNo = findValueByLabel(rowTC, 'Cilt No');

            const rowProv = jsonData[i + 8] || [];
            const province = findValueByLabel(rowProv, 'İli');
            const familyOrderNo = findValueByLabel(rowProv, 'Aile Sıra No');

            const rowDist = jsonData[i + 9] || [];
            const district = findValueByLabel(rowDist, 'İlçesi');
            const orderNo = findValueByLabel(rowDist, 'Sıra No');

            const rowHood = jsonData[i + 10] || [];
            const neighborhood = findValueByLabel(rowHood, 'Mahalle');

            const rowRegType = jsonData[i + 13] || [];
            const registrationType = findValueByLabel(rowRegType, 'Yeni Kayıt');
            
            let grade = findValueByLabel(rowRegType, 'Kabul Ed. Sınıf');

            const rowDoc = jsonData[i + 14] || [];
            const previousSchoolInfo = findValueByLabel(rowDoc, 'Get. Öğr. Belgesi');
            const examStatus = findValueByLabel(rowDoc, 'Sınavlı');

            const rowDate = jsonData[i + 15] || [];
            const registrationDate = findValueByLabel(rowDate, 'Tarih / Numarası');
            const boardingStatus = findValueByLabel(rowDate, 'Yatılı');

            const rowParent = jsonData[i + 16] || [];
            const parentName = findValueByLabel(rowParent, 'Veli Adı');
            const scholarshipStatus = findValueByLabel(rowParent, 'Bursluluk');

            const rowAddress = jsonData[i + 18] || [];
            const address = findValueByLabel(rowAddress, 'Adresi');

            if (grade) {
                const parts = grade.match(/(\d+)\.\s*Sınıf.*?([A-Z])\s*Şubesi/i);
                if (parts) {
                    grade = `${parts[1]}-${parts[2]}`;
                }
            }

            const fullName = `${firstName} ${lastName}`.trim();

            if (number && fullName) {
                const exists = parsedStudents.some(s => s.number === number) || students.some(s => s.number === number);
                if (!exists) {
                    parsedStudents.push({
                        id: Math.random().toString(36).substr(2, 9),
                        number,
                        name: fullName,
                        grade: grade || 'Belirtilmedi',
                        tcNo,
                        fatherName,
                        motherName,
                        birthPlaceDate,
                        province,
                        district,
                        neighborhood,
                        volumeNo,
                        familyOrderNo,
                        orderNo,
                        registrationType,
                        previousSchoolInfo,
                        registrationDate,
                        parentName,
                        examStatus,
                        boardingStatus,
                        scholarshipStatus,
                        address
                    });
                }
            }
            i += 18; 

          } catch (err) {
            console.error("Error parsing student block at row " + i, err);
          }
        }
      }

      if (parsedStudents.length > 0) {
        setStudents([...students, ...parsedStudents]);
        setSuccessMessage(`${parsedStudents.length} öğrenci başarıyla veritabanına eklendi.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert("Dosyada uygun formatta öğrenci verisi bulunamadı. Lütfen dosyanın 'Okul No:' formatına uygun olduğundan emin olun.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.name && newStudent.number) {
        addStudent({
            ...newStudent,
            id: Math.random().toString(36).substr(2, 9),
        } as Student);
        setShowAddModal(false);
        setNewStudent({ 
            number: '', name: '', grade: '', tcNo: '', parentName: '',
            fatherName: '', motherName: '', birthPlaceDate: '', 
            province: '', district: '', neighborhood: '',
            boardingStatus: 'GÜNDÜZLÜ', scholarshipStatus: 'BURSSUZ'
        });
        setSuccessMessage(`Öğrenci ${newStudent.name} başarıyla eklendi.`);
        setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDeleteClass = (gradeToDelete: string, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent selecting the class when clicking delete
      
      const count = classGroups.find(([g]) => g === gradeToDelete)?.[1] || 0;
      
      if (window.confirm(`DİKKAT!\n\n"${gradeToDelete}" sınıfındaki toplam ${count} öğrenciyi silmek üzeresiniz.\n\nBu işlem geri alınamaz. Onaylıyor musunuz?`)) {
          const newStudents = students.filter(s => (s.grade ? s.grade.trim() : 'Belirsiz') !== gradeToDelete);
          setStudents(newStudents);
          setSuccessMessage(`${gradeToDelete} sınıfı ve öğrencileri başarıyla silindi.`);
          
          if (selectedGrade === gradeToDelete) {
              setSelectedGrade(null);
          }
          setTimeout(() => setSuccessMessage(null), 3000);
      }
  };

  // Re-usable detail row component
  const DetailRow = ({ label, value, fullWidth = false }: { label: string, value?: string, fullWidth?: boolean }) => (
      <div className={`${fullWidth ? 'col-span-2' : ''} bg-slate-50 p-2.5 rounded border border-slate-100`}>
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">{label}</span>
          <span className="font-medium text-slate-700 text-sm truncate block" title={value}>{value || '-'}</span>
      </div>
  );

  return (
    <div className="p-8 max-w-full mx-auto h-screen flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Öğrenci Yönetimi</h1>
            <p className="text-slate-500">
                {students.length > 0 
                 ? `${students.length} öğrenci kayıtlı.` 
                 : 'Henüz öğrenci eklenmedi. Excel ile toplu yükleme yapabilirsiniz.'}
            </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Tek Ekle
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
                <FileSpreadsheet className="w-4 h-4" />
                Excel Yükle
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 flex items-center animate-fade-in shadow-sm shrink-0">
           <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
           <span className="font-medium">{successMessage}</span>
           <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* --- MAIN LAYOUT --- */}
      <div className="flex gap-6 flex-1 overflow-hidden">
          
          {/* LEFT SIDEBAR: CLASS LIST */}
          <div className="w-64 bg-white border border-slate-200 rounded-xl flex flex-col shrink-0 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Sınıflar & Gruplar
              </div>
              <div className="flex-1 overflow-y-auto">
                  <button 
                      onClick={() => setSelectedGrade(null)}
                      className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedGrade === null ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
                  >
                      <span>Tüm Öğrenciler</span>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{students.length}</span>
                  </button>
                  
                  {classGroups.map(([grade, count]) => (
                      <div 
                        key={grade} 
                        onClick={() => setSelectedGrade(grade)}
                        className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group ${selectedGrade === grade ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600'}`}
                      >
                          <div className="flex items-center gap-2">
                              <span>{grade}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${selectedGrade === grade ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                              <button 
                                onClick={(e) => handleDeleteClass(grade, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title={`${grade} sınıfını tamamen sil`}
                              >
                                  <Trash2 className="w-3.5 h-3.5" />
                              </button>
                          </div>
                      </div>
                  ))}
                  
                  {classGroups.length === 0 && (
                      <div className="p-4 text-xs text-slate-400 text-center">Henüz sınıf oluşmadı.</div>
                  )}
              </div>
          </div>

          {/* RIGHT CONTENT: TABLE */}
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={selectedGrade ? `${selectedGrade} sınıfı içinde ara...` : "Tüm öğrencilerde ara..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                    />
                    {selectedGrade && (
                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
                            {selectedGrade}
                            <button onClick={() => setSelectedGrade(null)}><X className="w-3 h-3 hover:text-blue-900" /></button>
                        </div>
                    )}
                </div>

                {/* Empty State / Drag Drop (Only if absolutely no students) */}
                {students.length === 0 ? (
                    <div 
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex-1 m-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                            isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
                        }`}
                    >
                        <div className="bg-green-100 p-4 rounded-full mb-4">
                            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-green-600'}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Öğrenci Veritabanı Boş</h3>
                        <p className="font-medium text-slate-600 max-w-md mx-auto mb-6">
                            Excel dosyasını buraya sürükleyin. Sistem, "Okul No" ile başlayan öğrenci kartlarını otomatik olarak tanıyacaktır.
                        </p>
                        <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:underline text-sm font-medium"
                        >
                            Dosya seçmek için tıklayın
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider shadow-sm">
                                    <th className="p-4 font-semibold border-b border-slate-100">No</th>
                                    <th className="p-4 font-semibold border-b border-slate-100">Ad Soyad</th>
                                    <th className="p-4 font-semibold border-b border-slate-100">Sınıf</th>
                                    <th className="p-4 font-semibold border-b border-slate-100">TC Kimlik</th>
                                    <th className="p-4 font-semibold border-b border-slate-100">Durum</th>
                                    <th className="p-4 font-semibold border-b border-slate-100 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                        <td className="p-4 font-medium text-slate-700">{student.number}</td>
                                        <td className="p-4 text-slate-800 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    {student.name}
                                                    <div className="text-xs text-slate-400 font-normal">
                                                        {student.fatherName ? `Baba: ${student.fatherName}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                                                {student.grade}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono">{student.tcNo || '-'}</td>
                                        <td className="p-4">
                                            <span className="text-xs border border-slate-200 px-2 py-1 rounded text-slate-500">
                                                {student.boardingStatus}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Detaylar"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if(window.confirm('Silmek istediğinize emin misiniz?')) removeStudent(student.id);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            {selectedGrade ? `${selectedGrade} sınıfında öğrenci bulunamadı.` : 'Aranan kriterde öğrenci bulunamadı.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
          </div>
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Yeni Öğrenci Ekle</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleManualAdd} className="p-6 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                             <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-1">
                                <User className="w-3 h-3" /> Temel Bilgiler
                             </h4>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Okul No</label>
                            <input required type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.number} onChange={e => setNewStudent({...newStudent, number: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Adı Soyadı</label>
                            <input required type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">TC Kimlik No</label>
                            <input type="text" maxLength={11} className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.tcNo} onChange={e => setNewStudent({...newStudent, tcNo: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Sınıf</label>
                            <input required type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade: e.target.value})} />
                        </div>
                        
                        <div className="md:col-span-2 mt-2">
                             <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Aile ve Kimlik
                             </h4>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Baba Adı</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.fatherName} onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Anne Adı</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.motherName} onChange={e => setNewStudent({...newStudent, motherName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Veli Adı Soyadı</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.parentName} onChange={e => setNewStudent({...newStudent, parentName: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Doğum Yeri/Tarihi</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.birthPlaceDate} onChange={e => setNewStudent({...newStudent, birthPlaceDate: e.target.value})} />
                        </div>

                         <div className="md:col-span-2 mt-2">
                             <h4 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Adres ve Kayıt
                             </h4>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">İl</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.province} onChange={e => setNewStudent({...newStudent, province: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">İlçe</label>
                            <input type="text" className="w-full p-2 border rounded-lg outline-none focus:border-blue-500"
                                value={newStudent.district} onChange={e => setNewStudent({...newStudent, district: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                         <button 
                            type="button" 
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button 
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Full Detail Modal */}
      {selectedStudent && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-800 text-white p-6 rounded-t-xl flex justify-between items-start shrink-0">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <User className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                            <p className="text-slate-300 text-sm mt-1">{selectedStudent.number} • {selectedStudent.grade}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="bg-blue-500/20 text-blue-200 text-xs px-2 py-0.5 rounded border border-blue-500/30">{selectedStudent.registrationType || 'Normal Kayıt'}</span>
                                <span className="bg-emerald-500/20 text-emerald-200 text-xs px-2 py-0.5 rounded border border-emerald-500/30">{selectedStudent.boardingStatus}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    
                    {/* Section 1: Kimlik */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600" /> Nüfus & Kimlik Bilgileri
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <DetailRow label="TC Kimlik No" value={selectedStudent.tcNo} />
                            <DetailRow label="Baba Adı" value={selectedStudent.fatherName} />
                            <DetailRow label="Anne Adı" value={selectedStudent.motherName} />
                            <DetailRow label="Doğum Yeri/Tarihi" value={selectedStudent.birthPlaceDate} />
                            <DetailRow label="İl" value={selectedStudent.province} />
                            <DetailRow label="İlçe" value={selectedStudent.district} />
                            <DetailRow label="Mahalle/Köy" value={selectedStudent.neighborhood} fullWidth />
                            <DetailRow label="Cilt No" value={selectedStudent.volumeNo} />
                            <DetailRow label="Aile Sıra No" value={selectedStudent.familyOrderNo} />
                            <DetailRow label="Sıra No" value={selectedStudent.orderNo} />
                        </div>
                    </div>

                    {/* Section 2: Okul */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Okul & Kayıt Bilgileri
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <DetailRow label="Kabul Ed. Sınıf" value={selectedStudent.grade} />
                            <DetailRow label="Öğrenim Belgesi" value={selectedStudent.previousSchoolInfo} />
                            <DetailRow label="Kayıt Tarihi" value={selectedStudent.registrationDate} />
                            <DetailRow label="Sınav Durumu" value={selectedStudent.examStatus} />
                            <DetailRow label="Yatılılık" value={selectedStudent.boardingStatus} />
                            <DetailRow label="Bursluluk" value={selectedStudent.scholarshipStatus} />
                        </div>
                    </div>

                     {/* Section 3: İletişim */}
                     <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-blue-600" /> İletişim & Veli
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DetailRow label="Veli Adı Soyadı" value={selectedStudent.parentName} />
                            <DetailRow label="Adres" value={selectedStudent.address} fullWidth />
                        </div>
                    </div>

                </div>
                
                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={() => setSelectedStudent(null)}
                        className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
                    >
                        Kapat
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Students;
