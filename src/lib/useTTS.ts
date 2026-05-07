// Web Speech API 文字转语音 Hook
// 用于朗读广播内容

import { useEffect, useRef, useCallback, useState } from 'react';

export interface VoiceOption {
  name: string;
  lang: string;
  isDefault: boolean;
}

export function useTTS() {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [ttsReady, setTtsReady] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const pausedRef = useRef(false);

  // 初始化语音合成
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // 加载语音列表
    const loadVoices = () => {
      const allVoices = synth.getVoices();
      if (allVoices.length === 0) {
        setTtsError('系统中未找到文字转语音引擎');
        setTtsReady(false);
        return;
      }

      const voiceList: VoiceOption[] = allVoices.map((v) => ({
        name: v.name,
        lang: v.lang,
        isDefault: v.default,
      }));
      setVoices(voiceList);

      // 智能选择语音：优先中文女性 → 中文 → 默认
      const zhFemale = allVoices.find(
        (v) => (v.lang.startsWith('zh') || v.lang.startsWith('cmn')) && 
               (v.name.includes('Female') || v.name.includes('Xiaoxiao') || v.name.includes('Xiaoyi') || v.name.includes('Huihui'))
      );
      const zhVoice = zhFemale || allVoices.find(
        (v) => v.lang.startsWith('zh') || v.lang.startsWith('cmn')
      );
      const defaultVoice = allVoices.find((v) => v.default) || allVoices[0];

      const chosenVoice = zhVoice || defaultVoice;
      setSelectedVoice(chosenVoice.name);
      setTtsReady(true);
      setTtsError(null);
    };

    // Chrome 需要异步加载 voices
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      synth.onvoiceschanged = null;
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, []);

  // 朗读一段文本
  const speak = useCallback((
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: string) => void;
    }
  ) => {
    if (!synthRef.current) {
      setTtsError('浏览器不支持文字转语音');
      callbacks?.onError?.('SpeechSynthesis not available');
      callbacks?.onEnd?.();
      return;
    }

    // 如果正在朗读，先取消
    if (synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);

      // 设置语音
      if (selectedVoice) {
        const matched = synthRef.current
          .getVoices()
          .find((v) => v.name === selectedVoice);
        if (matched) {
          utterance.voice = matched;
        }
      }

      // 深夜电台风格：语速慢、音调低
      utterance.rate = 0.75;
      utterance.pitch = 0.85;
      utterance.volume = 1;

      utterance.onstart = () => {
        pausedRef.current = false;
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          setTtsError(`语音合成错误: ${e.error}`);
          callbacks?.onError?.(e.error);
        }
        callbacks?.onEnd?.();
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    } catch (err) {
      setTtsError(`语音合成启动失败: ${String(err)}`);
      callbacks?.onError?.(String(err));
      callbacks?.onEnd?.();
    }
  }, [selectedVoice]);

  // 停止所有朗读
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    pausedRef.current = false;
  }, []);

  // 暂停
  const pause = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      pausedRef.current = true;
    }
  }, []);

  // 继续
  const resume = useCallback(() => {
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
      pausedRef.current = false;
    }
  }, []);

  // 切换语音
  const changeVoice = useCallback((voiceName: string) => {
    setSelectedVoice(voiceName);
    setTtsError(null);
  }, []);

  // 测试当前语音
  const testVoice = useCallback(() => {
    speak('你好，这里是 Tonight\'s Broadcast 今夜广播。这是一段语音测试。', {
      onEnd: () => {},
    });
  }, [speak]);

  return {
    voices,
    selectedVoice,
    ttsReady,
    ttsError,
    speak,
    stop,
    pause,
    resume,
    changeVoice,
    testVoice,
    isSpeaking: () => synthRef.current ? synthRef.current.speaking : false,
    isPaused: () => pausedRef.current,
  };
}
