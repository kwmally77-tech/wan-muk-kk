import React from 'react';
import { Building2, ShieldCheck, Phone, BookOpen, Settings, Sparkles } from 'lucide-react';
import { CompanyDocument, AdminSettings } from '../types/index.js';

interface HeaderProps {
  activeTab: 'chat' | 'admin';
  setActiveTab: (tab: 'chat' | 'admin') => void;
  documents: CompanyDocument[];
  settings: AdminSettings;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  documents,
  settings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Corporate Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">사내 인사·노무 규정 포털 시스템</span>
            <span className="text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">대한민국 노동관계법령 및 회사 내규 실시간 연계</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href={`tel:${settings.hrContact.phone}`}
              className="flex items-center space-x-1.5 text-slate-300 hover:text-white transition-colors"
              title="인사담당자 직통 전화연결"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>
                인사담당 {settings.hrContact.name}: <strong className="text-white font-mono">{settings.hrContact.phone}</strong>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md shrink-0">
            <Building2 className="w-6 h-6 text-blue-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                사내규정 AI 안내센터
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3 h-3 text-blue-600" />
                AI 지식 RAG
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              회사 내규와 최신 노동관계법령을 바탕으로 궁금한 사항을 안내해 드립니다.
            </p>
          </div>
        </div>

        {/* Tab & Status Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>등록 내규:</span>
            <span className="font-semibold text-slate-800">{documents.length}개 규정</span>
            {documents.length > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                정상 가동
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                내규 미등록
              </span>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>규정 질의응답</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-blue-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>규정 문서 관리</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
