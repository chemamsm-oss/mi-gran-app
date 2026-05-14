import { jsPDF } from 'jspdf';
import { ScoringResult, DiffChunk, TextType } from '../types';

export const generateResultsPDF = (
  results: ScoringResult,
  typedText: string,
  testType: TextType,
  originalText?: string
) => {
  const doc = new jsPDF();
  const marginLeft = 20;
  let cursorY = 20;

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Resultados de la Prueba de Transcripción', marginLeft, cursorY);
  
  cursorY += 15;

  // Subtitle
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, marginLeft, cursorY);
  cursorY += 8;
  doc.text(`Modo: ${testType === TextType.LIBRE ? 'Libre (RAE)' : 'Continuo (Copia exacta)'}`, marginLeft, cursorY);
  cursorY += 15;

  // Qualification BOX
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  
  if (results.isApt) {
    doc.setFillColor(235, 250, 235);
    doc.setDrawColor(100, 200, 100);
  } else {
    doc.setFillColor(250, 235, 235);
    doc.setDrawColor(200, 100, 100);
  }
  
  doc.roundedRect(marginLeft, cursorY, 170, 30, 3, 3, 'FD');
  
  // Qualification Text
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  if (results.isApt) {
    doc.setTextColor(34, 139, 34); // Green
    doc.text('APTO', marginLeft + 75, cursorY + 20);
  } else {
    doc.setTextColor(200, 50, 50); // Red
    doc.text('NO APTO', marginLeft + 65, cursorY + 20);
  }
  
  doc.setTextColor(0, 0, 0); // Black

  cursorY += 45;

  // Stats Grid
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estadísticas:', marginLeft, cursorY);
  cursorY += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Pulsaciones Brutas Totales: ${results.grossStrokes}`, marginLeft, cursorY);
  cursorY += 7;
  doc.text(`Pulsaciones Netas Finales: ${Math.round(results.netStrokes)}`, marginLeft, cursorY);
  cursorY += 7;
  doc.text(`Pulsaciones Por Minuto (PPM Netas): ${Math.round(results.strokesPerMinute)}`, marginLeft, cursorY);
  cursorY += 7;
  doc.text(`Tasa de Error: ${results.errorRate.toFixed(2)}%`, marginLeft, cursorY);
  cursorY += 7;
  doc.text(`Total de Errores: ${results.errorCount !== undefined ? results.errorCount : '-'}`, marginLeft, cursorY);
  cursorY += 7;
  doc.text(`Total de Penalizaciones: -${results.penalties}`, marginLeft, cursorY);
  cursorY += 7;

  if (!results.isApt && results.reason) {
    doc.setTextColor(200, 50, 50);
    doc.text(`Motivo principal de No Apto: ${results.reason}`, marginLeft, cursorY);
    doc.setTextColor(0, 0, 0);
    cursorY += 7;
  }

  cursorY += 15;

  // Typed Text Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Texto Escrito por el Usuario:', marginLeft, cursorY);
  cursorY += 10;

  // Original Text (Split into lines to avoid overflow)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const textLines = doc.splitTextToSize(typedText, 170);
  
  // Custom logic to handle page breaks inside text loop
  for (let i = 0; i < textLines.length; i++) {
    if (cursorY > 270) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(textLines[i], marginLeft, cursorY);
    cursorY += 5; // line height
  }
  
  // Save Document
  doc.save(`Resultado_Transcripcion_${new Date().getTime()}.pdf`);
};
