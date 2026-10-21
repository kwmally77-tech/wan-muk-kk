import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { FooterNotice } from './components/FooterNotice.js';
import { ChatInterface } from './components/ChatInterface.js';
import { AdminPanel } from './components/AdminPanel.js';
import { CompanyDocument, ChatMessage, AdminSettings } from './types/index.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'admin'>('chat');
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('hr_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    storeChatLogs: true,
    retentionDays: 90,
    enableSearchGrounding: true,
    hrContact: {
      name: '김완묵',
      phone: '010-1234-5678',
      email: 'wmkim@company.co.kr',
      department: '인사노무팀',
    },
  });

  // Load documents
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  // Load settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchSettings();
  }, [fetchDocuments, fetchSettings]);

  // Persist messages if retention enabled
  useEffect(() => {
    if (settings.storeChatLogs) {
      try {
        localStorage.setItem('hr_chat_history', JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save chat history to localStorage:', e);
      }
    } else {
      localStorage.removeItem('hr_chat_history');
    }
  }, [messages, settings.storeChatLogs]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: chatHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `서버 오류가 발생했습니다 (${res.status})`);
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answerText,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        rawResponse: data.answerText,
        structured: data.structured,
        hasPrivacyWarning: data.hasPrivacyWarning,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `질문 처리 중 문제가 발생했습니다: ${
          err instanceof Error ? err.message : String(err)
        }\n\n긴급한 인사·노무 문의는 인사담당자 ${settings.hrContact.name}(${settings.hrContact.phone})에게 직접 문의 바랍니다.`,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('대화 기록을 모두 지우시겠습니까?')) {
      setMessages([]);
      localStorage.removeItem('hr_chat_history');
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<AdminSettings>) => {
    const adminKey = sessionStorage.getItem('admin_token') || 'admin1234';
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify(newSettings),
    });

    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
    } else {
      throw new Error('설정 저장 실패');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documents={documents}
        settings={settings}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'chat' ? (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            isLoading={isLoading}
            settings={settings}
          />
        ) : (
          <AdminPanel
            documents={documents}
            onRefreshDocuments={fetchDocuments}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      <FooterNotice settings={settings} />
    </div>
  );
}
