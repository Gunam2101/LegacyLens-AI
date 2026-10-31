import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UploadPage } from './pages/UploadPage';
import { LiveAnalysisPage } from './pages/LiveAnalysisPage';
import { DashboardPage } from './pages/DashboardPage';
import { BusinessRulesPage } from './pages/BusinessRulesPage';
import { DependencyPage } from './pages/DependencyPage';
import { ModernizationPage } from './pages/ModernizationPage';
import { CodeChangesPage } from './pages/CodeChangesPage';
import { WebsiteRedesignStudio } from './pages/WebsiteRedesignStudio';
import { VerificationPage } from './pages/VerificationPage';
import { ReportsPage } from './pages/ReportsPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { SettingsPage } from './pages/SettingsPage';
import { Project } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
      // If we don't have a current project or it's not in the list, set default
      if (list.length > 0) {
        const savedId = localStorage.getItem('legacylens_active_project');
        const found = list.find(p => p.id === savedId) || list[0];
        setCurrentProject(found);
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (p: Project) => {
    setCurrentProject(p);
    localStorage.setItem('legacylens_active_project', p.id);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
        <Navbar
          currentProject={currentProject}
          projects={projects}
          onSelectProject={handleSelectProject}
        />

        <div className="flex-1 flex">
          <Sidebar hasActiveProject={!!currentProject} />

          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    refreshProjects={fetchProjects}
                  />
                }
              />
              <Route
                path="/projects"
                element={
                  <ProjectsPage
                    projects={projects}
                    currentProject={currentProject}
                    onSelectProject={handleSelectProject}
                    refreshProjects={fetchProjects}
                  />
                }
              />
              <Route
                path="/upload"
                element={
                  <UploadPage
                    currentProject={currentProject}
                    projects={projects}
                    onSelectProject={handleSelectProject}
                    refreshProjects={fetchProjects}
                  />
                }
              />
              <Route
                path="/analysis"
                element={
                  <LiveAnalysisPage
                    currentProject={currentProject}
                    refreshProjects={fetchProjects}
                  />
                }
              />
              <Route
                path="/dashboard"
                element={<DashboardPage currentProject={currentProject} />}
              />
              <Route
                path="/rules"
                element={<BusinessRulesPage currentProject={currentProject} />}
              />
              <Route
                path="/dependencies"
                element={<DependencyPage currentProject={currentProject} />}
              />
              <Route
                path="/modernization"
                element={<ModernizationPage currentProject={currentProject} />}
              />
              <Route
                path="/redesign"
                element={<WebsiteRedesignStudio currentProject={currentProject} />}
              />
              <Route
                path="/changes"
                element={<CodeChangesPage currentProject={currentProject} />}
              />
              <Route
                path="/verification"
                element={<VerificationPage currentProject={currentProject} />}
              />
              <Route
                path="/reports"
                element={<ReportsPage currentProject={currentProject} />}
              />
              <Route
                path="/benchmark"
                element={
                  <BenchmarkPage
                    onSelectProject={handleSelectProject}
                    refreshProjects={fetchProjects}
                  />
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
