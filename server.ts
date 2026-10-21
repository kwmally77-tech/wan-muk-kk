import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { documentStore } from './src/server/documentStore.js';
import { geminiService } from './src/server/geminiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.txt', '.md'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('PDF, DOCX, TXT 파일만 업로드할 수 있습니다.'));
    }
  },
});

// Middleware for admin verification (optional token check or header)
const checkAdmin = (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers['x-admin-key'];
  if (authHeader === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
};

// ---------------- Chat API ----------------
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: '질문 내용을 입력해주세요.' });
      return;
    }

    const response = await geminiService.answerQuestion(message, history || []);
    res.json(response);
  } catch (err: unknown) {
    console.error('Chat API Error:', err);
    res.status(500).json({
      error: '답변 생성 중 오류가 발생했습니다.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ---------------- Document Management APIs ----------------
app.get('/api/documents', (_req: Request, res: Response) => {
  const documents = documentStore.getDocuments();
  res.json({ documents });
});

app.post('/api/documents/upload', checkAdmin, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '업로드할 파일이 없습니다.' });
      return;
    }

    const { title, category, version, effectiveDate, revisionDate } = req.body;
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const newDoc = await documentStore.parseAndAddDocument(req.file.buffer, originalname, {
      title,
      category,
      version,
      effectiveDate,
      revisionDate,
    });

    res.json({
      success: true,
      message: `'${newDoc.title}' 규정이 성공적으로 등록 및 색인되었습니다. (${newDoc.chunksCount}개 조항/구간 분할)`,
      document: newDoc,
    });
  } catch (err: unknown) {
    console.error('Upload Error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : '문서 처리 중 오류가 발생했습니다.',
    });
  }
});

app.delete('/api/documents/:id', checkAdmin, (req: Request, res: Response) => {
  const docId = req.params.id;
  const deleted = documentStore.deleteDocument(docId);
  if (deleted) {
    res.json({ success: true, message: '문서가 삭제되었습니다.' });
  } else {
    res.status(404).json({ error: '해당 문서를 찾을 수 없습니다.' });
  }
});

app.post('/api/documents/reset-defaults', checkAdmin, (_req: Request, res: Response) => {
  const result = documentStore.resetToDefaults();
  res.json({
    success: true,
    message: '표준 회사 내규(취업규칙, 여비규정, 경조사규정)로 복원되었습니다.',
    documents: result.documents,
    chunksCount: result.chunksCount,
  });
});

app.post('/api/documents/clear', checkAdmin, (_req: Request, res: Response) => {
  documentStore.clearAllDocuments();
  res.json({
    success: true,
    message: '모든 회사 내규가 삭제되었습니다. (내규 확인 불가 상태 테스트 가능)',
  });
});

// Admin knowledge-base search tester
app.post('/api/documents/test-search', (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: '검색어를 입력해주세요.' });
    return;
  }
  const result = documentStore.testSearch(query);
  res.json(result);
});

// ---------------- Admin Settings & Auth ----------------
app.post('/api/admin/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ valid: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ valid: false, message: '비밀번호가 일치하지 않습니다.' });
  }
});

app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(documentStore.getSettings());
});

app.post('/api/settings', checkAdmin, (req: Request, res: Response) => {
  const updated = documentStore.saveSettings(req.body);
  res.json({ success: true, settings: updated });
});

// ---------------- Health Check ----------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    documentsCount: documentStore.getDocuments().length,
    timestamp: new Date().toISOString(),
  });
});

// ---------------- Server Entry & Vite Integration ----------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // In dev, mount Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist not found. Please run npm run build.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [사내규정 AI 안내센터] Server running on http://0.0.0.0:${PORT} (mode: ${isDev ? 'dev' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
});
