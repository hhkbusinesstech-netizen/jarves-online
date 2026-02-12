import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Send, Mic, Terminal, Activity, Cpu, Shield, Zap, Power } from 'lucide-react';

/** * JARVES v6.2.0 CORE CONFIGURATION
 * Replace the API_KEY below with the one you got from Google AI Studio.
 */
const CONFIG = {AIzaSyC6k1J7xk-sOobLOZ_6SjxIxy5fABlZ7d4
  API_KEY: "YOUR_API_KEY_HERE", 
  VERSION: "6.2.0-STABLE",
  MODEL: "gemini-2.5-flash-preview-09-2025"
};

// --- 3D INTERFACE ENGINE ---
const JarvesCore = ({ status, isMini = false }) => {
  const mountRef = useRef(null);
  const frameId = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const size = isMini ? 120 : 450;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(size, size);
    mountRef.current.appendChild(renderer.domElement);

    const character = new THREE.Group();
    const shellMat = new THREE.MeshPhysicalMaterial({ 
      color: 0xffffff, roughness: 0.1, metalness: 0.4, clearcoat: 1.0 
    });
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), shellMat);
    character.add(head);

    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.93, 64, 64, 0, Math.PI * 2, 0, Math.PI / 1.8),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a })
    );
    face.rotation.x = Math.PI / 2.2;
    character.add(face);

    const eyeGeo = new THREE.CapsuleGeometry(0.07, 0.2, 16, 32);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 3 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.35, 0.35, 0.88);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.35, 0.35, 0.88);
    character.add(eyeL, eyeR);

    scene.add(character);
    const light = new THREE.PointLight(0x22d3ee, 2, 10);
    light.position.set(2, 2, 5);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));
    camera.position.z = 5;

    const animate = () => {
      frameId.current = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      character.position.y = Math.sin(t * 1.5) * 0.07;
      character.rotation.y = Math.sin(t * 0.5) * 0.1;
      
      if (status === 'talking') {
        const s = 1 + Math.sin(t * 25) * 0.4;
        eyeL.scale.y = s; eyeR.scale.y = s;
      } else {
        eyeL.scale.y = 1; eyeR.scale.y = 1;
      }
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frameId.current);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [status, isMini]);

  return <div ref={mountRef} className="flex justify-center items-center" />;
};

// --- MAIN APPLICATION LOGIC ---
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([]);
  const [engineStatus, setEngineStatus] = useState('stable');

  const speak = async (text) => {
    if (!CONFIG.API_KEY) return;
    setEngineStatus('talking');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${CONFIG.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: { 
            responseModalities: ["AUDIO"], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } } 
          }
        })
      });
      const data = await res.json();
      const b64 = data.candidates[0].content.parts[0].inlineData.data;
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.onended = () => setEngineStatus('stable');
      audio.play();
    } catch (e) { setEngineStatus('stable'); }
  };

  const handleQuery = async () => {
    if (!input.trim()) return;
    const userPrompt = input;
    setChat(p => [...p, { role: 'user', text: userPrompt }]);
    setInput('');
    setEngineStatus('thinking');

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: "You are JARVES, a professional and loyal AI assistant. Use English and Bengali." }] }
        })
      });
      const data = await res.json();
      const reply = data.candidates[0].content.parts[0].text;
      setChat(p => [...p, { role: 'system', text: reply }]);
      speak(reply);
    } catch (e) { setEngineStatus('stable'); }
  };

  if (!isReady) return (
    <div className="h-screen bg-[#010206] flex flex-col items-center justify-center p-6 text-center">
      <JarvesCore status="stable" />
      <h1 className="text-6xl font-black text-white tracking-[0.3em] mb-4">JARVES</h1>
      <p className="text-cyan-500/50 text-xs font-mono mb-8 uppercase tracking-widest">Neural Link v{CONFIG.VERSION}</p>
      <button 
        onClick={() => setIsReady(true)}
        className="group relative px-12 py-4 bg-transparent border border-cyan-500 text-cyan-500 font-bold rounded-full overflow-hidden transition-all hover:bg-cyan-500 hover:text-black"
      >
        <span className="relative z-10">INITIATE HANDSHAKE</span>
        <div className="absolute inset-0 bg-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
      </button>
    </div>
  );

  return (
    <div className="h-screen bg-[#010206] text-slate-300 flex overflow-hidden font-sans">
      <aside className="w-80 border-r border-white/5 bg-black/40 flex flex-col p-8">
        <JarvesCore isMini={true} status={engineStatus} />
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-3 text-cyan-400 text-[10px] font-black tracking-widest uppercase"><Activity size={14}/> Systems: Online</div>
          <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black tracking-widest uppercase"><Shield size={14}/> Security: Level 5</div>
          <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black tracking-widest uppercase"><Zap size={14}/> Core: Quantum</div>
        </div>
        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] text-slate-500 leading-relaxed italic">
          "The best way to predict the future is to invent it."
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative p-8">
        <div className="flex-1 overflow-y-auto space-y-6 pb-32 scrollbar-hide">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-6 rounded-3xl ${m.role === 'user' ? 'bg-cyan-500 text-black font-semibold' : 'bg-white/5 border border-white/10 text-slate-200'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {engineStatus === 'thinking' && <div className="text-cyan-500 text-[10px] font-bold animate-pulse">JARVES IS PROCESSING...</div>}
        </div>

        <div className="absolute bottom-8 left-8 right-8 flex justify-center">
          <div className="relative w-full max-w-4xl">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="Give a command, Master..."
              className="w-full bg-white/5 border border-white/10 p-6 pr-20 rounded-full focus:border-cyan-500 outline-none transition-all placeholder:text-slate-700"
            />
            <button onClick={handleQuery} className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-cyan-500 text-black rounded-full hover:scale-110 transition-transform">
              <Send size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
