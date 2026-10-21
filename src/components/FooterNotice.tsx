import React, { useState } from 'react';
import { Phone, AlertCircle, Copy, Check, ExternalLink, ShieldAlert } from 'lucide-react';
import { AdminSettings } from '../types/index.js';

interface FooterNoticeProps {
  settings: AdminSettings;
}

export const FooterNotice: React.FC<FooterNoticeProps> = ({ settings }) => {
  const [copied, setCopied] = useState(false);
  const { name, phone, department } = settings.hrContact;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      {/* HR Contact Banner */}
      <div className="bg-slate-50 border-b border-slate-200 py-3 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center space-x-2 text-slate-700">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <Phone className="w-4 h-4" />
            </span>
            <div>
              <span className="font-semibold text-slate-900">인사·노무 개별 문의처:</span>{' '}
              <span className="text-slate-700">
                {department} <strong className="text-slate-900">{name}</strong> 담당자
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-mono text-xs font-semibold shadow-xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{phone} 전화걸기</span>
            </a>
            <button
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs transition-colors"
              title="전화번호 복사"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? '복사됨' : '번호 복사'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Legal & Caution Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500 space-y-2">
        <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/80 p-3 rounded-lg text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            본 안내는 참고용이며 최종적인 인사·노무 판단은 회사 담당자에게 확인하시기 바랍니다.
            <span className="hidden md:inline text-amber-800/80 font-normal ml-1">
              개인별 인사평가, 징계의결, 급여 및 퇴직금의 확정 계산은 회사 소관부서의 최종 확인 절차가 필요합니다.
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> 개인정보보호 준수 (주민등록번호 미수집)
            </span>
            <span>•</span>
            <span>Gemini API 실시간 법령 Grounding</span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="https://www.law.go.kr"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 inline-flex items-center gap-0.5 transition-colors"
            >
              국가법령정보센터 <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <a
              href="https://www.moel.go.kr"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600 inline-flex items-center gap-0.5 transition-colors"
            >
              고용노동부 공식포털 <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
