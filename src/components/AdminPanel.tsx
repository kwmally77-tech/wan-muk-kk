import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Upload,
  FileText,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Settings,
  Shield,
  Layers,
  Database,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { CompanyDocument, AdminSettings, SearchTestResult } from '../types/index.js';

interface AdminPanelProps {
  documents: CompanyDocument[];
  onRefreshDocuments: () => Promise<void>;
  settings: AdminSettings;
  onUpdateSettings: (newSettings: Partial<AdminSettings>) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  documents,
  onRefreshDocuments,
  settings,
  onUpdateSettings,
}) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_token') === 'admin1234';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState<CompanyDocument['category']>('취업규칙');
  const [version, setVersion] = useState('v1.0');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [revisionDate, setRevisionDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Search Tester State
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<SearchTestResult | null>(null);
  const [isTestingSearch, setIsTestingSearch] = useState(false);

  // Settings Form State
  const [hrName, setHrName] = useState(settings.hrContact.name);
  const [hrPhone, setHrPhone] = useState(settings.hrContact.phone);
  const [hrEmail, setHrEmail] = useState(settings.hrContact.email);
  const [hrDept, setHrDept] = useState(settings.hrContact.department);
  const [enableGrounding, setEnableGrounding] = useState(settings.enableSearchGrounding);
  const [retentionDays, setRetentionDays] = useState(settings.retentionDays);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('admin_token', passwordInput);
        setIsAdminAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError(data.message || '비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setAuthError('관리자 인증 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAdminAuthenticated(false);
  };

  const getAdminKey = () => sessionStorage.getItem('admin_token') || 'admin1234';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadStatus({ success: false, message: '업로드할 파일을 선택해주세요.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', docTitle);
    formData.append('category', category);
    formData.append('version', version);
    formData.append('effectiveDate', effectiveDate);
    if (revisionDate) formData.append('revisionDate', revisionDate);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'x-admin-key': getAdminKey(),
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus({ success: true, message: data.message });
        setUploadFile(null);
        setDocTitle('');
        await onRefreshDocuments();
      } else {
        setUploadStatus({ success: false, message: data.error || '문서 업로드 실패' });
      }
    } catch (err: unknown) {
      setUploadStatus({ success: false, message: '서버 통신 중 오류가 발생했습니다.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, title: string) => {
    if (!confirm(`'${title}' 규정 문서를 지식베이스에서 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': getAdminKey() },
      });
      if (res.ok) {
        await onRefreshDocuments();
      } else {
        alert('삭제 중 오류가 발생했습니다.');
      }
    } catch {
      alert('서버 통신 실패');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('표준 취업규칙, 여비규정, 경조사규정으로 지식베이스를 초기화하시겠습니까?')) return;
    try {
      const res = await fetch('/api/documents/reset-defaults', {
        method: 'POST',
        headers: { 'x-admin-key': getAdminKey() },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        await onRefreshDocuments();
      }
    } catch {
      alert('초기화 실패');
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        '모든 회사 내규를 삭제하시겠습니까?\n(테스트 시나리오 4: 내규 미등록 상태 테스트에 유용합니다)'
      )
    )
      return;
    try {
      const res = await fetch('/api/documents/clear', {
        method: 'POST',
        headers: { 'x-admin-key': getAdminKey() },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        await onRefreshDocuments();
      }
    } catch {
      alert('삭제 실패');
    }
  };

  const handleRunSearchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsTestingSearch(true);
    try {
      const res = await fetch('/api/documents/test-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery }),
      });
      const data = await res.json();
      setTestResults(data);
    } catch {
      alert('검색 테스트 실패');
    } finally {
      setIsTestingSearch(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        enableSearchGrounding: enableGrounding,
        retentionDays,
        hrContact: {
          name: hrName,
          phone: hrPhone,
          email: hrEmail,
          department: hrDept,
        },
      });
      setSettingsStatus('설정이 성공적으로 저장되었습니다.');
      setTimeout(() => setSettingsStatus(null), 3000);
    } catch {
      setSettingsStatus('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // If not logged in, show security login gate
  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-md">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">관리자 인증</h2>
          <p className="text-xs text-slate-500">
            사내 내규 업로드, 지식베이스 교체 및 시스템 설정을 관리하려면 관리자 인증이 필요합니다.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="기본 비밀번호: admin1234"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {authError && (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {authError}
            </p>
          )}

          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800">
            💡 테스트를 위한 기본 관리자 비밀번호는 <code className="font-mono font-bold">admin1234</code> 입니다.
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Unlock className="w-4 h-4" />
            <span>관리자 모드 접속</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Admin Top Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold">사내 규정 지식베이스 및 보안 관리 센터</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                인증됨 (Admin)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              임직원 질의응답의 최우선 근거가 되는 내규 파일 등록, 분할(Chunking), 색인 및 RAG 검색을 통제합니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
        >
          관리자 로그아웃
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document Upload & List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">새 사내 규정 파일 등록</h3>
              </div>
              <span className="text-xs text-slate-400">PDF, DOCX, TXT 파일 지원</span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="doc-file-input"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="doc-file-input" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-blue-600 mx-auto" />
                  <div className="text-xs text-slate-600">
                    {uploadFile ? (
                      <span className="font-semibold text-blue-700 text-sm">
                        선택된 파일: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-blue-700">여기를 클릭하여 파일 선택</span> 또는 드래그 앤 드롭
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    문서 업로드 시 자동으로 조항(제N조), 제목, 페이지를 감지하여 지식베이스로 구조화합니다.
                  </p>
                </label>
              </div>

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">규정 문서명</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="예: 2026년 인사평가 및 복무규정"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">규정 구분(분류)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CompanyDocument['category'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="취업규칙">취업규칙</option>
                    <option value="복무규정">복무규정</option>
                    <option value="급여/여비">급여/여비</option>
                    <option value="복리후생">복리후생</option>
                    <option value="인사/퇴직">인사/퇴직</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">버전</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="예: v1.0, 2026 개정판"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">시행일자</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {uploadStatus && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    uploadStatus.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {uploadStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{uploadStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>문서 텍스트 추출 및 조항 분할 색인 중...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>규정 등록 및 색인 완료</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Document List Table */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  현재 등록된 내규 지식베이스 목록 ({documents.length}건)
                </h3>
                <p className="text-xs text-slate-500">
                  질문 발생 시 우선 검색 대상이 되는 유효 규정 목록입니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors"
                  title="표준 취업규칙/여비규정/경조사규정으로 복원"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>표준 내규로 초기화</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-700 flex items-center gap-1 transition-colors"
                  title="모든 규정 삭제 (내규 미등록 상태 테스트)"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>전체 비우기</span>
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/50 space-y-2">
                <Database className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">등록된 회사 내규가 없습니다.</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  내규가 없는 상태에서는 챗봇이 "회사 내규에서 해당 사항을 확인하지 못했습니다"라고 정확히 알린 뒤 법령을 검색합니다.
                </p>
                <button
                  onClick={handleResetDefaults}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>표준 내규 3종 즉시 불러오기</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">규정명 / 파일명</th>
                      <th className="py-2.5 px-3 font-semibold">구분</th>
                      <th className="py-2.5 px-3 font-semibold">버전 / 시행일</th>
                      <th className="py-2.5 px-3 font-semibold">분할 조항 수</th>
                      <th className="py-2.5 px-3 font-semibold text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-900 block">{doc.title}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{doc.filename}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>
                            <span className="font-medium text-slate-800">{doc.version}</span>
                            <span className="block text-[11px] text-slate-400">{doc.effectiveDate}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                            <Layers className="w-3 h-3" />
                            {doc.chunksCount}개 조항
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 rounded-md hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
                              title="상세 정보"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.title)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Search Tester & Admin Settings */}
        <div className="space-y-6">
          {/* Instant Search Tester */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">내규 검색 즉시 테스트 (RAG 검증)</h3>
                <p className="text-[11px] text-slate-500">
                  질문 입력 시 어떤 조항이 매칭되는지 직접 확인합니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleRunSearchTest} className="space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="예: 연차 며칠, 지각 처리, 출장 숙박비, 제25조..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                />
                <button
                  type="submit"
                  disabled={isTestingSearch || !testQuery.trim()}
                  className="px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                >
                  {isTestingSearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>테스트</span>
                </button>
              </div>
            </form>

            {testResults && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>매칭된 조항 ({testResults.matchedChunks.length}건)</span>
                  <span>검색어: "{testResults.query}"</span>
                </div>

                {testResults.matchedChunks.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs">
                    ⚠️ 매칭된 내규 조항이 없습니다. (이 경우 챗봇은 "회사 내규에서 해당 사항을 확인하지 못했습니다"라고 답변하고 노동법령을 검색합니다)
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {testResults.matchedChunks.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span className="text-blue-800">{item.chunk.article || item.chunk.docTitle}</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px]">
                            점수: {item.score}점
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                          {item.matchReasons.map((r, rIdx) => (
                            <span key={rIdx} className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {r}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed mt-1">
                          {item.chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin System & Contact Settings */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">운영 정책 및 인사담당자 정보</h3>
                <p className="text-[11px] text-slate-500">
                  임직원 화면 하단과 답변 카드에 노출되는 연락처를 관리합니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">인사담당자 성명</label>
                <input
                  type="text"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">직통 전화번호</label>
                <input
                  type="text"
                  value={hrPhone}
                  onChange={(e) => setHrPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">소속 부서</label>
                <input
                  type="text"
                  value={hrDept}
                  onChange={(e) => setHrDept(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableGrounding}
                    onChange={(e) => setEnableGrounding(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Google Search 법령 Grounding 연계</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  내규에 없는 노동법령 문의 시 대한민국 최신 법령정보를 실시간 검색합니다.
                </p>

                <div className="pl-6 pt-1">
                  <label className="block font-semibold text-slate-700 mb-1">대화 기록 보관 주기</label>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value={30}>30일 보관 후 자동 파기</option>
                    <option value={90}>90일 보관 (권장)</option>
                    <option value={180}>180일 보관</option>
                    <option value={365}>1년 보관</option>
                  </select>
                </div>
              </div>

              {settingsStatus && (
                <p className="text-xs text-blue-700 font-medium">{settingsStatus}</p>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                {isSavingSettings ? '저장 중...' : '설정 저장'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">{previewDoc.title}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-600">
              <p><strong>파일명:</strong> {previewDoc.filename}</p>
              <p><strong>구분:</strong> {previewDoc.category}</p>
              <p><strong>버전:</strong> {previewDoc.version}</p>
              <p><strong>시행일자:</strong> {previewDoc.effectiveDate}</p>
              <p><strong>파일 크기:</strong> {(previewDoc.fileSize / 1024).toFixed(1)} KB</p>
              <p><strong>분할 조항 수:</strong> {previewDoc.chunksCount}개</p>
              <p><strong>등록일자:</strong> {new Date(previewDoc.uploadDate).toLocaleString()}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
