export interface DocumentChunk {
  id: string;
  docId: string;
  docTitle: string;
  article?: string; // e.g. "제25조 (연차유급휴가)"
  page?: number;
  content: string;
  keywords: string[];
}

export interface CompanyDocument {
  id: string;
  filename: string;
  title: string;
  category: '취업규칙' | '복무규정' | '급여/여비' | '복리후생' | '인사/퇴직' | '기타';
  version: string;
  effectiveDate: string; // 시행일
  revisionDate?: string; // 개정일
  uploadDate: string;
  fileSize: number;
  chunksCount: number;
  isDefault?: boolean;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface CompanyCitation {
  docTitle: string;
  article?: string;
  excerpt: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rawResponse?: string;
  structured?: {
    summary: string;
    companyStandard?: {
      found: boolean;
      details: string;
      citations: CompanyCitation[];
    };
    legalStandard?: {
      required: boolean;
      details: string;
      sources: GroundingSource[];
    };
    contactNotice?: string;
  };
  hasPrivacyWarning?: boolean;
}

export interface AdminSettings {
  storeChatLogs: boolean;
  retentionDays: number;
  enableSearchGrounding: boolean;
  hrContact: {
    name: string;
    phone: string;
    email: string;
    department: string;
  };
}

export interface SearchTestResult {
  query: string;
  matchedChunks: {
    chunk: DocumentChunk;
    score: number;
    matchReasons: string[];
  }[];
}
