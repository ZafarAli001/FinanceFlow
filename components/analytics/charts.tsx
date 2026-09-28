"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatCurrency } from "@/lib/utils/formatters";

interface CategoryChartProps {
  data: { name: string; amount: number; color: string }[];
  currency?: string;
}

export const CategoryPieChart: React.FC<CategoryChartProps> = ({ data, currency = "INR" }) => {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No spending data for this period
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="amount"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value), currency), "Spent"]}
            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#0f172a", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

interface TrendChartProps {
  data: { date: string; income: number; expense: number }[];
  currency?: string;
}

export const CashflowBarChart: React.FC<TrendChartProps> = ({ data, currency = "INR" }) => {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No cashflow trend data
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip
            formatter={(val: any) => formatCurrency(Number(val), currency)}
            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#0f172a", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
