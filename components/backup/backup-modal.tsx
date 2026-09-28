"use client";

import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Download, Upload, FileJson, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = (format: "json" | "csv") => {
    window.open(`/api/export?format=${format}`, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setStatusMessage(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const fileText = await importFile.text();
      const jsonData = JSON.parse(fileText);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setStatusMessage({
        type: "success",
        text: `Imported ${data.importedAccounts} accounts and ${data.importedTransactions} transactions successfully!`,
      });
      onSuccess();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Invalid JSON backup file" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backup & Restore Financial Data">
      <div className="space-y-6 py-2">
        {/* Export Options */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Export Data</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-3 p-4 rounded-2xl card-elevated hover:border-primary/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">JSON Full Backup</span>
                <p className="text-xs text-muted-foreground">Accounts, transactions & budgets</p>
              </div>
            </button>

            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-3 p-4 rounded-2xl card-elevated hover:border-emerald-500/50 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">CSV Spreadsheet</span>
                <p className="text-xs text-muted-foreground">Compatible with Excel & Sheets</p>
              </div>
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restore / Import Data</h4>
          <div className="p-4 rounded-2xl bg-secondary/30 border border-dashed border-border text-center space-y-3">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">
              Select a previously exported <code className="text-primary font-mono">.json</code> backup file
            </div>
            <input type="file" accept=".json" onChange={handleFileChange} className="text-xs mx-auto block" />
            {importFile && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                isLoading={isImporting}
                className="mt-2"
              >
                Restore {importFile.name}
              </Button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
