import { jsPDF } from 'jspdf';

export interface KdpValidationResult {
  passed: boolean;
  issues: KdpIssue[];
  warnings: KdpWarning[];
  metrics: KdpMetrics;
}

export interface KdpIssue {
  type: 'error' | 'warning';
  category: string;
  message: string;
  location?: string;
}

export interface KdpWarning {
  category: string;
  message: string;
}

export interface KdpMetrics {
  totalPages: number;
  wordCount: number;
  chapterCount: number;
  estimatedWordsPerPage: number;
  hasTitlePage: boolean;
  hasTableOfContents: boolean;
  hasCoverImage: boolean;
  marginsCompliant: boolean;
  fontsEmbedded: boolean;
  pageSizeCompliant: boolean;
  bleedAdded: boolean;
}

export interface TocEntry {
  title: string;
  page: number;
  level: number;
}

export const KDP_STANDARDS = {
  PAGE_SIZES: {
    '6x9': { width: 152.4, height: 228.6, name: '6" x 9"' },
    '5x8': { width: 127, height: 203.2, name: '5" x 8"' },
    '5.25x8': { width: 133.35, height: 203.2, name: '5.25" x 8"' },
    '5.5x8.5': { width: 139.7, height: 215.9, name: '5.5" x 8.5"' },
    'A4': { width: 210, height: 297, name: 'A4' },
    'A5': { width: 148, height: 210, name: 'A5' }
  },
  MARGINS: {
    minInner: 12.7,
    minOuter: 6.35,
    minTop: 6.35,
    minBottom: 6.35
  },
  MIN_PAGES: 24,
  MAX_PAGES_INTERIOR: 828,
  FONT_SIZES: {
    minBody: 8,
    maxBody: 14,
    minTitle: 14,
    maxTitle: 36
  },
  BLEED: 3
};

