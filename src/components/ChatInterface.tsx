import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  Download,
  AlertTriangle,
  BookCheck,
  Scale,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Phone,
  ShieldAlert,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ChatMessage, AdminSettings } from '../types/index.js';
import { QuickQuestions } from './QuickQuestions.js';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  isLoading: boolean;
  settings: AdminSettings;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  settings,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<{ [key: string]: boolean }>({});
  const [privacyAlert, setPrivacyAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check for RRN (주민등록번호 6자리-7자리)
  useEffect(() => {
    const rrnRegex = /\b\d{6}[- ]?[1-4]\d{6}\b/;
    setPrivacyAlert(rrnRegex.test(inputText));
  }, [inputText]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCitation = (key: string) => {
    setExpandedCitation((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportChatHistory = () => {
    if (messages.length === 0) return;
    const content = messages
      .map(
        (m) =>
          `[${m.role === 'user' ? '직원 질문' : '사내규정 AI 안내'}] (${m.timestamp})\n${m.content}\n----------------------------------\n`
      )
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `사내규정_상담내역_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-190px)] min-h-[550px] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Chat Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <Bot className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-800">인사·노무 실시간 규정 질의 상담</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">질문 입력 시 회사 내규 우선 검색 및 노동법령 자동 연계</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={exportChatHistory}
            disabled={messages.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors disabled:opacity-40"
            title="대화 내역 텍스트 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">대화 내보내기</span>
          </button>
          <button
            onClick={onClearChat}
            disabled={messages.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="대화 내역 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">대화 초기화</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                안녕하세요! 무엇이든 인사·노무 규정에 대해 질문해 주세요.
              </h2>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                임직원을 위한 취업규칙, 연차휴가, 출장여비, 경조사, 퇴직금, 복무규율 등 회사 내규를 우선 근거로 안내해 드립니다.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="pt-2">
              <QuickQuestions onSelectQuestion={(q) => onSendMessage(q)} disabled={isLoading} />
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>안내 시스템 작동 원리:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li><strong className="text-slate-900">회사 내규 우선 적용:</strong> 회사의 정식 규정 조항(제N조)과 세부 기준을 가장 먼저 찾습니다.</li>
                <li><strong className="text-slate-900">법정 기준 구분:</strong> 내규에 없거나 법적 검토가 필요한 경우 근로기준법 등 대한민국 최신 노동법령을 비교 안내합니다.</li>
                <li><strong className="text-slate-900">개인정보 보호:</strong> 주민등록번호, 계좌번호 등 민감정보는 절대 수집하지 않으므로 입력을 지양해 주세요.</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const structured = msg.structured;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 max-w-4xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-blue-400" />}
                </div>

                {/* Message Bubble & Content */}
                <div className={`space-y-2 min-w-0 flex-1 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Sender & Timestamp */}
                  <div
                    className={`flex items-center gap-2 text-xs text-slate-400 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className="font-semibold text-slate-700">
                      {isUser ? '직원 (나)' : '사내규정 AI 안내센터'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Body */}
                  {isUser ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl rounded-tr-xs bg-blue-600 text-white text-sm leading-relaxed shadow-xs whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-slate-50/80 border border-slate-200/90 text-slate-800 text-sm shadow-xs">
                      {/* Privacy Warning tag if triggered */}
                      {msg.hasPrivacyWarning && (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-medium">
                          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>주민등록번호 등 민감정보 보호를 위해 마스킹 처리되어 질의되었습니다.</span>
                        </div>
                      )}

                      {structured ? (
                        <div className="space-y-4">
                          {/* 1. Core Conclusion */}
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1.5 uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              <span>답변 요약</span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-blue-100 font-medium text-slate-900 leading-relaxed shadow-2xs whitespace-pre-wrap">
                              {structured.summary}
                            </div>
                          </div>

                          {/* 2. Company Internal Regulation Standard */}
                          {structured.companyStandard && (
                            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                  <BookCheck
                                    className={`w-4 h-4 ${
                                      structured.companyStandard.found ? 'text-blue-600' : 'text-amber-600'
                                    }`}
                                  />
                                  <span>회사 내규 기준</span>
                                </div>
                                {structured.companyStandard.found ? (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    내규 조항 확인됨
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    내규 미확인 (법령 참조)
                                  </span>
                                )}
                              </div>

                              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {structured.companyStandard.details}
                              </p>

                              {/* Cited Internal Document Chunks */}
                              {structured.companyStandard.citations && structured.companyStandard.citations.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                  <span className="text-[11px] font-semibold text-slate-500">확인된 사내 근거 규정:</span>
                                  {structured.companyStandard.citations.map((cite, cIdx) => {
                                    const citeKey = `${msg.id}-${cIdx}`;
                                    const isExpanded = !!expandedCitation[citeKey];
                                    return (
                                      <div key={cIdx} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs">
                                        <div
                                          onClick={() => toggleCitation(citeKey)}
                                          className="flex items-center justify-between cursor-pointer hover:text-blue-700"
                                        >
                                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            <span>{cite.docTitle}</span>
                                            {cite.article && (
                                              <span className="text-blue-800 font-semibold">[{cite.article}]</span>
                                            )}
                                          </div>
                                          <div className="text-slate-400">
                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                          </div>
                                        </div>
                                        {isExpanded && (
                                          <p className="mt-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                            {cite.excerpt}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Statutory Labor Laws Standard */}
                          {structured.legalStandard && structured.legalStandard.required && (
                            <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                                  <Scale className="w-4 h-4 text-emerald-600" />
                                  <span>대한민국 노동관계법령 기준</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  최신 법령 확인
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {structured.legalStandard.details}
                              </p>

                              {/* Official Legal Sources */}
                              {structured.legalStandard.sources && structured.legalStandard.sources.length > 0 && (
                                <div className="pt-2 border-t border-emerald-100 flex flex-wrap gap-1.5">
                                  {structured.legalStandard.sources.map((src, sIdx) => (
                                    <a
                                      key={sIdx}
                                      href={src.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium transition-colors"
                                    >
                                      <span>{src.title}</span>
                                      <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Contact & Reference Card */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-950">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              <span>
                                <strong>참고 및 개별문의:</strong> {structured.contactNotice || `${settings.hrContact.name} (${settings.hrContact.phone})`}
                              </span>
                            </div>
                            <a
                              href={`tel:${settings.hrContact.phone}`}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-medium text-[11px] transition-colors shrink-0"
                            >
                              <Phone className="w-3 h-3" />
                              <span>전화 상담</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-800">
                          {msg.content}
                        </div>
                      )}

                      {/* Message Actions */}
                      <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                        <span className="text-[11px]">안내 기준: 사내 규정 제반 조항 및 최신 노동법령</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
                          title="답변 복사"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-medium">복사완료</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>답변 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-4xl mr-auto">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200 flex items-center space-x-3 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>사내 규정 지식베이스 및 최신 노동법령 검색 중...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        {/* Real-time Privacy Guard Warning */}
        {privacyAlert && (
          <div className="mb-2.5 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>개인정보 주의:</strong> 입력하신 내용에 주민등록번호 등 민감정보 형식이 감지되었습니다. 사내 챗봇에는 개인정보를 입력하지 마십시오.
            </span>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="취업규칙, 연차, 출장비, 경조사, 퇴직, 병가 등 규정에 관해 무엇이든 물어보세요..."
              className="w-full resize-none rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="h-10 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white flex items-center justify-center font-medium shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
            title="질문 전송 (Enter)"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline ml-1.5 text-xs font-semibold">전송</span>
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Enter 키로 전송, Shift+Enter로 줄바꿈</span>
          <span className="hidden sm:inline">회사 내규 최우선 검색 • Google Search 실시간 법령 Grounding</span>
        </div>
      </div>
    </div>
  );
};
