"use client";

import React, { useState } from "react";
import { Download, Upload, FileJson, FileText, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyDataChanged } from "@/lib/events/data-events";

export default function BackupPage() {
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

      notifyDataChanged();
      setStatusMessage({
        type: "success",
        text: `Successfully imported ${data.importedAccounts} accounts and ${data.importedTransactions} transactions!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Invalid backup format" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Backup & Export</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Safeguard your personal financial records with instant offline & cloud exports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="p-6 rounded-2xl card-elevated space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <Download className="w-5 h-5" />
            <span>Export Financial Records</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Download your full account history, categories, transactions, and budget targets in JSON or CSV format.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-indigo-400" />
                <div className="text-left">
                  <span className="font-bold text-sm block">Full JSON Archive</span>
                  <span className="text-[11px] text-muted-foreground">Complete relational database backup</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div className="text-left">
                  <span className="font-bold text-sm block">CSV Spreadsheet</span>
                  <span className="text-[11px] text-muted-foreground">For Excel, Numbers, and Google Sheets</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="p-6 rounded-2xl card-elevated space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <Upload className="w-5 h-5" />
            <span>Restore / Import Data</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Safely import and merge financial records from a previously exported JSON backup file.
          </p>

          <div className="p-4 rounded-xl bg-secondary/20 border border-dashed border-border/50 text-center space-y-3">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
            <input type="file" accept=".json" onChange={handleFileChange} className="text-xs mx-auto block" />
            {importFile && (
              <Button variant="primary" size="sm" onClick={handleImportSubmit} isLoading={isImporting}>
                Import {importFile.name}
              </Button>
            )}
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
      </div>
    </div>
  );
}
