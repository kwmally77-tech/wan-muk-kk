import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { CompanyDocument, DocumentChunk, AdminSettings, SearchTestResult } from '../types/index.js';
import { INITIAL_DOCUMENTS, INITIAL_CHUNKS } from './defaultDocuments.js';

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

export class DocumentStore {
  private documents: CompanyDocument[] = [];
  private chunks: DocumentChunk[] = [];
  private settings: AdminSettings = {
    storeChatLogs: true,
    retentionDays: 90,
    enableSearchGrounding: true,
    hrContact: {
      name: '김완묵',
      phone: '010-1234-5678',
      email: 'wmkim@company.co.kr',
      department: '인사노무팀',
    },
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DOCS_FILE) && fs.existsSync(CHUNKS_FILE)) {
        const docsData = fs.readFileSync(DOCS_FILE, 'utf-8');
        const chunksData = fs.readFileSync(CHUNKS_FILE, 'utf-8');
        this.documents = JSON.parse(docsData);
        this.chunks = JSON.parse(chunksData);
      } else {
        // Load initial defaults
        this.documents = [...INITIAL_DOCUMENTS];
        this.chunks = [...INITIAL_CHUNKS];
        this.persist();
      }

      if (fs.existsSync(SETTINGS_FILE)) {
        const settingsData = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        this.settings = { ...this.settings, ...JSON.parse(settingsData) };
      } else {
        this.saveSettings(this.settings);
      }
    } catch (err) {
      console.error('Error initializing DocumentStore:', err);
      this.documents = [...INITIAL_DOCUMENTS];
      this.chunks = [...INITIAL_CHUNKS];
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DOCS_FILE, JSON.stringify(this.documents, null, 2), 'utf-8');
      fs.writeFileSync(CHUNKS_FILE, JSON.stringify(this.chunks, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting documents/chunks:', err);
    }
  }

  public getDocuments(): CompanyDocument[] {
    return this.documents;
  }

  public getSettings(): AdminSettings {
    return this.settings;
  }

  public saveSettings(newSettings: Partial<AdminSettings>): AdminSettings {
    this.settings = { ...this.settings, ...newSettings };
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
    return this.settings;
  }

  public resetToDefaults(): { documents: CompanyDocument[]; chunksCount: number } {
    this.documents = [...INITIAL_DOCUMENTS];
    this.chunks = [...INITIAL_CHUNKS];
    this.persist();
    return { documents: this.documents, chunksCount: this.chunks.length };
  }

  public clearAllDocuments(): void {
    this.documents = [];
    this.chunks = [];
    this.persist();
  }

  public deleteDocument(docId: string): boolean {
    const prevCount = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== docId);
    this.chunks = this.chunks.filter((c) => c.docId !== docId);
    this.persist();
    return this.documents.length < prevCount;
  }

  public async parseAndAddDocument(
    fileBuffer: Buffer,
    filename: string,
    metadata: {
      title?: string;
      category?: CompanyDocument['category'];
      version?: string;
      effectiveDate?: string;
      revisionDate?: string;
    }
  ): Promise<CompanyDocument> {
    const ext = path.extname(filename).toLowerCase();
    let rawText = '';

    if (ext === '.pdf') {
      const require = createRequire(import.meta.url);
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(fileBuffer);
      rawText = pdfData.text || '';
    } else if (ext === '.docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.default.extractRawText({ buffer: fileBuffer });
      rawText = result.value || '';
    } else if (ext === '.txt' || ext === '.md') {
      rawText = fileBuffer.toString('utf-8');
    } else {
      throw new Error(`지원하지 않는 파일 형식입니다: ${ext} (.pdf, .docx, .txt 지원)`);
    }

    if (!rawText.trim()) {
      throw new Error('문서에서 텍스트를 추출할 수 없습니다. 내용이 비어있거나 스캔 이미지 형태입니다.');
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const title = metadata.title?.trim() || filename.replace(/\.[^/.]+$/, '');
    const category = metadata.category || '기타';
    const version = metadata.version?.trim() || 'v1.0';
    const effectiveDate = metadata.effectiveDate?.trim() || new Date().toISOString().slice(0, 10);
    const revisionDate = metadata.revisionDate?.trim();

    // Chunk the document text
    const chunks = this.chunkText(rawText, docId, title);

    const newDoc: CompanyDocument = {
      id: docId,
      filename,
      title,
      category,
      version,
      effectiveDate,
      revisionDate,
      uploadDate: new Date().toISOString(),
      fileSize: fileBuffer.length,
      chunksCount: chunks.length,
      isDefault: false,
    };

    this.documents.push(newDoc);
    this.chunks.push(...chunks);
    this.persist();

    return newDoc;
  }

  private chunkText(rawText: string, docId: string, docTitle: string): DocumentChunk[] {
    const lines = rawText.split(/\r?\n/);
    const chunks: DocumentChunk[] = [];

    // Check for article pattern: 제1조, 제 1 조, 제10조의2 등
    const articleRegex = /^(?:제\s*(\d+(?:의\s*\d+)?)\s*조\s*(?:\(([^)]+)\))?|第\s*(\d+)\s*條)/;
    const chapterRegex = /^(?:제\s*(\d+)\s*장|第\s*(\d+)\s*章)/;

    let currentArticleTitle = '';
    let currentLines: string[] = [];
    let chunkIndex = 1;
    let pageEstimate = 1;
    let charAccumulator = 0;

    const flushChunk = () => {
      if (currentLines.length === 0) return;
      const text = currentLines.join('\n').trim();
      if (text.length > 20) {
        const keywords = this.extractKeywords(text, currentArticleTitle);
        chunks.push({
          id: `chunk-${docId}-${chunkIndex++}`,
          docId,
          docTitle,
          article: currentArticleTitle || undefined,
          page: pageEstimate,
          content: text,
          keywords,
        });
      }
      currentLines = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      charAccumulator += line.length;
      if (charAccumulator > 1400) {
        pageEstimate += 1;
        charAccumulator = 0;
      }

      const matchArticle = line.match(articleRegex);
      if (matchArticle) {
        // Start of a new article
        flushChunk();
        currentArticleTitle = line.length > 50 ? line.slice(0, 50) + '...' : line;
        currentLines.push(line);
      } else if (chapterRegex.test(line)) {
        flushChunk();
        currentArticleTitle = line;
        currentLines.push(line);
      } else {
        currentLines.push(line);
        // If chunk is getting too large (> 1200 chars) without article boundary, flush
        if (currentLines.join('\n').length > 1200) {
          flushChunk();
        }
      }
    }

    flushChunk();

    // If chunking didn't produce chunks (e.g., free text with no article markers)
    if (chunks.length === 0 && rawText.trim().length > 0) {
      const paragraphs = rawText.split(/\n\s*\n/);
      let temp = '';
      paragraphs.forEach((p, idx) => {
        if ((temp + '\n' + p).length > 800) {
          chunks.push({
            id: `chunk-${docId}-${chunks.length + 1}`,
            docId,
            docTitle,
            article: `섹션 ${chunks.length + 1}`,
            page: Math.floor(idx / 3) + 1,
            content: temp.trim(),
            keywords: this.extractKeywords(temp, ''),
          });
          temp = p;
        } else {
          temp += '\n' + p;
        }
      });
      if (temp.trim()) {
        chunks.push({
          id: `chunk-${docId}-${chunks.length + 1}`,
          docId,
          docTitle,
          article: `섹션 ${chunks.length + 1}`,
          page: Math.floor(paragraphs.length / 3) + 1,
          content: temp.trim(),
          keywords: this.extractKeywords(temp, ''),
        });
      }
    }

    return chunks;
  }

  private extractKeywords(text: string, title: string): string[] {
    const combined = `${title} ${text}`;
    const words = combined
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2);

    // Common HR/labor stopwords
    const stopwords = new Set(['따라', '경우', '이에', '한다', '하며', '등의', '관한', '사항', '또는', '있는', '대한', '하고', '위하여']);
    const freq: { [key: string]: number } = {};

    for (const w of words) {
      if (stopwords.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
  }

  /**
   * Search knowledge base for chunks relevant to the user's query
   */
  public search(query: string, maxResults: number = 4): { chunk: DocumentChunk; score: number; matchReasons: string[] }[] {
    if (this.chunks.length === 0) {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    // Extract query tokens
    const queryTokens = cleanQuery
      .replace(/[?.,!~]/g, '')
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    // Detect specific article number search e.g. "제25조", "25조"
    const articleMatch = cleanQuery.match(/(?:제\s*)?(\d+)\s*조/);
    const targetArticleNum = articleMatch ? articleMatch[1] : null;

    const scored = this.chunks.map((chunk) => {
      let score = 0;
      const matchReasons: string[] = [];
      const contentLower = chunk.content.toLowerCase();
      const articleLower = (chunk.article || '').toLowerCase();
      const docTitleLower = chunk.docTitle.toLowerCase();

      // 1. Exact article match
      if (targetArticleNum) {
        const regex = new RegExp(`제\\s*${targetArticleNum}\\s*조`);
        if (regex.test(articleLower)) {
          score += 50;
          matchReasons.push(`조항 일치(제${targetArticleNum}조)`);
        } else if (regex.test(contentLower)) {
          score += 25;
          matchReasons.push(`본문 조항 번호 일치(제${targetArticleNum}조)`);
        }
      }

      // 2. High-priority HR keyword domain mappings
      const domainKeywords: { [key: string]: string[] } = {
        연차: ['연차', '연차휴가', '유급휴가', '15일', '미사용', '반차', '반반차', '가산휴가'],
        경조사: ['경조사', '결혼', '사망', '축하금', '조의금', '화환', '경조휴가', '부모', '배우자'],
        출장: ['출장', '출장비', '여비', '일비', '식비', '숙박비', '교통비', '실비', 'ktx'],
        지각: ['지각', '조퇴', '외출', '시업시간', '09:00', '무단', '근태'],
        병가: ['병가', '휴직', '질병', '진단서', '가사휴직', '상해'],
        퇴직: ['퇴직', '사직', '퇴직금', '퇴직연금', 'dc형', 'db형', 'irp', '평균임금'],
        육아: ['육아휴직', '육아기', '자녀', '단축', '임신', '출산휴가'],
        초과근무: ['초과근무', '연장근로', '시간외', '야간근로', '휴일근로', '가산수당', '통상임금', '50%'],
        수습: ['수습', '3개월', '채용', '시용', '본채용'],
      };

      for (const [topic, topicWords] of Object.entries(domainKeywords)) {
        const queryHasTopic = topicWords.some((w) => cleanQuery.includes(w));
        if (queryHasTopic) {
          const chunkMatchesTopic = topicWords.filter((w) => contentLower.includes(w) || articleLower.includes(w));
          if (chunkMatchesTopic.length > 0) {
            score += chunkMatchesTopic.length * 8;
            matchReasons.push(`주제 키워드 일치(${topic}: ${chunkMatchesTopic.slice(0, 3).join(', ')})`);
          }
        }
      }

      // 3. Exact query token matches
      for (const token of queryTokens) {
        if (articleLower.includes(token)) {
          score += 15;
          matchReasons.push(`조항목 제목 일치(${token})`);
        } else if (docTitleLower.includes(token)) {
          score += 5;
          matchReasons.push(`규정 문서명 일치(${token})`);
        }

        // Count frequency in content safely without regex syntax issues
        const occurrences = token ? contentLower.split(token).length - 1 : 0;
        if (occurrences > 0) {
          score += Math.min(occurrences * 3, 12);
        }
      }

      // 4. Keyword array overlap
      for (const kw of chunk.keywords) {
        if (cleanQuery.includes(kw.toLowerCase())) {
          score += 6;
        }
      }

      return {
        chunk,
        score,
        matchReasons: Array.from(new Set(matchReasons)),
      };
    });

    // Filter by minimal relevant score threshold (e.g., 10)
    const valid = scored.filter((item) => item.score >= 10);
    valid.sort((a, b) => b.score - a.score);

    return valid.slice(0, maxResults);
  }

  public testSearch(query: string): SearchTestResult {
    const results = this.search(query, 5);
    return {
      query,
      matchedChunks: results,
    };
  }
}

export const documentStore = new DocumentStore();
