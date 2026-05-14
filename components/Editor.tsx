
import React, { useRef, useEffect } from 'react';

interface EditorProps {
  originalText: string;
  typedText: string;
  onChange: (text: string) => void;
  disabled: boolean;
  isPaused: boolean;
  showReference?: boolean;
}

const Editor: React.FC<EditorProps> = ({ originalText, typedText, onChange, disabled, isPaused, showReference = true }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="flex flex-col h-full bg-[#f3f2f1] overflow-hidden">
      {/* Fake Word Ribbon */}
      <div className="bg-[#f3f2f1] border-b border-gray-300 px-4 pt-1 hidden md:block shrink-0">
        <div className="flex space-x-6 text-[11px] text-gray-700 font-medium">
          <span className="border-b-2 border-[#2b579a] pb-1 text-[#2b579a] cursor-default font-bold">Archivo</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Inicio</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Insertar</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Diseño</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Disposición</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Referencias</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Correspondencia</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Revisar</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Vista</span>
          <span className="hover:text-[#2b579a] cursor-pointer pb-1">Ayuda</span>
        </div>
      </div>
      
      <div className={`flex flex-col md:flex-row flex-1 overflow-hidden p-4 lg:p-12 gap-6 justify-center ${!showReference ? 'bg-[#adb5bd]' : ''}`}>
        {/* Original Document View (LEFT) - Only if showReference is true */}
        {showReference && (
          <div className="flex-1 max-w-[850px] flex flex-col bg-[#fdfdfd] shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-gray-300 opacity-95 rounded-sm overflow-hidden">
            <div className="h-1.5 bg-gray-500 w-full shrink-0"></div>
            <div className="bg-[#f3f2f1] px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center">
                <svg className="w-3 h-3 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                EXAMEN_REFERENCIA.PDF
              </span>
            </div>
            <div 
              className="p-16 overflow-y-auto font-serif text-[12pt] leading-[1.8] select-none text-gray-800 bg-[#fbfbfb] custom-scrollbar"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              {originalText.split('\n').filter(p => p.trim() !== "").map((para, i) => (
                <p key={i} className="mb-6 text-justify indent-8 tracking-tight">
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* User Input View (RIGHT or CENTER) */}
        <div className={`flex flex-col bg-white shadow-[0_0_50px_rgba(0,0,0,0.2)] border border-gray-300 relative rounded-sm transition-all duration-500 ${showReference ? 'flex-1 max-w-[850px]' : 'w-full max-w-[800px]'}`}>
          <div className="h-1.5 bg-[#2b579a] w-full shrink-0"></div>
          <div className="bg-[#f3f2f1] px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
              <svg className="w-3 h-3 mr-2 text-[#2b579a]" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              Examen Oficial - Microsoft Word
            </span>
          </div>
          
          <div className={`relative flex-1 bg-white overflow-y-auto group custom-scrollbar`}>
            {isPaused && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none select-none">
                <div className="bg-white px-8 py-4 rounded-xl shadow-2xl border border-blue-100 flex flex-col items-center animate-pulse">
                  <span className="text-[#2b579a] font-black text-sm uppercase tracking-widest mb-1">Cortes Generales</span>
                  <span className="text-gray-500 font-medium text-xs">Empiece a teclear para activar el cronómetro</span>
                </div>
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              disabled={disabled}
              value={typedText}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Escriba aquí..."
              className={`p-20 md:p-24 w-full font-serif text-[11pt] leading-[1.8] focus:outline-none resize-none bg-transparent text-black selection:bg-blue-200 ${!showReference ? 'min-h-[1050px]' : 'h-full'}`}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>

          {/* Word Status Bar - Fixed at bottom of Word Window */}
          <div className="bg-[#2b579a] text-white px-4 py-1.5 text-[10px] flex justify-between items-center shrink-0">
            <div className="flex space-x-6 font-medium">
              <span>PÁGINA 1 DE 1</span>
              <span className="uppercase">{typedText.trim() === "" ? 0 : typedText.trim().split(/\s+/).length} PALABRAS</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center uppercase tracking-widest font-black text-[9px]"><span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span> {showReference ? 'MODO TRANSCRIPCIÓN' : 'MODO ESCRITURA LIBRE'}</span>
              <span className="opacity-70">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
