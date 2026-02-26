
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Institution, BoardMember } from '../types';

interface SettingsContextType {
  institution: Institution;
  boardMembers: BoardMember[];
  apiKey: string;
  updateInstitution: (data: Institution) => void;
  updateBoardMembers: (data: BoardMember[]) => void;
  updateApiKey: (key: string) => void;
}

const defaultInstitution: Institution = {
  name: '',
  code: '',
  type: 'Lise',
  year: '2025-2026',
  province: '',
  district: '',
  managerName: '',
  address: '',
  phone: '',
  fax: '',
  headerText: '',
  ebysCode: ''
};

const defaultBoardMembers: BoardMember[] = [
  { id: '1', role: 'BAŞKAN', mainName: '', mainTitle: 'Müdür Başyardımcısı', reserveName: '', reserveTitle: 'Müdür Yardımcısı' },
  { id: '2', role: '1. ÜYE', mainName: '', mainTitle: 'Öğretmen', reserveName: '', reserveTitle: 'Öğretmen' },
  { id: '3', role: '2. ÜYE', mainName: '', mainTitle: 'Öğretmen', reserveName: '', reserveTitle: 'Öğretmen' },
  { id: '4', role: '3. ÜYE', mainName: '', mainTitle: 'Öğretmen', reserveName: '', reserveTitle: 'Öğretmen' },
  { id: '5', role: '4. ÜYE (VELİ)', mainName: '', mainTitle: 'Okul Aile Bir. Üyesi', reserveName: '', reserveTitle: 'Yedek Veli' },
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [institution, setInstitution] = useState<Institution>(defaultInstitution);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(defaultBoardMembers);
  const [apiKey, setApiKey] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedInst = localStorage.getItem('institutionSettings');
      const savedBoard = localStorage.getItem('boardSettings');
      const savedKey = localStorage.getItem('gemini_api_key');
      
      if (savedInst) setInstitution(JSON.parse(savedInst));
      if (savedBoard) setBoardMembers(JSON.parse(savedBoard));
      if (savedKey) setApiKey(savedKey);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  const updateInstitution = (data: Institution) => {
    setInstitution(data);
    localStorage.setItem('institutionSettings', JSON.stringify(data));
  };

  const updateBoardMembers = (data: BoardMember[]) => {
    setBoardMembers(data);
    localStorage.setItem('boardSettings', JSON.stringify(data));
  };

  const updateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  }

  return (
    <SettingsContext.Provider value={{ institution, boardMembers, apiKey, updateInstitution, updateBoardMembers, updateApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
