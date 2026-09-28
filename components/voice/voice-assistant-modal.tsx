"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Volume2,
  Plus,
  CheckCircle2,
  Loader2,
  Clock,
  Layers,
  ArrowRight,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { VoiceParsedCommand } from "@/lib/validation/schemas";
import { formatCurrency } from "@/lib/utils/formatters";
import { notifyDataChanged } from "@/lib/events/data-events";

interface ParsedEntry {
  id: string;
  rawText: string;
  command: VoiceParsedCommand | null;
  status: "parsing" | "parsed" | "saving" | "saved" | "error";
  error?: string;
  editedType: "EXPENSE" | "INCOME" | "TRANSFER";
  editedAmount: number | "";
  editedAccountName: string;
  editedSourceAccountName: string;
  editedDestinationAccountName: string;
  editedCategoryName: string;
  editedDescription: string;
  editedDate: string;
}

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: any[];
  categories: any[];
}

interface ActiveClarification {
  entryId: string;
  field: "amount" | "type";
  question: string;
}

function extractSpokenAmount(text: string): number | null {
  const match = text.match(/(?:₹|\$|rs\.?|rupees?\s*)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
}

function findSpokenCategory(text: string, categories: any[]): any | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  // 1. Exact match
  const exact = categories.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Substring match
  const sub = categories.find(
    (c) => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower)
  );
  if (sub) return sub;

  // 3. Common voice synonyms and aliases
  const synonyms: Record<string, string[]> = {
    Dining: ["food", "restaurant", "lunch", "dinner", "breakfast", "cafe", "coffee", "eating", "eat", "snack", "burger", "pizza", "starbucks", "swiggy", "zomato", "mcdonalds", "kfc", "bistro", "drinks"],
    Groceries: ["grocery", "supermarket", "provisions", "veggies", "vegetables", "milk", "fruits", "mart", "ration", "bread", "eggs", "meat", "chicken", "blinkit", "zepto", "instamart"],
    Shopping: ["shopping", "clothes", "cloth", "shoes", "amazon", "flipkart", "mall", "market", "purchase", "dress", "shirt", "jeans", "apparel"],
    Transport: ["transport", "cab", "uber", "ola", "taxi", "metro", "bus", "auto", "train", "rickshaw"],
    Fuel: ["fuel", "petrol", "diesel", "gas station", "cng"],
    Bills: ["bill", "electricity bill", "water bill", "phone bill", "recharge", "wifi bill", "broadband"],
    Rent: ["rent", "house rent", "flat rent", "landlord"],
    Utilities: ["utility", "utilities", "electricity", "water", "gas", "wifi", "internet", "power"],
    Entertainment: ["entertainment", "movie", "cinema", "film", "games", "netflix", "prime", "theatre", "gaming"],
    Healthcare: ["health", "healthcare", "medical", "medicine", "doctor", "pharmacy", "hospital", "clinic", "pills", "dentist"],
    Education: ["education", "books", "course", "college", "school", "tuition", "fees", "classes"],
    Travel: ["travel", "flight", "hotel", "trip", "vacation", "holiday", "ticket", "airbnb"],
    Personal: ["personal", "salon", "haircut", "spa", "cosmetics"],
    Subscription: ["subscription", "subscriptions", "spotify", "youtube", "membership"],
    Salary: ["salary", "job", "paycheck", "wages", "stipend"],
    Freelance: ["freelance", "client", "gig", "contract", "project"],
    Investment: ["invest", "investment", "stocks", "mutual fund", "crypto", "dividend"],
    Cashback: ["cashback", "reward", "rewards"],
  };

  for (const cat of categories) {
    const syns = synonyms[cat.name] || [];
    for (const syn of syns) {
      if (lower.includes(syn)) return cat;
    }
  }

  return null;
}

function speakSpokenFeedback(text: string) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

