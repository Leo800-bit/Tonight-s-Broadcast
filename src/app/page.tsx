"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Broadcast } from "@/lib/types";
import { useTTS } from "@/lib/useTTS";

// ─── 星空粒子组件 ───
function Stars({ isDayMode }: { isDayMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let stars: { x: number; y: number; r: number; alpha: number; speed: number; phase: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      initStars();
    }

    function initStars(count = 100) {
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          r: Math.random() * 1.4 + 0.3,
          alpha: Math.random() * 0.5 + 0.1,
          speed: Math.random() * 0.003 + 0.0005,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const s of stars) {
        const flicker = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200, 190, 220, ${s.alpha * flicker})`;
        ctx!.fill();
      }
      animationId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: isDayMode ? 0 : 1, transition: 'opacity 0.6s ease' }}
    />
  );
}

// ─── 氛围提示数据 ───
const atmosphereNotes = [
  "低保真音乐缓慢播放",
  "窗外有轻微雨声",
  "城市远处有微弱车流声",
  "雨声渐密，敲打窗沿",
  "空气安静得像暂停",
  "风声轻缓，渐行渐远",
];

// ─── 段落时长（秒） ───
const sectionDurations = [50, 35, 45, 55, 20, 30];
const totalDuration = sectionDurations.reduce((a, b) => a + b, 0);

// ─── 段落标签 ───
const sectionLabels = [
  "开场 · Opening",
  "今夜氛围 · Night Atmosphere",
  "听众留言 · Listener Message",
  "夜晚故事 · Night Story",
  "今夜一句话 · Tonight's Thought",
  "结束语 · Closing",
];

export default function Home() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState("");
  const [message, setMessage] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDayMode, setIsDayMode] = useState(false);

  // TTS
  const tts = useTTS();

  // 播放控制
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingSectionRef = useRef(0);
  const broadcastRef = useRef<Broadcast | null>(null);

  // 日间/夜间切换
  const toggleDayMode = useCallback(() => {
    setIsDayMode((prev) => !prev);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('day-mode', isDayMode);
  }, [isDayMode]);

  // 更新实时时间
  useEffect(() => {
    function update() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      setLiveTime(`${h}:${m}`);
    }
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // 获取今日广播
  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/get-today");
      const json = await res.json();
      if (json.success && json.hasBroadcast && json.data) {
        setBroadcast(json.data);
      } else {
        setBroadcast(null);
      }
    } catch {
      setError("无法加载广播数据");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // 生成广播
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-broadcast", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        setBroadcast(json.data);
        resetPlayback();
      } else {
        setError(json.error || "生成失败");
      }
    } catch {
      setError("生成广播时出错");
    } finally {
      setGenerating(false);
    }
  }, []);

  // 提交留言
  const handleSubmitMessage = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setMessageSent(true);
        setMessage("");
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        setError(json.error || "提交失败");
      }
    } catch {
      setError("提交留言时出错");
    } finally {
      setSubmitting(false);
    }
  }, [message]);

  // 用 TTS 顺序朗读所有段落
  const speakAllSections = useCallback((startFrom: number) => {
    const b = broadcastRef.current;
    if (!b) return;

    const contents = [
      b.opening,
      b.atmosphere,
      `听众留言：\n「${b.listener_message}」\n\n主播回应：\n${b.reply}`,
      b.story,
      b.thought,
      b.closing,
    ];

    let idx = startFrom;

    function speakNext() {
      if (idx >= contents.length) {
        // 全部播完
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setIsPlaying(false);
        return;
      }

      speakingSectionRef.current = idx;
      setCurrentSection(idx);

      tts.speak(contents[idx], {
        onEnd: () => {
          idx++;
          speakNext();
        },
        onError: () => {
          idx++;
          speakNext();
        },
      });
    }

    speakNext();
  }, [tts]);

  // 开始播放
  const startPlayback = useCallback(() => {
    const b = broadcastRef.current;
    if (!b) return;

    setIsPlaying(true);
    setHasPlayed(true);

    // 如果是从头开始，重置进度
    if (elapsed <= 1 || elapsed >= totalDuration - 1) {
      setElapsed(0);
      setCurrentSection(0);
      speakingSectionRef.current = 0;
    }

    // 从当前段落开始顺序朗读
    speakAllSections(speakingSectionRef.current);

    // 辅助计时器（仅用于 UI 进度条展示）
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalDuration) {
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
          return totalDuration;
        }
        return next;
      });
    }, 1000);
  }, [elapsed, speakAllSections]);

  // 暂停/继续
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      // 暂停
      tts.pause();
      setIsPlaying(false);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    } else {
      // 继续
      if (tts.isPaused()) {
        tts.resume();
        setIsPlaying(true);
        // 继续计时器
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = setInterval(() => {
          setElapsed((prev) => {
            const next = prev + 1;
            if (next >= totalDuration) {
              if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
              return totalDuration;
            }
            return next;
          });
        }, 1000);
      } else {
        // 重新开始/继续播放
        startPlayback();
      }
    }
  }, [isPlaying, tts, startPlayback]);

  // 重置播放
  const resetPlayback = useCallback(() => {
    tts.stop();
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentSection(0);
    setElapsed(0);
    setHasPlayed(false);
    speakingSectionRef.current = 0;
  }, [tts]);

  // 同步 broadcastRef
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  // 清理
  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      tts.stop();
    };
  }, [tts]);

  // 格式化时间
  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(Math.floor(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

  // 键盘快捷键
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === "Space" && broadcast) {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [broadcast, togglePlay]);

  // 获取中文字体列表（用户首次交互时浏览器才允许语音）
  useEffect(() => {
    // 预加载语音列表
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // ─── 获取当前正在展示的段落内容 ───
  const sectionContents = broadcast
    ? [
        broadcast.opening,
        broadcast.atmosphere,
        `「${broadcast.listener_message}」\n\n— — —\n\n${broadcast.reply}`,
        broadcast.story,
        broadcast.thought,
        broadcast.closing,
      ]
    : [];

  return (
    <>
      <Stars isDayMode={isDayMode} />
      <div className="relative z-10 min-h-screen">
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          {/* ─── Header ─── */}
          <div className="text-center mb-10 sm:mb-14 relative">
            <div className="absolute right-0 top-0 flex items-center gap-2">
              <button
                onClick={toggleDayMode}
                className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--toggle-bg)]
                  hover:bg-[var(--toggle-hover)] transition-all duration-300
                  flex items-center justify-center text-sm cursor-pointer
                  active:scale-95"
                title={isDayMode ? "切换至夜间" : "切换至日间"}
              >
                {isDayMode ? "🌙" : "☀️"}
              </button>
            </div>

            <p className="text-xs tracking-[0.3em] uppercase text-[var(--foreground-muted)] font-mono">
              Tonight's Broadcast
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-light tracking-wider text-[var(--foreground)]">
              今夜广播
            </h1>
            <p className="mt-2 text-sm font-mono text-[var(--foreground-muted)] tracking-wider">
              LIVE · {liveTime}
            </p>
          </div>

          {/* ─── Loading State ─── */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-[var(--foreground-muted)] text-sm tracking-wider">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--foreground-muted)] animate-pulse" />
                加载中
              </div>
            </div>
          )}

          {/* ─── Error State ─── */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-400/60 text-sm mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors tracking-wider"
              >
                关闭
              </button>
            </div>
          )}

          {/* ─── No Broadcast State ─── */}
          {!loading && !broadcast && (
            <div className="text-center py-20">
              <p className="text-[var(--foreground-muted)] text-sm tracking-wider mb-6">
                今晚的广播还没有生成
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[var(--border)]
                  bg-[var(--muted)] text-[var(--foreground)] text-sm tracking-wider
                  hover:bg-[var(--toggle-hover)] hover:border-[var(--accent-dim)]
                  transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full border border-[var(--border)] border-t-transparent animate-spin" />
                    生成中…
                  </>
                ) : (
                  <>
                    <span className="text-base">🎙</span>
                    生成今日广播
                  </>
                )}
              </button>
            </div>
          )}

          {/* ─── Broadcast Content ─── */}
          {broadcast && (
            <>
              {/* 播放控件 */}
              <div className="mb-10">
                {/* 播放按钮 + 进度条 */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={togglePlay}
                    className="shrink-0 w-12 h-12 rounded-full border border-[var(--border)]
                      bg-[var(--muted)] flex items-center justify-center text-[var(--foreground)] text-lg
                      hover:bg-[var(--toggle-hover)] hover:border-[var(--accent-dim)]
                      transition-all duration-300 active:scale-95"
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>

                  <div className="flex-1">
                    <div
                      className="w-full h-1 bg-[var(--muted)] rounded-full overflow-hidden cursor-pointer group relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        setElapsed(Math.floor(pct * totalDuration));
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progressPct}%`,
                          background: "linear-gradient(90deg, var(--accent-dim), var(--accent))",
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-[var(--foreground-muted)] mt-1.5 tracking-wider">
                      {formatTime(elapsed)} / {formatTime(totalDuration)}
                    </p>
                  </div>
                </div>

                {/* 声波动画 */}
                <div className="flex justify-center items-end gap-[3px] h-6 mb-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-[2px] rounded-full transition-all duration-500 ${
                        isPlaying ? "opacity-40" : "opacity-10"
                      }`}
                      style={{
                        height: isPlaying ? `${30 + Math.random() * 70}%` : "30%",
                        background: "linear-gradient(to top, var(--accent-dim), var(--accent))",
                        animation: isPlaying
                          ? `wave 1.2s ease-in-out infinite ${i * 0.1}s`
                          : "none",
                      }}
                    />
                  ))}
                </div>

                {/* 氛围提示 */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot" />
                  <span className="text-[11px] text-[var(--foreground-muted)] tracking-wider">
                    {atmosphereNotes[currentSection] || atmosphereNotes[0]}
                  </span>
                </div>
              </div>

              {/* 键盘提示 */}
              {!hasPlayed && (
                <p className="text-center text-[11px] text-[var(--foreground-muted)] tracking-wider mb-8">
                  按空格键播放 · 点击进度条跳转
                </p>
              )}

              {/* 节目内容分段展示 */}
              <div className="space-y-8">
                {sectionContents.map((content, index) => (
                  <div
                    key={index}
                    className={`transition-all duration-700 ${
                      index <= currentSection
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3 pointer-events-none absolute"
                    }`}
                  >
                    {/* 段落标签 */}
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] mb-3 pb-2 border-b border-[var(--border)]">
                      ◆ {sectionLabels[index]}
                    </p>

                    {/* 段落内容 */}
                    <div
                      className={`font-normal leading-[1.9] text-sm sm:text-base whitespace-pre-wrap ${
                        index === 4
                          ? "text-[var(--accent)] text-base sm:text-lg"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {content}
                    </div>
                  </div>
                ))}
              </div>

              {/* 生成新广播按钮 */}
              <div className="mt-12 text-center">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]
                    transition-all duration-300 disabled:opacity-40"
                >
                  {generating ? "生成中…" : "生成新的广播"}
                </button>
              </div>
            </>
          )}

          {/* ─── 匿名留言区 ─── */}
          <div className="mt-16 sm:mt-20 pt-8 border-t border-[var(--border)]">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--foreground-muted)] mb-4 text-center">
              匿名留言
            </p>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="今晚你在想什么？写在这里，我会在节目中读出来…"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-3 
                    text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] resize-none
                    focus:outline-none focus:border-[var(--accent-dim)] focus:bg-[var(--toggle-hover)]
                    transition-all duration-300"
                />
                <p className="text-[10px] text-[var(--foreground-dim)] mt-1.5 text-right">
                  {message.length}/500
                </p>
              </div>
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleSubmitMessage}
                  disabled={submitting || !message.trim()}
                  className="px-5 py-2 rounded-full border border-[var(--border)] bg-[var(--muted)]
                    text-xs text-[var(--foreground)] tracking-wider
                    hover:bg-[var(--toggle-hover)] hover:border-[var(--accent-dim)]
                    transition-all duration-300 
                    disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {submitting ? "发送中…" : messageSent ? "已发送 ✦" : "发送留言"}
                </button>
              </div>
            </div>
          </div>

          {/* ─── Footer ─── */}
          <footer className="mt-16 text-center">
            <p className="text-[10px] text-[var(--foreground-muted)] tracking-[0.3em] uppercase">
              Tonight's Broadcast
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
