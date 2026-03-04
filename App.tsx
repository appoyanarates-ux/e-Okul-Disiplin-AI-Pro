import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import IncidentLog from './components/IncidentLog';
import DecisionAssistant from './components/DecisionAssistant';
import Statistics from './components/Statistics';
import Regulations from './components/Regulations';
import Students from './components/Students';
import Settings from './components/Settings';
import HelpBackup from './components/HelpBackup';
import PenaltyCatalog from './components/PenaltyCatalog';
import PenaltyRemoval from './components/PenaltyRemoval';
import About from './components/About';
import { StudentProvider } from './context/StudentContext';
import { SettingsProvider } from './context/SettingsContext';
import { IncidentProvider } from './context/IncidentContext';

const App = () => {
  return (
    <StudentProvider>
      <IncidentProvider>
        <SettingsProvider>
          <HashRouter>
            <div className="flex bg-[#f3f4f6] min-h-screen font-sans">
              <Sidebar />
              <div className="flex-1 ml-64 transition-all duration-300">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/incidents" element={<IncidentLog />} />
                  <Route path="/penalties" element={<PenaltyCatalog />} />
                  <Route path="/decisions" element={<DecisionAssistant />} />
                  <Route path="/penalty-removal" element={<PenaltyRemoval />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/regulations" element={<Regulations />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help" element={<HelpBackup />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          </HashRouter>
        </SettingsProvider>
      </IncidentProvider>
    </StudentProvider>
  );
};

export default App;