// 2.6 seconds silence before auto-stopping (comfortable 2-3 sec window as requested)
const SILENCE_TIMEOUT_MS = 2600;
const INACTIVITY_TIMEOUT_MS = 9000;
const MIN_LISTEN_MS = 700;

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts,
  categories,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([4, 4, 4, 4, 4]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [silenceSecondsLeft, setSilenceSecondsLeft] = useState<number | null>(null);
  const [activeClarification, setActiveClarification] = useState<ActiveClarification | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenStartRef = useRef<number>(0);
  const lastTranscriptRef = useRef<string>("");
  const isStoppingRef = useRef<boolean>(false);
  const lastProcessedTextRef = useRef<string>("");
  const lastProcessedTimeRef = useRef<number>(0);
  const waveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeClarificationRef = useRef<ActiveClarification | null>(null);
  const startListeningRef = useRef<() => void>(() => {});
  const isProcessingRef = useRef<boolean>(false);

  // Initialize Speech Recognition once
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.maxAlternatives = 1;
        recognitionRef.current = rec;
      }
    }
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setSilenceSecondsLeft(null);
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    isStoppingRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
  }, [clearSilenceTimer]);

  const resolveClarification = useCallback((id: string, field: string, value: any) => {
    setActiveClarification(null);
    activeClarificationRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updatedCmd = e.command
          ? {
              ...e.command,
              clarificationQuestion: undefined,
              missingFields: e.command.missingFields?.filter(
                (f) =>
                  !(field === "editedAmount" && f === "amount") &&
                  !(field === "editedType" && f === "type")
              ),
            }
          : null;
        return {
          ...e,
          [field]: value,
          command: updatedCmd,
        };
      })
    );
  }, []);

  const processTranscript = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (isProcessingRef.current) return;

      // 1. If we are actively waiting for the user's spoken answer to an AI clarification:
      const active = activeClarificationRef.current;
      if (active) {
        const spokenLower = clean.toLowerCase();

        if (active.field === "amount") {
          const amt = extractSpokenAmount(spokenLower);
          if (amt) {
            resolveClarification(active.entryId, "editedAmount", amt);
            setActiveClarification(null);
            activeClarificationRef.current = null;
            speakSpokenFeedback(`Noted, ${amt}`);
            return;
          }
        } else if (active.field === "type") {
          const isExpense =
            spokenLower.includes("expense") ||
            spokenLower.includes("spend") ||
            spokenLower.includes("spent") ||
            spokenLower.includes("paid");
          const isIncome =
            spokenLower.includes("income") ||
            spokenLower.includes("salary") ||
            spokenLower.includes("credit") ||
            spokenLower.includes("received") ||
            spokenLower.includes("got") ||
            spokenLower.includes("earning");

          if (isExpense) {
            resolveClarification(active.entryId, "editedType", "EXPENSE");
            setActiveClarification(null);
            activeClarificationRef.current = null;
            speakSpokenFeedback("Noted, Expense");
            return;
          } else if (isIncome) {
            resolveClarification(active.entryId, "editedType", "INCOME");
            setActiveClarification(null);
            activeClarificationRef.current = null;
            speakSpokenFeedback("Noted, Income");
            return;
          }
        }

        // If not a direct match to clarification, clear active clarification and proceed to parse as transaction
        setActiveClarification(null);
        activeClarificationRef.current = null;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      const tempId = crypto.randomUUID();
      const tempEntry: ParsedEntry = {
        id: tempId,
        rawText: clean,
        command: null,
        status: "parsing",
        editedType: "EXPENSE",
        editedAmount: "",
        editedAccountName: accounts[0]?.name || "",
        editedSourceAccountName: accounts[0]?.name || "",
        editedDestinationAccountName: accounts[1]?.name || accounts[0]?.name || "",
        editedCategoryName: "Other",
        editedDescription: "",
        editedDate: new Date().toISOString().split("T")[0],
      };

      setEntries((prev) => [tempEntry, ...prev]);

      try {
        const res = await fetch("/api/ai/voice-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: clean }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Parsing failed");

        const commands: VoiceParsedCommand[] =
          data.commands && data.commands.length > 0
            ? data.commands
            : data.command
            ? [data.command]
            : [];

        // Check if query intent
        const queryCmd = commands.find((c) => c.intent.startsWith("QUERY"));
        if (queryCmd) {
          const qRes = await fetch("/api/ai/voice-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: queryCmd }),
          });
          const qData = await qRes.json();
          if (qData.answer) {
            setQueryAnswer(qData.answer);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(qData.answer);
              window.speechSynthesis.speak(utterance);
            }
          }
          setEntries((prev) => prev.filter((e) => e.id !== tempId));
          return;
        }

        const txCommands = commands.filter((c) => !c.intent.startsWith("QUERY"));
        if (txCommands.length === 0) {
          setEntries((prev) => prev.filter((e) => e.id !== tempId));
          return;
        }

        // Replace placeholder entry with distinct parsed cards
        const newParsedEntries: ParsedEntry[] = txCommands.map((cmd) => ({
          id: crypto.randomUUID(),
          rawText: cmd.description || clean,
          command: cmd,
          status: "parsed" as const,
          editedType: (cmd.type as any) || "EXPENSE",
          editedAmount: cmd.amount || "",
          editedAccountName: cmd.account || accounts[0]?.name || "",
          editedSourceAccountName: cmd.sourceAccount || accounts[0]?.name || "",
          editedDestinationAccountName:
            cmd.destinationAccount || accounts[1]?.name || accounts[0]?.name || "",
          editedCategoryName: cmd.category || "Other",
          editedDescription: cmd.description || "",
          editedDate: cmd.date || new Date().toISOString().split("T")[0],
        }));

        // Conflict Resolution: Prevent duplicate entries in the list
        setEntries((prev) => {
          const withoutTemp = prev.filter((e) => e.id !== tempId);
          const updated = [...withoutTemp];

          for (const newEntry of newParsedEntries) {
            // Check for conflict / duplicate with existing un-saved entries
            const existingIndex = updated.findIndex((e) => {
              if (e.status === "saved") return false;
              const sameAmount =
                Number(e.editedAmount) > 0 &&
                Number(e.editedAmount) === Number(newEntry.editedAmount);
              const sameCategory =
                e.editedCategoryName.toLowerCase() === newEntry.editedCategoryName.toLowerCase();
              const isDraft = !e.editedAmount || e.status === "parsing" || e.command?.intent === "AMBIGUOUS";

              return (sameAmount && sameCategory) || (sameAmount && isDraft);
            });

            if (existingIndex !== -1) {
              // Resolve conflict by updating existing entry
              updated[existingIndex] = {
                ...newEntry,
                id: updated[existingIndex].id,
              };
            } else {
              updated.unshift(newEntry);
            }
          }

          return updated;
        });

        // Only ask clarification if amount is genuinely missing
        const entryNeedingClarification = newParsedEntries.find(
          (e) => e.command?.clarificationQuestion && e.command?.missingFields?.includes("amount")
        );

        if (entryNeedingClarification && entryNeedingClarification.command) {
          const clarificationInfo: ActiveClarification = {
            entryId: entryNeedingClarification.id,
            field: "amount",
            question: entryNeedingClarification.command.clarificationQuestion || "",
          };

          setActiveClarification(clarificationInfo);
          activeClarificationRef.current = clarificationInfo;

          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(clarificationInfo.question);
              utterance.rate = 1.0;

              utterance.onend = () => {
                setTimeout(() => {
                  startListeningRef.current();
                }, 300);
              };

              utterance.onerror = () => {
                setTimeout(() => {
                  startListeningRef.current();
                }, 500);
              };

              window.speechSynthesis.speak(utterance);
            } catch {
              setTimeout(() => {
                startListeningRef.current();
              }, 500);
            }
          } else {
            setTimeout(() => {
              startListeningRef.current();
            }, 500);
          }
        }
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === tempId ? { ...e, status: "error" as const, error: err.message } : e
          )
        );
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [accounts, categories, resolveClarification]
  );

  const stopListeningAndProcess = useCallback(() => {
    clearSilenceTimer();
    const textToProcess = lastTranscriptRef.current.trim();
    isStoppingRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {}

    setIsListening(false);

    if (textToProcess && !isProcessingRef.current) {
      const now = Date.now();
      const normText = textToProcess.toLowerCase().replace(/[^a-z0-9]/g, "");
      const prevNorm = lastProcessedTextRef.current.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Safeguard against duplicate / overlapping processing within 4s
      if (
        (normText === prevNorm || normText.includes(prevNorm) || prevNorm.includes(normText)) &&
        now - lastProcessedTimeRef.current < 4000
      ) {
        return;
      }

      lastProcessedTextRef.current = textToProcess;
      lastProcessedTimeRef.current = now;
      setCurrentTranscript("");
      lastTranscriptRef.current = "";

      processTranscript(textToProcess);
    }
  }, [clearSilenceTimer, processTranscript]);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();

    // Start 2.6s countdown
    let remainingMs = SILENCE_TIMEOUT_MS;
    setSilenceSecondsLeft(Math.ceil(remainingMs / 1000));

    countdownIntervalRef.current = setInterval(() => {
      remainingMs -= 200;
      if (remainingMs <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setSilenceSecondsLeft(null);
      } else {
        setSilenceSecondsLeft(Math.ceil(remainingMs / 1000));
      }
    }, 200);

    silenceTimerRef.current = setTimeout(() => {
      const elapsed = Date.now() - listenStartRef.current;
      if (elapsed > MIN_LISTEN_MS && lastTranscriptRef.current.trim()) {
        stopListeningAndProcess();
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimer, stopListeningAndProcess]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setErrorMessage("Speech recognition not supported in this browser. Please use text input below.");
      return;
    }

    setErrorMessage(null);
    setCurrentTranscript("");
    lastTranscriptRef.current = "";
    isStoppingRef.current = false;
    clearSilenceTimer();

    const rec = recognitionRef.current;

    rec.onresult = (event: any) => {
      // Ignore trailing callbacks if we already commanded stop
      if (isStoppingRef.current) return;

      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      const displayText = (finalText + " " + interimText).trim();
      if (!displayText) return;

      setCurrentTranscript(displayText);
      lastTranscriptRef.current = displayText;

      // User spoke: reset silence timer to allow full 2.6s pause
      resetSilenceTimer();
    };

    rec.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setErrorMessage("Microphone: " + event.error);
      }
      setIsListening(false);
      clearSilenceTimer();
    };

    rec.onend = () => {
      setIsListening(false);
      clearSilenceTimer();
      isStoppingRef.current = false;
    };

    try {
      rec.start();
      setIsListening(true);
      listenStartRef.current = Date.now();

      // Inactivity timeout: stop after 9s of zero speech
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        if (!lastTranscriptRef.current.trim()) {
          stopListening();
        }
      }, INACTIVITY_TIMEOUT_MS);
    } catch {
      // Already running or permission error
    }
  }, [resetSilenceTimer, clearSilenceTimer, stopListening]);

  // Keep startListening ref updated
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Auto-start listening on open
  useEffect(() => {
    if (isOpen) {
      setCurrentTranscript("");
      setManualText("");
      setEntries([]);
      setQueryAnswer(null);
      setErrorMessage(null);
      lastProcessedTextRef.current = "";
      lastProcessedTimeRef.current = 0;
      setActiveClarification(null);
      activeClarificationRef.current = null;

      const timer = setTimeout(() => {
        startListening();
      }, 300);

      return () => clearTimeout(timer);
    } else {
      stopListening();
      setActiveClarification(null);
      activeClarificationRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isOpen, startListening, stopListening]);

  // Animate wave visualizer when listening
  useEffect(() => {
    if (isListening) {
      waveIntervalRef.current = setInterval(() => {
        setWaveAmplitudes(Array.from({ length: 5 }, () => 4 + Math.random() * 18));
      }, 100);
    } else {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
      setWaveAmplitudes([4, 4, 4, 4, 4]);
    }
    return () => {
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    };
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListeningAndProcess();
    } else {
      startListening();
    }
  };

  const updateEntry = (id: string, field: string, value: any) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const saveEntry = async (entry: ParsedEntry) => {
    if (!entry.editedAmount || Number(entry.editedAmount) <= 0) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: "error" as const, error: "Invalid amount" } : e
        )
      );
      return;
    }

    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: "saving" as const } : e))
    );

    try {
      const acc =
        accounts.find((a) => a.name.toLowerCase() === entry.editedAccountName.toLowerCase()) ||
        accounts[0];
      const srcAcc =
        accounts.find((a) => a.name.toLowerCase() === entry.editedSourceAccountName.toLowerCase()) ||
        accounts[0];
      const destAcc =
        accounts.find((a) => a.name.toLowerCase() === entry.editedDestinationAccountName.toLowerCase()) ||
        accounts[1] ||
        accounts[0];
      const cat = categories.find(
        (c) => c.name.toLowerCase() === entry.editedCategoryName.toLowerCase()
      );

      const payload = {
        clientId: entry.id,
        type: entry.editedType,
        amount: Number(entry.editedAmount),
        currency: acc?.currency || "INR",
        accountId: acc?.id,
        sourceAccountId: entry.editedType === "TRANSFER" ? srcAcc?.id : undefined,
        destinationAccountId: entry.editedType === "TRANSFER" ? destAcc?.id : undefined,
        categoryId: cat?.id || undefined,
        description: entry.editedDescription,
        date: entry.editedDate || new Date().toISOString(),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "saved" as const } : e))
      );

      // Trigger instantaneous global update across all pages
      notifyDataChanged();
      onSuccess();
    } catch (err: any) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: "error" as const, error: err.message } : e
        )
      );
    }
  };

  const saveAllParsed = async () => {
    const parsedEntries = entries.filter((e) => e.status === "parsed");
    if (!parsedEntries.length) return;

    // Deduplicate any conflicting identical entries before batch saving
    const uniqueToSave: ParsedEntry[] = [];
    for (const entry of parsedEntries) {
      const isDup = uniqueToSave.some(
        (u) =>
          u.editedAmount === entry.editedAmount &&
          u.editedType === entry.editedType &&
          u.editedCategoryName === entry.editedCategoryName &&
          u.editedAccountName === entry.editedAccountName &&
          u.editedDate === entry.editedDate
      );
      if (!isDup) uniqueToSave.push(entry);
    }

    await Promise.all(uniqueToSave.map((entry) => saveEntry(entry)));
    notifyDataChanged();
    onSuccess();
  };

  const handleManualSubmit = () => {
    const text = manualText.trim();
    if (!text) return;
    processTranscript(text);
    setManualText("");
  };

  const parsedCount = entries.filter((e) => e.status === "parsed").length;
  const savedCount = entries.filter((e) => e.status === "saved").length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Voice Entry" maxWidth="lg">
      <div className="space-y-5 py-1">
        {/* Microphone Hero Section */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/20 border border-border/50 text-center relative overflow-hidden">
          {/* Audio Wave Glow Rings */}
          {isListening && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 rounded-full border border-primary/20 animate-ping opacity-25" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full border border-primary/40 animate-pulse opacity-50" />
              </div>
            </>
          )}

          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 z-10 ${
              isListening
                ? "bg-gradient-to-br from-rose-500 to-pink-600 scale-110 shadow-rose-500/40 ring-4 ring-rose-500/20"
                : "bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 hover:scale-105 shadow-indigo-500/30 hover:shadow-indigo-500/50"
            }`}
          >
            {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          {/* Wave Visualizer */}
          <div className="flex items-center gap-1.5 mt-4 h-6">
            {waveAmplitudes.map((amp, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isListening ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                style={{ height: `${amp}px` }}
              />
            ))}
          </div>

          {/* Status Label & Countdown */}
          <div className="mt-2 text-center">
            <div className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 min-h-[22px]">
              {isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Listening...</span>
                  {silenceSecondsLeft !== null ? (
                    <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 ml-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Clock className="w-3 h-3" /> Auto-saving in {silenceSecondsLeft}s
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground font-normal ml-1">
                      (waits 2.6s after you finish)
                    </span>
                  )}
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Parsing entry...</span>
                </>
              ) : (
                <span>Tap microphone to start speaking</span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-0.5">
              e.g. "500 for groceries and 200 for taxi"
            </p>
          </div>

          {/* Live Transcript Display with Instant Submit Action */}
          {currentTranscript && (
            <div className="mt-3 w-full p-3.5 rounded-xl card-elevated border border-primary/30 text-foreground text-sm font-medium animate-fadeInUp shadow-inner flex items-center justify-between gap-3">
              <div className="truncate text-left">
                <span className="text-primary mr-1 font-bold">"</span>
                <span className="truncate">{currentTranscript}</span>
                <span className="text-primary ml-1 font-bold">"</span>
              </div>
              {isListening && (
                <button
                  type="button"
                  onClick={stopListeningAndProcess}
                  className="shrink-0 px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-md"
                >
                  Done <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Text Input for manual/paste entry */}
        <div className="flex gap-2">
          <Input
            placeholder="Or type here: 500 for groceries, 200 for taxi"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualSubmit();
            }}
          />
          <Button
            variant="primary"
            onClick={handleManualSubmit}
            className="shrink-0 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Parse
          </Button>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Query Answer Display */}
        {queryAnswer && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-xs text-emerald-400">
              <Volume2 className="w-3.5 h-3.5" />
              <span>AI Financial Answer</span>
            </div>
            <p className="text-sm font-medium text-emerald-300">{queryAnswer}</p>
          </div>
        )}

        {/* Parsed Entries Queue */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Entries ({entries.length})
                {savedCount > 0 && (
                  <span className="text-emerald-400 ml-1 font-medium">• {savedCount} saved</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {entries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEntries([])}
                    className="text-xs text-muted-foreground hover:text-rose-400 h-7 px-2"
                  >
                    Clear All
                  </Button>
                )}
                {parsedCount > 1 && (
                  <Button variant="primary" size="sm" onClick={saveAllParsed} className="h-7 text-xs">
                    <Check className="w-3 h-3" />
                    Save All ({parsedCount})
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border transition-all duration-200 animate-fadeInUp ${
                    entry.status === "saved"
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : entry.status === "error"
                      ? "bg-rose-500/5 border-rose-500/20"
                      : "card-elevated"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.status === "parsing" && (
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      )}
                      {entry.status === "parsed" && (
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      )}
                      {entry.status === "saving" && (
                        <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      )}
                      {entry.status === "saved" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {entry.status === "error" && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px]">
                        "{entry.rawText}"
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-foreground font-medium flex items-center gap-1 border border-border/40">
                        <Calendar className="w-2.5 h-2.5 text-primary" />
                        {entry.editedDate}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 text-muted-foreground hover:text-rose-400 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* AI Clarification Box if amount or type was not clear */}
                  {entry.command?.clarificationQuestion && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 border border-indigo-500/30 space-y-2 mb-3 animate-fadeInUp">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                          <span>AI Assistant:</span>
                        </div>
                        {activeClarification?.entryId === entry.id && isListening && (
                          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                            <Mic className="w-3 h-3 text-emerald-400 animate-bounce" />
                            Listening for answer...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground font-semibold">
                        {entry.command.clarificationQuestion}
                      </p>

                      {/* Missing Amount: Quick 1-tap suggestions or voice */}
                      {entry.command.missingFields?.includes("amount") && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                            Say amount aloud or tap to pick:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => resolveClarification(entry.id, "editedAmount", amt)}
                                className="px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-primary hover:text-white border border-border/50 text-[11px] font-medium text-foreground transition-all duration-150 active:scale-95 shadow-sm"
                              >
                                ₹{amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Type: Quick Expense / Income buttons or voice */}
                      {entry.command.missingFields?.includes("type") && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                            Say "Expense" or "Income", or tap below:
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => resolveClarification(entry.id, "editedType", "EXPENSE")}
                              className="px-3.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all active:scale-95"
                            >
                              Expense
                            </button>
                            <button
                              type="button"
                              onClick={() => resolveClarification(entry.id, "editedType", "INCOME")}
                              className="px-3.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
                            >
                              Income
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.status === "error" && entry.error && (
                    <p className="text-[11px] text-rose-400 mb-2">{entry.error}</p>
                  )}

                  {/* Editable Fields */}
                  {(entry.status === "parsed" || entry.status === "saving") && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Type
                          </label>
                          <select
                            value={entry.editedType}
                            onChange={(e) => updateEntry(entry.id, "editedType", e.target.value)}
                            className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                            disabled={entry.status === "saving"}
                          >
                            <option value="EXPENSE" className="bg-card text-foreground">Expense</option>
                            <option value="INCOME" className="bg-card text-foreground">Income</option>
                            <option value="TRANSFER" className="bg-card text-foreground">Transfer</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={entry.editedAmount}
                            onChange={(e) =>
                              updateEntry(
                                entry.id,
                                "editedAmount",
                                e.target.value ? Number(e.target.value) : ""
                              )
                            }
                            className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-semibold"
                            disabled={entry.status === "saving"}
                            placeholder="0"
                          />
                        </div>

                        {entry.editedType !== "TRANSFER" ? (
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                              Account
                            </label>
                            <select
                              value={entry.editedAccountName}
                              onChange={(e) => updateEntry(entry.id, "editedAccountName", e.target.value)}
                              className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                              disabled={entry.status === "saving"}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.name} className="bg-card text-foreground">
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                              From
                            </label>
                            <select
                              value={entry.editedSourceAccountName}
                              onChange={(e) =>
                                updateEntry(entry.id, "editedSourceAccountName", e.target.value)
                              }
                              className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                              disabled={entry.status === "saving"}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.name} className="bg-card text-foreground">
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {entry.editedType !== "TRANSFER" ? (
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                              Category
                            </label>
                            <select
                              value={entry.editedCategoryName}
                              onChange={(e) =>
                                updateEntry(entry.id, "editedCategoryName", e.target.value)
                              }
                              className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                              disabled={entry.status === "saving"}
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.name} className="bg-card text-foreground">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                              To Account
                            </label>
                            <select
                              value={entry.editedDestinationAccountName}
                              onChange={(e) =>
                                updateEntry(entry.id, "editedDestinationAccountName", e.target.value)
                              }
                              className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium"
                              disabled={entry.status === "saving"}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.name} className="bg-card text-foreground">
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-primary" /> Date of Spend
                          </label>
                          <input
                            type="date"
                            value={entry.editedDate ? entry.editedDate.split("T")[0] : ""}
                            onChange={(e) => updateEntry(entry.id, "editedDate", e.target.value)}
                            className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium [color-scheme:dark]"
                            disabled={entry.status === "saving"}
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          Description
                        </label>
                        <input
                          value={entry.editedDescription}
                          onChange={(e) => updateEntry(entry.id, "editedDescription", e.target.value)}
                          className="w-full mt-0.5 bg-secondary/40 border border-border/50 rounded-lg px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                          disabled={entry.status === "saving"}
                          placeholder="Description / Note"
                        />
                      </div>

                      {/* Confirm & Save Button */}
                      <button
                        type="button"
                        onClick={() => saveEntry(entry)}
                        disabled={entry.status === "saving"}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        {entry.status === "saving" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        {entry.status === "saving" ? "Saving..." : "Confirm & Save"}
                      </button>
                    </div>
                  )}

                  {/* Saved Confirmation Banner */}
                  {entry.status === "saved" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved — {entry.editedType === "EXPENSE" ? "−" : "+"}
                      {formatCurrency(Number(entry.editedAmount))} (
                      {entry.editedDescription || entry.editedCategoryName})
                    </div>
                  )}

                  {/* Parsing State */}
                  {entry.status === "parsing" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <div className="flex gap-0.5">
                        <div
                          className="w-1 h-1 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-1 h-1 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-1 h-1 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      Parsing with AI...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
