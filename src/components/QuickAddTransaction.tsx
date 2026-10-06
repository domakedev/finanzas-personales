"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Mic, MicOff, Send, Loader2, X, Check, AlertCircle, Pencil,
  Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { ParsedTransaction, Transaction } from "@/types";
import { TRANSACTION_CATEGORIES, INCOME_SOURCES } from "@/constants/categories";
import {
  addTransaction as addTransactionDB,
  updateAccount as updateAccountInDB,
  updateDebt as updateDebtInDB,
  updateGoal as updateGoalInDB,
} from "@/lib/db";
import { addMoney, subtractMoney } from "@/lib/utils";
import { PillarPicker } from "@/components/pillars/PillarPicker";
import { findPillarAlert, getPillar, makeCurrencyOf, makeToPen, PILLAR_PICK_TYPES, suggestPillar } from "@/lib/pillars";

export const QuickAddTransaction: React.FC = () => {
  const { user: authUser } = useAuth();
  const user = useStore((s) => s.user) || authUser;
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const debts = useStore((s) => s.debts);
  const goals = useStore((s) => s.goals);
  const addTransactionToStore = useStore((s) => s.addTransaction);
  const updateAccount = useStore((s) => s.updateAccount);
  const updateDebt = useStore((s) => s.updateDebt);
  const updateGoal = useStore((s) => s.updateGoal);
  const transactions = useStore((s) => s.transactions);
  const setPillarAlert = useStore((s) => s.setPillarAlert);
  const usdRate = useStore((s) => s.usdRate);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech Recognition setup
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-PE";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputText(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador.");
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setError(null);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setError(null);
    setParsedTxs([]);

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const res = await fetch("/api/parse-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency, balance: a.balance, pillar: a.pillar })),
          categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, type: c.type })),
          debts: debts.map((d) => ({ id: d.id, name: d.name, isCreditCard: d.isCreditCard, isLent: d.isLent, currency: d.currency, lastFourDigits: d.lastFourDigits })),
          goals: goals.map((g) => ({ id: g.id, name: g.name, currency: g.currency })),
          today: todayStr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al parsear");
        return;
      }
      setParsedTxs(data.transactions || []);
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    } finally {
      setIsParsing(false);
    }
  };

  const removeParsed = (id: string) => {
    setParsedTxs((prev) => prev.filter((t) => t.id !== id));
  };

  const updateParsed = (id: string, updates: Partial<ParsedTransaction>) => {
    setParsedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  // Check if all transactions have required accountId (pillar is optional)
  const allHaveAccount = parsedTxs.every((t) => t.accountId);

  const handleSaveAll = async () => {
    if (!user || !allHaveAccount) return;
    setIsSaving(true);
    setError(null);
    const before = transactions;
    const saved: Transaction[] = [];

    try {
      for (const ptx of parsedTxs) {
        const txDate = new Date(ptx.date + "T00:00:00");
        const txData: any = {
          amount: ptx.amount,
          description: ptx.description,
          date: txDate,
          type: ptx.type,
          accountId: ptx.accountId!,
          isVerified: false,
        };
        if (ptx.categoryId) txData.categoryId = ptx.categoryId;
        if (ptx.debtId) txData.debtId = ptx.debtId;
        if (ptx.goalId) txData.goalId = ptx.goalId;
        if (ptx.fromAccountId) txData.fromAccountId = ptx.fromAccountId;
        if (PILLAR_PICK_TYPES.includes(ptx.type) && ptx.pillar) {
          txData.pillar = ptx.pillar;
          // Dollar movements keep today's exchange rate for Pilares
          if (makeCurrencyOf(accounts, debts)(txData) === "USD") txData.pillarRate = usdRate;
        }

        // Save to Firebase
        const docRef = await addTransactionDB(user.uid, txData as Omit<Transaction, "id">);

        // Update local store
        const savedTx = { ...txData, id: docRef.id, createdAt: new Date() } as Transaction;
        addTransactionToStore(savedTx);
        saved.push(savedTx);

        // Update account balances
        if (ptx.type === "EXPENSE") {
          const isCreditCard = debts.some((d) => d.id === ptx.accountId && d.isCreditCard);
          if (isCreditCard) {
            const cc = debts.find((d) => d.id === ptx.accountId);
            if (cc) {
              const newTotal = addMoney(cc.totalAmount, ptx.amount);
              updateDebt(cc.id, { totalAmount: newTotal });
              await updateDebtInDB(cc.id, { totalAmount: newTotal });
            }
          } else {
            const acc = accounts.find((a) => a.id === ptx.accountId);
            if (acc) {
              const newBal = subtractMoney(acc.balance, ptx.amount);
              updateAccount(acc.id, { balance: newBal });
              await updateAccountInDB(acc.id, { balance: newBal });
            }
          }
        } else if (ptx.type === "INCOME") {
          const acc = accounts.find((a) => a.id === ptx.accountId);
          if (acc) {
            const newBal = addMoney(acc.balance, ptx.amount);
            updateAccount(acc.id, { balance: newBal });
            await updateAccountInDB(acc.id, { balance: newBal });
          }
        } else if (ptx.type === "PAY_DEBT" || ptx.type === "PAY_CREDIT_CARD") {
          const acc = accounts.find((a) => a.id === ptx.accountId);
          if (acc) {
            const newBal = subtractMoney(acc.balance, ptx.amount);
            updateAccount(acc.id, { balance: newBal });
            await updateAccountInDB(acc.id, { balance: newBal });
          }
          if (ptx.debtId) {
            const debt = debts.find((d) => d.id === ptx.debtId);
            if (debt) {
              const newPaid = addMoney(debt.paidAmount || 0, ptx.amount);
              updateDebt(debt.id, { paidAmount: newPaid });
              await updateDebtInDB(debt.id, { paidAmount: newPaid });
            }
          }
        } else if (ptx.type === "SAVE_FOR_GOAL") {
          const acc = accounts.find((a) => a.id === ptx.accountId);
          if (acc) {
            const newBal = subtractMoney(acc.balance, ptx.amount);
            updateAccount(acc.id, { balance: newBal });
            await updateAccountInDB(acc.id, { balance: newBal });
          }
          if (ptx.goalId) {
            const goal = goals.find((g) => g.id === ptx.goalId);
            if (goal) {
              const newAmt = addMoney(goal.currentAmount, ptx.amount);
              updateGoal(goal.id, { currentAmount: newAmt });
              await updateGoalInDB(goal.id, { currentAmount: newAmt });
            }
          }
        } else if (ptx.type === "RECEIVE_DEBT_PAYMENT") {
          const acc = accounts.find((a) => a.id === ptx.accountId);
          if (acc) {
            const newBal = addMoney(acc.balance, ptx.amount);
            updateAccount(acc.id, { balance: newBal });
            await updateAccountInDB(acc.id, { balance: newBal });
          }
          if (ptx.debtId) {
            const debt = debts.find((d) => d.id === ptx.debtId);
            if (debt) {
              const newPaid = addMoney(debt.paidAmount || 0, ptx.amount);
              updateDebt(debt.id, { paidAmount: newPaid });
              await updateDebtInDB(debt.id, { paidAmount: newPaid });
            }
          }
        }
      }

      const alert = findPillarAlert(before, [...before, ...saved], saved.map((t) => t.date), makeToPen(makeCurrencyOf(accounts, debts), usdRate));
      if (alert) setPillarAlert(alert);

      setShowSuccess(true);
      setParsedTxs([]);
      setInputText("");
      setTimeout(() => { setShowSuccess(false); setIsOpen(false); }, 1500);
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      EXPENSE: { label: "Gasto", color: "bg-red-500" },
      INCOME: { label: "Ingreso", color: "bg-green-500" },
      TRANSFER: { label: "Transferencia", color: "bg-blue-500" },
      PAY_DEBT: { label: "Pago Deuda", color: "bg-purple-500" },
      PAY_CREDIT_CARD: { label: "Pago TC", color: "bg-orange-500" },
      SAVE_FOR_GOAL: { label: "Ahorro Meta", color: "bg-emerald-600" },
      RECEIVE_DEBT_PAYMENT: { label: "Cobro", color: "bg-teal-500" },
    };
    const item = map[type] || { label: type, color: "bg-gray-500" };
    return <span className={`${item.color} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>{item.label}</span>;
  };

  const allCategories = [...TRANSACTION_CATEGORIES, ...INCOME_SOURCES, ...categories];
  const allAccounts = [
    ...accounts.map((a) => ({ id: a.id, label: `${a.name} (${a.currency})` })),
    ...debts.filter((d) => d.isCreditCard).map((d) => ({ id: d.id, label: `💳 ${d.name}` })),
  ];

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        title="Agregar rápido con IA"
      >
        <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
      </button>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setParsedTxs([]); setError(null); setInputText(""); }} title="⚡ Agregar Rápido con IA">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Success overlay */}
          {showSuccess && (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-green-600">¡Transacciones guardadas!</p>
            </div>
          )}

          {!showSuccess && (
            <>
              {/* Input area */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Dicta o escribe tus gastos/ingresos
                </label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder='Ej: "Gasté 25 en uber con yape, 45 en almuerzo ayer, y me pagaron 3000 de sueldo en BCP"'
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-3 pr-24 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 min-h-[80px] resize-none"
                    disabled={isParsing || isListening}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleParse(); } }}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isParsing}
                      className={`p-2 rounded-full transition-all ${isListening
                        ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-violet-100 dark:hover:bg-violet-900 text-gray-600 dark:text-gray-300"
                        }`}
                      title={isListening ? "Detener" : "Dictar por voz"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={handleParse}
                      disabled={!inputText.trim() || isParsing}
                      className="p-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Analizar con IA"
                    >
                      {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {isListening && (
                  <p className="text-xs text-red-500 flex items-center gap-1 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Escuchando...
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Parsed transactions preview */}
              {parsedTxs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      {parsedTxs.length} transacción{parsedTxs.length > 1 ? "es" : ""} detectada{parsedTxs.length > 1 ? "s" : ""}
                    </h3>
                  </div>

                  {parsedTxs.map((ptx) => {
                    const isEditing = editingId === ptx.id;
                    const needsAccount = !ptx.accountId;

                    return (
                      <div
                        key={ptx.id}
                        className={`border rounded-lg p-3 space-y-2 transition-all ${needsAccount
                          ? "border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10"
                          : "border-border hover:border-violet-300 dark:hover:border-violet-700"
                          }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getTypeBadge(ptx.type)}
                            <span className="font-bold text-lg">
                              {ptx.type === "INCOME" || ptx.type === "RECEIVE_DEBT_PAYMENT" ? "+" : "-"}
                              S/ {ptx.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingId(isEditing ? null : ptx.id)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                            >
                              {isEditing ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => removeParsed(ptx.id)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Description & meta */}
                        <div className="text-sm text-muted-foreground">
                          {ptx.description} • {ptx.date}
                          {ptx.categoryId && (() => {
                            const cat = allCategories.find((c) => c.id === ptx.categoryId);
                            return cat ? <span> • {cat.icon} {cat.name}</span> : null;
                          })()}
                          {(() => {
                            const meta = getPillar(ptx.pillar);
                            return meta ? <span style={{ color: meta.color }} className="font-medium"> • {meta.name}</span> : null;
                          })()}
                        </div>

                        {PILLAR_PICK_TYPES.includes(ptx.type) && (!ptx.pillar || isEditing) && (
                          <div className="space-y-1 pt-1">
                            {!ptx.pillar && <p className="text-xs text-muted-foreground">Pilar (opcional)</p>}
                            <PillarPicker
                              compact
                              value={ptx.pillar}
                              suggested={suggestPillar(ptx.type, ptx.categoryId, accounts.find((a) => a.id === ptx.accountId)?.pillar)}
                              onChange={(p) => updateParsed(ptx.id, { pillar: p })}
                            />
                          </div>
                        )}

                        {/* Account selector (always visible if no account) */}
                        {(needsAccount || isEditing) && (
                          <div className="space-y-2 pt-1">
                            {needsAccount && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Selecciona una cuenta
                              </p>
                            )}
                            <select
                              value={ptx.accountId || ""}
                              onChange={(e) => updateParsed(ptx.id, { accountId: e.target.value || undefined })}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                              <option value="">Seleccionar cuenta</option>
                              {allAccounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Expanded edit fields */}
                        {isEditing && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="text-xs font-medium">Tipo</label>
                              <select
                                value={ptx.type}
                                onChange={(e) => updateParsed(ptx.id, { type: e.target.value as any })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              >
                                <option value="EXPENSE">Gasto</option>
                                <option value="INCOME">Ingreso</option>
                                <option value="TRANSFER">Transferencia</option>
                                <option value="PAY_DEBT">Pagar Deuda</option>
                                <option value="PAY_CREDIT_CARD">Pagar TC</option>
                                <option value="SAVE_FOR_GOAL">Ahorro Meta</option>
                                <option value="RECEIVE_DEBT_PAYMENT">Cobro Préstamo</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium">Monto</label>
                              <input
                                type="number"
                                step="0.01"
                                value={ptx.amount}
                                onChange={(e) => updateParsed(ptx.id, { amount: Number(e.target.value) || 0 })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium">Descripción</label>
                              <input
                                type="text"
                                value={ptx.description}
                                onChange={(e) => updateParsed(ptx.id, { description: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium">Fecha</label>
                              <input
                                type="date"
                                value={ptx.date}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={(e) => updateParsed(ptx.id, { date: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs font-medium">Categoría</label>
                              <select
                                value={ptx.categoryId || ""}
                                onChange={(e) => updateParsed(ptx.id, { categoryId: e.target.value || undefined })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              >
                                <option value="">Sin categoría</option>
                                {(ptx.type === "INCOME"
                                  ? [...INCOME_SOURCES, ...categories.filter((c) => c.type === "INCOME")]
                                  : [...TRANSACTION_CATEGORIES, ...categories.filter((c) => c.type === "EXPENSE")]
                                ).map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {ptx.type === "INCOME" && (
                          <p className="text-xs text-muted-foreground">Repártelo en pilares desde la página Pilares.</p>
                        )}

                        {ptx.aiNote && (
                          <p className="text-xs text-violet-600 dark:text-violet-400 italic">💡 {ptx.aiNote}</p>
                        )}
                      </div>
                    );
                  })}

                  {/* Save all button */}
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSaving || !allHaveAccount}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                  >
                    {isSaving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                    ) : (
                      <><Check className="mr-2 h-4 w-4" /> Guardar {parsedTxs.length} transacción{parsedTxs.length > 1 ? "es" : ""}</>
                    )}
                  </Button>
                  {!allHaveAccount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                      ⚠️ Todas las transacciones necesitan una cuenta asignada
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};