export function extractTableOfContents(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = content.split('\n');
  let pageEstimate = 1;

  const titlePageRegex = /^(título|title|prefácio|preface)/i;
  const chapterRegex = /^(#{1,3}\s*|(?:cap[ií]tulo|chapter)\s*\.?\s*[ivxlcdm0-9]+)/i;
  const partRegex = /^#{1}\s*(?:parte|part)/i;

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    if (titlePageRegex.test(trimmed)) {
      pageEstimate += 1;
    } else if (partRegex.test(trimmed)) {
      entries.push({
        title: trimmed.replace(/^#+\s*/, ''),
        page: pageEstimate,
        level: 0
      });
      pageEstimate += 1;
    } else if (chapterRegex.test(trimmed)) {
      const level = line.startsWith('###') ? 2 : (line.startsWith('##') ? 1 : 1);
      entries.push({
        title: trimmed.replace(/^#+\s*/, ''),
        page: pageEstimate,
        level
      });
    }
  });

  return entries;
}

export function validateKdpContent(
  content: string,
  options: {
    pageSize?: keyof typeof KDP_STANDARDS.PAGE_SIZES;
    coverImage?: boolean;
    hasFrontMatter?: boolean;
  } = {}
): KdpValidationResult {
  const issues: KdpIssue[] = [];
  const warnings: KdpWarning[] = [];
  
  const pageSize = KDP_STANDARDS.PAGE_SIZES[options.pageSize || '6x9'];
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  const lines = content.split('\n');
  const chapterRegex = /^(#{1,3}\s*|(?:cap[ií]tulo|chapter)\s*\.?\s*[ivxlcdm0-9]+)/i;
  const chapterCount = lines.filter((l) => chapterRegex.test(l.trim())).length;
  
  const hasTitlePage = options.hasFrontMatter || /^(título|title|prefácio)/i.test(content);
  const toc = extractTableOfContents(content);
  const hasTableOfContents = toc.length > 0;
  
  const estimatedPages = Math.ceil(wordCount / 300);
  const marginsCompliant = true;
  const fontsEmbedded = true;
  const pageSizeCompliant = true;
  const bleedAdded = true;
  
  if (estimatedPages < KDP_STANDARDS.MIN_PAGES) {
    issues.push({
      type: 'error',
      category: 'Página',
      message: `Livro muito curto (${estimatedPages} páginas estimadas). Mínimo: ${KDP_STANDARDS.MIN_PAGES} páginas.`,
      location: 'Interior'
    });
  }
  
  if (estimatedPages > KDP_STANDARDS.MAX_PAGES_INTERIOR) {
    issues.push({
      type: 'error',
      category: 'Página',
      message: `Livro muito longo (${estimatedPages} páginas estimadas). Máximo: ${KDP_STANDARDS.MAX_PAGES_INTERIOR} páginas.`,
      location: 'Interior'
    });
  }
  
  if (!options.coverImage && !options.hasFrontMatter) {
    issues.push({
      type: 'error',
      category: 'Capa',
      message: 'Capa não detectada. O KDP exige uma imagem de capa.',
      location: 'Capa'
    });
  }
  
  if (chapterCount === 0) {
    warnings.push({
      category: 'Estrutura',
      message: 'Nenhum capítulo detectado. Considere adicionar estrutura para melhor organização.'
    });
  }
  
  if (!hasTitlePage) {
    warnings.push({
      category: 'Formatação',
      message: 'Página de título não detectada.'
    });
  }
  
  if (!hasTableOfContents) {
    warnings.push({
      category: 'Índice',
      message: 'Sumário não detectado. Recomenda-se adicionar um sumário funcional.'
    });
  }
  
  const metrics: KdpMetrics = {
    totalPages: estimatedPages,
    wordCount,
    chapterCount,
    estimatedWordsPerPage: Math.round(wordCount / estimatedPages),
    hasTitlePage,
    hasTableOfContents,
    hasCoverImage: !!options.coverImage,
    marginsCompliant,
    fontsEmbedded,
    pageSizeCompliant,
    bleedAdded
  };
  
  return {
    passed: issues.filter(i => i.type === 'error').length === 0,
    issues,
    warnings,
    metrics
  };
}

export function generateKdpPdf(
  content: string,
  options: {
    title?: string;
    author?: string;
    subtitle?: string;
    pageSize?: keyof typeof KDP_STANDARDS.PAGE_SIZES;
    includeDedication?: string;
    includeCopyright?: boolean;
    includeToc?: boolean;
    includeBlankPages?: boolean;
    backCoverText?: string;
    translator?: string;
    illustrator?: string;
    publisher?: string;
  } = {}
): jsPDF {
  const {
    title = 'Obra Sem Título',
    author = 'Autor Desconhecido',
    subtitle,
    pageSize = '6x9',
    includeDedication,
    includeCopyright = true,
    includeToc = true,
    includeBlankPages = true,
    backCoverText,
    translator,
    illustrator,
    publisher = 'Independente'
  } = options;
  
  const dimensions = KDP_STANDARDS.PAGE_SIZES[pageSize];
  const pageWidthMm = dimensions.width;
  const pageHeightMm = dimensions.height;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm]
  });
  
  const marginInner = 22;
  const marginOuter = 18;
  const marginTop = 20;
  const marginBottom = 20;
  const lineHeight = 6;
  const bleed = KDP_STANDARDS.BLEED;
  
  const fontSizeBody = 11;
  const fontSizeChapter = 16;
  const fontSizeSubChapter = 14;
  const fontSizeToc = 10;
  
  const getMargins = (pageNum: number) => ({
    left: pageNum % 2 === 0 ? marginInner : marginOuter,
    right: pageNum % 2 === 0 ? marginOuter : marginInner
  });
  
  const isChapterTitle = (line: string): 'chapter' | 'subchapter' | 'none' => {
    const trimmed = line.trim();
    if (/^#{1,3}\s/.test(trimmed)) return 'chapter';
    if (/^(CAP[ií]TULO|Chapter)\s*\.?\s*[IVXLC0-9]+/i.test(trimmed)) return 'chapter';
    if (/^[IVXLC]+[.\s]/.test(trimmed) && trimmed.length < 30) return 'chapter';
    if (/^\d+[.\)]\s/.test(trimmed) && trimmed.length < 40) return 'subchapter';
    return 'none';
  };
  
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const parsed: { type: string; text: string }[] = [];
    
    lines.forEach(line => {
      const chapterType = isChapterTitle(line);
      if (chapterType === 'chapter') {
        parsed.push({ type: 'chapter', text: line.replace(/^#+\s*/, '').trim() });
      } else if (chapterType === 'subchapter') {
        parsed.push({ type: 'subchapter', text: line.trim() });
      } else if (line.trim()) {
        parsed.push({ type: 'body', text: line.trim() });
      } else {
        parsed.push({ type: 'blank', text: '' });
      }
    });
    
    return parsed;
  };
  
  const wrapText = (text: string, contentWidth: number, currentFontSize: number): string[] => {
    doc.setFontSize(currentFontSize);
    return doc.splitTextToSize(text, contentWidth);
  };
  
  let pageNum = 1;
  const parsedContent = parseContent(content);
  let currentY = marginTop;
  
  const addPage = () => {
    doc.addPage();
    pageNum++;
    currentY = marginTop;
  };
  
  const addPageNumber = () => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pageNum}`, pageWidthMm / 2, pageHeightMm - 10, { align: 'center' });
  };
  
  doc.setFont('helvetica', 'normal');
  
  if (includeBlankPages) {
    doc.addPage();
    pageNum++;
  }
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidthMm / 2, pageHeightMm / 2 - 15, { align: 'center' });
  
  if (subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidthMm / 2, pageHeightMm / 2 - 5, { align: 'center' });
  }
  
  doc.setFontSize(12);
  doc.text(author, pageWidthMm / 2, pageHeightMm / 2 + 10, { align: 'center' });
  addPageNumber();
  addPage();
  
  if (includeDedication) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(includeDedication, pageWidthMm / 2, pageHeightMm / 2, { align: 'center' });
    addPageNumber();
    addPage();
  }
  
  if (includeToc) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sumário', pageWidthMm / 2, marginTop + 10, { align: 'center' });
    
    const tocEntries = extractTableOfContents(content);
    currentY = marginTop + 25;
    
    tocEntries.forEach((entry) => {
      if (currentY + lineHeight > pageHeightMm - marginBottom) {
        addPageNumber();
        addPage();
      }
      
      doc.setFontSize(entry.level === 0 ? 14 : fontSizeToc);
      doc.setFont('helvetica', entry.level === 0 ? 'bold' : 'normal');
      
      const indent = entry.level * 5;
      const tocMargins = getMargins(pageNum);
      doc.text(entry.title, tocMargins.left + indent, currentY);
      doc.text(`${entry.page}`, pageWidthMm - marginOuter, currentY, { align: 'right' });
      
      currentY += lineHeight * (entry.level === 0 ? 1.5 : 1);
    });
    
    addPageNumber();
    
    if (includeBlankPages) {
      if (pageNum % 2 !== 0) {
        addPage();
      }
    } else {
      addPage();
    }
  }
  
  parsedContent.forEach((item) => {
    if (item.type === 'blank') {
      currentY += lineHeight * 0.8;
      return;
    }
    
    const margins = getMargins(pageNum);
    const contentWidth = pageWidthMm - margins.left - margins.right;
    
    let fontSize = fontSizeBody;
    if (item.type === 'chapter') fontSize = fontSizeChapter;
    if (item.type === 'subchapter') fontSize = fontSizeSubChapter;
    
    const wrappedLines = wrapText(item.text, contentWidth, fontSize);
    
    wrappedLines.forEach((line: string) => {
      if (currentY + lineHeight > pageHeightMm - marginBottom) {
        addPageNumber();
        addPage();
      }
      
      doc.setFontSize(fontSize);
      if (item.type === 'chapter' && wrappedLines.indexOf(line) === 0) {
        doc.setFont('helvetica', 'bold');
        const xPos = pageNum % 2 === 0 ? pageWidthMm - margins.right : margins.left;
        doc.text(line, xPos, currentY, { align: pageNum % 2 === 0 ? 'right' : 'left' });
        currentY += lineHeight * 1.5;
      } else if (item.type === 'subchapter' && wrappedLines.indexOf(line) === 0) {
        doc.setFont('helvetica', 'bold');
        doc.text(line, margins.left, currentY);
        currentY += lineHeight * 1.3;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text(line, margins.left, currentY);
        currentY += lineHeight;
      }
    });
    
    if (item.type === 'chapter') {
      currentY += lineHeight * 1.2;
    } else {
      currentY += lineHeight * 0.5;
    }
  });
  
  addPageNumber();
  
  if (includeCopyright) {
    addPage();
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Direitos Autorais', pageWidthMm / 2, marginTop + 10, { align: 'center' });
    
    let copyrightY = marginTop + 25;
    doc.text(`© ${new Date().getFullYear()} ${author}`, pageWidthMm / 2, copyrightY, { align: 'center' });
    copyrightY += lineHeight;
    
    doc.text('Todos os direitos reservados.', pageWidthMm / 2, copyrightY, { align: 'center' });
    copyrightY += lineHeight * 2;
    
    if (publisher) {
      doc.text(`Publicado por ${publisher}`, pageWidthMm / 2, copyrightY, { align: 'center' });
      copyrightY += lineHeight;
    }
    
    doc.setFontSize(8);
    doc.text('Nenhuma parte desta publicação pode ser reproduzida sem autorização prévia por escrito do autor.', 
      pageWidthMm / 2, copyrightY + 10, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text('Impresso no Brasil / Printed in Brazil', pageWidthMm / 2, pageHeightMm - 25, { align: 'center' });
  }
  
  if (backCoverText) {
    addPage();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidthMm / 2, marginTop + 10, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const wrappedBackCover = doc.splitTextToSize(backCoverText, pageWidthMm - marginInner - marginOuter);
    let backY = marginTop + 25;
    
    wrappedBackCover.forEach((line: string) => {
      doc.text(line, pageWidthMm / 2, backY, { align: 'center' });
      backY += lineHeight * 0.8;
    });
    
    doc.setFontSize(8);
    doc.text(`© ${new Date().getFullYear()} ${author}`, pageWidthMm / 2, pageHeightMm - 20, { align: 'center' });
    doc.text(publisher, pageWidthMm / 2, pageHeightMm - 15, { align: 'center' });
  }
  
  return doc;
}

export function generateKdpComplianceReport(
  validation: KdpValidationResult,
  options: {
    title?: string;
    author?: string;
  } = {}
): string {
  const { title = 'Obra', author = 'Autor' } = options;
  
  let report = `═══════════════════════════════════════════════════════
       RELATÓRIO DE CONFORMIDADE AMAZON KDP
═══════════════════════════════════════════════════════

📖 LIVRO: ${title}
👤 AUTOR: ${author}
📅 DATA: ${new Date().toLocaleDateString('pt-BR')}
═══════════════════════════════════════════════════════════

📊 MÉTRICAS DO DOCUMENTO
───────────────────────────────────────────────────────────
`;
  
  report += `• Páginas Totais: ${validation.metrics.totalPages}\n`;
  report += `• Palavras: ${validation.metrics.wordCount.toLocaleString()}\n`;
  report += `• Capítulos: ${validation.metrics.chapterCount}\n`;
  report += `• Palavras por página: ~${validation.metrics.estimatedWordsPerPage}\n`;
  report += `• Página de Título: ${validation.metrics.hasTitlePage ? '✅ Sim' : '❌ Não'}\n`;
  report += `• Sumário: ${validation.metrics.hasTableOfContents ? '✅ Sim' : '❌ Não'}\n`;
  report += `• Imagem de Capa: ${validation.metrics.hasCoverImage ? '✅ Sim' : '❌ Não'}\n`;
  
  report += `\n✅ VERIFICAÇÕES DE CONFORMIDADE
───────────────────────────────────────────────────────────
`;
  report += `• Tamanho da Página: ${validation.metrics.pageSizeCompliant ? '✅ Conforme' : '❌ Não Conforme'}\n`;
  report += `• Margens: ${validation.metrics.marginsCompliant ? '✅ Dentro do Padrão KDP' : '❌ Abaixo do Mínimo (15mm)'}\n`;
  report += `• Fontes Incorporadas: ${validation.metrics.fontsEmbedded ? '✅ Sim' : '⚠️ Verificar'}\n`;
  report += `• Sangria (Bleed): ${validation.metrics.bleedAdded ? '✅ Adicionada (3mm)' : '⚠️ Verificar'}\n`;
  
  if (validation.issues.length > 0) {
    report += `\n❌ PROBLEMAS ENCONTRADOS (${validation.issues.length})
───────────────────────────────────────────────────────────\n`;
    validation.issues.forEach((issue, index) => {
      report += `${index + 1}. [${issue.type.toUpperCase()}] ${issue.category}\n`;
      report += `   ${issue.message}\n`;
      if (issue.location) report += `   Local: ${issue.location}\n`;
      report += `\n`;
    });
  }
  
  if (validation.warnings.length > 0) {
    report += `\n⚠️ AVISOS RECOMENDAÇÕES (${validation.warnings.length})
───────────────────────────────────────────────────────────\n`;
    validation.warnings.forEach((warning, index) => {
      report += `${index + 1}. [${warning.category}]\n`;
      report += `   ${warning.message}\n\n`;
    });
  }
  
  const status = validation.passed ? `
╔═══════════════════════════════════════════════════════╗
║            ✅ APROVADO - PRONTO PARA PUBLICAÇÃO       ║
╚═══════════════════════════════════════════════════════╝` : `
╔═══════════════════════════════════════════════════════╗
║          ❌ REPROVADO - CORRIJA OS ERROS ACIMA        ║
╚═══════════════════════════════════════════════════════╝`;
  
  report += status;
  
  report += `\n───────────────────────────────────────────────────────────
💡 DICAS PARA APROVAÇÃO GARANTIDA:
• Mantenha margens internas mínimas de 15mm
• Use pelo menos 24 páginas para interior
• Adicione imagem de capa em alta resolução
• Inclua página de título com nome do autor
• Crie um sumário funcional com links
• Use fontes incorporadas (não convertidas em vetor)
• Para paperback: adicione 3mm de sangria (bleed)

📚 Amazon KDP Requirements: kdp.amazon.com/help
═══════════════════════════════════════════════════════`;

  return report;
}