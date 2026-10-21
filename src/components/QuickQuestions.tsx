import React from 'react';
import { Sparkles, Calendar, HeartHandshake, Stethoscope, Briefcase, Clock, HandCoins, Baby, Calculator } from 'lucide-react';

interface QuickQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export const QUICK_QUESTIONS = [
  {
    text: '연차휴가는 어떻게 사용하나요?',
    icon: Calendar,
    tag: '연차/휴가',
  },
  {
    text: '경조사 휴가와 경조금 기준은 무엇인가요?',
    icon: HeartHandshake,
    tag: '경조사',
  },
  {
    text: '병가 및 휴직 신청 절차는 어떻게 되나요?',
    icon: Stethoscope,
    tag: '병가/휴직',
  },
  {
    text: '출장비 및 여비 지급 기준은 무엇인가요?',
    icon: Briefcase,
    tag: '출장/여비',
  },
  {
    text: '지각이나 조퇴 시 처리 기준은 무엇인가요?',
    icon: Clock,
    tag: '근태관리',
  },
  {
    text: '퇴직금과 퇴직 절차는 어떻게 되나요?',
    icon: HandCoins,
    tag: '퇴직/급여',
  },
  {
    text: '육아휴직은 얼마나 사용할 수 있나요?',
    icon: Baby,
    tag: '육아지원',
  },
  {
    text: '초과근무 수당은 어떻게 계산하나요?',
    icon: Calculator,
    tag: '근로시간',
  },
];

export const QuickQuestions: React.FC<QuickQuestionsProps> = ({ onSelectQuestion, disabled }) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-slate-700">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>자주 묻는 규정 질문 (클릭 시 자동 질의)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {QUICK_QUESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(item.text)}
              disabled={disabled}
              className="group flex items-start gap-2.5 p-2.5 text-left rounded-xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-semibold text-blue-600 mb-0.5 uppercase tracking-wide">
                  {item.tag}
                </span>
                <p className="text-xs font-medium text-slate-800 group-hover:text-blue-900 leading-snug line-clamp-2">
                  {item.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
