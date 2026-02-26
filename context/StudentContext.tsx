import React, { createContext, useContext, useState } from 'react';
import { Student } from '../types';

interface StudentContextType {
  students: Student[];
  addStudent: (student: Student) => void;
  removeStudent: (id: string) => void;
  setStudents: (students: Student[]) => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudentsState] = useState<Student[]>(() => {
    try {
        const saved = localStorage.getItem('students');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  const setStudents = (newStudents: Student[]) => {
    setStudentsState(newStudents);
    localStorage.setItem('students', JSON.stringify(newStudents));
  };

  const addStudent = (student: Student) => {
    setStudentsState(prev => {
        const updated = [...prev, student];
        localStorage.setItem('students', JSON.stringify(updated));
        return updated;
    });
  };

  const removeStudent = (id: string) => {
    setStudentsState(prev => {
        const updated = prev.filter(s => s.id !== id);
        localStorage.setItem('students', JSON.stringify(updated));
        return updated;
    });
  };

  return (
    <StudentContext.Provider value={{ students, addStudent, removeStudent, setStudents }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) throw new Error('useStudents must be used within a StudentProvider');
  return context;
};