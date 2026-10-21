import { GoogleGenAI } from '@google/genai';
import { documentStore } from './documentStore.js';
import { CompanyCitation, GroundingSource, AdminSettings } from '../types/index.js';

export interface ChatResponsePayload {
  answerText: string;
  structured: {
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
    contactNotice: string;
  };
  hasPrivacyWarning: boolean;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
      }
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  /**
   * Screen for sensitive information such as Korean Resident Registration Numbers (RRN).
   */
  public checkSensitiveInfo(text: string): { containsSensitive: boolean; maskedText: string } {
    // 6 digits + hyphen or space + 7 digits (주민등록번호 패턴)
    const rrnRegex = /\b(\d{6})[- ]?([1-4]\d{6})\b/g;
    let containsSensitive = false;
    const maskedText = text.replace(rrnRegex, (_match, front) => {
      containsSensitive = true;
      return `${front}-*******`;
    });
    return { containsSensitive, maskedText };
  }

  public async answerQuestion(
    userQuestion: string,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<ChatResponsePayload> {
    const { containsSensitive, maskedText } = this.checkSensitiveInfo(userQuestion);
    const settings = documentStore.getSettings();

    // 1. RAG Search on Company Internal Documents
    const searchResults = documentStore.search(maskedText, 4);
    const hasCompanyMatches = searchResults.length > 0;
    const totalDocsCount = documentStore.getDocuments().length;

    let companyContextText = '';
    const companyCitations: CompanyCitation[] = [];

    if (totalDocsCount === 0) {
      companyContextText = '현재 시스템에 등록된 회사 내규 문서가 전혀 없습니다. (내규 확인 불가 상태)';
    } else if (!hasCompanyMatches) {
      companyContextText = '회사 내규 지식베이스에서 해당 질문과 관련된 규정이나 조항이 검색되지 않았습니다.';
    } else {
      companyContextText = searchResults
        .map((res, i) => {
          companyCitations.push({
            docTitle: res.chunk.docTitle,
            article: res.chunk.article,
            excerpt: res.chunk.content.slice(0, 150) + (res.chunk.content.length > 150 ? '...' : ''),
            score: res.score,
          });
          return `[내규 발췌 ${i + 1}] 규정명: ${res.chunk.docTitle} | 조항: ${res.chunk.article || '일반 규정'} (페이지 ${res.chunk.page || 1})\n내용: ${res.chunk.content}`;
        })
        .join('\n\n');
    }

    // 2. Prepare Gemini system instruction with the 10 core directives
    const hrContact = settings.hrContact;
    const systemPrompt = `당신은 '우리회사 AI 인사·노무 규정 안내 챗봇'입니다.
임직원의 취업규칙, 복무규정, 인사규정, 급여, 연차휴가, 휴직, 퇴직, 출장, 경조사, 복리후생 등 질문에 대해 회사 내규를 최우선 근거로 신속하고 정확하게 답변합니다.

[10대 핵심 운영 원칙 - 엄격 준수]
1. 회사 내규 문서를 가장 먼저 확인합니다. 시스템이 제공한 [회사 내규 검색 결과]가 최우선 기준입니다.
2. 회사 내규에 명시된 사항은 해당 규정명, 조항, 페이지 등 확인 가능한 근거를 명확하게 밝힙니다.
3. 회사 내규에 관련 내용이 없거나 등록된 내규가 없는 경우, 반드시 '회사 내규에서 해당 사항을 확인하지 못했습니다'라고 먼저 솔직하고 명확하게 안내한 후, 법령 검색을 진행합니다.
4. 내규에 없거나 법적 검토가 필요한 경우 근로기준법, 근로기준법 시행령, 남녀고용평등과 일·가정 양립 지원에 관한 법률, 근로자퇴직급여 보장법, 최저임금법, 산업안전보건법 등 최신 대한민국 노동관계법령을 확인합니다.
5. 법령 인용 시 국가법령정보센터(law.go.kr), 고용노동부(moel.go.kr) 등 공식 출처를 명시합니다.
6. 회사 내규와 강행법규(근로기준법 등)가 상충할 가능성이 있으면 '법정 기준'과 '내규 기준'을 명확히 구분하여 안내합니다. (예: 법정 최소 기준 대비 회사 내규의 우대 조건 등)
7. 규정이나 법률에 명시되지 않은 내용을 자의적으로 추측하거나 임의로 지어내지 않습니다.
8. 최신 법령을 실제로 검색/확인하지 못했다면 확인한 것처럼 꾸며 답하지 않습니다.
9. 개인별 인사 평가, 징계 결정, 퇴직금/급여의 최종 확정액 산정, 법률적 분쟁 사안은 일반 참고 정보만 제공하고 "최종 판단은 회사 인사담당자의 확인이 필요합니다"라고 명시합니다.
10. 모든 답변은 정중하고 신뢰감 있으며 친절한 한국어 존댓말(~합니다, ~바랍니다)로 일관성 있게 작성합니다.

[표준 답변 형식]
질문: ${maskedText}

답변:
[질문에 대한 핵심 결론을 먼저 쉽고 명확하게 설명]

회사 내규 기준:
[관련 규정의 내용과 적용 요건(규정명, 조항 등)을 상세히 설명. 내규에 없으면 "회사 내규에서 해당 사항을 확인하지 못했습니다"라고 표시.]

관련 법령:
[법령 확인이 필요한 경우 최신 법령명과 조문, 공식 출처를 정리. 내규로 충분한 단순 일상 안내는 간략히 또는 생략 가능]

참고 및 문의:
해석이 불명확하거나 개별 상황에 따른 최종 확인이 필요한 경우 아래 담당자에게 문의해 주시기 바랍니다.
- 인사담당자: ${hrContact.name} (${hrContact.department})
- 전화번호: ${hrContact.phone}
- 이메일: ${hrContact.email}

(단, 매우 단순하고 명확한 질문인 경우 가독성을 위해 불필요한 공란 없이 간결하게 핵심과 근거를 제공하세요.)`;

    const userMessageContent = `[질문]: ${maskedText}

[시스템이 검색한 회사 내규 검색 결과]:
${companyContextText}

위의 10대 원칙과 표준 답변 양식을 준수하여 성실하고 정확하게 답변해 주세요.`;

    try {
      const client = this.getClient();
      // Execute generateContent with Google Search Grounding tool enabled if setting is on
      const toolsConfig = settings.enableSearchGrounding ? [{ googleSearch: {} }] : [];

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          ...history.slice(-4).map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })),
          { role: 'user', parts: [{ text: userMessageContent }] },
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2, // Low temperature for high factual accuracy
          ...(toolsConfig.length > 0 ? { tools: toolsConfig } : {}),
        },
      });

      const responseText = response.text || '답변을 생성하지 못했습니다.';

      // Extract grounding sources from search tool if present
      const groundingSources: GroundingSource[] = [];
      const candidate = response.candidates?.[0];
      const metadata = candidate?.groundingMetadata;
      if (metadata && metadata.groundingChunks) {
        for (const chunk of metadata.groundingChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            groundingSources.push({
              title: chunk.web.title,
              url: chunk.web.uri,
            });
          }
        }
      }

      // Parse structured sections for enhanced UI display
      const structured = this.parseStructuredAnswer(responseText, hasCompanyMatches, companyCitations, groundingSources, hrContact);

      return {
        answerText: responseText,
        structured,
        hasPrivacyWarning: containsSensitive,
      };
    } catch (err: unknown) {
      console.error('Gemini API execution error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Local graceful fallback response when API key or network is unavailable
      return this.generateFallbackResponse(maskedText, hasCompanyMatches, searchResults, hrContact, containsSensitive, errorMessage);
    }
  }

  private parseStructuredAnswer(
    fullText: string,
    hasCompanyMatches: boolean,
    citations: CompanyCitation[],
    groundingSources: GroundingSource[],
    hrContact: AdminSettings['hrContact']
  ) {
    let summary = '';
    let companyDetails = '';
    let legalDetails = '';

    // Regex parsing of standard section headers
    const answerMatch = fullText.match(/답변:\s*([\s\S]*?)(?=(?:회사 내규 기준:|관련 법령:|참고 및 문의:|$))/i);
    const companyMatch = fullText.match(/회사 내규 기준:\s*([\s\S]*?)(?=(?:관련 법령:|참고 및 문의:|$))/i);
    const legalMatch = fullText.match(/관련 법령:\s*([\s\S]*?)(?=(?:참고 및 문의:|$))/i);

    if (answerMatch) {
      summary = answerMatch[1].trim();
    } else {
      summary = fullText.slice(0, 300).trim();
    }

    if (companyMatch) {
      companyDetails = companyMatch[1].trim();
    }

    if (legalMatch) {
      legalDetails = legalMatch[1].trim();
    }

    const companyNotFound = !hasCompanyMatches || companyDetails.includes('확인하지 못했습니다') || companyDetails.includes('확인되지 않았');

    return {
      summary: summary || fullText,
      companyStandard: {
        found: !companyNotFound,
        details: companyDetails || (hasCompanyMatches ? '내규 검색 내용 참조' : '회사 내규에서 해당 사항을 확인하지 못했습니다.'),
        citations,
      },
      legalStandard: legalDetails
        ? {
            required: true,
            details: legalDetails,
            sources: groundingSources,
          }
        : undefined,
      contactNotice: `인사담당자: ${hrContact.name} (${hrContact.phone})`,
    };
  }

  private generateFallbackResponse(
    question: string,
    hasMatches: boolean,
    searchResults: { chunk: import('../types/index.js').DocumentChunk; score: number }[],
    hrContact: AdminSettings['hrContact'],
    containsSensitive: boolean,
    _errorDetails: string
  ): ChatResponsePayload {
    if (hasMatches && searchResults.length > 0) {
      const top = searchResults[0].chunk;
      const citations: CompanyCitation[] = searchResults.map((r) => ({
        docTitle: r.chunk.docTitle,
        article: r.chunk.article,
        excerpt: r.chunk.content,
        score: r.score,
      }));

      const text = `질문: ${question}

답변:
회사 내규에 따른 안내를 드립니다.

회사 내규 기준:
[${top.docTitle} - ${top.article || '관련 조항'}]
${top.content}

관련 법령:
(시스템 연결 상태를 확인 중이며, 필요 시 고용노동부 공식 포털 moel.go.kr 또는 국가법령정보센터 law.go.kr을 참조하시기 바랍니다.)

참고 및 문의:
정확한 적용 및 개별 판단은 아래 인사담당자에게 문의 바랍니다.
인사담당자: ${hrContact.name}
전화번호: ${hrContact.phone}`;

      return {
        answerText: text,
        structured: {
          summary: `회사 내규 [${top.article || top.docTitle}] 규정에 따라 처리됩니다.`,
          companyStandard: {
            found: true,
            details: top.content,
            citations,
          },
          contactNotice: `인사담당자: ${hrContact.name} (${hrContact.phone})`,
        },
        hasPrivacyWarning: containsSensitive,
      };
    }

    const noRuleText = `질문: ${question}

답변:
질문하신 사항에 대하여 회사 내규에서 관련 내용을 확인하지 못했습니다.

회사 내규 기준:
회사 내규에서 해당 사항을 확인하지 못했습니다.

관련 법령:
근로기준법 등 관련 노동관계법령 또는 고용노동부 행정해석을 기준으로 처리될 수 있으며, 공식 법령 정보는 국가법령정보센터(law.go.kr)에서 확인하실 수 있습니다.

참고 및 문의:
세부적인 인사 처리 기준 및 확인은 인사담당자에게 직접 문의하여 주시기 바랍니다.
인사담당자: ${hrContact.name}
전화번호: ${hrContact.phone}`;

    return {
      answerText: noRuleText,
      structured: {
        summary: '회사 내규에서 관련 규정을 확인하지 못하여 담당자 확인이 필요합니다.',
        companyStandard: {
          found: false,
          details: '회사 내규에서 해당 사항을 확인하지 못했습니다.',
          citations: [],
        },
        contactNotice: `인사담당자: ${hrContact.name} (${hrContact.phone})`,
      },
      hasPrivacyWarning: containsSensitive,
    };
  }
}

export const geminiService = new GeminiService();
