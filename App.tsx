
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AppState, ScoringResult, TextType, TestRecord } from './types';
import { generateLegislativeText, analyzeFreeText } from './services/gemini';
import { calculateFinalScore, calculateFreeWritingScore, countStrokes } from './utils/scoring';
import Timer from './components/Timer';
import Editor from './components/Editor';
import Metronome from './components/Metronome';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.INITIAL);
  const [selectedType, setSelectedType] = useState<TextType>(TextType.PLANO);
  const [originalText, setOriginalText] = useState('');
  const [customTextInput, setCustomTextInput] = useState('');
  const [typedText, setTypedText] = useState('');
  const [results, setResults] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [history, setHistory] = useState<TestRecord[]>(() => {
    const saved = localStorage.getItem('mecacortes_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mecacortes_history', JSON.stringify(history));
  }, [history]);

  const startTest = async () => {
    if (selectedType === TextType.LIBRE) {
      setOriginalText('');
      setTypedText('');
      setHasStartedTyping(false);
      setStartTime(null);
      setState(AppState.TESTING);
      return;
    }

    setLoading(true);
    setState(AppState.GENERATING);
    try {
      const text = await generateLegislativeText(selectedType);
      setOriginalText(text);
      setTypedText('');
      setHasStartedTyping(false);
      setStartTime(null);
      setState(AppState.TESTING);
    } catch (err) {
      alert("Error al conectar con el Tribunal (IA). Inténtalo de nuevo.");
      setState(AppState.INITIAL);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = useCallback(() => {
    setState(AppState.REVIEWING);
  }, []);

  const calculateResults = useCallback(async () => {
    setIsCalculating(true);
    try {
      if (selectedType === TextType.LIBRE) {
        // Timeout de 90 segundos para la auditoría IA
        const auditPromise = analyzeFreeText(typedText);
        const timeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 90000)
        );
        
        try {
            const auditErrors = await Promise.race([auditPromise, timeoutPromise]);
            const finalResults = calculateFreeWritingScore(typedText, auditErrors, 600);
            setResults(finalResults);
            saveToHistory(finalResults);
        } catch (e) {
            console.warn("AI Audit timed out or failed, falling back to basic score");
            alert("La auditoría detallada está tardando demasiado. Mostrando resultados básicos de velocidad y pulsaciones.");
            const basicResults = calculateFreeWritingScore(typedText, [], 600);
            setResults(basicResults);
            saveToHistory(basicResults);
        }
      } else {
        const finalResults = calculateFinalScore(originalText, typedText, 600); 
        setResults(finalResults);
        saveToHistory(finalResults);
      }
      setState(AppState.RESULTS);
    } catch (error) {
      alert("El sistema de corrección ha fallado. Reintentando...");
    } finally {
      setIsCalculating(false);
    }
  }, [originalText, typedText, selectedType]);

  const saveToHistory = (res: ScoringResult) => {
    const newRecord: TestRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: selectedType,
      isApt: res.isApt,
      reason: res.reason,
      netStrokes: res.netStrokes,
      grossStrokes: res.grossStrokes,
      errorRate: res.errorRate,
      strokesPerMinute: res.strokesPerMinute,
      timeSpent: res.timeSpent
    };
    setHistory(prev => [newRecord, ...prev]);
  };

  const handleTyping = (text: string) => {
    if (!hasStartedTyping && text.length > 0) {
      setHasStartedTyping(true);
      setStartTime(Date.now());
    }
    setTypedText(text);
  };

  const grossPPM = useMemo(() => {
    if (!startTime || !hasStartedTyping) return 0;
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / 60000;
    if (elapsedMinutes < 0.05) return 0; 
    const gross = countStrokes(typedText);
    return Math.round(gross / elapsedMinutes);
  }, [typedText, startTime, hasStartedTyping]);

  const wordCount = useMemo(() => {
    return typedText.trim() === "" ? 0 : typedText.trim().split(/\s+/).length;
  }, [typedText]);

  const reset = () => {
    setState(AppState.INITIAL);
    setTypedText('');
    setOriginalText('');
    setResults(null);
    setHasStartedTyping(false);
    setIsCalculating(false);
  };

  const renderHistory = () => {
    if (history.length === 0) return null;
    
    const totalTests = history.length;
    const totalSeconds = history.reduce((acc, curr) => acc + (curr.timeSpent || 600), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return (
      <div id="historial-pruebas" className="max-w-5xl mx-auto mt-24">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-xl font-black text-[#2b579a] uppercase tracking-widest flex items-center mb-4">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Historial de Pruebas
            </h3>
            <div className="flex space-x-6">
              <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="w-10 h-10 bg-blue-50 text-[#2b579a] rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pruebas Totales</div>
                  <div className="text-xl font-black text-gray-800">{totalTests}</div>
                </div>
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiempo Invertido</div>
                  <div className="text-xl font-black text-gray-800">{hours}h {minutes}m</div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setHistory([])} className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-widest bg-red-50 px-4 py-2 rounded-full transition-colors h-fit">
            Borrar Historial
          </button>
        </div>
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="p-6 font-black">Fecha y Hora</th>
                <th className="p-6 font-black">Modo</th>
                <th className="p-6 font-black">Resultado</th>
                <th className="p-6 font-black text-right">Netas</th>
                <th className="p-6 font-black text-right">Errores</th>
              </tr>
            </thead>
            <tbody>
              {history.map(record => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-6 text-sm font-bold text-gray-700">
                    {new Date(record.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-6 text-xs font-bold text-gray-500 uppercase">
                    {record.type}
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-start">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${record.isApt ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {record.isApt ? 'APTO' : 'NO APTO'}
                      </span>
                      {!record.isApt && record.reason && (
                        <span className="text-[10px] text-red-500 font-bold mt-2 max-w-[200px] leading-tight">
                          * {record.reason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-right font-black text-[#2b579a]">
                    {Math.round(record.netStrokes)}
                  </td>
                  <td className="p-6 text-right text-sm font-bold text-gray-500">
                    {record.errorRate.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#f3f2f1] overflow-hidden">
      {/* Header word-style */}
      <header className="bg-[#2b579a] text-white py-2 px-6 flex justify-between items-center shadow-lg z-50 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-white text-[#2b579a] p-1.5 rounded-lg shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter uppercase">MecaCortes Pro</h1>
            <p className="text-[9px] opacity-70 font-bold uppercase tracking-[0.2em]">Cortes Generales de España</p>
          </div>
        </div>

        {state === AppState.TESTING && (
          <div className="flex items-center space-x-10">
             <div className="hidden sm:flex items-center space-x-8">
                <div className="text-center">
                   <span className="block text-[8px] font-black uppercase text-white/50 tracking-widest mb-0.5">Pulsaciones</span>
                   <span className="text-xl font-black leading-none">{countStrokes(typedText)}</span>
                </div>
                <div className="text-center border-l border-white/20 pl-8">
                   <span className="block text-[8px] font-black uppercase text-white/50 tracking-widest mb-0.5">Palabras</span>
                   <span className="text-xl font-black leading-none">{wordCount}</span>
                </div>
                <div className="text-center border-l border-white/20 pl-8">
                   <span className="block text-[8px] font-black uppercase text-white/50 tracking-widest mb-0.5">Brutas/Min</span>
                   <span className="text-xl font-black leading-none text-yellow-300">{grossPPM}</span>
                </div>
             </div>
             
             <Metronome isPlaying={state === AppState.TESTING && hasStartedTyping} />

             <Timer 
               initialSeconds={600} 
               onTimeUp={handleFinish} 
               isActive={state === AppState.TESTING} 
               isPaused={!hasStartedTyping} 
             />
             <button onClick={handleFinish} className="bg-white text-[#2b579a] hover:bg-gray-100 px-5 py-2 rounded-lg font-black text-xs shadow-md transition-all active:scale-95">FINALIZAR</button>
          </div>
        )}

        {state === AppState.REVIEWING && (
          <button disabled={isCalculating} onClick={calculateResults} className="bg-green-500 text-white hover:bg-green-600 px-10 py-2.5 rounded-full font-black text-sm shadow-xl flex items-center transition-all animate-pulse">
             {isCalculating ? (
                <div className="flex flex-col items-end">
                  <div className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SISTEMA DE CORRECCIÓN ACTIVO...
                  </div>
                  <span className="text-[8px] opacity-60 font-medium tracking-widest mt-1">AUDITORÍA RAE EN CURSO</span>
                </div>
              ) : 'OBTENER CALIFICACIÓN'}
          </button>
        )}

        {state === AppState.RESULTS && (
          <div className="flex items-center space-x-4">
            <button onClick={() => {
              const historyEl = document.getElementById('historial-pruebas');
              if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth' });
            }} className="bg-white/10 text-white hover:bg-white/20 px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase transition-colors border border-white/20">
              Ver Historial
            </button>
            <button onClick={reset} className="bg-white text-[#2b579a] hover:bg-gray-100 px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase">Nuevo Examen</button>
          </div>
        )}

        {state === AppState.INITIAL && history.length > 0 && (
          <div className="flex items-center space-x-4">
            <button onClick={() => {
              const historyEl = document.getElementById('historial-pruebas');
              if (historyEl) historyEl.scrollIntoView({ behavior: 'smooth' });
            }} className="bg-white/10 text-white hover:bg-white/20 px-6 py-2 rounded-full font-black text-xs tracking-widest uppercase transition-colors border border-white/20">
              Ver Historial
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto bg-[#f3f2f1]">
        {state === AppState.INITIAL && (
          <div className="max-w-6xl mx-auto py-16 px-6">
            <div className="text-center mb-16">
              <div className="inline-block bg-[#2b579a] text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.3em] mb-6 shadow-sm">SIMULADOR OFICIAL</div>
              <h2 className="text-7xl font-black text-gray-900 mb-6 tracking-tighter leading-tight">Prueba de <br/>Transcripción</h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed italic">Certificado para la preparación de las oposiciones a las Cortes Generales.</p>
            </div>

            <div className="flex justify-center gap-6 mb-16">
               {[
                 { id: TextType.PLANO, title: 'Continuo', desc: 'Textos oficiales sin formato.', icon: '📜' },
                 { id: TextType.LIBRE, title: 'Libre (RAE)', desc: 'Auditoría IA desde libro.', icon: '🚀' }
               ].map((type) => (
                 <button 
                   key={type.id}
                   onClick={() => setSelectedType(type.id)}
                   className={`p-8 rounded-[2.5rem] border-2 text-left transition-all duration-300 w-64 ${
                     selectedType === type.id 
                     ? 'bg-white border-[#2b579a] shadow-2xl scale-105 ring-8 ring-[#2b579a]/5' 
                     : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-lg'
                   }`}
                 >
                   <div className="text-5xl mb-6 drop-shadow-sm">{type.icon}</div>
                   <h3 className={`text-lg font-black mb-2 uppercase tracking-tight ${selectedType === type.id ? 'text-[#2b579a]' : 'text-gray-700'}`}>{type.title}</h3>
                   <p className="text-xs text-gray-400 font-bold uppercase opacity-80 leading-tight">{type.desc}</p>
                 </button>
               ))}
            </div>

            {selectedType === TextType.LIBRE && (
              <div className="max-w-4xl mx-auto mb-16 p-12 rounded-[4rem] bg-gradient-to-br from-[#2b579a] to-[#1e3e6d] text-white shadow-2xl relative overflow-hidden group border border-white/10">
                  <div className="absolute -right-20 -bottom-20 opacity-10 transform rotate-12 group-hover:scale-125 transition-transform duration-1000">
                    <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  </div>
                  <h3 className="text-3xl font-black mb-4 flex items-center">
                    <span className="bg-white/20 p-3 rounded-2xl mr-5 shadow-lg">🚀</span>
                    MÉTODO DE ESCRITURA LIBRE
                  </h3>
                  <p className="text-lg text-blue-100 font-medium leading-relaxed opacity-90 mb-8 max-w-2xl">
                    Ideal para practicar con un <b>libro físico</b>. Escribe directamente sin texto en pantalla. Al finalizar, el sistema realizará una <b>Auditoría RAE</b> completa para calcular tus penalizaciones oficiales.
                  </p>
                  <div className="flex space-x-4">
                    <div className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20">
                       <span className="block text-[8px] font-black uppercase text-blue-200 tracking-widest">Tecnología</span>
                       <span className="text-xs font-bold">GEMINI FLASH RAE</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/20">
                       <span className="block text-[8px] font-black uppercase text-blue-200 tracking-widest">Criterio</span>
                       <span className="text-xs font-bold">CORTES GENERALES</span>
                    </div>
                  </div>
              </div>
            )}

            <div className="flex justify-center space-x-8 mb-16">
               <div className="bg-white px-10 py-8 rounded-[2.5rem] border border-gray-100 shadow-xl w-56 text-center transform transition hover:scale-105">
                  <div className="text-4xl font-black text-[#2b579a]">2.500</div>
                  <div className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Mínimo Netas</div>
               </div>
               <div className="bg-white px-10 py-8 rounded-[2.5rem] border border-gray-100 shadow-xl w-56 text-center transform transition hover:scale-105">
                  <div className="text-4xl font-black text-[#2b579a]">10 MIN</div>
                  <div className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Tiempo Oficial</div>
               </div>
               <div className="bg-white px-10 py-8 rounded-[2.5rem] border border-gray-100 shadow-xl w-56 text-center transform transition hover:scale-105">
                  <div className="text-4xl font-black text-[#2b579a]">RAE</div>
                  <div className="text-[10px] uppercase font-black text-gray-400 mt-2 tracking-widest">Auditoría IA</div>
               </div>
            </div>

            <div className="text-center">
              <button 
                onClick={startTest} 
                disabled={loading}
                className={`bg-[#2b579a] hover:bg-[#1e3e6d] text-white px-24 py-8 rounded-[2.5rem] font-black text-3xl shadow-2xl transform transition hover:-translate-y-2 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
              >
                COMENZAR EXAMEN
              </button>
            </div>

            {renderHistory()}
          </div>
        )}

        {state === AppState.GENERATING && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-gray-200 border-t-[#2b579a] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <svg className="w-8 h-8 text-[#2b579a] animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              </div>
            </div>
            <p className="mt-8 text-gray-400 font-black uppercase tracking-[0.5em] text-xs">Instanciando Tribunal...</p>
          </div>
        )}

        {(state === AppState.TESTING || state === AppState.REVIEWING) && (
          <div className="h-full overflow-hidden relative">
            <Editor 
              originalText={originalText} 
              typedText={typedText} 
              onChange={handleTyping} 
              disabled={state === AppState.REVIEWING} 
              isPaused={state === AppState.TESTING && !hasStartedTyping}
              showReference={selectedType !== TextType.LIBRE} 
            />
            
            {state === AppState.REVIEWING && !results && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/20 transform animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase">¡TIEMPO AGOTADO!</h2>
                  <p className="text-gray-500 font-medium text-lg mb-8 leading-relaxed">
                    El tribunal ha dado por finalizada la prueba. Tu texto ha sido bloqueado y está listo para ser calificado.
                  </p>

                  <div className="bg-gray-50 rounded-3xl p-8 mb-10 border border-gray-100 shadow-inner">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Pulsaciones Brutas Registradas</span>
                    <span className="text-6xl font-black text-[#2b579a] tracking-tighter">{countStrokes(typedText)}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={reset}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-6 rounded-2xl font-black text-xl transition-all active:scale-95 border border-gray-200"
                    >
                      NUEVO EXAMEN
                    </button>

                    <button 
                      onClick={calculateResults}
                      disabled={isCalculating}
                      className={`flex-[2] py-6 rounded-2xl font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 bg-[#2b579a] hover:bg-[#1e3e6d] text-white`}
                    >
                      {isCalculating ? (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center mb-2">
                            <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            PROCESANDO...
                          </div>
                          <span className="text-[10px] font-medium opacity-60 animate-pulse">La auditoría RAE puede tardar hasta 90 segundos</span>
                        </div>
                      ) : (
                        'ANALIZAR RESULTADOS'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {state === AppState.RESULTS && results && (
          <div className="max-w-[1500px] mx-auto px-6 py-16 pb-64">
            {/* ACTA OFICIAL CARD */}
            <div className={`mb-16 p-12 rounded-[4rem] shadow-2xl bg-white border-l-[32px] flex flex-col xl:flex-row items-center justify-between relative overflow-hidden ${results.isApt ? 'border-green-500' : 'border-red-600'}`}>
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                 <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              </div>

              <div className="flex items-center space-x-16 mb-12 xl:mb-0 relative z-10">
                <div className={`p-10 rounded-[2.5rem] shadow-lg ${results.isApt ? 'bg-green-100 text-green-600 ring-8 ring-green-50' : 'bg-red-100 text-red-600 ring-8 ring-red-50'}`}>
                   {results.isApt ? <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                </div>
                <div>
                  <div className="text-[12px] font-black uppercase text-gray-400 tracking-[0.4em] mb-2">Tribunal de Oposiciones</div>
                  <h2 className={`text-8xl font-black ${results.isApt ? 'text-green-900' : 'text-red-900'} tracking-tighter leading-none mb-2`}>{results.isApt ? 'APTO' : 'NO APTO'}</h2>
                  {!results.isApt && results.reason && (
                    <div className="text-red-600 font-bold text-sm mb-6 bg-red-50 inline-block px-4 py-2 rounded-lg border border-red-100">
                      * {results.reason}
                    </div>
                  )}
                  {results.isApt && <div className="mb-6"></div>}
                  <div className="flex space-x-12">
                    <div className="flex flex-col">
                        <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">Pulsaciones Netas</span>
                        <span className={`text-5xl font-black ${results.isApt ? 'text-green-600' : 'text-red-600'}`}>{Math.round(results.netStrokes)}</span>
                    </div>
                    <div className="flex flex-col border-l border-gray-100 pl-12">
                        <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">Tasa de Error</span>
                        <span className={`text-5xl font-black ${results.errorRate > 3 ? 'text-orange-500' : 'text-gray-800'}`}>{results.errorRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex flex-col border-l border-gray-100 pl-12">
                        <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">PPM Netas</span>
                        <span className="text-5xl font-black text-gray-900">{Math.round(results.strokesPerMinute)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 relative z-10">
                 <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 text-center min-w-[220px] shadow-inner">
                    <span className="block text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">Brutas Totales</span>
                    <span className="text-3xl font-black text-gray-700">{results.grossStrokes}</span>
                 </div>
                 <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 text-center min-w-[220px] shadow-inner">
                    <span className="block text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">Penalizaciones</span>
                    <span className="text-3xl font-black text-red-600">-{results.penalties}</span>
                 </div>
              </div>
            </div>

            {/* PENALTY LEGEND */}
            <div className="mb-16 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center space-x-6">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                        <span className="font-black text-lg">5</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Error Simple (1 car.)</div>
                        <div className="text-sm font-bold text-gray-700">-5 pulsaciones</div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center space-x-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                        <span className="font-black text-lg">1</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inversión (2 letras)</div>
                        <div className="text-sm font-bold text-gray-700">-1 pulsación</div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center space-x-6">
                    <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 shrink-0">
                        <span className="font-black text-lg">N</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Error Múltiple</div>
                        <div className="text-sm font-bold text-gray-700">-1 por carácter afectado</div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center space-x-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 shrink-0">
                        <span className="font-black text-lg">P</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Palabra Omitida/Extra</div>
                        <div className="text-sm font-bold text-gray-700">Total de sus pulsaciones</div>
                    </div>
                </div>
            </div>

            {/* ERROR REPORT BOX */}
            <div className="bg-white rounded-[4rem] shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-[#2b579a] px-12 py-8 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-black uppercase text-sm tracking-[0.3em] flex items-center">
                        <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Informe Técnico de Revisión {selectedType === TextType.LIBRE ? '(Auditoría RAE)' : '(Cotejo Oficial)'}
                    </h3>
                    <div className="flex items-center space-x-6">
                       <div className="h-8 w-px bg-white/20"></div>
                       <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Cortes Generales</span>
                    </div>
                </div>
                <div className="p-12 md:p-20 font-serif text-[12pt] leading-[2.2] text-gray-800 text-justify bg-white min-h-[500px]">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                        {results.diffMarkup.map((chunk, i) => (
                            chunk.type === 'match' ? (
                                <span key={i} className="mb-1">{chunk.typed}</span>
                            ) : (
                                <span key={i} className={`border-b-[4px] px-1 mb-1 group relative cursor-help inline-block rounded-md transition-all duration-300 ${
                                  chunk.type === 'inclusion' ? 'bg-orange-50 text-orange-700 border-orange-400' : 
                                  chunk.type === 'omission' ? 'bg-gray-50 text-gray-300 border-gray-200 italic' :
                                  chunk.type === 'inversion' ? 'bg-yellow-50 text-yellow-700 border-yellow-400' :
                                  chunk.type === 'substitution' ? 'bg-red-50 text-red-700 border-red-400' :
                                  'bg-red-50 text-red-700 border-red-400'
                                }`}>
                                    {chunk.typed}
                                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-8 p-8 bg-[#1a1c1e] text-white rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] z-[100] w-80 text-center font-sans normal-case leading-snug text-xs border border-white/10 transition-all duration-300 transform scale-95 group-hover:scale-100">
                                        <div className="text-[10px] text-blue-400 uppercase font-black mb-3 tracking-[0.3em] border-b border-white/10 pb-3">
                                          {chunk.type === 'spelling' ? 'Error Normativo RAE' : chunk.type === 'inclusion' ? 'Palabra No Presente' : chunk.type === 'omission' ? 'Omisión Crítica' : chunk.type === 'inversion' ? 'Inversión Detectada' : chunk.type === 'substitution' ? 'Errata Detectada' : 'Discrepancia de Texto'}
                                        </div>
                                        <div className="font-bold text-white text-base mb-3 italic">
                                          {chunk.type === 'spelling' ? `Debía ser: "${chunk.original}"` : chunk.type === 'inclusion' ? `Sobran caracteres` : chunk.type === 'omission' ? `Faltaba: "${chunk.original}"` : chunk.type === 'inversion' ? `Inversión: "${chunk.original}"` : `Original: "${chunk.original}"`}
                                        </div>
                                        {chunk.penalty !== undefined && chunk.penalty > 0 && (
                                          <div className="bg-red-500/20 text-red-400 font-black text-[10px] py-2 px-4 rounded-full inline-block mb-4 border border-red-500/30">
                                            PENALIZACIÓN: -{chunk.penalty} PUNTOS
                                          </div>
                                        )}
                                        {chunk.reason && <div className="text-[11px] text-gray-400 mt-4 font-medium bg-white/5 p-4 rounded-2xl border border-white/5 italic">"{chunk.reason}"</div>}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-[#1a1c1e]"></div>
                                    </div>
                                </span>
                            )
                        ))}
                    </div>
                </div>
            </div>
            
            {renderHistory()}
          </div>
        )}
      </main>

      <footer className="bg-[#2b579a] text-white py-5 px-12 text-[12px] font-black flex justify-between shrink-0 border-t border-white/10 uppercase tracking-[0.3em]">
        <div className="flex items-center space-x-8">
           <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-4 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.8)]"></span> AUDITORÍA RAE CONECTADA</span>
        </div>
        <div className="opacity-50">© 2025 Tribunal Superior de Oposiciones - Cortes Generales</div>
      </footer>
    </div>
  );
};

export default App;
